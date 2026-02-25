const BASE_URL = process.env.E2E_BASE_URL || "http://127.0.0.1:3000";
const E2E_CONCURRENCY = Math.max(1, Number(process.env.E2E_CONCURRENCY || "8"));

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function toLocalUrl(urlText) {
  try {
    const parsed = new URL(urlText);
    return `${BASE_URL}${parsed.pathname}${parsed.search}`;
  } catch {
    if (urlText.startsWith("/")) return `${BASE_URL}${urlText}`;
    return `${BASE_URL}/${urlText}`;
  }
}

function extractLocUrls(xml) {
  const matches = Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/g));
  return matches.map((match) => toLocalUrl(match[1]));
}

async function checkSitemap() {
  const res = await fetch(`${BASE_URL}/sitemap.xml`);
  assert(res.ok, `sitemap.xml status is ${res.status}`);
  const xml = await res.text();
  assert(xml.includes("<urlset"), "sitemap.xml does not contain <urlset");
  assert(xml.includes("/list"), "sitemap.xml does not contain /list");
  console.log("[ok] sitemap.xml");
  return xml;
}

async function checkPage(path, expectedText) {
  const res = await fetch(`${BASE_URL}${path}`);
  assert(res.ok, `${path} status is ${res.status}`);
  const html = await res.text();
  assert(html.includes(expectedText), `${path} does not contain expected text: ${expectedText}`);
  console.log(`[ok] page ${path}`);
}

async function checkRobots() {
  const res = await fetch(`${BASE_URL}/robots.txt`);
  assert(res.ok, `robots.txt status is ${res.status}`);
  const text = await res.text();
  assert(text.toLowerCase().includes("sitemap"), "robots.txt does not contain sitemap");
  console.log("[ok] robots.txt");
}

async function checkAllSitemapUrls(xml) {
  const urls = extractLocUrls(xml);
  assert(urls.length > 0, "sitemap.xml has no <loc> URLs");

  let index = 0;
  const failures = [];
  const workers = Array.from({ length: Math.min(E2E_CONCURRENCY, urls.length) }, async () => {
    while (index < urls.length) {
      const current = index;
      index += 1;
      const url = urls[current];
      try {
        const res = await fetch(url);
        if (!res.ok) {
          failures.push(`${url} -> ${res.status}`);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        failures.push(`${url} -> ${message}`);
      }
    }
  });

  await Promise.all(workers);
  assert(
    failures.length === 0,
    `sitemap URLs check failed:\n${failures.slice(0, 10).join("\n")}${
      failures.length > 10 ? `\n...and ${failures.length - 10} more` : ""
    }`
  );
  console.log(`[ok] sitemap URLs (${urls.length} pages)`);
}

async function checkContactValidation() {
  const invalidCategory = await fetch(`${BASE_URL}/api/contact`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": "198.51.100.41",
    },
    body: JSON.stringify({
      category: "無効カテゴリ",
      body: "test",
      company: "",
    }),
  });
  assert(invalidCategory.status === 400, `contact invalid category status is ${invalidCategory.status}`);

  const missingBody = await fetch(`${BASE_URL}/api/contact`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": "198.51.100.42",
    },
    body: JSON.stringify({
      category: "その他",
      body: "",
      company: "",
    }),
  });
  assert(missingBody.status === 400, `contact missing body status is ${missingBody.status}`);
  console.log("[ok] contact validation");
}

async function checkContactRateLimit() {
  const payload = {
    category: "その他",
    body: "E2E smoke test",
    company: "",
  };

  let got429 = false;
  for (let i = 0; i < 6; i += 1) {
    const res = await fetch(`${BASE_URL}/api/contact`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "203.0.113.8",
      },
      body: JSON.stringify(payload),
    });
    if (res.status === 429) {
      got429 = true;
      break;
    }
  }

  assert(got429, "contact API did not return 429 within 6 requests");
  console.log("[ok] contact rate limit");
}

async function main() {
  const sitemapXml = await checkSitemap();
  await checkAllSitemapUrls(sitemapXml);
  await checkRobots();
  await checkPage("/", "讃岐うどん総合ランキング");
  await checkPage("/list", "讃岐うどん店一覧");
  await checkPage("/rankings", "ランキング一覧");
  await checkPage("/map", "讃岐うどんマップ");
  await checkPage("/favorites", "お気に入り");
  await checkPage("/about", "運営者情報");
  await checkPage("/contact", "お問い合わせ");
  await checkPage("/privacy", "プライバシー");
  await checkPage("/terms", "利用規約");
  await checkContactValidation();
  await checkContactRateLimit();
  console.log("E2E smoke checks passed.");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
