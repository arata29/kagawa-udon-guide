import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { siteUrl } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [{ _max }, areas, shops] = await Promise.all([
    prisma.placeCache.aggregate({ _max: { fetchedAt: true } }),
    prisma.placeCache.findMany({
      where: { area: { not: null } },
      distinct: ["area"],
      select: { area: true },
    }),
    prisma.placeCache.findMany({
      select: { placeId: true, fetchedAt: true },
    }),
  ]);

  const lastFetchedAt = _max.fetchedAt ?? new Date();
  const staticLastModified = new Date("2026-02-24");

  const areaEntries = areas
    .map((a) => (a.area ?? "").trim())
    .filter(Boolean)
    .map((area) => ({
      url: `${siteUrl}/rankings/area/${encodeURIComponent(area)}`,
      lastModified: lastFetchedAt,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));

  return [
    {
      url: `${siteUrl}/`,
      lastModified: lastFetchedAt,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${siteUrl}/list`,
      lastModified: lastFetchedAt,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${siteUrl}/rankings`,
      lastModified: lastFetchedAt,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/map`,
      lastModified: lastFetchedAt,
      changeFrequency: "weekly",
      priority: 0.6,
    },
    {
      url: `${siteUrl}/privacy`,
      lastModified: staticLastModified,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${siteUrl}/terms`,
      lastModified: staticLastModified,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${siteUrl}/contact`,
      lastModified: staticLastModified,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${siteUrl}/about`,
      lastModified: staticLastModified,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    ...areaEntries,
    ...shops.map((s) => ({
      url: `${siteUrl}/shops/${encodeURIComponent(s.placeId)}`,
      lastModified: s.fetchedAt ?? lastFetchedAt,
      changeFrequency: "weekly" as const,
      priority: 0.5,
    })),
  ];
}
