import { drizzle } from 'drizzle-orm/node-postgres';
import { Client } from 'pg';
import * as schema from './schema';

export const createDbClient = (connectionString: string) => {
  const client = new Client({ connectionString });
  const db = drizzle(client, { schema });
  return { client, db };
};
