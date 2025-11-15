#!/usr/bin/env tsx
/**
 * SSActivewear Incremental Catalog Sync
 * 
 * Syncs only NEW styles added since the last sync.
 * Much faster than full sync for daily/hourly updates.
 * 
 * Usage:
 *   npm run sync:ssa:incremental
 *   npm run sync:ssa:incremental -- --days 7  # Sync styles from last 7 days
 */

import 'tsconfig-paths/register';
import { SupplierSource } from '@prisma/client';
import { loadConfig } from '@/integrations/ssactivewear/config';
import { prisma } from '@/lib/prisma';
import { ensureCanonicalStyleLink, guessCanonicalStyleNumber } from '@/services/canonical-style';

interface CliOptions {
  days?: number;
}

interface SsaStyle {
  styleID: number;
  partNumber: string;
  brandName: string;
  styleName: string;
  title?: string;
  description?: string;
  baseCategory?: string;
  newStyle?: boolean;
}

interface SsaProduct {
  sku: string;
  styleID: number;
  brandName?: string;
  styleName?: string;
  colorName?: string;
  colorCode?: string;
  colorSwatchImage?: string;
  colorFrontImage?: string;
  colorBackImage?: string;
  colorSideImage?: string;
  sizeName?: string;
  sizeCode?: string;
  sizeOrder?: string | number;
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const options: CliOptions = {
    days: 30,  // Default: sync styles from last 30 days
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--days' && args[i + 1]) {
      options.days = Number.parseInt(args[++i], 10);
    }
  }

  return options;
}

