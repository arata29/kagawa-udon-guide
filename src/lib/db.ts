import { withPrismaConnectRetry } from "@/lib/prisma";

type DbSuccess<T> = {
  ok: true;
  data: T;
};

type DbFailure = {
  ok: false;
  error: unknown;
};

export type DbResult<T> = DbSuccess<T> | DbFailure;

export async function safeDbQuery<T>(
  label: string,
  run: () => Promise<T>
): Promise<DbResult<T>> {
  try {
    const data = await withPrismaConnectRetry(run);
    return { ok: true, data };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[db] ${label}: ${message}`);
    return { ok: false, error };
  }
}
