"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { MarkerClusterer } from "@googlemaps/markerclusterer";
import {
  getLocalDayMinutes,
  isOpenAt,
  isOpenNow,
  isClosedOnDay,
  isOpenOnDay,
  parseTimeInput,
} from "@/lib/openingHours";
import type { OpeningHours } from "@/lib/openingHours";

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
  openingHours?: OpeningHours | null;
  utcOffsetMinutes?: number | null;
  openDays?: number[] | null;
};

type MapMarker = google.maps.Marker | google.maps.marker.AdvancedMarkerElement;

const KAGAWA_CENTER = { lat: 34.2261, lng: 134.0183 };

let mapsLoader: Promise<void> | null = null;

function waitForMapsReady(timeoutMs = 8000) {
  if (window.google?.maps) return Promise.resolve(undefined);
  return new Promise<void>((resolve, reject) => {
    const started = Date.now();
    const tick = () => {
      if (window.google?.maps) {
        resolve();
        return;
      }
      if (Date.now() - started > timeoutMs) {
        reject(new Error("Google Maps の読み込みに失敗しました。"));
        return;
      }
      window.setTimeout(tick, 50);
    };
    tick();
  });
}

function loadGoogleMaps(apiKey: string) {
  if (typeof window === "undefined") return Promise.resolve(undefined);
  if (window.google?.maps) return Promise.resolve(undefined);
  if (mapsLoader) return mapsLoader;

  mapsLoader = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&loading=async&libraries=marker`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error("Google Maps の読み込みに失敗しました。"));
    document.head.appendChild(script);
  })
    .then(() => waitForMapsReady())
    .catch((error) => {
      mapsLoader = null;
      throw error;
    });

  return mapsLoader;
}

function buildMapsUrl(place: PlacePin) {
  return (
    place.googleMapsUri ??
    `https://www.google.com/maps?q=${place.lat},${place.lng}&z=16`
  );
}

type ClusterIcon = {
  icon: google.maps.Icon;
  pixelSize: number;
};

function buildClusterIcon(count: number): ClusterIcon {
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
    icon: {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
      scaledSize: new window.google.maps.Size(size, size),
      anchor: new window.google.maps.Point(size / 2, size / 2),
    },
    pixelSize: size,
  };
}

function buildClusterContent(count: number) {
  const { icon, pixelSize } = buildClusterIcon(count);
  const wrapper = document.createElement("div");
  wrapper.style.position = "relative";
  wrapper.style.width = `${pixelSize}px`;
  wrapper.style.height = `${pixelSize}px`;

  const img = document.createElement("img");
  img.src = icon.url ?? "";
  img.style.width = "100%";
  img.style.height = "100%";
  img.style.display = "block";

  const label = document.createElement("div");
  label.textContent = String(count);
  label.style.position = "absolute";
  label.style.inset = "0";
  label.style.display = "flex";
  label.style.alignItems = "center";
  label.style.justifyContent = "center";
  label.style.color = "#fffaf1";
  label.style.fontSize = "12px";
  label.style.fontWeight = "700";

  wrapper.append(img, label);
  return wrapper;
}

function createMapMarker(
  position: google.maps.LatLngLiteral,
  title: string,
  useAdvanced: boolean
) {
  const AdvancedMarker = window.google.maps.marker?.AdvancedMarkerElement;
  if (useAdvanced && AdvancedMarker) {
    return new AdvancedMarker({ position, title });
  }
  return new window.google.maps.Marker({ position, title });
}

function getMarkerClickEvent(marker: MapMarker) {
  const AdvancedMarker = window.google.maps.marker?.AdvancedMarkerElement;
  if (AdvancedMarker && marker instanceof AdvancedMarker) {
    return "gmp-click";
  }
  return "click";
}

function getOpenDays(value: unknown): number[] | null {
  const days = Array.isArray(value) ? value : null;
  return days && days.length > 0 ? days : null;
}

function toLatLngLiteral(
  position: google.maps.LatLng | google.maps.LatLngLiteral
): google.maps.LatLngLiteral {
  const resolveCoord = (value: number | (() => number)) =>
    typeof value === "function" ? value() : value;
  return {
    lat: resolveCoord(position.lat),
    lng: resolveCoord(position.lng),
  };
}

function createClusterMarker(
  count: number,
  position: google.maps.LatLng | google.maps.LatLngLiteral,
  useAdvanced: boolean
) {
  const literal = toLatLngLiteral(position);
  const AdvancedMarker = window.google.maps.marker?.AdvancedMarkerElement;
  if (useAdvanced && AdvancedMarker) {
    return new AdvancedMarker({
      position: literal,
      content: buildClusterContent(count),
    });
  }
  const { icon } = buildClusterIcon(count);
  return new window.google.maps.Marker({
    position: literal,
    icon,
    label: {
      text: String(count),
      color: "#fffaf1",
      fontSize: "12px",
      fontWeight: "700",
    },
    zIndex: Number(window.google.maps.Marker.MAX_ZINDEX) + count,
  });
}

