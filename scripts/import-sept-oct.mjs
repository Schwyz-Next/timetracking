import { drizzle } from "drizzle-orm/mysql2";
import { eq } from "drizzle-orm";
import { timeEntries, projects, categories, users } from "../drizzle/schema.ts";

const db = drizzle(process.env.DATABASE_URL);

// Time entries data
const entries = [
  { date: "2025-09-09", start: "15:00", end: "22:00", category: "GF", description: "Hohle Gasse KI Event" },
  { date: "2025-09-10", start: "09:00", end: "09:30", category: "GF", description: "Kt. Schwyz DT" },
  { date: "2025-09-10", start: "12:45", end: "17:45", category: "GF", description: "SN Andy" },
  { date: "2025-09-10", start: "08:00", end: "09:00", category: "NRP", description: "CSEM" },
  { date: "2025-09-15", start: "09:00", end: "10:30", category: "GF", description: "Ops meeting" },
  { date: "2025-09-15", start: "11:00", end: "15:00", category: "GF", description: "Requirements GMI Scope" },
  { date: "2025-09-16", start: "10:00", end: "11:00", category: "GF", description: "CSEM, Meetings MarKom" },
  { date: "2025-09-16", start: "14:00", end: "18:00", category: "GF", description: "Hackathon mit Kt. Schwyz" },
  { date: "2025-09-17", start: "13:00", end: "14:00", category: "GF", description: "GMI, FHNW" },
  { date: "2025-09-18", start: "15:00", end: "18:00", category: "GF", description: "Hackathon" },
  { date: "2025-09-18", start: "18:00", end: "21:00", category: "NRP", description: "CSEM" },
  { date: "2025-09-22", start: "09:00", end: "10:30", category: "GF", description: "Koordination Meetings" },
  { date: "2025-09-24", start: "16:00", end: "18:00", category: "GF", description: "Tage des Gründes vorbereiten" },
  { date: "2025-09-25", start: "08:00", end: "09:30", category: "GF", description: "Sync Elisabeth + Event prep" },
  { date: "2025-09-25", start: "12:00", end: "19:00", category: "SU", description: "Tag des Gründes" },
  { date: "2025-09-25", start: "19:00", end: "21:00", category: "GF", description: "Tag des Gründes" },
  { date: "2025-09-28", start: "07:30", end: "08:30", category: "GF", description: "Tag des Gründen Blogbeitrag" },
  { date: "2025-09-28", start: "14:00", end: "16:00", category: "NRP", description: "Sichtung Nachhaltigkeits Unterlagen" },
  { date: "2025-09-29", start: "10:00", end: "15:30", category: "GF", description: "Meetings FHNW GMI, Unterlagen vorbereiten" },
  { date: "2025-09-29", start: "16:00", end: "20:30", category: "GF", description: "Webinar, Vorbereitung, Blog post" },
  { date: "2025-09-29", start: "21:59", end: "23:59", category: "GF", description: "Tag des Gründes - Rückblick" },
  { date: "2025-09-30", start: "11:30", end: "12:45", category: "NRP", description: "Sync Elisabeth + Event prep" },
  { date: "2025-09-30", start: "06:00", end: "08:00", category: "NRP", description: "Vorbereitung und Anpasungen" },
  { date: "2025-10-30", start: "16:00", end: "19:00", category: "GF", description: "Sichtung und Beurteilung Startups ImR + com" },
];

// Calculate duration in hours (stored as integer * 100)
function calculateDuration(startTime, endTime) {
  const [startHour, startMin] = startTime.split(":").map(Number);
  const [endHour, endMin] = endTime.split(":").map(Number);
  
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  
  const durationMinutes = endMinutes >= startMinutes
    ? endMinutes - startMinutes
    : 24 * 60 - startMinutes + endMinutes;
  
  return Math.round((durationMinutes / 60) * 100);
}

async function importEntries() {
  try {
    console.log("Starting import...");
    
    // Get the admin user (first user)
    const userList = await db.select().from(users).limit(1);
    if (!userList[0]) {
      throw new Error("No users found in database");
    }
    const userId = userList[0].id;
    console.log(`Using user ID: ${userId}`);
    
    // Get all projects and categories
    const allProjects = await db.select().from(projects);
    const allCategories = await db.select().from(categories);
    
    console.log(`Found ${allProjects.length} projects and ${allCategories.length} categories`);
    
    // Map category codes to IDs
    const categoryMap = {};
    allCategories.forEach(cat => {
      categoryMap[cat.code] = cat.id;
    });
    
    // Find the "Geschäftsführung" project (for GF entries)
    const gfProject = allProjects.find(p => p.name.includes("Geschäftsführung"));
    const nrpProject = allProjects.find(p => p.name.includes("NRP"));
    const suProject = allProjects.find(p => p.name.includes("Tag des Gründes") || p.name.includes("SU"));
    
    if (!gfProject) {
      console.error("Could not find Geschäftsführung project");
      return;
    }
    
    console.log(`Using project IDs: GF=${gfProject.id}, NRP=${nrpProject?.id}, SU=${suProject?.id}`);
    
    let imported = 0;
    let skipped = 0;
    
    for (const entry of entries) {
      // Determine project based on category
      let projectId;
      if (entry.category === "GF") {
        projectId = gfProject.id;
      } else if (entry.category === "NRP") {
        projectId = nrpProject?.id || gfProject.id;
      } else if (entry.category === "SU") {
        projectId = suProject?.id || gfProject.id;
      } else {
        projectId = gfProject.id; // Default to GF project
      }
      
      // Get category ID
      const categoryId = categoryMap[entry.category];
      if (!categoryId) {
        console.warn(`Category ${entry.category} not found, skipping entry`);
        skipped++;
        continue;
      }
      
      // Calculate duration
      const durationHours = calculateDuration(entry.start, entry.end);
      
      // Insert entry
      try {
        await db.insert(timeEntries).values({
          userId,
          projectId,
          categoryId,
          date: new Date(entry.date),
          startTime: entry.start,
          endTime: entry.end,
          durationHours,
          description: entry.description,
          kilometers: null,
        });
        
        imported++;
        console.log(`✓ Imported: ${entry.date} ${entry.start}-${entry.end} ${entry.category} - ${entry.description}`);
      } catch (error) {
        console.error(`✗ Failed to import entry: ${entry.date} - ${error.message}`);
        skipped++;
      }
    }
    
    console.log(`\nImport complete!`);
    console.log(`Imported: ${imported} entries`);
    console.log(`Skipped: ${skipped} entries`);
    
  } catch (error) {
    console.error("Import failed:", error);
    process.exit(1);
  }
  
  process.exit(0);
}

importEntries();
