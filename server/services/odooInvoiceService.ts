import { OdooClient, OdooInvoice } from "../utils/odooClient";
import { getOdooConfig } from "../db";

export interface InvoiceData {
  userId: number;
  invoiceNumber: string;
  recipientName: string;
  invoiceDate: Date;
  lineItems: Array<{
    projectName: string;
    hours: number; // Already in decimal format (e.g., 1.5)
    rate: number; // Already in decimal format (e.g., 150.00)
    amount: number; // Already in decimal format (e.g., 225.00)
  }>;
}

/**
 * Create an invoice in Odoo when time tracker invoice is set to draft
 */
export async function createOdooInvoice(invoiceData: InvoiceData): Promise<{
  success: boolean;
  odooInvoiceId?: number;
  message: string;
}> {
  try {
    console.log('[Odoo] Creating invoice for user:', invoiceData.userId);
    // Get user's Odoo configuration
    const config = await getOdooConfig(invoiceData.userId);
    console.log('[Odoo] Config found:', config ? 'Yes' : 'No', config?.isActive ? '(active)' : '(inactive)');
    
    if (!config || !config.isActive) {
      return {
        success: false,
        message: "Odoo integration not configured or inactive",
      };
    }

    // Create Odoo client
    const client = new OdooClient({
      url: config.odooUrl,
      username: config.username,
      database: config.database,
      apiKey: config.apiKey,
    });

    // Find company "World Wide Services Group Ltd."
    console.log('[Odoo] Searching for company: World Wide Services Group Ltd.');
    const companyId = await client.findCompany("World Wide Services Group Ltd.");
    console.log('[Odoo] Company ID:', companyId);
    if (!companyId) {
      return {
        success: false,
        message: "Company 'World Wide Services Group Ltd.' not found in Odoo",
      };
    }

    // Find or get partner (customer) by name
    console.log('[Odoo] Searching for partner:', invoiceData.recipientName);
    let partnerId = await client.findPartner(invoiceData.recipientName);
    console.log('[Odoo] Partner ID:', partnerId);
    
    if (!partnerId) {
      return {
        success: false,
        message: `Customer '${invoiceData.recipientName}' not found in Odoo. Please create the customer first.`,
      };
    }

    // Prepare invoice line items
    const invoiceLines = invoiceData.lineItems.map((item) => ({
      name: `${item.projectName} - ${item.hours}h @ CHF ${item.rate}/h`,
      quantity: item.hours,
      price_unit: item.rate,
    }));

    // Create invoice in Odoo
    const odooInvoice: any = {
      partner_id: partnerId,
      move_type: "out_invoice",
      invoice_date: invoiceData.invoiceDate.toISOString().split("T")[0], // YYYY-MM-DD
      invoice_line_ids: invoiceLines.map((line) => [0, 0, line]), // Odoo format for creating lines
      ref: invoiceData.invoiceNumber, // Reference number from time tracker
      company_id: companyId, // Set company to Schwyz Next
    };

    console.log('[Odoo] Creating invoice with data:', JSON.stringify(odooInvoice, null, 2));
    const odooInvoiceId = await client.createInvoice(odooInvoice);
    console.log('[Odoo] Invoice created with ID:', odooInvoiceId);

    return {
      success: true,
      odooInvoiceId,
      message: `Invoice created in Odoo with ID: ${odooInvoiceId}`,
    };
  } catch (error) {
    console.error("Error creating Odoo invoice:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
