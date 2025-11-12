import { z } from "zod";
import { desc, and, eq, gte, lte, like } from "drizzle-orm";
import { getDb } from "../db.js";
import { auditLogs, users } from "../../drizzle/schema.js";
import { protectedProcedure, router } from "../_core/trpc.js";
import { TRPCError } from "@trpc/server";

// Admin-only procedure
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only administrators can view audit logs",
    });
  }
  return next({ ctx });
});

export const auditLogsRouter = router({
  // List audit logs with filtering
  list: adminProcedure
    .input(
      z.object({
        userId: z.number().optional(),
        action: z.string().optional(),
        entityType: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        limit: z.number().min(1).max(1000).default(100),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const conditions = [];

      if (input.userId) {
        conditions.push(eq(auditLogs.userId, input.userId));
      }

      if (input.action) {
        conditions.push(like(auditLogs.action, `%${input.action}%`));
      }

      if (input.entityType) {
        conditions.push(eq(auditLogs.entityType, input.entityType));
      }

      if (input.startDate) {
        conditions.push(gte(auditLogs.createdAt, new Date(input.startDate)));
      }

      if (input.endDate) {
        conditions.push(lte(auditLogs.createdAt, new Date(input.endDate)));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const logs = await db
        .select({
          id: auditLogs.id,
          userId: auditLogs.userId,
          userName: users.name,
          action: auditLogs.action,
          entityType: auditLogs.entityType,
          entityId: auditLogs.entityId,
          oldValue: auditLogs.oldValue,
          newValue: auditLogs.newValue,
          ipAddress: auditLogs.ipAddress,
          userAgent: auditLogs.userAgent,
          createdAt: auditLogs.createdAt,
        })
        .from(auditLogs)
        .leftJoin(users, eq(auditLogs.userId, users.id))
        .where(whereClause)
        .orderBy(desc(auditLogs.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return logs;
    }),

  // Get total count for pagination
  count: adminProcedure
    .input(
      z.object({
        userId: z.number().optional(),
        action: z.string().optional(),
        entityType: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const conditions = [];

      if (input.userId) {
        conditions.push(eq(auditLogs.userId, input.userId));
      }

      if (input.action) {
        conditions.push(like(auditLogs.action, `%${input.action}%`));
      }

      if (input.entityType) {
        conditions.push(eq(auditLogs.entityType, input.entityType));
      }

      if (input.startDate) {
        conditions.push(gte(auditLogs.createdAt, new Date(input.startDate)));
      }

      if (input.endDate) {
        conditions.push(lte(auditLogs.createdAt, new Date(input.endDate)));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const result = await db
        .select({ count: auditLogs.id })
        .from(auditLogs)
        .where(whereClause);

      return result.length;
    }),
});
