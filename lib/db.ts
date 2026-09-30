import { Pool, type QueryResultRow } from "pg";

const globalForPg = globalThis as unknown as { pgPool?: Pool };

export const pool =
  globalForPg.pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    // Hosted Postgres (Supabase etc.) requires TLS.
    ssl:
      process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : undefined,
    max: 10,
  });

if (process.env.NODE_ENV !== "production") globalForPg.pgPool = pool;

export async function query<T extends QueryResultRow = any>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const res = await pool.query<T>(text, params);
  return res.rows;
}

export async function queryOne<T extends QueryResultRow = any>(
  text: string,
  params: unknown[] = [],
): Promise<T | null> {
  return (await query<T>(text, params))[0] ?? null;
}
