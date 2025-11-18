import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { timeEntries, projects, categories } from "../../drizzle/schema";
import { and, eq, gte, lte } from "drizzle-orm";
import { generateTimeReportPDF, type ReportData, type TimeEntry, type ProjectSummary } from "../utils/pdfGenerator";

export const timeReportsRouter = router({
  exportMonthlyPDF: protectedProcedure
    .input(
      z.object({
        year: z.number(),
        month: z.number().min(1).max(12),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Calculate date range
      const startDate = new Date(input.year, input.month - 1, 1);
      const endDate = new Date(input.year, input.month, 0, 23, 59, 59);

      // Fetch time entries for the month
      const conditions = [
        gte(timeEntries.date, startDate),
        lte(timeEntries.date, endDate),
      ];

      // Non-admin users can only export their own entries
      if (ctx.user.role !== "admin") {
        conditions.push(eq(timeEntries.userId, ctx.user.id));
      }

      const entries = await db
        .select({
          entry: timeEntries,
          project: projects,
          category: categories,
        })
        .from(timeEntries)
        .leftJoin(projects, eq(timeEntries.projectId, projects.id))
        .leftJoin(categories, eq(timeEntries.categoryId, categories.id))
        .where(and(...conditions))
        .orderBy(timeEntries.date);

      if (entries.length === 0) {
        throw new Error("No time entries found for this period");
      }

      // Transform data for PDF generation
      const timeEntryData: TimeEntry[] = entries.map((e) => {
        const hourlyRate = e.project?.hourlyRate || 0;
        const hours = e.entry.durationHours;
        const cost = (hourlyRate * hours) / 100; // hourlyRate is stored in cents
        
        return {
          date: e.entry.date,
          projectName: e.project?.name || "Unknown",
          categoryName: e.category?.name || "Unknown",
          hours,
          startTime: e.entry.startTime,
          endTime: e.entry.endTime,
          description: e.entry.description,
          hourlyRate: hourlyRate / 100, // Convert cents to CHF
          cost,
        };
      });

      // Calculate project summaries
      const projectMap = new Map<string, { hours: number; count: number }>();
      let totalHours = 0;

      timeEntryData.forEach((entry) => {
        totalHours += entry.hours;
        const existing = projectMap.get(entry.projectName) || { hours: 0, count: 0 };
        projectMap.set(entry.projectName, {
          hours: existing.hours + entry.hours,
          count: existing.count + 1,
        });
      });

      const projectSummaries: ProjectSummary[] = Array.from(projectMap.entries())
        .map(([projectName, data]) => ({
          projectName,
          totalHours: data.hours,
          entryCount: data.count,
          percentage: (data.hours / totalHours) * 100,
        }))
        .sort((a, b) => b.totalHours - a.totalHours);

      // Format month name
      const monthName = new Date(input.year, input.month - 1).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });

      const reportData: ReportData = {
        userName: ctx.user.name || "Unknown User",
        userEmail: ctx.user.email,
        month: monthName,
        totalHours,
        entryCount: entries.length,
        projectSummaries,
        entries: timeEntryData,
      };

      // Generate PDF
      const pdfDoc = generateTimeReportPDF(reportData);

      // Convert stream to buffer
      const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
        const chunks: Buffer[] = [];
        pdfDoc.on('data', (chunk) => chunks.push(chunk));
        pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
        pdfDoc.on('error', reject);
      });

      // Return base64 encoded PDF
      return {
        pdf: pdfBuffer.toString("base64"),
        filename: `time-report-${input.year}-${String(input.month).padStart(2, "0")}.pdf`,
      };
    }),
});
