import { PrismaClient } from "@/generated/prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

function readRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`[prisma] Missing required environment variable: ${name}`);
  }
  return value;
}

function readIntEnv(name: string, fallback: number, min: number): number {
  const raw = process.env[name];
  if (raw == null || raw.trim() === "") return fallback;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < min) {
    throw new Error(
      `[prisma] Invalid environment variable: ${name}=${raw} (must be an integer >= ${min})`
    );
  }
  return parsed;
}

const DATABASE_URL = readRequiredEnv("DATABASE_URL");
const PG_POOL_MAX = readIntEnv("PG_POOL_MAX", 1, 1);
const PG_CONNECT_TIMEOUT_MS = readIntEnv("PG_CONNECT_TIMEOUT_MS", 10_000, 1);
const PRISMA_CONNECT_RETRIES = readIntEnv("PRISMA_CONNECT_RETRIES", 1, 0);
const PRISMA_CONNECT_RETRY_DELAY_MS = readIntEnv(
  "PRISMA_CONNECT_RETRY_DELAY_MS",
  400,
  0
);
const IS_SUPABASE = /supabase\.com/i.test(DATABASE_URL);

// dev のホットリロードで PrismaClient が増殖しないように global に保持
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg(
      new Pool({
        connectionString: DATABASE_URL,
        max: PG_POOL_MAX,
        idleTimeoutMillis: 30_000,
        connectionTimeoutMillis: PG_CONNECT_TIMEOUT_MS,
        keepAlive: true,
        ssl: IS_SUPABASE ? { rejectUnauthorized: false } : undefined,
      })
    ),
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isConnectTimeoutError(error: unknown) {
  return (
    error instanceof Error &&
    /timeout exceeded when trying to connect|connection terminated unexpectedly/i.test(
      error.message
    )
  );
}

export async function withPrismaConnectRetry<T>(
  run: () => Promise<T>
): Promise<T> {
  let lastError: unknown;
  const maxAttempts = Math.max(1, PRISMA_CONNECT_RETRIES + 1);

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await run();
    } catch (error) {
      lastError = error;
      if (!isConnectTimeoutError(error) || attempt >= maxAttempts) {
        throw error;
      }
      await sleep(PRISMA_CONNECT_RETRY_DELAY_MS * attempt);
    }
  }

  throw lastError;
}
