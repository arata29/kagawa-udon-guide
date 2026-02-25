import type { MetadataRoute } from "next";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { safeDbQuery } from "@/lib/db";
import { siteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";
export const revalidate = 900;

function buildStaticEntries(lastModified: Date): MetadataRoute.Sitemap {
  const staticLastModified = new Date("2026-02-24");
  return [
    {
      url: `${siteUrl}/`,
      lastModified,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${siteUrl}/list`,
      lastModified,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${siteUrl}/rankings`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/map`,
      lastModified,
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
  ];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const getSitemapData = unstable_cache(
    async () => {
      const result = await safeDbQuery("sitemap data", () =>
        Promise.all([
          prisma.placeCache.aggregate({ _max: { fetchedAt: true } }),
          prisma.placeCache.findMany({
            where: { area: { not: null } },
            distinct: ["area"],
            select: { area: true },
          }),
          prisma.placeCache.findMany({
            select: { placeId: true, fetchedAt: true },
          }),
        ])
      );
      return result.ok ? result.data : null;
    },
    ["sitemap-data-v1"],
    { revalidate }
  );

  const dbData = await getSitemapData();
  if (!dbData) {
    return buildStaticEntries(now);
  }

  try {
    const [{ _max }, areas, shops] = dbData;
    const lastFetchedAt = _max.fetchedAt ?? now;
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
      ...buildStaticEntries(lastFetchedAt),
      ...areaEntries,
      ...shops.map((s) => ({
        url: `${siteUrl}/shops/${encodeURIComponent(s.placeId)}`,
        lastModified: s.fetchedAt ?? lastFetchedAt,
        changeFrequency: "weekly" as const,
        priority: 0.5,
      })),
    ];
  } catch (error) {
    console.error("Failed to generate sitemap from DB", error);
    return buildStaticEntries(now);
  }
}
