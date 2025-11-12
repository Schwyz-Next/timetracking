import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { categories, timeEntries } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export const categoriesRouter = router({
  // Get all categories
  list: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    return await db.select().from(categories);
  }),

  // Get a single category by ID
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const category = await db
        .select()
        .from(categories)
        .where(eq(categories.id, input.id))
        .limit(1);

      if (!category[0]) {
        throw new Error("Category not found");
      }

      return category[0];
    }),

  // Create a new category
  create: protectedProcedure
    .input(
      z.object({
        code: z.string().min(1).max(10),
        name: z.string().min(1),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const result = await db.insert(categories).values(input);

      return { id: Number((result as any).insertId) };
    }),

  // Update an existing category
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        code: z.string().min(1).max(10).optional(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { id, ...updateData } = input;

      await db.update(categories).set(updateData).where(eq(categories.id, id));

      return { success: true };
    }),

  // Delete a category
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Check if there are any time entries for this category
      const entries = await db
        .select()
        .from(timeEntries)
        .where(eq(timeEntries.categoryId, input.id))
        .limit(1);

      if (entries.length > 0) {
        throw new Error(
          "Cannot delete category with existing time entries."
        );
      }

      await db.delete(categories).where(eq(categories.id, input.id));

      return { success: true };
    }),

  // Seed default categories
  seedDefaults: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Check if user is admin
    if (ctx.user.role !== "admin") {
      throw new Error("Only admins can seed default categories");
    }

    const defaultCategories = [
      {
        code: "GF",
        name: "Geschäftsführung (Management)",
        description: "General management and leadership activities",
      },
      {
        code: "NRP",
        name: "NRP Projects",
        description: "New Regional Policy projects",
      },
      {
        code: "IC",
        name: "Innovationscoaching",
        description: "Innovation coaching activities",
      },
      {
        code: "IS",
        name: "Innoscouting",
        description: "Innovation scouting activities",
      },
      {
        code: "TP",
        name: "Tüftel Park",
        description: "Tüftel Park project activities",
      },
      {
        code: "SE",
        name: "Swiss Edition",
        description: "Swiss Edition project activities",
      },
      {
        code: "KI",
        name: "KI Projects",
        description: "Artificial Intelligence project activities",
      },
      {
        code: "SU",
        name: "Start-up Ökosystem",
        description: "Start-up ecosystem activities",
      },
    ];

    for (const category of defaultCategories) {
      try {
        await db.insert(categories).values(category);
      } catch (error) {
        // Ignore duplicate key errors
        console.log(`Category ${category.code} already exists, skipping`);
      }
    }

    return { success: true, count: defaultCategories.length };
  }),
});
