import { drizzle } from "drizzle-orm/mysql2";
import { mysqlTable, int, varchar } from "drizzle-orm/mysql-core";

const testTable = mysqlTable("invoices", {
  id: int("id").autoincrement().primaryKey(),
  invoiceNumber: varchar("invoiceNumber", { length: 50 }),
});

const db = drizzle(process.env.DATABASE_URL);

const result = await db.insert(testTable).values({
  invoiceNumber: "TEST-001"
});

console.log("Result type:", typeof result);
console.log("Result:", JSON.stringify(result, (key, value) =>
  typeof value === 'bigint' ? value.toString() : value
, 2));
console.log("insertId:", result.insertId);
console.log("insertId type:", typeof result.insertId);

// Clean up
await db.delete(testTable).where({ invoiceNumber: "TEST-001" });
