import PDFDocument from "pdfkit";


export interface TimeEntry {
  date: Date;
  projectName: string;
  categoryName: string;
  hours: number;
  startTime: string | null;
  endTime: string | null;
  description: string | null;
}

export interface ProjectSummary {
  projectName: string;
  totalHours: number;
  entryCount: number;
  percentage: number;
}

export interface ReportData {
  userName: string;
  userEmail: string | null;
  month: string; // e.g., "October 2025"
  totalHours: number;
  entryCount: number;
  projectSummaries: ProjectSummary[];
  entries: TimeEntry[];
}

export function generateTimeReportPDF(data: ReportData) {
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 50, bottom: 50, left: 50, right: 50 },
  });

  // Colors matching Schwyz Next branding
  const darkBlue = "#2C3E50";
  const cyan = "#00D9FF";
  const gray = "#7F8C8D";
  const lightGray = "#ECF0F1";

  // Header
  doc
    .fontSize(24)
    .fillColor(darkBlue)
    .text("Schwyz Next", { continued: true })
    .fillColor(cyan)
    .text("_");

  doc.moveDown(0.5);
  doc
    .fontSize(20)
    .fillColor(darkBlue)
    .text("Monthly Time Report");

  doc.moveDown(0.3);
  doc
    .fontSize(10)
    .fillColor(gray)
    .text(`Period: ${data.month}`)
    .text(`Generated for: ${data.userName}`)
    .text(`Generated on: ${new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })}`);

  doc.moveDown(1);

  // Executive Summary
  doc
    .fontSize(14)
    .fillColor(darkBlue)
    .text("Executive Summary");

  doc.moveDown(0.5);

  // Summary box
  const summaryY = doc.y;
  doc
    .rect(50, summaryY, 495, 80)
    .fillAndStroke(lightGray, darkBlue);

  doc
    .fontSize(10)
    .fillColor(darkBlue)
    .text(`Total Hours: ${data.totalHours.toFixed(2)}h`, 70, summaryY + 15)
    .text(`Number of Entries: ${data.entryCount}`, 70, summaryY + 35)
    .text(`Number of Projects: ${data.projectSummaries.length}`, 70, summaryY + 55);

  doc.y = summaryY + 95;
  doc.moveDown(0.5);

  // Project Breakdown
  doc
    .fontSize(12)
    .fillColor(darkBlue)
    .text("Project Breakdown");

  doc.moveDown(0.3);

  data.projectSummaries.forEach((project) => {
    doc
      .fontSize(10)
      .fillColor(darkBlue)
      .text(
        `${project.projectName}: ${project.totalHours.toFixed(2)}h (${project.percentage.toFixed(1)}%) - ${project.entryCount} ${project.entryCount === 1 ? "entry" : "entries"}`
      );
  });

  doc.moveDown(1);

  // Detailed Entries
  doc
    .fontSize(14)
    .fillColor(darkBlue)
    .text("Detailed Time Entries");

  doc.moveDown(0.5);

  // Table header
  const tableTop = doc.y;
  const colWidths = {
    date: 70,
    project: 100,
    category: 60,
    duration: 80,
    description: 185,
  };

  doc
    .fontSize(9)
    .fillColor("white");

  // Header background
  doc
    .rect(50, tableTop, 495, 20)
    .fill(darkBlue);

  // Header text
  let x = 55;
  doc.text("Date", x, tableTop + 6);
  x += colWidths.date;
  doc.text("Project", x, tableTop + 6);
  x += colWidths.project;
  doc.text("Category", x, tableTop + 6);
  x += colWidths.category;
  doc.text("Duration", x, tableTop + 6);
  x += colWidths.duration;
  doc.text("Description", x, tableTop + 6);

  doc.y = tableTop + 25;

  // Table rows
  let currentY = doc.y;
  let rowIndex = 0;

  data.entries.forEach((entry) => {
    // Check if we need a new page
    if (currentY > 700) {
      doc.addPage();
      currentY = 50;
    }

    // Alternate row colors
    const rowBg = rowIndex % 2 === 0 ? "white" : lightGray;
    doc
      .rect(50, currentY, 495, 20)
      .fill(rowBg);

    doc.fillColor(darkBlue);

    x = 55;
    const dateStr = entry.date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    doc.text(dateStr, x, currentY + 6);

    x += colWidths.date;
    doc.text(entry.projectName, x, currentY + 6, { width: colWidths.project - 5 });

    x += colWidths.project;
    doc.text(entry.categoryName, x, currentY + 6, { width: colWidths.category - 5 });

    x += colWidths.category;
    const timeRange = entry.startTime && entry.endTime
      ? `${entry.startTime}-${entry.endTime}`
      : `${entry.hours.toFixed(2)}h`;
    doc.text(timeRange, x, currentY + 6);

    x += colWidths.duration;
    const desc = entry.description || "-";
    doc.text(desc, x, currentY + 6, { width: colWidths.description - 5 });

    currentY += 20;
    rowIndex++;
  });

  // Footer
  const pageRange = doc.bufferedPageRange();
  const pageCount = pageRange.count;
  const startPage = pageRange.start;
  
  for (let i = 0; i < pageCount; i++) {
    doc.switchToPage(startPage + i);
    doc
      .fontSize(8)
      .fillColor(gray)
      .text(
        `Page ${i + 1} of ${pageCount}`,
        50,
        doc.page.height - 30,
        { align: "center" }
      );
  }

  doc.end();

  return doc;
}
