import { PrismaClient } from "@/generated/prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const DATABASE_URL = process.env.DATABASE_URL!;
const PG_POOL_MAX = Number(process.env.PG_POOL_MAX ?? "1");

// dev のホットリロードで PrismaClient が増殖しないように global に保持
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg(
      new Pool({
        connectionString: DATABASE_URL,
        max: PG_POOL_MAX,              // ★ここが重要（1〜2推奨）
        idleTimeoutMillis: 10_000,
        connectionTimeoutMillis: 10_000,
      })
    ),
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;