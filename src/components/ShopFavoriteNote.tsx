"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  updateFavoriteNote,
  useFavoriteItems,
} from "@/components/FavoriteButton";

type Props = {
  placeId: string;
};

export default function ShopFavoriteNote({ placeId }: Props) {
  const favorites = useFavoriteItems();
  const [saved, setSaved] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const item = useMemo(
    () => favorites.find((fav) => fav.placeId === placeId),
    [favorites, placeId]
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  if (!item) return null;

  return (
    <div className="app-card mt-6">
      <h2 className="text-sm font-semibold mb-2">お気に入りメモ</h2>
      <textarea
        className="w-full text-sm"
        rows={3}
        maxLength={300}
        defaultValue={item.note}
        placeholder="この店舗のメモ（例: 朝うどん向き / だし濃いめ）"
        onBlur={(event) => {
          updateFavoriteNote(placeId, event.currentTarget.value);
          setSaved(true);
          if (timerRef.current) clearTimeout(timerRef.current);
          timerRef.current = setTimeout(() => setSaved(false), 2000);
        }}
      />
      <div className="mt-2 flex items-center justify-between gap-2">
        <p className="text-xs app-muted">300文字まで保存できます。</p>
        {saved && (
          <span className="text-xs app-badge app-badge--soft">保存しました</span>
        )}
      </div>
    </div>
  );
}
