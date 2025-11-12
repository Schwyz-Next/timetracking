#!/usr/bin/env node
/**
 * Database Restore Script
 * Restores data from a JSON backup file to the database
 * 
 * Usage: node scripts/restore-db.mjs [backup-file.json]
 *        node scripts/restore-db.mjs (uses latest.json)
 */

import { drizzle } from "drizzle-orm/mysql2";
import { users, projects, categories, timeEntries, invoices, invoiceItems } from "../drizzle/schema.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function restoreDatabase() {
  console.log("🔄 Starting database restore...");
  
  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL environment variable is not set");
    process.exit(1);
  }

  const db = drizzle(process.env.DATABASE_URL);
  const backupDir = path.join(__dirname, "../backups");

  // Determine which backup file to use
  const backupFile = process.argv[2] 
    ? path.join(backupDir, process.argv[2])
    : path.join(backupDir, "latest.json");

  if (!fs.existsSync(backupFile)) {
    console.error(`❌ Backup file not found: ${backupFile}`);
    console.log("\n💡 Available backups:");
    if (fs.existsSync(backupDir)) {
      const files = fs.readdirSync(backupDir).filter(f => f.endsWith('.json'));
      files.forEach(f => console.log(`   - ${f}`));
    }
    process.exit(1);
  }

  try {
    console.log(`📂 Reading backup from: ${backupFile}`);
    const backupData = JSON.parse(fs.readFileSync(backupFile, "utf-8"));

    console.log(`\n📊 Backup Info:`);
    console.log(`   Version: ${backupData.version}`);
    console.log(`   Timestamp: ${backupData.timestamp}`);
    console.log(`   Total records: ${Object.values(backupData.stats).reduce((a, b) => a + b, 0)}`);

    console.log("\n⚠️  WARNING: This will replace ALL existing data in the database!");
    console.log("Press Ctrl+C to cancel, or wait 5 seconds to continue...\n");
    
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log("🗑️  Clearing existing data...");
    // Delete in correct order to respect foreign key constraints
    await db.delete(invoiceItems);
    await db.delete(invoices);
    await db.delete(timeEntries);
    await db.delete(categories);
    await db.delete(projects);
    // Note: We don't delete users to preserve OAuth data

    console.log("📥 Restoring data...");

    // Restore categories first (no dependencies)
    if (backupData.tables.categories.length > 0) {
      await db.insert(categories).values(backupData.tables.categories);
      console.log(`   ✓ Restored ${backupData.tables.categories.length} categories`);
    }

    // Restore projects (no dependencies except users)
    if (backupData.tables.projects.length > 0) {
      await db.insert(projects).values(backupData.tables.projects);
      console.log(`   ✓ Restored ${backupData.tables.projects.length} projects`);
    }

    // Restore time entries (depends on projects, categories, users)
    if (backupData.tables.timeEntries.length > 0) {
      await db.insert(timeEntries).values(backupData.tables.timeEntries);
      console.log(`   ✓ Restored ${backupData.tables.timeEntries.length} time entries`);
    }

    // Restore invoices (depends on users)
    if (backupData.tables.invoices.length > 0) {
      await db.insert(invoices).values(backupData.tables.invoices);
      console.log(`   ✓ Restored ${backupData.tables.invoices.length} invoices`);
    }

    // Restore invoice items (depends on invoices, projects)
    if (backupData.tables.invoiceItems.length > 0) {
      await db.insert(invoiceItems).values(backupData.tables.invoiceItems);
      console.log(`   ✓ Restored ${backupData.tables.invoiceItems.length} invoice items`);
    }

    console.log("\n✨ Database restore completed successfully!");
    console.log("\n💡 Note: User accounts are preserved to maintain OAuth authentication.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Restore failed:", error);
    process.exit(1);
  }
}

restoreDatabase();
