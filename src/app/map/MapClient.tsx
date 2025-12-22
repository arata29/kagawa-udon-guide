"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { MarkerClusterer } from "@googlemaps/markerclusterer";

type PlacePin = {
  placeId: string;
  name: string;
  address?: string | null;
  area?: string | null;
  lat: number;
  lng: number;
  rating?: number | null;
  userRatingCount?: number | null;
  googleMapsUri?: string | null;
};

const KAGAWA_CENTER = { lat: 34.2261, lng: 134.0183 };

let mapsLoader: Promise<void> | null = null;

function loadGoogleMaps(apiKey: string) {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.google?.maps) return Promise.resolve();
  if (mapsLoader) return mapsLoader;

  mapsLoader = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error("Google Maps の読み込みに失敗しました。"));
    document.head.appendChild(script);
  });

  return mapsLoader;
}

function buildMapsUrl(place: PlacePin) {
  return (
    place.googleMapsUri ??
    `https://www.google.com/maps?q=${place.lat},${place.lng}&z=16`
  );
}

function buildClusterIcon(count: number) {
  const size = count < 10 ? 36 : count < 30 ? 44 : 52;
  const color = count < 10 ? "#c96a2a" : count < 30 ? "#8a4a22" : "#4f2b14";
  const ring = "rgba(255, 248, 236, 0.9)";
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="${ring}"/>
      <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 4}" fill="${color}"/>
    </svg>
  `;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new window.google.maps.Size(size, size),
    anchor: new window.google.maps.Point(size / 2, size / 2),
  };
}

export default function MapClient({ places }: { places: PlacePin[] }) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const clustererRef = useRef<MarkerClusterer | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [area, setArea] = useState<string>("");
  const [sort, setSort] = useState<"reviews" | "rating">("reviews");
  const [minRating, setMinRating] = useState<string>("");
  const [minReviews, setMinReviews] = useState<string>("");
  const [sheetExpanded, setSheetExpanded] = useState<boolean>(false);
  const [locating, setLocating] = useState<boolean>(false);

  const areaOptions = useMemo(() => {
    const options = new Set<string>();
    places.forEach((p) => {
      const value = (p.area ?? "").trim();
      if (value) options.add(value);
    });
    return Array.from(options).sort();
  }, [places]);

  const filteredPlaces = useMemo(() => {
    let filtered = places;

    if (area) {
      filtered = filtered.filter((p) => (p.area ?? "").trim() === area);
    }

    const ratingThreshold = minRating.trim() === "" ? null : Number(minRating);
    if (ratingThreshold != null && !Number.isNaN(ratingThreshold)) {
      filtered = filtered.filter(
        (p) => p.rating != null && p.rating >= ratingThreshold
      );
    }

    const reviewThreshold = minReviews.trim() === "" ? null : Number(minReviews);
    if (reviewThreshold != null && !Number.isNaN(reviewThreshold)) {
      filtered = filtered.filter(
        (p) => p.userRatingCount != null && p.userRatingCount >= reviewThreshold
      );
    }

    const sorted = [...filtered].sort((a, b) => {
      const ratingA = a.rating ?? 0;
      const ratingB = b.rating ?? 0;
      const reviewsA = a.userRatingCount ?? 0;
      const reviewsB = b.userRatingCount ?? 0;
      if (sort === "rating") {
        if (ratingB !== ratingA) return ratingB - ratingA;
        if (reviewsB !== reviewsA) return reviewsB - reviewsA;
      } else {
        if (reviewsB !== reviewsA) return reviewsB - reviewsA;
        if (ratingB !== ratingA) return ratingB - ratingA;
      }
      return (a.name ?? "").localeCompare(b.name ?? "", "ja");
    });

    return sorted;
  }, [places, area, minRating, minReviews, sort]);

  useEffect(() => {
    if (!selectedId) return;
    const stillExists = filteredPlaces.some((p) => p.placeId === selectedId);
    if (!stillExists) setSelectedId(null);
  }, [filteredPlaces, selectedId]);

  useEffect(() => {
    if (!sheetExpanded) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSheetExpanded(false);
      }
      if (event.key === "Tab" && panelRef.current) {
        const focusable = panelRef.current.querySelectorAll<HTMLElement>(
          "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])"
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey) {
          if (document.activeElement === first) {
            last.focus();
            event.preventDefault();
          }
        } else if (document.activeElement === last) {
          first.focus();
          event.preventDefault();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
      "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])"
    );
    const first = focusable?.[0];
    if (first) {
      first.focus();
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [sheetExpanded]);

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      setError("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY が未設定です。");
      return;
    }

    Promise.all([loadGoogleMaps(apiKey), import("@googlemaps/markerclusterer")])
      .then(([, { MarkerClusterer }]) => {
        if (!mapRef.current || !window.google?.maps) return;

        const map =
          mapInstanceRef.current ??
          new window.google.maps.Map(mapRef.current, {
            center: KAGAWA_CENTER,
            zoom: 10,
            mapTypeControl: false,
          });

        mapInstanceRef.current = map;
        infoWindowRef.current =
          infoWindowRef.current ?? new window.google.maps.InfoWindow();

        markersRef.current.forEach((marker) => marker.setMap(null));
        markersRef.current = new Map();
        if (clustererRef.current) {
          clustererRef.current.clearMarkers();
        }

        const bounds = new window.google.maps.LatLngBounds();

        const markers = filteredPlaces.map((p) => {
          const position = { lat: p.lat, lng: p.lng };
          bounds.extend(position);

          const marker = new window.google.maps.Marker({
            position,
            title: p.name,
          });

          markersRef.current.set(p.placeId, marker);

          marker.addListener("click", () => {
            setSelectedId(p.placeId);
            openInfoWindow(p);
          });

          return marker;
        });

        clustererRef.current = new MarkerClusterer({
          map,
          markers,
          renderer: {
            render: ({ count, position }) =>
              new window.google.maps.Marker({
                position,
                icon: buildClusterIcon(count),
                label: {
                  text: String(count),
                  color: "#fffaf1",
                  fontSize: "12px",
                  fontWeight: "700",
                },
                zIndex: Number(window.google.maps.Marker.MAX_ZINDEX) + count,
              }),
          },
        });

        if (filteredPlaces.length > 0) {
          map.fitBounds(bounds);
        }
      })
      .catch((e) => setError(String(e)));
  }, [filteredPlaces]);

  const openInfoWindow = (place: PlacePin) => {
    const map = mapInstanceRef.current;
    const infoWindow = infoWindowRef.current;
    const marker = markersRef.current.get(place.placeId);
    if (!map || !infoWindow || !marker) return;

    const ratingText =
      place.rating != null ? `評価 ${place.rating}` : "評価なし";
    const reviewText =
      place.userRatingCount != null
        ? `レビュー${place.userRatingCount}件`
        : "レビューなし";
    const openUrl = buildMapsUrl(place);

    infoWindow.setContent(
      `<div style="max-width:240px;background:#fffaf1;border-radius:14px;padding:8px 10px 10px;border:1px solid rgba(201,106,42,0.25);box-shadow:0 12px 30px rgba(90,60,40,0.18);font-size:12px;line-height:1.5;">
        <div style="font-size:13px;font-weight:600;color:#1f2a2e;margin-bottom:4px;word-break:break-word;">
          ${place.name}
        </div>
        ${
          place.address
            ? `<div style="color:#5c6a6d;margin-bottom:6px;word-break:break-word;">${place.address}</div>`
            : ""
        }
        <div style="display:flex;gap:6px;align-items:center;margin-bottom:8px;flex-wrap:wrap;">
          <span style="display:inline-flex;align-items:center;border-radius:999px;background:#c96a2a;color:#fff7ee;padding:2px 8px;font-size:11px;">
            ${ratingText}
          </span>
          <span style="display:inline-flex;align-items:center;border-radius:999px;background:rgba(201,106,42,0.16);color:#2f4d4f;padding:2px 8px;font-size:11px;">
            ${reviewText}
          </span>
        </div>
        <a href="${openUrl}" target="_blank" rel="noreferrer" style="color:#1f6f78;text-decoration:underline;">
          Googleマップを開く
        </a>
      </div>`
    );

    infoWindow.open({ map, anchor: marker });
    const markerPosition = marker.getPosition();
    if (markerPosition) {
      map.panTo(markerPosition);
    }

    const currentZoom = map.getZoom?.() ?? 10;
    if (currentZoom < 14) {
      map.setZoom(14);
    }
  };

  const handleLocate = () => {
    if (!navigator.geolocation) {
      setError("このブラウザでは現在地取得ができません。");
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        setSheetExpanded(false);
        const map = mapInstanceRef.current;
        if (!map) return;
        const position = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        map.panTo(position);
        map.setZoom(14);
      },
      () => {
        setLocating(false);
        setError("現在地の取得に失敗しました。");
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  if (error) {
    return (
      <div className="app-card mt-6">
        <p className="text-sm app-error">{error}</p>
      </div>
    );
  }

  return (
    <div className="map-layout">
      {sheetExpanded && (
        <button
          type="button"
          className="map-backdrop"
          aria-label="閉じる"
          onClick={() => setSheetExpanded(false)}
        />
      )}
      <div
        className={
          sheetExpanded ? "map-panel map-panel--expanded" : "map-panel"
        }
        ref={panelRef}
        role={sheetExpanded ? "dialog" : undefined}
        aria-modal={sheetExpanded ? "true" : undefined}
        aria-label={sheetExpanded ? "フィルター" : undefined}
      >
        <div className="map-panel-header">
          <div className="map-panel-grip" />
          <div className="map-panel-meta">
            <span>
              表示 {filteredPlaces.length}/{places.length} 件
            </span>
            <button
              type="button"
              className="map-panel-toggle underline"
              onClick={() => setSheetExpanded((prev) => !prev)}
            >
              {sheetExpanded ? "閉じる" : "フィルター"}
            </button>
          </div>
        </div>

        <div className="map-panel-content">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="app-button app-button--ghost"
              onClick={handleLocate}
              disabled={locating}
            >
              {locating ? "取得中..." : "現在地"}
            </button>
          </div>

          <div className="app-card app-card--mini mt-3">
            <div className="grid gap-2">
              <select value={sort} onChange={(event) => setSort(event.target.value as "reviews" | "rating")}>
                <option value="reviews">レビュー件数順</option>
                <option value="rating">評価順</option>
              </select>
              <select value={area} onChange={(event) => setArea(event.target.value)}>
                <option value="">エリア（すべて）</option>
                {areaOptions.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  placeholder="最低評価"
                  value={minRating}
                  onChange={(event) => setMinRating(event.target.value)}
                />
                <input
                  type="number"
                  min={0}
                  step={1}
                  placeholder="最低レビュー数"
                  value={minReviews}
                  onChange={(event) => setMinReviews(event.target.value)}
                />
              </div>
            </div>
            {(area || minRating || minReviews || sort !== "reviews") && (
              <div className="mt-2 text-xs app-muted">
                <button
                  type="button"
                  className="underline"
                  onClick={() => {
                    setSort("reviews");
                    setArea("");
                    setMinRating("");
                    setMinReviews("");
                  }}
                >
                  フィルタをリセット
                </button>
              </div>
            )}
          </div>

          {filteredPlaces.length === 0 ? (
            <div className="app-card app-card--mini mt-3">
              <p className="text-sm app-muted">該当するお店がありません。</p>
            </div>
          ) : (
            <ul className="grid gap-3 mt-3">
              {filteredPlaces.map((p) => {
                const openMapsUrl = buildMapsUrl(p);
                const isActive = selectedId === p.placeId;
                const ratingText = p.rating != null ? p.rating.toFixed(1) : "-";
                const reviewText =
                  p.userRatingCount != null ? `${p.userRatingCount}件` : "-";

                return (
                  <li key={p.placeId}>
                    <button
                      type="button"
                      className="app-card app-card--mini w-full text-left"
                      style={
                        isActive
                          ? {
                              borderColor: "rgba(201, 106, 42, 0.6)",
                              boxShadow: "0 12px 30px rgba(90, 60, 40, 0.15)",
                            }
                          : undefined
                      }
                      onClick={() => {
                        setSelectedId(p.placeId);
                        setSheetExpanded(false);
                        openInfoWindow(p);
                      }}
                    >
                      <div className="font-semibold break-words">{p.name}</div>
                      {p.address && (
                        <div className="mt-1 text-xs app-muted break-words">
                          {p.address}
                        </div>
                      )}
                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        <span className="app-badge app-badge--accent">
                          評価 {ratingText}
                        </span>
                        <span className="app-badge">レビュー {reviewText}</span>
                        <a
                          href={openMapsUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="app-muted underline"
                        >
                          Googleマップ
                        </a>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
      <div ref={mapRef} className="app-map" />
      <button
        type="button"
        className="map-fab app-button"
        onClick={() => setSheetExpanded(true)}
      >
        フィルター
      </button>
    </div>
  );
}
