import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  invoices,
  invoiceItems,
  timeEntries,
  projects,
  categories,
} from "../../drizzle/schema";
import { eq, and, sql } from "drizzle-orm";

export const invoicesRouter = router({
  // Get all invoices
  list: protectedProcedure
    .input(
      z.object({
        year: z.number().optional(),
        status: z.enum(["draft", "sent", "paid"]).optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const conditions = [];

      // Non-admin users can only see their own invoices
      if (ctx.user.role !== "admin") {
        conditions.push(eq(invoices.userId, ctx.user.id));
      }

      if (input.year) {
        conditions.push(eq(invoices.year, input.year));
      }
      if (input.status) {
        conditions.push(eq(invoices.status, input.status));
      }

      let query = db.select().from(invoices);

      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }

      return await query;
    }),

  // Get a single invoice with items
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const invoice = await db
        .select()
        .from(invoices)
        .where(eq(invoices.id, input.id))
        .limit(1);

      if (!invoice[0]) {
        throw new Error("Invoice not found");
      }

      // Check ownership
      if (
        ctx.user.role !== "admin" &&
        invoice[0].userId !== ctx.user.id
      ) {
        throw new Error("Access denied");
      }

      // Get invoice items with project details
      const items = await db
        .select({
          item: invoiceItems,
          project: projects,
        })
        .from(invoiceItems)
        .leftJoin(projects, eq(invoiceItems.projectId, projects.id))
        .where(eq(invoiceItems.invoiceId, input.id));

      return {
        invoice: invoice[0],
        items,
      };
    }),

  // Generate invoice from time entries
  generate: protectedProcedure
    .input(
      z.object({
        month: z.number().min(1).max(12),
        year: z.number().min(2020).max(2100),
        recipientName: z.string().min(1),
        recipientAddress: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get all time entries for the specified month/year
      const entries = await db
        .select({
          entry: timeEntries,
          project: projects,
          category: categories,
        })
        .from(timeEntries)
        .leftJoin(projects, eq(timeEntries.projectId, projects.id))
        .leftJoin(categories, eq(timeEntries.categoryId, categories.id))
        .where(
          and(
            eq(timeEntries.userId, ctx.user.id),
            sql`MONTH(${timeEntries.date}) = ${input.month}`,
            sql`YEAR(${timeEntries.date}) = ${input.year}`
          )
        );

      if (entries.length === 0) {
        throw new Error("No time entries found for the specified period");
      }

      // Group entries by project and calculate totals
      const projectTotals = new Map<
        number,
        {
          projectId: number;
          projectName: string;
          hourlyRate: number;
          totalHours: number;
        }
      >();

      for (const entry of entries) {
        if (!entry.project) continue;

        const projectId = entry.project.id;
        const hours = entry.entry.durationHours / 100;

        if (projectTotals.has(projectId)) {
          const existing = projectTotals.get(projectId)!;
          existing.totalHours += hours;
        } else {
          projectTotals.set(projectId, {
            projectId,
            projectName: entry.project.name,
            hourlyRate: entry.project.hourlyRate,
            totalHours: hours,
          });
        }
      }

      // Calculate total amount
      let totalAmount = 0;
      const items: Array<{
        projectId: number;
        hours: number;
        rate: number;
        amount: number;
      }> = [];

      for (const [_, data] of Array.from(projectTotals.entries())) {
        const amount = data.totalHours * data.hourlyRate;
        totalAmount += amount;

        items.push({
          projectId: data.projectId,
          hours: Math.round(data.totalHours * 100), // Store as integer
          rate: data.hourlyRate,
          amount: Math.round(amount * 100), // Store as integer
        });
      }

      // Generate invoice number (format: YYYY-MM-XXX)
      const existingInvoices = await db
        .select()
        .from(invoices)
        .where(
          and(eq(invoices.year, input.year), eq(invoices.month, input.month))
        );

      const invoiceNumber = `${input.year}-${String(input.month).padStart(2, "0")}-${String(existingInvoices.length + 1).padStart(3, "0")}`;

      // Create invoice
      const invoiceResult = await db.insert(invoices).values({
        invoiceNumber,
        userId: ctx.user.id,
        month: input.month,
        year: input.year,
        recipientName: input.recipientName,
        recipientAddress: input.recipientAddress || null,
        totalAmount: Math.round(totalAmount * 100),
        status: "draft",
        pdfUrl: null,
      });

      const invoiceId = Number((invoiceResult as any).insertId);

      // Create invoice items
      for (const item of items) {
        await db.insert(invoiceItems).values({
          invoiceId,
          ...item,
        });
      }

      return { id: invoiceId, invoiceNumber };
    }),

  // Update invoice status
  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["draft", "sent", "paid"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Check ownership
      const existing = await db
        .select()
        .from(invoices)
        .where(eq(invoices.id, input.id))
        .limit(1);

      if (!existing[0]) {
        throw new Error("Invoice not found");
      }

      if (ctx.user.role !== "admin" && existing[0].userId !== ctx.user.id) {
        throw new Error("Access denied");
      }

      await db
        .update(invoices)
        .set({ status: input.status })
        .where(eq(invoices.id, input.id));

      return { success: true };
    }),

  // Delete an invoice
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Check ownership
      const existing = await db
        .select()
        .from(invoices)
        .where(eq(invoices.id, input.id))
        .limit(1);

      if (!existing[0]) {
        throw new Error("Invoice not found");
      }

      if (ctx.user.role !== "admin" && existing[0].userId !== ctx.user.id) {
        throw new Error("Access denied");
      }

      // Delete invoice items first
      await db.delete(invoiceItems).where(eq(invoiceItems.invoiceId, input.id));

      // Delete invoice
      await db.delete(invoices).where(eq(invoices.id, input.id));

      return { success: true };
    }),

  // Get invoice preview data (before generating)
  preview: protectedProcedure
    .input(
      z.object({
        month: z.number().min(1).max(12),
        year: z.number().min(2020).max(2100),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get all time entries for the specified month/year
      const entries = await db
        .select({
          entry: timeEntries,
          project: projects,
          category: categories,
        })
        .from(timeEntries)
        .leftJoin(projects, eq(timeEntries.projectId, projects.id))
        .leftJoin(categories, eq(timeEntries.categoryId, categories.id))
        .where(
          and(
            eq(timeEntries.userId, ctx.user.id),
            sql`MONTH(${timeEntries.date}) = ${input.month}`,
            sql`YEAR(${timeEntries.date}) = ${input.year}`
          )
        );

      // Group by project
      const projectTotals = new Map<
        number,
        {
          projectId: number;
          projectName: string;
          hourlyRate: number;
          vatType: string;
          totalHours: number;
          amount: number;
        }
      >();

      for (const entry of entries) {
        if (!entry.project) continue;

        const projectId = entry.project.id;
        const hours = entry.entry.durationHours / 100;
        const amount = hours * entry.project.hourlyRate;

        if (projectTotals.has(projectId)) {
          const existing = projectTotals.get(projectId)!;
          existing.totalHours += hours;
          existing.amount += amount;
        } else {
          projectTotals.set(projectId, {
            projectId,
            projectName: entry.project.name,
            hourlyRate: entry.project.hourlyRate,
            vatType: entry.project.vatType,
            totalHours: hours,
            amount,
          });
        }
      }

      const items = Array.from(projectTotals.values());
      const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

      return {
        items,
        totalAmount,
        entryCount: entries.length,
      };
    }),
});
