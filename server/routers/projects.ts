import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { projects, timeEntries, userProjectQuotas } from "../../drizzle/schema";
import { eq, and, sql } from "drizzle-orm";
import { auditLog } from "../auditLog";

export const projectsRouter = router({
  // Get all projects with usage statistics
  list: protectedProcedure
    .input(
      z.object({
        year: z.number().optional(),
        status: z.enum(["active", "archived"]).optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      let query = db.select().from(projects);
      const conditions = [];

      if (input.year) {
        conditions.push(eq(projects.year, input.year));
      }
      if (input.status) {
        conditions.push(eq(projects.status, input.status));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }

      const allProjects = await query;

      // Get usage statistics for each project
      const projectsWithUsage = await Promise.all(
        allProjects.map(async (project: typeof projects.$inferSelect) => {
          // Get individual user's hours on this project
          const userUsageResult = await db
            .select({
              totalHours: sql<number>`COALESCE(SUM(${timeEntries.durationHours}), 0)`,
            })
            .from(timeEntries)
            .where(
              and(
                eq(timeEntries.projectId, project.id),
                eq(timeEntries.userId, ctx.user.id)
              )
            );

          // Get total project hours (all users)
          const totalUsageResult = await db
            .select({
              totalHours: sql<number>`COALESCE(SUM(${timeEntries.durationHours}), 0)`,
            })
            .from(timeEntries)
            .where(eq(timeEntries.projectId, project.id));

          // Get individual user quota for this project
          const userQuotaResult = await db
            .select()
            .from(userProjectQuotas)
            .where(
              and(
                eq(userProjectQuotas.projectId, project.id),
                eq(userProjectQuotas.userId, ctx.user.id)
              )
            )
            .limit(1);

          const userHours = (userUsageResult[0]?.totalHours || 0) / 100;
          const totalProjectHours = (totalUsageResult[0]?.totalHours || 0) / 100;
          const userQuota = userQuotaResult[0]?.quotaHours || project.totalQuotaHours; // Fallback to project quota if no individual quota
          const totalQuota = project.totalQuotaHours;

          const userUsagePercentage = userQuota > 0 ? (userHours / userQuota) * 100 : 0;
          const totalUsagePercentage = totalQuota > 0 ? (totalProjectHours / totalQuota) * 100 : 0;
          const isWarning = userUsagePercentage >= project.warningThreshold;

          return {
            ...project,
            // Individual user stats
            usedHours: userHours,
            userQuotaHours: userQuota,
            usagePercentage: userUsagePercentage,
            isWarning,
            // Total project stats
            totalUsedHours: totalProjectHours,
            totalQuotaHours: totalQuota,
            totalUsagePercentage,
          };
        })
      );

      return projectsWithUsage;
    }),

  // Get a single project by ID
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const project = await db
        .select()
        .from(projects)
        .where(eq(projects.id, input.id))
        .limit(1);

      if (!project[0]) {
        throw new Error("Project not found");
      }

      return project[0];
    }),

  // Create a new project
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        hourlyRate: z.number().min(0),
        vatType: z.enum(["inclusive", "exclusive"]),
        totalQuotaHours: z.number().min(0),
        warningThreshold: z.number().min(0).max(100).default(80),
        year: z.number().min(2020).max(2100),
        status: z.enum(["active", "archived"]).default("active"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const result = await db.insert(projects).values({
        ...input,
        hourlyRate: input.hourlyRate, // Store as-is (will be in CHF)
      });

      const projectId = Number((result as any).insertId);

      // Audit log
      await auditLog(ctx, "project.created", {
        entityType: "project",
        entityId: projectId,
        newValue: input,
      });

      return { id: projectId };
    }),

  // Update an existing project
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        hourlyRate: z.number().min(0).optional(),
        vatType: z.enum(["inclusive", "exclusive"]).optional(),
        totalQuotaHours: z.number().min(0).optional(),
        warningThreshold: z.number().min(0).max(100).optional(),
        year: z.number().min(2020).max(2100).optional(),
        status: z.enum(["active", "archived"]).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const { id, ...updateData } = input;

      // Get old values for audit
      const oldProject = await db
        .select()
        .from(projects)
        .where(eq(projects.id, id))
        .limit(1);

      await db.update(projects).set(updateData).where(eq(projects.id, id));

      // Audit log
      await auditLog(ctx, "project.updated", {
        entityType: "project",
        entityId: id,
        oldValue: oldProject[0],
        newValue: updateData,
      });

      return { success: true };
    }),

  // Delete a project
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Check if there are any time entries for this project
      const entries = await db
        .select()
        .from(timeEntries)
        .where(eq(timeEntries.projectId, input.id))
        .limit(1);

      if (entries.length > 0) {
        throw new Error(
          "Cannot delete project with existing time entries. Archive it instead."
        );
      }

      // Get project details for audit
      const project = await db
        .select()
        .from(projects)
        .where(eq(projects.id, input.id))
        .limit(1);

      await db.delete(projects).where(eq(projects.id, input.id));

      // Audit log
      await auditLog(ctx, "project.deleted", {
        entityType: "project",
        entityId: input.id,
        oldValue: project[0],
      });

      return { success: true };
    }),

  // Clone a project for a new year
  clone: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        newYear: z.number().min(2020).max(2100),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const original = await db
        .select()
        .from(projects)
        .where(eq(projects.id, input.id))
        .limit(1);

      if (!original[0]) {
        throw new Error("Project not found");
      }

      const result = await db.insert(projects).values({
        name: original[0].name,
        hourlyRate: original[0].hourlyRate,
        vatType: original[0].vatType,
        totalQuotaHours: original[0].totalQuotaHours,
        warningThreshold: original[0].warningThreshold,
        year: input.newYear,
        status: "active",
      });

      return { id: Number((result as any).insertId) };
    }),
});
