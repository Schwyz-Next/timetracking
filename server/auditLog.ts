import { getDb } from "./db.js";
import { auditLogs, InsertAuditLog } from "../drizzle/schema.js";

export type AuditAction =
  | "user.created"
  | "user.updated"
  | "user.deleted"
  | "user.role_changed"
  | "user.login"
  | "user.logout"
  | "user.password_changed"
  | "project.created"
  | "project.updated"
  | "project.deleted"
  | "time_entry.created"
  | "time_entry.updated"
  | "time_entry.deleted"
  | "invoice.created"
  | "invoice.updated"
  | "invoice.status_changed"
  | "category.created"
  | "category.updated"
  | "category.deleted"
  | "quota.created"
  | "quota.updated"
  | "quota.deleted";

export interface AuditLogOptions {
  userId?: number;
  action: AuditAction;
  entityType?: string;
  entityId?: number;
  oldValue?: any;
  newValue?: any;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(options: AuditLogOptions): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[AuditLog] Database not available, skipping audit log");
    return;
  }

  try {
    const logEntry: InsertAuditLog = {
      userId: options.userId,
      action: options.action,
      entityType: options.entityType,
      entityId: options.entityId,
      oldValue: options.oldValue ? JSON.stringify(options.oldValue) : null,
      newValue: options.newValue ? JSON.stringify(options.newValue) : null,
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
    };

    await db.insert(auditLogs).values(logEntry);
  } catch (error) {
    console.error("[AuditLog] Failed to create audit log:", error);
    // Don't throw - audit logging should not break the main operation
  }
}

/**
 * Helper to extract IP address from request
 */
export function getClientIp(req: any): string | undefined {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.headers["x-real-ip"] ||
    req.socket?.remoteAddress ||
    req.connection?.remoteAddress
  );
}

/**
 * Helper to extract user agent from request
 */
export function getUserAgent(req: any): string | undefined {
  return req.headers["user-agent"];
}

/**
 * Middleware-style helper to create audit log from tRPC context
 */
export async function auditLog(
  ctx: { user?: { id: number }; req: any },
  action: AuditAction,
  options?: Partial<AuditLogOptions>
): Promise<void> {
  await createAuditLog({
    userId: ctx.user?.id,
    action,
    ipAddress: getClientIp(ctx.req),
    userAgent: getUserAgent(ctx.req),
    ...options,
  });
}
