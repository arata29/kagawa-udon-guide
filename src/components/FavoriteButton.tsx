"use client";

import { useMemo, useSyncExternalStore } from "react";

const STORAGE_KEY = "udon_favorites";
const FAVORITES_CHANGED_EVENT = "udon-favorites-changed";
const RECENT_STORAGE_KEY = "udon_recently_viewed";
const RECENT_CHANGED_EVENT = "udon-recently-viewed-changed";

export type FavoriteItem = {
  placeId: string;
  name: string;
  addedAt: number;
  lastViewedAt: number | null;
  note: string;
};

type FavoritesStore = {
  version: 2;
  ids: string[];
  meta: Record<
    string,
    { name: string; addedAt: number; lastViewedAt?: number | null; note?: string }
  >;
};

type RecentlyViewedStore = {
  version: 1;
  items: Array<{ placeId: string; name: string; viewedAt: number }>;
};

const EMPTY_STORE: FavoritesStore = {
  version: 2,
  ids: [],
  meta: {},
};

const EMPTY_RECENT_STORE: RecentlyViewedStore = {
  version: 1,
  items: [],
};

function readStore(): FavoritesStore {
  if (typeof window === "undefined") {
    return EMPTY_STORE;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_STORE;
    return parseFavoritesStore(JSON.parse(raw));
  } catch {
    return EMPTY_STORE;
  }
}

function readRecentStore(): RecentlyViewedStore {
  if (typeof window === "undefined") {
    return EMPTY_RECENT_STORE;
  }
  try {
    const raw = localStorage.getItem(RECENT_STORAGE_KEY);
    if (!raw) return EMPTY_RECENT_STORE;
    return parseRecentlyViewedStore(JSON.parse(raw));
  } catch {
    return EMPTY_RECENT_STORE;
  }
}

function readStoreFromSnapshot(snapshot: string | null): FavoritesStore {
  if (!snapshot) return EMPTY_STORE;
  try {
    return parseFavoritesStore(JSON.parse(snapshot));
  } catch {
    return EMPTY_STORE;
  }
}

function readRecentStoreFromSnapshot(snapshot: string | null): RecentlyViewedStore {
  if (!snapshot) return EMPTY_RECENT_STORE;
  try {
    return parseRecentlyViewedStore(JSON.parse(snapshot));
  } catch {
    return EMPTY_RECENT_STORE;
  }
}

function parseFavoritesStore(value: unknown): FavoritesStore {
  if (!value || typeof value !== "object") return EMPTY_STORE;
  const source = value as {
    ids?: unknown;
    meta?: unknown;
  };

  const ids = Array.isArray(source.ids)
    ? Array.from(
        new Set(
          source.ids
            .filter((item): item is string => typeof item === "string")
            .map((item) => item.trim())
            .filter(Boolean)
        )
      )
    : [];

  const metaSource =
    source.meta && typeof source.meta === "object"
      ? (source.meta as Record<string, unknown>)
      : {};
  const meta: FavoritesStore["meta"] = {};
  const now = Date.now();
  for (const id of ids) {
    const raw = metaSource[id];
    const name =
      raw && typeof raw === "object" && typeof (raw as { name?: unknown }).name === "string"
        ? (raw as { name: string }).name.trim() || id
        : id;
    const addedAt =
      raw && typeof raw === "object" && Number.isFinite((raw as { addedAt?: unknown }).addedAt)
        ? Number((raw as { addedAt: unknown }).addedAt)
        : now;
    const lastViewedAt =
      raw &&
      typeof raw === "object" &&
      Number.isFinite((raw as { lastViewedAt?: unknown }).lastViewedAt)
        ? Number((raw as { lastViewedAt: unknown }).lastViewedAt)
        : null;
    const note =
      raw && typeof raw === "object" && typeof (raw as { note?: unknown }).note === "string"
        ? (raw as { note: string }).note.trim().slice(0, 300)
        : "";
    meta[id] = { name, addedAt, lastViewedAt, note };
  }

  return {
    version: 2,
    ids,
    meta,
  };
}

function parseRecentlyViewedStore(value: unknown): RecentlyViewedStore {
  if (!value || typeof value !== "object") return EMPTY_RECENT_STORE;
  const source = value as {
    items?: unknown;
  };
  const itemsRaw = Array.isArray(source.items) ? source.items : [];
  const deduped = new Map<string, { placeId: string; name: string; viewedAt: number }>();
  for (const item of itemsRaw) {
    if (!item || typeof item !== "object") continue;
    const placeId = typeof (item as { placeId?: unknown }).placeId === "string"
      ? (item as { placeId: string }).placeId.trim()
      : "";
    if (!placeId) continue;
    const name = typeof (item as { name?: unknown }).name === "string"
      ? (item as { name: string }).name.trim() || placeId
      : placeId;
    const viewedAt = Number((item as { viewedAt?: unknown }).viewedAt);
    if (!Number.isFinite(viewedAt)) continue;
    const prev = deduped.get(placeId);
    if (!prev || viewedAt > prev.viewedAt) {
      deduped.set(placeId, { placeId, name, viewedAt });
    }
  }
  return {
    version: 1,
    items: Array.from(deduped.values())
      .sort((a, b) => b.viewedAt - a.viewedAt)
      .slice(0, 30),
  };
}

