import { drizzle } from "drizzle-orm/mysql2";
import { eq } from "drizzle-orm";
import { timeEntries, projects, categories, users } from "../drizzle/schema.ts";

const db = drizzle(process.env.DATABASE_URL);

// October 2025 time entries data
const entries = [
  { date: "2025-10-02", start: "09:00", end: "12:00", category: "GF", description: "Meetings, Emails, Impuslraum, Anpassungen" },
  { date: "2025-10-02", start: "13:15", end: "14:15", category: "NRP", description: "NRP KMU Tech bridge" },
  { date: "2025-10-06", start: "13:30", end: "17:00", category: "GF", description: "ITZ Persona / GMI sync, Beschreibung" },
  { date: "2025-10-09", start: "15:45", end: "17:30", category: "GF", description: "Mails" },
  { date: "2025-10-10", start: "14:00", end: "15:15", category: "NRP", description: "CSEM" },
  { date: "2025-10-10", start: "10:00", end: "11:30", category: "GF", description: "Mails, Follow ups" },
  { date: "2025-10-13", start: "09:00", end: "11:30", category: "GF", description: "Meetings, Emails, ImR, Anpassungen" },
  { date: "2025-10-13", start: "11:30", end: "12:30", category: "NRP", description: "comms CSEM" },
  { date: "2025-10-17", start: "09:00", end: "11:00", category: "GF", description: "Hackathon" },
  { date: "2025-10-17", start: "11:30", end: "15:00", category: "NRP", description: "CSEM" },
  { date: "2025-10-17", start: "09:00", end: "12:00", category: "GF", description: "Meetings" },
  { date: "2025-10-22", start: "09:00", end: "16:30", category: "GF", description: "GetLau., Hack, Domain, NS Issue, IT, Login Imo" },
  { date: "2025-10-23", start: "14:00", end: "16:00", category: "NRP", description: "CSEM, Mail, Speakers, .." },
  { date: "2025-10-23", start: "11:00", end: "11:45", category: "GF", description: "IPr coordination" },
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
    console.log("Starting October 2025 import...");
    
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
    
    if (!gfProject) {
      console.error("Could not find Geschäftsführung project");
      return;
    }
    
    console.log(`Using project IDs: GF=${gfProject.id}, NRP=${nrpProject?.id}`);
    
    let imported = 0;
    let skipped = 0;
    
    for (const entry of entries) {
      // Determine project based on category
      let projectId;
      if (entry.category === "GF") {
        projectId = gfProject.id;
      } else if (entry.category === "NRP") {
        projectId = nrpProject?.id || gfProject.id;
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
    
    console.log(`\nOctober 2025 import complete!`);
    console.log(`Imported: ${imported} entries`);
    console.log(`Skipped: ${skipped} entries`);
    
  } catch (error) {
    console.error("Import failed:", error);
    process.exit(1);
  }
  
  process.exit(0);
}

importEntries();
