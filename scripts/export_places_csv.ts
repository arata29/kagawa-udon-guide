import "dotenv/config";
import fs from "node:fs";
import { prisma } from "../src/lib/prisma";

function esc(v: string) {
  const s = v.replace(/"/g, '""');
  return `"${s}"`;
}

async function main() {
  const rows = await prisma.placeCache.findMany({
    orderBy: { fetchedAt: "desc" },
  });

  const header = ["placeId", "name", "address", "lat", "lng", "fetchedAt"].join(",");
  const lines = rows.map((r) =>
    [
      esc(r.placeId),
      esc(r.name),
      esc(r.address ?? ""),
      r.lat ?? "",
      r.lng ?? "",
      r.fetchedAt.toISOString(),
    ].join(",")
  );

  fs.writeFileSync("places_kagawa_udon.csv", [header, ...lines].join("\n"), "utf-8");
  console.log(`exported: ${rows.length} rows -> places_kagawa_udon.csv`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
