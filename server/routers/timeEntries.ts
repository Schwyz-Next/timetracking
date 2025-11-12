import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { timeEntries, projects, categories, users } from "../../drizzle/schema";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";

export const timeEntriesRouter = router({
  // Get all time entries with filters
  list: protectedProcedure
    .input(
      z.object({
        projectId: z.number().optional(),
        categoryId: z.number().optional(),
        userId: z.number().optional(),
        startDate: z.string().optional(), // ISO date string
        endDate: z.string().optional(), // ISO date string
        limit: z.number().min(1).max(1000).default(100),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const conditions = [];

      // Non-admin users can only see their own entries
      if (ctx.user.role !== "admin") {
        conditions.push(eq(timeEntries.userId, ctx.user.id));
      } else if (input.userId) {
        conditions.push(eq(timeEntries.userId, input.userId));
      }

      if (input.projectId) {
        conditions.push(eq(timeEntries.projectId, input.projectId));
      }
      if (input.categoryId) {
        conditions.push(eq(timeEntries.categoryId, input.categoryId));
      }
      if (input.startDate) {
        conditions.push(gte(timeEntries.date, new Date(input.startDate)));
      }
      if (input.endDate) {
        conditions.push(lte(timeEntries.date, new Date(input.endDate)));
      }

      const query = db
        .select({
          entry: timeEntries,
          project: projects,
          category: categories,
          user: {
            id: users.id,
            name: users.name,
            email: users.email,
          },
        })
        .from(timeEntries)
        .leftJoin(projects, eq(timeEntries.projectId, projects.id))
        .leftJoin(categories, eq(timeEntries.categoryId, categories.id))
        .leftJoin(users, eq(timeEntries.userId, users.id))
        .orderBy(desc(timeEntries.date))
        .limit(input.limit)
        .offset(input.offset);

      if (conditions.length > 0) {
        const result = await query.where(and(...conditions));
        return result;
      }

      return await query;
    }),

  // Get a single time entry by ID
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const result = await db
        .select({
          entry: timeEntries,
          project: projects,
          category: categories,
        })
        .from(timeEntries)
        .leftJoin(projects, eq(timeEntries.projectId, projects.id))
        .leftJoin(categories, eq(timeEntries.categoryId, categories.id))
        .where(eq(timeEntries.id, input.id))
        .limit(1);

      if (!result[0]) {
        throw new Error("Time entry not found");
      }

      // Non-admin users can only access their own entries
      if (
        ctx.user.role !== "admin" &&
        result[0].entry.userId !== ctx.user.id
      ) {
        throw new Error("Access denied");
      }

      return result[0];
    }),

  // Create a new time entry
  create: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        categoryId: z.number(),
        date: z.string(), // ISO date string
        startTime: z.string().optional(), // HH:MM format
        endTime: z.string().optional(), // HH:MM format
        durationHours: z.number().min(0).optional(), // Manual entry in hours
        description: z.string().optional(),
        kilometers: z.number().min(0).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Calculate duration
      let durationHours = 0;

      if (input.durationHours !== undefined) {
        // Manual entry
        durationHours = Math.round(input.durationHours * 100); // Store as integer (e.g., 1.5h = 150)
      } else if (input.startTime && input.endTime) {
        // Calculate from start/end times
        const [startHour, startMin] = input.startTime.split(":").map(Number);
        const [endHour, endMin] = input.endTime.split(":").map(Number);

        const startMinutes = startHour * 60 + startMin;
        const endMinutes = endHour * 60 + endMin;
        const durationMinutes =
          endMinutes >= startMinutes
            ? endMinutes - startMinutes
            : 24 * 60 - startMinutes + endMinutes;

        durationHours = Math.round((durationMinutes / 60) * 100);
      } else {
        throw new Error(
          "Either provide durationHours or both startTime and endTime"
        );
      }

      // Check for overlapping entries (if start/end times are provided)
      if (input.startTime && input.endTime) {
        const dateStr = input.date.split("T")[0]; // Get just the date part
        const overlapping = await db
          .select()
          .from(timeEntries)
          .where(
            and(
              eq(timeEntries.userId, ctx.user.id),
              sql`DATE(${timeEntries.date}) = ${dateStr}`
            )
          );

        // Simple overlap check - can be enhanced
        if (overlapping.length > 0) {
          console.warn("Potential time overlap detected");
        }
      }

      const result = await db.insert(timeEntries).values({
        userId: ctx.user.id,
        projectId: input.projectId,
        categoryId: input.categoryId,
        date: new Date(input.date),
        startTime: input.startTime || null,
        endTime: input.endTime || null,
        durationHours,
        description: input.description || null,
        kilometers: input.kilometers || null,
      });

      return { id: Number((result as any).insertId) };
    }),

  // Update an existing time entry
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        projectId: z.number().optional(),
        categoryId: z.number().optional(),
        date: z.string().optional(),
        startTime: z.string().optional(),
        endTime: z.string().optional(),
        durationHours: z.number().min(0).optional(),
        description: z.string().optional(),
        kilometers: z.number().min(0).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { id, ...updateData } = input;

      // Check ownership
      const existing = await db
        .select()
        .from(timeEntries)
        .where(eq(timeEntries.id, id))
        .limit(1);

      if (!existing[0]) {
        throw new Error("Time entry not found");
      }

      if (ctx.user.role !== "admin" && existing[0].userId !== ctx.user.id) {
        throw new Error("Access denied");
      }

      // Recalculate duration if needed
      const updates: any = {};

      if (updateData.projectId !== undefined)
        updates.projectId = updateData.projectId;
      if (updateData.categoryId !== undefined)
        updates.categoryId = updateData.categoryId;
      if (updateData.date !== undefined)
        updates.date = new Date(updateData.date);
      if (updateData.description !== undefined)
        updates.description = updateData.description;
      if (updateData.kilometers !== undefined)
        updates.kilometers = updateData.kilometers;

      // Handle time updates
      if (updateData.startTime !== undefined)
        updates.startTime = updateData.startTime;
      if (updateData.endTime !== undefined) updates.endTime = updateData.endTime;

      if (updateData.durationHours !== undefined) {
        updates.durationHours = Math.round(updateData.durationHours * 100);
      } else if (updateData.startTime && updateData.endTime) {
        const [startHour, startMin] = updateData.startTime.split(":").map(Number);
        const [endHour, endMin] = updateData.endTime.split(":").map(Number);

        const startMinutes = startHour * 60 + startMin;
        const endMinutes = endHour * 60 + endMin;
        const durationMinutes =
          endMinutes >= startMinutes
            ? endMinutes - startMinutes
            : 24 * 60 - startMinutes + endMinutes;

        updates.durationHours = Math.round((durationMinutes / 60) * 100);
      }

      await db.update(timeEntries).set(updates).where(eq(timeEntries.id, id));

      return { success: true };
    }),

  // Delete a time entry
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Check ownership
      const existing = await db
        .select()
        .from(timeEntries)
        .where(eq(timeEntries.id, input.id))
        .limit(1);

      if (!existing[0]) {
        throw new Error("Time entry not found");
      }

      if (ctx.user.role !== "admin" && existing[0].userId !== ctx.user.id) {
        throw new Error("Access denied");
      }

      await db.delete(timeEntries).where(eq(timeEntries.id, input.id));

      return { success: true };
    }),

  // Get summary statistics
  getSummary: protectedProcedure
    .input(
      z.object({
        userId: z.number().optional(),
        month: z.number().min(1).max(12).optional(),
        year: z.number().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const conditions = [];

      // Non-admin users can only see their own summary
      if (ctx.user.role !== "admin") {
        conditions.push(eq(timeEntries.userId, ctx.user.id));
      } else if (input.userId) {
        conditions.push(eq(timeEntries.userId, input.userId));
      }

      if (input.month && input.year) {
        conditions.push(
          sql`MONTH(${timeEntries.date}) = ${input.month} AND YEAR(${timeEntries.date}) = ${input.year}`
        );
      } else if (input.year) {
        conditions.push(sql`YEAR(${timeEntries.date}) = ${input.year}`);
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const summary = await db
        .select({
          projectId: timeEntries.projectId,
          projectName: projects.name,
          categoryId: timeEntries.categoryId,
          categoryCode: categories.code,
          totalHours: sql<number>`SUM(${timeEntries.durationHours})`,
          entryCount: sql<number>`COUNT(*)`,
        })
        .from(timeEntries)
        .leftJoin(projects, eq(timeEntries.projectId, projects.id))
        .leftJoin(categories, eq(timeEntries.categoryId, categories.id))
        .where(whereClause)
        .groupBy(timeEntries.projectId, timeEntries.categoryId);

      return summary.map((item) => ({
        ...item,
        totalHours: (item.totalHours || 0) / 100,
      }));
    }),
});
