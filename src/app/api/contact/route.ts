import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";
import { safeDbQuery } from "@/lib/db";

const ALLOWED_CATEGORIES = new Set([
  "掲載内容の修正",
  "不正情報の報告",
  "その他",
]);
const RATE_LIMIT_MAX_REQUESTS = 5;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

type Payload = {
  category: string;
  body: string;
  company?: string;
};

const globalForRateLimit = globalThis as unknown as {
  contactRateLimitTableReady?: boolean;
};

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return (
    request.headers.get("x-real-ip") ??
    request.headers.get("cf-connecting-ip") ??
    "unknown"
  );
}

async function ensureRateLimitTable(): Promise<boolean> {
  if (globalForRateLimit.contactRateLimitTableReady) return true;
  const result = await safeDbQuery("contact rate limit table init", () =>
    prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS contact_rate_limits (
        key TEXT PRIMARY KEY,
        count INTEGER NOT NULL,
        reset_at TIMESTAMPTZ NOT NULL
      )
    `)
  );
  if (!result.ok) return false;
  globalForRateLimit.contactRateLimitTableReady = true;
  return true;
}

async function consumeRateLimit(
  key: string
): Promise<{ limited: boolean; retryAfterSec: number }> {
  const ready = await ensureRateLimitTable();
  if (!ready) {
    return { limited: false, retryAfterSec: Math.ceil(RATE_LIMIT_WINDOW_MS / 1000) };
  }

  const now = new Date();
  const resetAt = new Date(now.getTime() + RATE_LIMIT_WINDOW_MS);
  const rowResult = await safeDbQuery("contact rate limit read", () =>
    prisma.$queryRaw<{ count: number; resetAt: Date }[]>`
      SELECT count, reset_at as "resetAt"
      FROM contact_rate_limits
      WHERE key = ${key}
      LIMIT 1
    `
  );
  if (!rowResult.ok) {
    return { limited: false, retryAfterSec: Math.ceil(RATE_LIMIT_WINDOW_MS / 1000) };
  }

  const current = rowResult.data[0];
  if (!current || current.resetAt.getTime() <= now.getTime()) {
    await safeDbQuery("contact rate limit upsert reset", () =>
      prisma.$executeRaw`
        INSERT INTO contact_rate_limits (key, count, reset_at)
        VALUES (${key}, 1, ${resetAt})
        ON CONFLICT (key)
        DO UPDATE SET count = 1, reset_at = ${resetAt}
      `
    );
    return { limited: false, retryAfterSec: Math.ceil(RATE_LIMIT_WINDOW_MS / 1000) };
  }

  if (current.count >= RATE_LIMIT_MAX_REQUESTS) {
    return {
      limited: true,
      retryAfterSec: Math.max(
        1,
        Math.ceil((current.resetAt.getTime() - now.getTime()) / 1000)
      ),
    };
  }

  await safeDbQuery("contact rate limit increment", () =>
    prisma.$executeRaw`
      UPDATE contact_rate_limits
      SET count = count + 1
      WHERE key = ${key}
    `
  );
  return {
    limited: false,
    retryAfterSec: Math.max(
      1,
      Math.ceil((current.resetAt.getTime() - now.getTime()) / 1000)
    ),
  };
}

export async function POST(request: Request) {
  let payload: Payload | null = null;
  try {
    payload = (await request.json()) as Payload;
  } catch {
    return NextResponse.json({ error: "入力内容が不正です。" }, { status: 400 });
  }

  const category = (payload?.category ?? "").trim();
  const body = (payload?.body ?? "").trim();
  const company = (payload?.company ?? "").trim();

  if (company) {
    return NextResponse.json({ ok: true });
  }

  if (!category || !body) {
    return NextResponse.json(
      { error: "必須項目が未入力です。" },
      { status: 400 }
    );
  }

  if (!ALLOWED_CATEGORIES.has(category)) {
    return NextResponse.json(
      { error: "お問い合わせ種別が不正です。" },
      { status: 400 }
    );
  }

  if (body.length > 5000) {
    return NextResponse.json(
      { error: "本文は5000文字以内で入力してください。" },
      { status: 400 }
    );
  }

  const clientIp = getClientIp(request);
  const { limited, retryAfterSec } = await consumeRateLimit(clientIp);
  if (limited) {
    return NextResponse.json(
      { error: "送信回数が多すぎます。時間をおいて再度お試しください。" },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfterSec),
        },
      }
    );
  }

  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT;
  const smtpSecure = process.env.SMTP_SECURE;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const fromEmail = process.env.SMTP_FROM ?? process.env.SMTP_USER;
  const toEmail = process.env.CONTACT_EMAIL;

  if (!smtpHost || !smtpPort || !smtpUser || !smtpPass || !toEmail) {
    return NextResponse.json(
      { error: "メール送信の設定が未完了です。" },
      { status: 500 }
    );
  }

  const subject = `【${category}】香川県うどんランキング お問い合わせ`;
  const text = [
    "香川県うどんランキング お問い合わせ",
    "",
    `種別: ${category}`,
    "",
    "内容:",
    body,
  ].join("\n");

  const port = Number(smtpPort);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    return NextResponse.json(
      { error: "メール送信の設定が未完了です。" },
      { status: 500 }
    );
  }
  const secure = smtpSecure ? smtpSecure === "true" || smtpSecure === "1" : port == 465;
  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port,
    secure,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  try {
    await transporter.sendMail({
      from: fromEmail,
      to: [toEmail],
      subject,
      text,
    });
  } catch {
    return NextResponse.json(
      { error: "送信に失敗しました。しばらくしてからお試しください。" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
