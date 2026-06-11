import path from "node:path";
import { defineConfig } from "prisma/config";

// Prisma 7 no longer auto-loads .env. Node 22 has process.loadEnvFile.
process.loadEnvFile?.(".env");

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    path: path.join("prisma", "migrations"),
  },
  // Used by migrate/introspect CLI commands. Runtime uses the adapter in lib/prisma.ts.
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
