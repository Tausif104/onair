import path from "node:path";
import { defineConfig } from "prisma/config";

// Load .env locally; on Vercel there's no .env (vars come from the platform),
// and process.loadEnvFile throws if the file is missing — so guard it.
try {
  process.loadEnvFile?.(".env");
} catch {
  // no local .env — fine
}

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    path: path.join("prisma", "migrations"),
  },
  // Used by migrate/introspect CLI. Runtime uses the adapter in lib/prisma.ts.
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
