import { z } from "zod";
import bcrypt from "bcryptjs";
import { eq, and } from "drizzle-orm";
import { getDb } from "../db.js";
import { users } from "../../drizzle/schema.js";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc.js";
import { TRPCError } from "@trpc/server";
import { auditLog } from "../auditLog.js";
import { sdk } from "../_core/sdk.js";
import { COOKIE_NAME } from "../../shared/const.js";
import { getSessionCookieOptions } from "../_core/cookies.js";

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

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

export const localAuthRouter = router({
  // Admin creates a new local user with username/password
  createLocalUser: adminProcedure
    .input(
      z.object({
        username: z.string().min(3).max(50),
        password: z.string().min(8),
        name: z.string().min(1),
        email: z.string().email().optional(),
        role: z.enum(["admin", "user"]).default("user"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Check if username already exists
      const existing = await db
        .select()
        .from(users)
        .where(eq(users.username, input.username))
        .limit(1);

      if (existing.length > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Username already exists",
        });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(input.password, 10);

      // Create user
      const result = await db.insert(users).values({
        username: input.username,
        passwordHash,
        name: input.name,
        email: input.email,
        loginMethod: "local",
        role: input.role,
        lastSignedIn: new Date(),
      });

      const userId = Number(result[0].insertId);

      // Audit log
      await auditLog(ctx, "user.created", {
        entityType: "user",
        entityId: userId,
        newValue: {
          username: input.username,
          name: input.name,
          role: input.role,
        },
      });

      return { success: true, userId };
    }),

  // Local user login with username/password
  login: publicProcedure
    .input(
      z.object({
        username: z.string(),
        password: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Find user by username
      const userResult = await db
        .select()
        .from(users)
        .where(eq(users.username, input.username))
        .limit(1);

      if (userResult.length === 0) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid username or password",
        });
      }

      const user = userResult[0];

      // Check if user is deactivated
      if (user.name?.includes("[DEACTIVATED]")) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This account has been deactivated",
        });
      }

      // Verify password
      if (!user.passwordHash) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This account does not use password authentication",
        });
      }

      const isValidPassword = await bcrypt.compare(input.password, user.passwordHash);

      if (!isValidPassword) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid username or password",
        });
      }

      // Update last signed in
      await db
        .update(users)
        .set({ lastSignedIn: new Date() })
        .where(eq(users.id, user.id));

      // Create session token using SDK
      const openId = user.openId || `local:${user.username}`;
      const sessionToken = await sdk.createSessionToken(openId, {
        name: user.name || user.username || "",
        expiresInMs: ONE_YEAR_MS,
      });

      // Set cookie
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      // Audit log
      await auditLog(
        { user: { id: user.id }, req: ctx.req },
        "user.login",
        {
          entityType: "user",
          entityId: user.id,
        }
      );

      return {
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      };
    }),

  // Change password for local users
  changePassword: protectedProcedure
    .input(
      z.object({
        currentPassword: z.string(),
        newPassword: z.string().min(8),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const user = await db
        .select()
        .from(users)
        .where(eq(users.id, ctx.user.id))
        .limit(1);

      if (!user[0]) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      if (!user[0].passwordHash) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This account does not use password authentication",
        });
      }

      // Verify current password
      const isValid = await bcrypt.compare(input.currentPassword, user[0].passwordHash);

      if (!isValid) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Current password is incorrect",
        });
      }

      // Hash new password
      const newPasswordHash = await bcrypt.hash(input.newPassword, 10);

      // Update password
      await db
        .update(users)
        .set({ passwordHash: newPasswordHash })
        .where(eq(users.id, ctx.user.id));

      // Audit log
      await auditLog(ctx, "user.password_changed", {
        entityType: "user",
        entityId: ctx.user.id,
      });

      return { success: true };
    }),

  // Admin resets a user's password
  resetUserPassword: adminProcedure
    .input(
      z.object({
        userId: z.number(),
        newPassword: z.string().min(8),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const user = await db
        .select()
        .from(users)
        .where(eq(users.id, input.userId))
        .limit(1);

      if (!user[0]) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      if (user[0].loginMethod !== "local") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Can only reset passwords for local users",
        });
      }

      // Hash new password
      const newPasswordHash = await bcrypt.hash(input.newPassword, 10);

      // Update password
      await db
        .update(users)
        .set({ passwordHash: newPasswordHash })
        .where(eq(users.id, input.userId));

      // Audit log
      await auditLog(ctx, "user.password_changed", {
        entityType: "user",
        entityId: input.userId,
        newValue: { resetByAdmin: ctx.user.id },
      });

      return { success: true };
    }),
});
