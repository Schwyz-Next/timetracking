import { drizzle } from "drizzle-orm/mysql2";
import { eq } from "drizzle-orm";
import { timeEntries, projects, categories, users } from "../drizzle/schema.ts";

const db = drizzle(process.env.DATABASE_URL);

// November 2025 time entries data
const entries = [
  { date: "2025-11-05", start: "08:00", end: "10:00", category: "NRP", description: "Company Data, CSEM" },
  { date: "2025-11-05", start: "10:30", end: "11:15", category: "GF", description: "Meeting sync" },
  { date: "2025-11-06", start: "13:00", end: "15:30", category: "NRP", description: "CSEM Update" },
  { date: "2025-11-11", start: "12:00", end: "19:00", category: "NRP", description: "CSEM Roadshow" },
  { date: "2025-11-12", start: "13:00", end: "19:50", category: "NRP", description: "CSEM Roadshow" },
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
    console.log("Starting November 2025 import...");
    
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
    
    console.log(`\nNovember 2025 import complete!`);
    console.log(`Imported: ${imported} entries`);
    console.log(`Skipped: ${skipped} entries`);
    
  } catch (error) {
    console.error("Import failed:", error);
    process.exit(1);
  }
  
  process.exit(0);
}

importEntries();
