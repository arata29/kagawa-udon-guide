"use client";

import { useState } from "react";

type FormState = "idle" | "sending" | "success" | "error";

type FormPayload = {
  category: string;
  body: string;
  company: string;
};

export default function ContactForm() {
  const [status, setStatus] = useState<FormState>("idle");
  const [message, setMessage] = useState<string>("");

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("sending");
    setMessage("");

    const form = event.currentTarget;
    const formData = new FormData(form);

    const payload: FormPayload = {
      category: String(formData.get("category") ?? "").trim(),
      body: String(formData.get("body") ?? "").trim(),
      company: String(formData.get("company") ?? "").trim(),
    };

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "送信に失敗しました。");
      }

      setStatus("success");
      setMessage("送信が完了しました。ありがとうございました。");
      form.reset();
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error ? error.message : "送信に失敗しました。"
      );
    }
  };

  return (
    <form className="mt-4 grid gap-3" onSubmit={onSubmit}>
      <select name="category" required defaultValue="">
        <option value="" disabled>
          お問い合わせ種別
        </option>
        <option value="掲載内容の修正">掲載内容の修正</option>
        <option value="不正情報の報告">不正情報の報告</option>
        <option value="その他">その他</option>
      </select>

      <input
        type="text"
        name="company"
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        aria-hidden="true"
      />

      <textarea
        name="body"
        placeholder="お問い合わせ内容"
        rows={6}
        required
      />

      <div className="flex flex-wrap items-center gap-2">
        <button
          className="app-button"
          type="submit"
          disabled={status === "sending"}
        >
          {status === "sending" ? "送信中..." : "送信する"}
        </button>
        {status !== "idle" && (
          <span
            className={
              status === "error" ? "app-error text-sm" : "app-muted text-sm"
            }
          >
            {message}
          </span>
        )}
      </div>
    </form>
  );
}