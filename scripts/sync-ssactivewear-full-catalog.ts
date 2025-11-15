#!/usr/bin/env tsx
/**
 * SSActivewear Full Catalog Sync
 * 
 * Fetches ALL styles from SSActivewear and syncs them to the database.
 * This is the proper wholesale catalog integration approach.
 * 
 * Usage:
 *   npm run sync:ssa:full
 *   npm run sync:ssa:full -- --limit 100  # Test with first 100 styles
 *   npm run sync:ssa:full -- --brands "Gildan,Adidas"  # Specific brands only
 */

import 'tsconfig-paths/register';
import { SupplierSource } from '@prisma/client';
import { loadConfig } from '@/integrations/ssactivewear/config';
import { prisma } from '@/lib/prisma';
import { ensureCanonicalStyleLink, guessCanonicalStyleNumber } from '@/services/canonical-style';

interface CliOptions {
  limit?: number;
  brands?: string[];
  categories?: string[];
  dryRun: boolean;
}

interface SsaStyle {
  styleID: number;
  partNumber: string;
  brandName: string;
  styleName: string;
  title?: string;
  description?: string;
  baseCategory?: string;
  categories?: string;
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
  qty?: number | string;
  piecePrice?: number | string;
  customerPrice?: number | string;
  warehouses?: Array<{
    warehouseAbbr: string;
    qty: number | string;
  }>;
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const options: CliOptions = {
    dryRun: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--limit' && args[i + 1]) {
      options.limit = Number.parseInt(args[++i], 10);
    } else if (arg === '--brands' && args[i + 1]) {
      options.brands = args[++i].split(',').map((b) => b.trim());
    } else if (arg === '--categories' && args[i + 1]) {
      options.categories = args[++i].split(',').map((c) => c.trim());
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    }
  }

  return options;
}

async function fetchAllStyles(options: CliOptions): Promise<SsaStyle[]> {
  const config = loadConfig();
  const auth = `Basic ${Buffer.from(`${config.accountNumber}:${config.apiKey}`).toString('base64')}`;
  
  console.log('Fetching all styles from SSActivewear...');
  const response = await fetch(`${config.restBaseUrl}/styles/`, {
    headers: { Authorization: auth },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch styles: ${response.status} ${response.statusText}`);
  }

  let styles: SsaStyle[] = await response.json();
  console.log(`✅ Retrieved ${styles.length} total styles from SSActivewear`);

  // Apply filters
  if (options.brands && options.brands.length > 0) {
    const brandSet = new Set(options.brands.map((b) => b.toUpperCase()));
    styles = styles.filter((s) => brandSet.has(s.brandName.toUpperCase()));
    console.log(`   Filtered to ${styles.length} styles matching brands: ${options.brands.join(', ')}`);
  }

  if (options.categories && options.categories.length > 0) {
    const categorySet = new Set(options.categories.map((c) => c.toLowerCase()));
    styles = styles.filter((s) => 
      s.baseCategory && categorySet.has(s.baseCategory.toLowerCase())
    );
    console.log(`   Filtered to ${styles.length} styles in categories: ${options.categories.join(', ')}`);
  }

  if (options.limit && options.limit > 0) {
    styles = styles.slice(0, options.limit);
    console.log(`   Limited to first ${options.limit} styles`);
  }

  return styles;
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

async function syncStyle(style: SsaStyle, dryRun: boolean): Promise<void> {
  const styleKey = `${style.brandName} ${style.styleName}`;
  
  if (dryRun) {
    console.log(`[DRY RUN] Would sync: ${styleKey} (${style.partNumber})`);
    return;
  }

  console.log(`[${styleKey}] Fetching products...`);
  const products = await fetchProductsForStyle(style.partNumber);
  
  if (products.length === 0) {
    console.log(`[${styleKey}] ⚠️  No products found, skipping`);
    return;
  }

  // Group products by color and size
  const colors = new Map<string, { colorName: string; colorCode: string; swatchUrl?: string }>();
  const sizes = new Map<string, { code: string; display: string; sort: number }>();
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
        code: sizeCode,
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
      defaultColor: colors.values().next().value?.colorCode || 'DEFAULT',
      description: style.description ? [style.description] : undefined,
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

  console.log(`[${styleKey}] ✅ Synced ${colors.size} colors, ${sizes.size} sizes, ${skuMap.length} SKUs`);
}

async function main() {
  const options = parseArgs();
  
  console.log('=== SSActivewear Full Catalog Sync ===\n');
  if (options.dryRun) {
    console.log('🔍 DRY RUN MODE - No database changes will be made\n');
  }

  const startTime = Date.now();
  const styles = await fetchAllStyles(options);

  console.log(`\nSyncing ${styles.length} styles...\n`);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < styles.length; i++) {
    const style = styles[i];
    try {
      await syncStyle(style, options.dryRun);
      successCount++;
      
      // Rate limiting: 60 requests/min = 1 request per second
      if (i < styles.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1100));
      }
    } catch (error) {
      errorCount++;
      console.error(`[${style.brandName} ${style.styleName}] ❌ Error:`, error instanceof Error ? error.message : error);
    }

    // Progress update every 10 styles
    if ((i + 1) % 10 === 0) {
      const elapsed = (Date.now() - startTime) / 1000;
      const rate = (i + 1) / elapsed;
      const remaining = styles.length - (i + 1);
      const eta = remaining / rate;
      console.log(`\n📊 Progress: ${i + 1}/${styles.length} (${rate.toFixed(1)} styles/sec, ETA: ${Math.ceil(eta / 60)}min)\n`);
    }
  }

  const totalTime = (Date.now() - startTime) / 1000;
  console.log('\n=== Sync Complete ===');
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

