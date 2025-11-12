import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

// Test insert
const result = await db.execute(`
  INSERT INTO invoices (invoiceNumber, userId, month, year, recipientName, totalAmount, status)
  VALUES ('TEST-999', 1, 11, 2025, 'Test Recipient', 10000, 'draft')
`);

console.log("=== Raw Execute Result ===");
console.log("Type:", typeof result);
console.log("Result:", result);
console.log("Result[0]:", result[0]);
console.log("Result[0].insertId:", result[0]?.insertId);

// Clean up
await db.execute(`DELETE FROM invoices WHERE invoiceNumber = 'TEST-999'`);

await connection.end();
