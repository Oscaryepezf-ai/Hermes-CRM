import { defineConfig } from "prisma/config";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

export default defineConfig({
  schema: "./prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL ?? "postgresql://placeholder:placeholder@localhost:5432/placeholder",
  },
  migrations: {
    seed: "npx ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts",
  },
});
