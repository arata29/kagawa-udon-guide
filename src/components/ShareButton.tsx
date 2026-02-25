"use client";

import { useState } from "react";

type Props = {
  url: string;
  title: string;
  text?: string;
  className?: string;
};

export default function ShareButton({ url, title, text, className }: Props) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ url, title, text });
      } catch {
        // ユーザーキャンセル等は無視
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard 不可の場合は何もしない
    }
  };

  return (
    <button
      type="button"
      className={`app-button app-button--ghost${copied ? " share-button--copied" : ""}${className ? ` ${className}` : ""}`}
      aria-label={copied ? "URLをコピーしました" : "この店舗をシェア"}
      onClick={handleShare}
    >
      {copied ? (
        <>
          <CheckIcon />
          コピーしました
        </>
      ) : (
        <>
          <ShareIcon />
          シェア
        </>
      )}
    </button>
  );
}

function ShareIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
