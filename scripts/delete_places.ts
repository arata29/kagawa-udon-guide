import "dotenv/config";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { prisma } from "../src/lib/prisma";

async function main() {
  const placeCount = await prisma.place.count();
  const cacheCount = await prisma.placeCache.count();

  console.log("Target tables: Place, PlaceCache");
  console.log(`Place rows: ${placeCount}`);
  console.log(`PlaceCache rows: ${cacheCount}`);
  console.log("");
  console.log("This will DELETE ALL rows in both tables.");
  console.log('Type "DELETE_ALL" to continue:');

  const rl = createInterface({ input, output });
  const answer = (await rl.question("> ")).trim();
  await rl.close();

  if (answer !== "DELETE_ALL") {
    console.log("Canceled.");
    return;
  }

  const deletedCache = await prisma.placeCache.deleteMany();
  const deletedPlace = await prisma.place.deleteMany();

  console.log("Deleted rows:");
  console.log(`PlaceCache: ${deletedCache.count}`);
  console.log(`Place: ${deletedPlace.count}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
