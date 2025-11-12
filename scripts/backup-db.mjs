#!/usr/bin/env node
/**
 * Database Backup Script
 * Exports all data from the database to JSON files for version control backup
 * 
 * Usage: node scripts/backup-db.mjs
 */

import { drizzle } from "drizzle-orm/mysql2";
import { users, projects, categories, timeEntries, invoices, invoiceItems } from "../drizzle/schema.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function backupDatabase() {
  console.log("🔄 Starting database backup...");
  
  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL environment variable is not set");
    process.exit(1);
  }

  const db = drizzle(process.env.DATABASE_URL);
  const backupDir = path.join(__dirname, "../backups");

  // Create backups directory if it doesn't exist
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupFile = path.join(backupDir, `backup-${timestamp}.json`);
  const latestFile = path.join(backupDir, "latest.json");

  try {
    // Fetch all data from tables
    console.log("📊 Fetching data from tables...");
    
    const [
      usersData,
      projectsData,
      categoriesData,
      timeEntriesData,
      invoicesData,
      invoiceItemsData,
    ] = await Promise.all([
      db.select().from(users),
      db.select().from(projects),
      db.select().from(categories),
      db.select().from(timeEntries),
      db.select().from(invoices),
      db.select().from(invoiceItems),
    ]);

    const backup = {
      version: "1.0",
      timestamp: new Date().toISOString(),
      tables: {
        users: usersData,
        projects: projectsData,
        categories: categoriesData,
        timeEntries: timeEntriesData,
        invoices: invoicesData,
        invoiceItems: invoiceItemsData,
      },
      stats: {
        users: usersData.length,
        projects: projectsData.length,
        categories: categoriesData.length,
        timeEntries: timeEntriesData.length,
        invoices: invoicesData.length,
        invoiceItems: invoiceItemsData.length,
      },
    };

    // Write timestamped backup
    fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));
    console.log(`✅ Backup saved to: ${backupFile}`);

    // Write latest backup (for easy access)
    fs.writeFileSync(latestFile, JSON.stringify(backup, null, 2));
    console.log(`✅ Latest backup updated: ${latestFile}`);

    // Print statistics
    console.log("\n📈 Backup Statistics:");
    console.log(`   Users: ${backup.stats.users}`);
    console.log(`   Projects: ${backup.stats.projects}`);
    console.log(`   Categories: ${backup.stats.categories}`);
    console.log(`   Time Entries: ${backup.stats.timeEntries}`);
    console.log(`   Invoices: ${backup.stats.invoices}`);
    console.log(`   Invoice Items: ${backup.stats.invoiceItems}`);

    console.log("\n✨ Database backup completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Backup failed:", error);
    process.exit(1);
  }
}

backupDatabase();
