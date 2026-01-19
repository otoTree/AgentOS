import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/agentos';

// For migrations and queries
const client = postgres(connectionString);
export const db = drizzle(client, { schema });

export * from 'drizzle-orm';
export * from './schema';
