import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.js';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });

export async function saveSummary(summaryObj) {
  return await db.insert(schema.summaries).values(summaryObj);
}

export async function getRecentSummaries(limit = 10) {
  return await db.select().from(schema.summaries).limit(limit);
}

export async function getSummaryByUrl(url) {
  return await db.select().from(schema.summaries).where(sql`url = ${url}`).limit(1);
}
