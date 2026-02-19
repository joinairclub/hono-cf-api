import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

if (!process.env.MIGRATION_DATABASE_URL) {
  throw new Error('MIGRATION_DATABASE_URL is required for Drizzle migrations.');
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  strict: true,
  verbose: true,
  dbCredentials: {
    // Use migrator-admin-main direct connection (5432) for migrations.
    // Keep this in .env / CI secrets, never in source control.
    url: process.env.MIGRATION_DATABASE_URL,
  },
});
