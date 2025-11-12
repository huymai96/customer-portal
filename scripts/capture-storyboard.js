/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const BASE_URL = process.env.PORTAL_BASE_URL || 'https://customer-portal-plcebt9v3-promos-ink.vercel.app';
const OUTPUT_DIR = path.resolve(process.cwd(), 'storyboard');
const VIEWPORT = { width: 1440, height: 900 };

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function captureScreenshots() {
  ensureDir(OUTPUT_DIR);

  const targets = [
    { slug: 'overview', pathname: '/portal' },
    { slug: 'catalog', pathname: '/portal/catalog' },
    { slug: 'product-pc54', pathname: '/portal/catalog/PC54' },
    { slug: 'projects', pathname: '/portal/projects' },
    { slug: 'orders', pathname: '/portal/orders' },
  ];

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: VIEWPORT });

  for (const target of targets) {
    const url = new URL(target.pathname, BASE_URL).toString();
    console.log(`Capturing ${url}`);
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    const filePath = path.join(OUTPUT_DIR, `${target.slug}.png`);
    await page.screenshot({ path: filePath, fullPage: true });
    await page.close();
    console.log(`Saved ${filePath}`);
  }

  await browser.close();
}

captureScreenshots().catch((error) => {
  console.error('Storyboard capture failed', error);
  process.exitCode = 1;
});
