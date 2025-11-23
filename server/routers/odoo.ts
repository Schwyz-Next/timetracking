import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getOdooConfig, upsertOdooConfig } from "../db";
import { OdooClient } from "../utils/odooClient";

export const odooRouter = router({
  // Get current user's Odoo configuration
  getConfig: protectedProcedure.query(async ({ ctx }) => {
    const config = await getOdooConfig(ctx.user.id);
    
    // Don't expose API key in response
    if (config) {
      return {
        ...config,
        apiKey: "***" + config.apiKey.slice(-4), // Show only last 4 characters
      };
    }
    
    return null;
  }),

  // Test Odoo connection
  testConnection: protectedProcedure
    .input(
      z.object({
        odooUrl: z.string().url(),
        username: z.string().min(1),
        apiKey: z.string().min(1),
        database: z.string().min(1),
      })
    )
    .mutation(async ({ input }) => {
      const client = new OdooClient({
        url: input.odooUrl,
        username: input.username,
        database: input.database,
        apiKey: input.apiKey,
      });

      const result = await client.testConnection();
      return result;
    }),

  // Save Odoo configuration
  saveConfig: protectedProcedure
    .input(
      z.object({
        odooUrl: z.string().url(),
        username: z.string().min(1),
        apiKey: z.string().min(1),
        database: z.string().min(1),
        isActive: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Test connection first
      const client = new OdooClient({
        url: input.odooUrl,
        username: input.username,
        database: input.database,
        apiKey: input.apiKey,
      });

      const testResult = await client.testConnection();
      
      if (!testResult.success) {
        throw new Error(`Connection test failed: ${testResult.message}`);
      }

      // Save configuration
      await upsertOdooConfig({
        userId: ctx.user.id,
        odooUrl: input.odooUrl,
        username: input.username,
        apiKey: input.apiKey,
        database: input.database,
        isActive: input.isActive ?? 1,
        lastTestedAt: new Date(),
      });

      return {
        success: true,
        message: "Configuration saved successfully",
      };
    }),

  // Delete Odoo configuration
  deleteConfig: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await import("../db").then((m) => m.getDb());
    if (!db) {
      throw new Error("Database not available");
    }

    const { odooConfigurations } = await import("../../drizzle/schema");
    const { eq } = await import("drizzle-orm");
    
    await db.delete(odooConfigurations).where(eq(odooConfigurations.userId, ctx.user.id));

    return {
      success: true,
      message: "Configuration deleted successfully",
    };
  }),
});