async function fetchAllStyles(): Promise<SsaStyle[]> {
  const config = loadConfig();
  const auth = `Basic ${Buffer.from(`${config.accountNumber}:${config.apiKey}`).toString('base64')}`;
  
  const response = await fetch(`${config.restBaseUrl}/styles/`, {
    headers: { Authorization: auth },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch styles: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

async function fetchProductsForStyle(partNumber: string): Promise<SsaProduct[]> {
  const config = loadConfig();
  const auth = `Basic ${Buffer.from(`${config.accountNumber}:${config.apiKey}`).toString('base64')}`;
  
  const response = await fetch(`${config.restBaseUrl}/products/?partnumber=${partNumber}`, {
    headers: { Authorization: auth },
  });

  if (!response.ok) {
    if (response.status === 404) {
      return [];
    }
    throw new Error(`Failed to fetch products for ${partNumber}: ${response.status}`);
  }

  return response.json();
}

async function syncStyle(style: SsaStyle): Promise<void> {
  const styleKey = `${style.brandName} ${style.styleName}`;
  
  console.log(`[${styleKey}] Fetching products...`);
  const products = await fetchProductsForStyle(style.partNumber);
  
  if (products.length === 0) {
    console.log(`[${styleKey}] ⚠️  No products found, skipping`);
    return;
  }

  // Group products by color and size
  const colors = new Map<string, { colorName: string; colorCode: string; swatchUrl?: string }>();
  const sizes = new Map<string, { sizeCode: string; display: string; sort: number }>();
  const skuMap: Array<{ colorCode: string; sizeCode: string; supplierSku: string }> = [];
  const mediaMap = new Map<string, Set<string>>();

  for (const product of products) {
    const colorCode = product.colorCode || 'DEFAULT';
    const colorName = product.colorName || 'Default';
    
    if (!colors.has(colorCode)) {
      colors.set(colorCode, {
        colorName,
        colorCode,
        swatchUrl: product.colorSwatchImage || undefined,
      });
    }

    const sizeCode = product.sizeCode || 'OSFA';
    const sizeName = product.sizeName || 'One Size';
    const sizeOrder = Number.parseInt(String(product.sizeOrder || 0), 10) || 0;
    
    if (!sizes.has(sizeCode)) {
      sizes.set(sizeCode, {
        sizeCode: sizeCode,
        display: sizeName,
        sort: sizeOrder,
      });
    }

    skuMap.push({
      colorCode,
      sizeCode,
      supplierSku: product.sku,
    });

    // Collect images
    const mediaSet = mediaMap.get(colorCode) || new Set<string>();
    [product.colorFrontImage, product.colorBackImage, product.colorSideImage]
      .filter(Boolean)
      .forEach((url) => mediaSet.add(url!));
    mediaMap.set(colorCode, mediaSet);
  }

  // Upsert product
  await prisma.product.upsert({
    where: { supplierPartId: style.partNumber },
    create: {
      supplierPartId: style.partNumber,
      name: style.title || style.styleName,
      brand: style.brandName,
      defaultColor: colors.values().next().value?.colorCode || 'DEFAULT',
      description: style.description ? [style.description] : undefined,
      colors: {
        create: Array.from(colors.values()).map((color) => ({
          colorCode: color.colorCode,
          colorName: color.colorName,
          swatchUrl: color.swatchUrl,
        })),
      },
      sizes: {
        create: Array.from(sizes.values()),
      },
      skus: {
        create: skuMap,
      },
      media: {
        create: Array.from(mediaMap.entries()).flatMap(([colorCode, urls]) =>
          Array.from(urls).map((url, index) => ({
            colorCode,
            url,
            position: index,
          }))
        ),
      },
    },
    update: {
      name: style.title || style.styleName,
      brand: style.brandName,
      colors: {
        deleteMany: {},
        create: Array.from(colors.values()).map((color) => ({
          colorCode: color.colorCode,
          colorName: color.colorName,
          swatchUrl: color.swatchUrl,
        })),
      },
      sizes: {
        deleteMany: {},
        create: Array.from(sizes.values()),
      },
      skus: {
        deleteMany: {},
        create: skuMap,
      },
      media: {
        deleteMany: {},
        create: Array.from(mediaMap.entries()).flatMap(([colorCode, urls]) =>
          Array.from(urls).map((url, index) => ({
            colorCode,
            url,
            position: index,
          }))
        ),
      },
    },
  });

  // Link to canonical style
  await ensureCanonicalStyleLink(prisma, {
    supplier: SupplierSource.SSACTIVEWEAR,
    supplierPartId: style.partNumber,
    styleNumber: guessCanonicalStyleNumber({
      supplier: SupplierSource.SSACTIVEWEAR,
      supplierPartId: style.partNumber,
      brand: style.brandName,
    }),
    displayName: style.title || style.styleName,
    brand: style.brandName,
  });

  console.log(`[${styleKey}] ✅ Synced ${colors.size} colors, ${sizes.size} sizes`);
}

async function main() {
  const options = parseArgs();
  
  console.log('=== SSActivewear Incremental Sync ===\n');
  console.log(`Checking for new styles from the last ${options.days} days...\n`);

  const startTime = Date.now();

  // Fetch all styles from SSActivewear
  console.log('Fetching current catalog from SSActivewear...');
  const allStyles = await fetchAllStyles();
  console.log(`✅ Retrieved ${allStyles.length} total styles\n`);

  // Get existing part numbers from database
  const existingProducts = await prisma.product.findMany({
    where: {
      supplierPartId: {
        not: {
          startsWith: 'SM',  // Exclude SanMar
        },
      },
    },
    select: {
      supplierPartId: true,
    },
  });

  const existingPartNumbers = new Set(existingProducts.map((p) => p.supplierPartId));
  console.log(`Found ${existingPartNumbers.size} existing SSActivewear products in database\n`);

  // Filter to new styles only
  const newStyles = allStyles.filter((style) => !existingPartNumbers.has(style.partNumber));
  
  // Prioritize styles marked as "new" by SSActivewear
  const priorityNewStyles = newStyles.filter((s) => s.newStyle);
  const otherNewStyles = newStyles.filter((s) => !s.newStyle);

  console.log(`📦 Found ${newStyles.length} new styles to sync:`);
  console.log(`   - ${priorityNewStyles.length} marked as "new" by supplier`);
  console.log(`   - ${otherNewStyles.length} other new styles\n`);

  if (newStyles.length === 0) {
    console.log('✅ Catalog is up to date, no new styles to sync');
    return;
  }

  // Sync priority styles first
  const stylesToSync = [...priorityNewStyles, ...otherNewStyles];
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < stylesToSync.length; i++) {
    const style = stylesToSync[i];
    try {
      await syncStyle(style);
      successCount++;
      
      // Rate limiting
      if (i < stylesToSync.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1100));
      }
    } catch (error) {
      errorCount++;
      console.error(`[${style.brandName} ${style.styleName}] ❌ Error:`, error instanceof Error ? error.message : error);
    }

    // Progress update
    if ((i + 1) % 10 === 0) {
      const elapsed = (Date.now() - startTime) / 1000;
      const rate = (i + 1) / elapsed;
      const remaining = stylesToSync.length - (i + 1);
      const eta = remaining / rate;
      console.log(`\n📊 Progress: ${i + 1}/${stylesToSync.length} (${rate.toFixed(1)} styles/sec, ETA: ${Math.ceil(eta / 60)}min)\n`);
    }
  }

  const totalTime = (Date.now() - startTime) / 1000;
  console.log('\n=== Incremental Sync Complete ===');
  console.log(`✅ Success: ${successCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log(`⏱️  Total time: ${Math.ceil(totalTime / 60)} minutes`);
}

main()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });

