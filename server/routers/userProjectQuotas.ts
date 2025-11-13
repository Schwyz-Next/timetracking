import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { userProjectQuotas } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { auditLog } from "../auditLog";

export const userProjectQuotasRouter = router({
  // Get all user quotas for a project
  listByProject: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const quotas = await db
        .select()
        .from(userProjectQuotas)
        .where(eq(userProjectQuotas.projectId, input.projectId));

      return quotas;
    }),

  // Get user's quota for a specific project
  getByUserAndProject: protectedProcedure
    .input(
      z.object({
        userId: z.number(),
        projectId: z.number(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const quota = await db
        .select()
        .from(userProjectQuotas)
        .where(
          and(
            eq(userProjectQuotas.userId, input.userId),
            eq(userProjectQuotas.projectId, input.projectId)
          )
        )
        .limit(1);

      return quota[0] || null;
    }),

  // Set or update user quota for a project
  upsert: protectedProcedure
    .input(
      z.object({
        userId: z.number(),
        projectId: z.number(),
        quotaHours: z.number().min(0),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Check if quota already exists
      const existing = await db
        .select()
        .from(userProjectQuotas)
        .where(
          and(
            eq(userProjectQuotas.userId, input.userId),
            eq(userProjectQuotas.projectId, input.projectId)
          )
        )
        .limit(1);

      if (existing[0]) {
        // Update existing quota
        await db
          .update(userProjectQuotas)
          .set({ quotaHours: input.quotaHours })
          .where(eq(userProjectQuotas.id, existing[0].id));

        await auditLog(ctx, "quota.updated", {
          entityType: "user_project_quota",
          entityId: existing[0].id,
          oldValue: existing[0],
          newValue: input,
        });

        return { id: existing[0].id, updated: true };
      } else {
        // Create new quota
        const result = await db.insert(userProjectQuotas).values(input);

        const quotaId = Number((result as any).insertId);

        await auditLog(ctx, "quota.created", {
          entityType: "user_project_quota",
          entityId: quotaId,
          newValue: input,
        });

        return { id: quotaId, updated: false };
      }
    }),

  // Delete user quota for a project
  delete: protectedProcedure
    .input(
      z.object({
        userId: z.number(),
        projectId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const existing = await db
        .select()
        .from(userProjectQuotas)
        .where(
          and(
            eq(userProjectQuotas.userId, input.userId),
            eq(userProjectQuotas.projectId, input.projectId)
          )
        )
        .limit(1);

      if (existing[0]) {
        await db
          .delete(userProjectQuotas)
          .where(eq(userProjectQuotas.id, existing[0].id));

        await auditLog(ctx, "quota.deleted", {
          entityType: "user_project_quota",
          entityId: existing[0].id,
          oldValue: existing[0],
        });

        return { success: true };
      }

      return { success: false };
    }),
});
