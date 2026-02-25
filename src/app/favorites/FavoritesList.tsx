"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import FavoriteButton, {
  updateFavoriteNote,
  useFavoriteItems,
} from "@/components/FavoriteButton";

type SortKey = "added" | "name" | "recent";

export default function FavoritesList() {
  const items = useFavoriteItems();
  const [sortKey, setSortKey] = useState<SortKey>("added");
  const [savedMap, setSavedMap] = useState<Record<string, boolean>>({});
  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const dtf = useMemo(
    () => new Intl.DateTimeFormat("ja-JP", { dateStyle: "short", timeStyle: "short" }),
    []
  );
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const timer of Object.values(timers)) {
        clearTimeout(timer);
      }
    };
  }, []);

  const sortedItems = useMemo(() => {
    const list = [...items];
    if (sortKey === "name") {
      list.sort((a, b) => a.name.localeCompare(b.name, "ja"));
      return list;
    }
    if (sortKey === "recent") {
      list.sort((a, b) => (b.lastViewedAt ?? 0) - (a.lastViewedAt ?? 0));
      return list;
    }
    list.sort((a, b) => b.addedAt - a.addedAt);
    return list;
  }, [items, sortKey]);

  if (items.length === 0) {
    return (
      <div className="app-card text-center py-10">
        <p className="app-muted mb-4">お気に入りはまだありません。</p>
        <Link href="/list" className="app-button app-button--ghost">
          店舗一覧へ
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="app-card">
        <label className="text-xs app-muted block mb-1" htmlFor="favorite-sort">
          並び替え
        </label>
        <select
          id="favorite-sort"
          value={sortKey}
          onChange={(event) => setSortKey(event.currentTarget.value as SortKey)}
          className="w-full sm:w-auto"
        >
          <option value="added">追加が新しい順</option>
          <option value="recent">最近見た順</option>
          <option value="name">店名順</option>
        </select>
      </div>

      <ul className="space-y-3">
        {sortedItems.map((item) => (
          <li key={item.placeId} className="app-card">
            <div className="flex flex-col sm:flex-row sm:items-start gap-3">
              <div className="flex-1 min-w-0">
                <Link
                  href={`/shops/${encodeURIComponent(item.placeId)}`}
                  className="font-semibold app-text hover:underline truncate block"
                >
                  {item.name}
                </Link>
                <div className="mt-1 text-xs app-muted">
                  追加: {dtf.format(new Date(item.addedAt))}
                  {item.lastViewedAt ? ` / 最終閲覧: ${dtf.format(new Date(item.lastViewedAt))}` : ""}
                </div>
                <textarea
                  className="mt-2 w-full text-sm"
                  rows={2}
                  maxLength={300}
                  defaultValue={item.note}
                  placeholder="メモ（例: だし濃いめ / 駐車場あり）"
                  onBlur={(event) => {
                    updateFavoriteNote(item.placeId, event.currentTarget.value);
                    setSavedMap((prev) => ({ ...prev, [item.placeId]: true }));
                    const timer = timersRef.current[item.placeId];
                    if (timer) clearTimeout(timer);
                    timersRef.current[item.placeId] = setTimeout(() => {
                      setSavedMap((prev) => ({ ...prev, [item.placeId]: false }));
                    }, 2000);
                  }}
                />
                {savedMap[item.placeId] && (
                  <div className="mt-1 text-right">
                    <span className="text-xs app-badge app-badge--soft">保存しました</span>
                  </div>
                )}
              </div>
              <FavoriteButton placeId={item.placeId} name={item.name} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
