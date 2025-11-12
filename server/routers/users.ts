import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { getDb } from "../db.js";
import { users, timeEntries } from "../../drizzle/schema.js";
import { protectedProcedure, router } from "../_core/trpc.js";
import { TRPCError } from "@trpc/server";

// Admin-only procedure
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only administrators can perform this action",
    });
  }
  return next({ ctx });
});

export const usersRouter = router({
  // Get all users (admin only)
  list: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const allUsers = await db.select().from(users);

    // Get statistics for each user
    const usersWithStats = await Promise.all(
      allUsers.map(async (user) => {
        const stats = await db
          .select({
            totalHours: sql<number>`COALESCE(SUM(${timeEntries.durationHours}), 0)`,
            totalEntries: sql<number>`COUNT(*)`,
          })
          .from(timeEntries)
          .where(eq(timeEntries.userId, user.id));

        return {
          ...user,
          totalHours: (stats[0]?.totalHours || 0) / 100, // Convert back from stored format
          totalEntries: Number(stats[0]?.totalEntries || 0),
        };
      })
    );

    return usersWithStats;
  }),

  // Get single user by ID (admin only)
  getById: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const user = await db
        .select()
        .from(users)
        .where(eq(users.id, input.id))
        .limit(1);

      if (!user[0]) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      return user[0];
    }),

  // Update user role (admin only)
  updateRole: adminProcedure
    .input(
      z.object({
        id: z.number(),
        role: z.enum(["admin", "user"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Prevent admin from demoting themselves
      if (input.id === ctx.user.id && input.role === "user") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You cannot remove your own admin privileges",
        });
      }

      await db.update(users).set({ role: input.role }).where(eq(users.id, input.id));

      return { success: true };
    }),

  // Deactivate user (soft delete - admin only)
  deactivate: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Prevent admin from deactivating themselves
      if (input.id === ctx.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You cannot deactivate your own account",
        });
      }

      // For now, we'll just update the name to indicate deactivation
      // In a production app, you'd add an 'active' column to the schema
      const user = await db
        .select()
        .from(users)
        .where(eq(users.id, input.id))
        .limit(1);

      if (!user[0]) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      await db
        .update(users)
        .set({
          name: `[DEACTIVATED] ${user[0].name}`,
        })
        .where(eq(users.id, input.id));

      return { success: true };
    }),

  // Delete user permanently (admin only)
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Prevent admin from deleting themselves
      if (input.id === ctx.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You cannot delete your own account",
        });
      }

      // Check if user has time entries
      const entries = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(timeEntries)
        .where(eq(timeEntries.userId, input.id));

      const entryCount = Number(entries[0]?.count || 0);

      if (entryCount > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot delete user with ${entryCount} time entries. Please reassign or delete their entries first.`,
        });
      }

      await db.delete(users).where(eq(users.id, input.id));

      return { success: true };
    }),

  // Get current user's profile
  me: protectedProcedure.query(({ ctx }) => {
    return ctx.user;
  }),
});
