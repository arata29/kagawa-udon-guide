"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useRecentlyViewed } from "@/components/FavoriteButton";

type Props = {
  title?: string;
  maxItems?: number;
  excludePlaceId?: string;
};

export default function RecentlyViewedList({
  title = "最近見た店舗",
  maxItems = 8,
  excludePlaceId,
}: Props) {
  const recent = useRecentlyViewed(30);
  const dtf = useMemo(
    () => new Intl.DateTimeFormat("ja-JP", { dateStyle: "short", timeStyle: "short" }),
    []
  );
  const items = useMemo(
    () =>
      recent
        .filter((item) => !excludePlaceId || item.placeId !== excludePlaceId)
        .slice(0, maxItems),
    [excludePlaceId, maxItems, recent]
  );

  if (items.length === 0) return null;

  return (
    <section className="app-card">
      <h2 className="text-sm font-semibold mb-3">{title}</h2>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.placeId} className="flex items-center justify-between gap-2">
            <Link
              href={`/shops/${encodeURIComponent(item.placeId)}`}
              className="text-sm app-text hover:underline truncate"
            >
              {item.name}
            </Link>
            <span className="text-xs app-muted shrink-0">
              {dtf.format(new Date(item.viewedAt))}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
