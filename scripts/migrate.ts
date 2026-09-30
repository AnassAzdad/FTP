import "dotenv/config";
import { readFileSync } from "node:fs";
import { Client } from "pg";

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  await client.query(readFileSync("db/schema.sql", "utf8"));
  await client.end();
  console.log("Schema applied.");
}
main().catch((e) => { console.error(e); process.exit(1); });