function writeStore(store: FavoritesStore): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  window.dispatchEvent(new Event(FAVORITES_CHANGED_EVENT));
}

function writeRecentStore(store: RecentlyViewedStore): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(store));
  window.dispatchEvent(new Event(RECENT_CHANGED_EVENT));
}

function subscribeStorage(
  key: string,
  customEvent: string,
  onStoreChange: () => void
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const onStorage = (event: StorageEvent) => {
    if (event.key === key) {
      onStoreChange();
    }
  };

  window.addEventListener("storage", onStorage);
  window.addEventListener(customEvent, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(customEvent, onStoreChange);
  };
}

function subscribeFavorites(onStoreChange: () => void): () => void {
  return subscribeStorage(STORAGE_KEY, FAVORITES_CHANGED_EVENT, onStoreChange);
}

function subscribeRecentlyViewed(onStoreChange: () => void): () => void {
  return subscribeStorage(RECENT_STORAGE_KEY, RECENT_CHANGED_EVENT, onStoreChange);
}

function toFavoriteItems(store: FavoritesStore): FavoriteItem[] {
  return store.ids.map((id) => ({
    placeId: id,
    name: store.meta[id]?.name ?? id,
    addedAt: store.meta[id]?.addedAt ?? 0,
    lastViewedAt: store.meta[id]?.lastViewedAt ?? null,
    note: store.meta[id]?.note ?? "",
  }));
}

export function getFavorites(): Array<{ placeId: string; name: string }> {
  const store = readStore();
  return toFavoriteItems(store).map(({ placeId, name }) => ({ placeId, name }));
}

export function getFavoriteItems(): FavoriteItem[] {
  return toFavoriteItems(readStore());
}

export function useFavorites(): Array<{ placeId: string; name: string }> {
  return useFavoriteItems().map(({ placeId, name }) => ({ placeId, name }));
}

export function useFavoriteItems(): FavoriteItem[] {
  const snapshot = useSyncExternalStore(
    subscribeFavorites,
    () => (typeof window === "undefined" ? null : localStorage.getItem(STORAGE_KEY)),
    () => null
  );
  const store = useMemo(() => readStoreFromSnapshot(snapshot), [snapshot]);
  return useMemo(() => toFavoriteItems(store), [store]);
}

export function updateFavoriteNote(placeId: string, note: string): void {
  const trimmedId = placeId.trim();
  if (!trimmedId) return;
  const store = readStore();
  if (!store.ids.includes(trimmedId)) return;
  const current = store.meta[trimmedId];
  if (!current) return;
  store.meta[trimmedId] = {
    ...current,
    note: note.trim().slice(0, 300),
  };
  writeStore(store);
}

export function markRecentlyViewed(placeId: string, name: string): void {
  const trimmedId = placeId.trim();
  if (!trimmedId) return;
  const trimmedName = name.trim() || trimmedId;
  const viewedAt = Date.now();

  const recentStore = readRecentStore();
  const nextItems = [
    { placeId: trimmedId, name: trimmedName, viewedAt },
    ...recentStore.items.filter((item) => item.placeId !== trimmedId),
  ].slice(0, 30);
  writeRecentStore({ version: 1, items: nextItems });

  const favoriteStore = readStore();
  if (favoriteStore.ids.includes(trimmedId) && favoriteStore.meta[trimmedId]) {
    favoriteStore.meta[trimmedId] = {
      ...favoriteStore.meta[trimmedId],
      name: trimmedName,
      lastViewedAt: viewedAt,
    };
    writeStore(favoriteStore);
  }
}

export function useRecentlyViewed(maxItems = 10) {
  const snapshot = useSyncExternalStore(
    subscribeRecentlyViewed,
    () =>
      typeof window === "undefined" ? null : localStorage.getItem(RECENT_STORAGE_KEY),
    () => null
  );
  const store = useMemo(() => readRecentStoreFromSnapshot(snapshot), [snapshot]);
  return useMemo(() => store.items.slice(0, maxItems), [store, maxItems]);
}

type Props = {
  placeId: string;
  name: string;
  className?: string;
  /** お気に入り解除時に呼ばれるコールバック（FavoritesList での即時削除用） */
  onToggleOff?: () => void;
};

export default function FavoriteButton({ placeId, name, className, onToggleOff }: Props) {
  const favorites = useFavoriteItems();
  const isFavorite = favorites.some((item) => item.placeId === placeId);

  const handleToggle = () => {
    const store = readStore();
    if (store.ids.includes(placeId)) {
      store.ids = store.ids.filter((id) => id !== placeId);
      delete store.meta[placeId];
      onToggleOff?.();
    } else {
      store.ids = [placeId, ...store.ids];
      store.meta[placeId] = {
        name,
        addedAt: Date.now(),
        lastViewedAt: null,
        note: "",
      };
    }
    writeStore(store);
  };

  return (
    <button
      type="button"
      className={`fav-button${isFavorite ? " fav-button--active" : ""}${className ? ` ${className}` : ""}`}
      aria-label={isFavorite ? `${name}をお気に入りから削除` : `${name}をお気に入りに追加`}
      aria-pressed={isFavorite}
      onClick={handleToggle}
    >
      <HeartIcon filled={isFavorite} />
      {isFavorite ? "お気に入り済み" : "お気に入り"}
    </button>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}
