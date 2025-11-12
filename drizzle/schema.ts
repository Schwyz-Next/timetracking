import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Nullable for local users. */
  openId: varchar("openId", { length: 64 }).unique(),
  /** Username for local authentication. Nullable for OAuth users. */
  username: varchar("username", { length: 100 }).unique(),
  /** Hashed password for local authentication. Null for OAuth users. */
  passwordHash: varchar("passwordHash", { length: 255 }),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Projects table - stores different project types with rates and quotas
export const projects = mysqlTable("projects", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  hourlyRate: int("hourlyRate").notNull(), // Rate in CHF
  vatType: mysqlEnum("vatType", ["inclusive", "exclusive"]).notNull(),
  totalQuotaHours: int("totalQuotaHours").notNull(), // Total hours allowed for this project
  warningThreshold: int("warningThreshold").default(80).notNull(), // Percentage threshold for warnings (e.g., 80%)
  year: int("year").notNull(), // Project year (2025, 2026, etc.)
  status: mysqlEnum("status", ["active", "archived"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

// Categories table - stores time entry categories (GF, NRP, IC, etc.)
export const categories = mysqlTable("categories", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 10 }).notNull().unique(), // Short code like GF, NRP, IC
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Category = typeof categories.$inferSelect;
export type InsertCategory = typeof categories.$inferInsert;

// Time entries table - stores individual time tracking entries
export const timeEntries = mysqlTable("timeEntries", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // Reference to users table
  projectId: int("projectId").notNull(), // Reference to projects table
  categoryId: int("categoryId").notNull(), // Reference to categories table
  date: timestamp("date").notNull(), // Date of the work
  startTime: varchar("startTime", { length: 8 }), // HH:MM:SS format (optional)
  endTime: varchar("endTime", { length: 8 }), // HH:MM:SS format (optional)
  durationHours: int("durationHours").notNull(), // Duration in hours (multiplied by 100 for 2 decimal places, e.g., 150 = 1.5h)
  description: text("description"), // Description of the work done
  kilometers: int("kilometers"), // Optional kilometers traveled
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TimeEntry = typeof timeEntries.$inferSelect;
export type InsertTimeEntry = typeof timeEntries.$inferInsert;

// Invoices table - stores generated invoices
export const invoices = mysqlTable("invoices", {
  id: int("id").autoincrement().primaryKey(),
  invoiceNumber: varchar("invoiceNumber", { length: 50 }).notNull().unique(),
  userId: int("userId").notNull(), // User who generated the invoice
  month: int("month").notNull(), // 1-12
  year: int("year").notNull(),
  recipientName: varchar("recipientName", { length: 255 }).notNull(),
  recipientAddress: text("recipientAddress"),
  totalAmount: int("totalAmount").notNull(), // Total in CHF (multiplied by 100 for 2 decimal places)
  status: mysqlEnum("status", ["draft", "sent", "paid"]).default("draft").notNull(),
  pdfUrl: text("pdfUrl"), // S3 URL to the generated PDF
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = typeof invoices.$inferInsert;

// Invoice items table - stores line items for each invoice
export const invoiceItems = mysqlTable("invoiceItems", {
  id: int("id").autoincrement().primaryKey(),
  invoiceId: int("invoiceId").notNull(), // Reference to invoices table
  projectId: int("projectId").notNull(), // Reference to projects table
  hours: int("hours").notNull(), // Hours worked (multiplied by 100 for 2 decimal places)
  rate: int("rate").notNull(), // Hourly rate in CHF (multiplied by 100)
  amount: int("amount").notNull(), // Total amount for this line item (multiplied by 100)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type InvoiceItem = typeof invoiceItems.$inferSelect;
export type InsertInvoiceItem = typeof invoiceItems.$inferInsert;

// Audit logs table - tracks all important user actions for compliance and security
export const auditLogs = mysqlTable("auditLogs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"), // User who performed the action (null for system actions)
  action: varchar("action", { length: 100 }).notNull(), // e.g., "user.created", "role.changed", "time_entry.deleted"
  entityType: varchar("entityType", { length: 50 }), // e.g., "user", "project", "time_entry"
  entityId: int("entityId"), // ID of the affected entity
  oldValue: text("oldValue"), // JSON string of old values
  newValue: text("newValue"), // JSON string of new values
  ipAddress: varchar("ipAddress", { length: 45 }), // IPv4 or IPv6
  userAgent: text("userAgent"), // Browser/client information
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;