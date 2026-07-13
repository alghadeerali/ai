import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

// Paths are relative to this package dir (lib/db); drizzle-kit runs with the
// package as cwd (via `pnpm --filter`). Keep them relative so drizzle-kit's
// `generate` command can read the migration journal without mangling absolute
// paths.
export default defineConfig({
  schema: "./src/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
