import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

type Payload = {
  category: string;
  body: string;
  company?: string;
};

export async function POST(request: Request) {
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