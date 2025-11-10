/* eslint-disable @typescript-eslint/no-require-imports */
const path = require("path");
const fs = require("fs/promises");
const { chromium } = require("playwright");

const portalBaseUrl = process.env.PORTAL_BASE_URL || "https://portal.promosinkwall-e.com";
const outputDir = path.resolve(process.cwd(), "storyboard");

const routes = [
  { name: "overview", path: "/portal" },
  { name: "inventory", path: "/portal/inventory" },
  { name: "quotes", path: "/portal/quotes" },
];

async function ensureDir(dir) {
  await fs.promises.mkdir(dir, { recursive: true });
}

async function captureScreenshots() {
  await ensureDir(outputDir);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  for (const route of routes) {
    const url = `${portalBaseUrl}${route.path}`;
    console.log(`Visiting ${url}`);
    await page.goto(url, { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);
    const filePath = path.join(outputDir, `${route.name}.png`);
    await page.screenshot({ path: filePath, fullPage: true });
    console.log(`Saved ${filePath}`);
  }

  await browser.close();
}

captureScreenshots().catch((error) => {
  console.error("Storyboard capture failed", error);
  process.exit(1);
});