function clearMarker(marker: MapMarker) {
  if ("setMap" in marker) {
    marker.setMap(null);
  } else {
    marker.map = null;
  }
}

function getMarkerPosition(marker: MapMarker) {
  if ("getPosition" in marker) {
    return marker.getPosition();
  }
  const position = marker.position;
  if (!position) return null;
  return new window.google.maps.LatLng(
    typeof position.lat === "function" ? position.lat() : position.lat,
    typeof position.lng === "function" ? position.lng() : position.lng
  );
}

export default function MapClient({ places }: { places: PlacePin[] }) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const markersRef = useRef<Map<string, MapMarker>>(new Map());
  const clustererRef = useRef<MarkerClusterer | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [area, setArea] = useState<string>("");
  const [sort, setSort] = useState<"reviews" | "rating">("reviews");
  const [minRating, setMinRating] = useState<string>("");
  const [minReviews, setMinReviews] = useState<string>("");
  const [openNow, setOpenNow] = useState<boolean>(false);
  const [openAt, setOpenAt] = useState<string>("");
  const [openDay, setOpenDay] = useState<string>("");
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

    const openAtValue = openAt.trim();
    const openAtMinutes = parseTimeInput(openAtValue);
    const openDayValue = openDay.trim();
    const openDayIndex =
      openDayValue === "" ? null : Number.parseInt(openDayValue, 10);
    if (openNow) {
      filtered = filtered.filter((p) => {
        const result = isOpenNow(p.openingHours, p.utcOffsetMinutes);
        return result === true;
      });
    } else if (openAtMinutes != null) {
      filtered = filtered.filter((p) => {
        const day =
          openDayIndex != null && !Number.isNaN(openDayIndex)
            ? openDayIndex
            : getLocalDayMinutes(new Date(), p.utcOffsetMinutes).day;
        const result = isOpenAt(p.openingHours, day, openAtMinutes);
        return result === true;
      });
    } else if (openDayIndex != null && !Number.isNaN(openDayIndex)) {
      filtered = filtered.filter((p) => {
        const openDays = getOpenDays(p.openDays);
        const result =
          openDays != null
            ? openDays.includes(openDayIndex)
            : isOpenOnDay(p.openingHours, openDayIndex);
        return result === true;
      });
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
  }, [places, area, minRating, minReviews, sort, openNow, openAt, openDay]);

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
    const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAP_ID;
    if (!apiKey) {
      setError("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY が未設定です。");
      return;
    }

    let cancelled = false;
    const canUseAdvanced = Boolean(mapId);

    const initMap = async (attempt: number) => {
      try {
        await loadGoogleMaps(apiKey);
        const { MarkerClusterer } = await import("@googlemaps/markerclusterer");
        if (cancelled || !mapRef.current || !window.google?.maps) return;

        let MapCtor = window.google.maps.Map;
        if (window.google.maps.importLibrary) {
          const mapsLib = (await window.google.maps.importLibrary(
            "maps"
          )) as google.maps.MapsLibrary;
          MapCtor = mapsLib.Map;
          if (canUseAdvanced) {
            await window.google.maps.importLibrary("marker");
          }
        }

        if (!MapCtor) {
          throw new Error("Google Maps の読み込みに失敗しました。");
        }

        setError(null);

        const map =
          mapInstanceRef.current ??
          new MapCtor(mapRef.current, {
            center: KAGAWA_CENTER,
            zoom: 10,
            mapTypeControl: false,
            ...(mapId ? { mapId } : {}),
          });

        mapInstanceRef.current = map;
        infoWindowRef.current =
          infoWindowRef.current ?? new window.google.maps.InfoWindow();

        markersRef.current.forEach((marker) => clearMarker(marker));
        markersRef.current = new Map();
        if (clustererRef.current) {
          clustererRef.current.clearMarkers();
        }

        const bounds = new window.google.maps.LatLngBounds();

        const markers = filteredPlaces.map((p) => {
          const position = { lat: p.lat, lng: p.lng };
          bounds.extend(position);

          const marker = createMapMarker(position, p.name, canUseAdvanced);

          markersRef.current.set(p.placeId, marker);

          marker.addListener(getMarkerClickEvent(marker), () => {
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
              createClusterMarker(count, position, canUseAdvanced),
          },
        });

        if (filteredPlaces.length > 0) {
          map.fitBounds(bounds);
        }
      } catch (e) {
        if (cancelled) return;
        if (attempt < 1) {
          await new Promise((resolve) => setTimeout(resolve, 500));
          return initMap(attempt + 1);
        }
        setError(String(e));
      }
    };

    initMap(0);

    return () => {
      cancelled = true;
    };
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
    const openNow = isOpenNow(place.openingHours, place.utcOffsetMinutes);
    const todayIndex = getLocalDayMinutes(
      new Date(),
      place.utcOffsetMinutes
    ).day;
    const openDays = getOpenDays(place.openDays);
    const closedToday =
      openDays != null
        ? !openDays.includes(todayIndex)
        : isClosedOnDay(place.openingHours, todayIndex);

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
          ${
            openNow === true
              ? `<span style="display:inline-flex;align-items:center;border-radius:999px;background:#2f6d3b;color:#ecfff1;padding:2px 8px;font-size:11px;">営業中</span>`
              : ""
          }
          ${
            closedToday === true
              ? `<span style="display:inline-flex;align-items:center;border-radius:999px;background:rgba(60,70,75,0.12);color:#3d474f;padding:2px 8px;font-size:11px;">定休日</span>`
              : ""
          }
        </div>
        <a href="${openUrl}" target="_blank" rel="noreferrer" style="color:#1f6f78;text-decoration:underline;">
          Googleマップを開く
        </a>
      </div>`
    );

    infoWindow.open({ map, anchor: marker });
    const markerPosition = getMarkerPosition(marker);
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
            <div className="grid gap-3">
              <div className="grid gap-2">
                <div className="text-xs app-muted whitespace-normal">並び替え・エリア</div>
                <div className="grid grid-cols-1 gap-2">
                  <select
                    value={sort}
                    onChange={(event) =>
                      setSort(event.target.value as "reviews" | "rating")
                    }
                    className="w-full"
                  >
                    <option value="reviews">レビュー件数順</option>
                    <option value="rating">評価順</option>
                  </select>
                  <select
                    value={area}
                    onChange={(event) => setArea(event.target.value)}
                    className="w-full"
                  >
                    <option value="">エリア（すべて）</option>
                    {areaOptions.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-2">
                <div className="text-xs app-muted whitespace-normal">評価・レビュー</div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <input
                    type="number"
                    min={0}
                    step={0.1}
                    placeholder="最低評価"
                    value={minRating}
                    onChange={(event) => setMinRating(event.target.value)}
                    className="w-full"
                  />
                  <input
                    type="number"
                    min={0}
                    step={1}
                    placeholder="最低レビュー数"
                    value={minReviews}
                    onChange={(event) => setMinReviews(event.target.value)}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <div className="text-xs app-muted whitespace-normal">営業時間</div>
                <div className="grid gap-2 sm:flex sm:flex-wrap sm:items-center">
                  <select
                    value={openDay}
                    onChange={(event) => {
                      setOpenDay(event.target.value);
                      setOpenNow(false);
                    }}
                    className="w-full sm:flex-1"
                  >
                    <option value="">曜日（指定なし）</option>
                    <option value="0">日曜</option>
                    <option value="1">月曜</option>
                    <option value="2">火曜</option>
                    <option value="3">水曜</option>
                    <option value="4">木曜</option>
                    <option value="5">金曜</option>
                    <option value="6">土曜</option>
                  </select>
                  <input
                    type="time"
                    value={openAt}
                    onChange={(event) => {
                      setOpenAt(event.target.value);
                      setOpenNow(false);
                    }}
                    className="w-full sm:flex-1"
                  />
                  <label className="flex w-fit items-center gap-2 text-left text-sm whitespace-nowrap justify-start justify-self-start sm:ml-auto sm:whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={openNow}
                      onChange={(event) => {
                        const checked = event.target.checked;
                        setOpenNow(checked);
                        if (checked) {
                          setOpenAt("");
                          setOpenDay("");
                        }
                      }}
                    />
                    営業中のみ
                  </label>
                </div>
                <p className="text-xs app-muted">
                  営業時間はGoogleマップの情報のため、誤りがある場合があります。
                </p>
              </div>
            </div>
            {(area ||
              minRating ||
              minReviews ||
              sort !== "reviews" ||
              openNow ||
              openAt ||
              openDay) && (
              <div className="mt-2 text-xs app-muted">
                <button
                  type="button"
                  className="underline"
                  onClick={() => {
                    setSort("reviews");
                    setArea("");
                    setMinRating("");
                    setMinReviews("");
                    setOpenNow(false);
                    setOpenAt("");
                    setOpenDay("");
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
                const openNow = isOpenNow(p.openingHours, p.utcOffsetMinutes);
                const todayIndex = getLocalDayMinutes(
                  new Date(),
                  p.utcOffsetMinutes
                ).day;
                const openDays = getOpenDays(p.openDays);
                const closedToday =
                  openDays != null
                    ? !openDays.includes(todayIndex)
                    : isClosedOnDay(p.openingHours, todayIndex);

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
                        {openNow === true && (
                          <span className="app-badge app-badge--accent">
                            営業中
                          </span>
                        )}
                        {closedToday === true && (
                          <span className="app-badge">定休日</span>
                        )}
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
