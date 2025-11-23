import xmlrpc from "xmlrpc";

export interface OdooConfig {
  url: string;
  username: string;
  database: string;
  apiKey: string;
}

export interface OdooInvoice {
  partner_id: number; // Customer ID in Odoo
  move_type: "out_invoice"; // Customer invoice
  invoice_date: string; // YYYY-MM-DD
  invoice_line_ids: Array<{
    name: string; // Description
    quantity: number;
    price_unit: number;
    product_id?: number; // Optional product reference
  }>;
  ref?: string; // Invoice reference/number
}

/**
 * Odoo XML-RPC API client
 * Connects to Odoo using XML-RPC protocol for invoice creation
 */
export class OdooClient {
  private config: OdooConfig;
  private uid: number | null = null;

  constructor(config: OdooConfig) {
    this.config = config;
  }

  /**
   * Test connection to Odoo and authenticate
   */
  async testConnection(): Promise<{ success: boolean; message: string; uid?: number }> {
    try {
      const uid = await this.authenticate();
      return {
        success: true,
        message: "Connection successful",
        uid,
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Connection failed",
      };
    }
  }

  /**
   * Authenticate with Odoo and get user ID
   */
  private async authenticate(): Promise<number> {
    if (this.uid) {
      return this.uid;
    }

    const url = new URL(this.config.url);
    const isSecure = url.protocol === "https:";
    const defaultPort = isSecure ? 443 : 80;
    
    const commonClient = isSecure
      ? xmlrpc.createSecureClient({
          host: url.hostname,
          port: url.port ? parseInt(url.port) : defaultPort,
          path: "/xmlrpc/2/common",
        })
      : xmlrpc.createClient({
          host: url.hostname,
          port: url.port ? parseInt(url.port) : defaultPort,
          path: "/xmlrpc/2/common",
        });

    return new Promise((resolve, reject) => {
      commonClient.methodCall(
        "authenticate",
        [this.config.database, this.config.username, this.config.apiKey, {}],
        (error: any, uid: number) => {
          if (error) {
            console.error("[Odoo] Authentication error:", error);
            reject(new Error(`Authentication failed: ${error.message || JSON.stringify(error)}`));
          } else if (!uid) {
            console.error("[Odoo] Authentication returned no UID");
            reject(new Error("Authentication failed: Invalid credentials"));
          } else {
            console.log("[Odoo] Authentication successful, UID:", uid);
            this.uid = uid;
            resolve(uid);
          }
        }
      );
    });
  }

  /**
   * Execute a method on Odoo
   */
  private async execute(model: string, method: string, args: any[]): Promise<any> {
    const uid = await this.authenticate();
    const url = new URL(this.config.url);
    const isSecure = url.protocol === "https:";
    const defaultPort = isSecure ? 443 : 80;
    
    const objectClient = isSecure
      ? xmlrpc.createSecureClient({
          host: url.hostname,
          port: url.port ? parseInt(url.port) : defaultPort,
          path: "/xmlrpc/2/object",
        })
      : xmlrpc.createClient({
          host: url.hostname,
          port: url.port ? parseInt(url.port) : defaultPort,
          path: "/xmlrpc/2/object",
        });

    return new Promise((resolve, reject) => {
      objectClient.methodCall(
        "execute_kw",
        [
          this.config.database,
          uid,
          this.config.apiKey,
          model,
          method,
          args,
        ],
        (error: any, result: any) => {
          if (error) {
            reject(new Error(`Odoo API error: ${error.message}`));
          } else {
            resolve(result);
          }
        }
      );
    });
  }

  /**
   * Search for a partner (customer) by name
   */
  async findPartner(name: string): Promise<number | null> {
    try {
      const result = await this.execute("res.partner", "search", [
        [["name", "ilike", name]],
      ]);
      return result && result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error("Error finding partner:", error);
      return null;
    }
  }

  /**
   * Search for company by name
   */
  async findCompany(name: string): Promise<number | null> {
    try {
      const result = await this.execute("res.company", "search", [
        [["name", "=", name]],
      ]);
      return result && result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error("Error finding company:", error);
      return null;
    }
  }

  /**
   * Create an invoice in Odoo
   */
  async createInvoice(invoice: OdooInvoice): Promise<number> {
    try {
      const invoiceId = await this.execute("account.move", "create", [[invoice]]);
      return invoiceId;
    } catch (error) {
      throw new Error(`Failed to create invoice: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Get invoice details by ID
   */
  async getInvoice(invoiceId: number): Promise<any> {
    try {
      const result = await this.execute("account.move", "read", [[invoiceId]]);
      return result && result.length > 0 ? result[0] : null;
    } catch (error) {
      throw new Error(`Failed to get invoice: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
}
