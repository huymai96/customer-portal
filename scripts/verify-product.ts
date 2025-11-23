#!/usr/bin/env tsx
/**
 * Diagnostic script to verify product completeness
 * 
 * Usage:
 *   npx tsx scripts/verify-product.ts PC43
 *   npx tsx scripts/verify-product.ts 5000
 */

import 'tsconfig-paths/register';
import { config } from 'dotenv';
import path from 'path';

const envFiles = ['.env.local', '.env'];
for (const envFile of envFiles) {
  const envPath = path.resolve(process.cwd(), envFile);
  config({ path: envPath, override: false });
}

import { getCanonicalProductDetail } from '@/services/product-service';
import { searchCanonicalStyles } from '@/services/search-service';
import { FALLBACK_COLORS } from '@/app/product/[canonicalStyleId]/components/ColorSwatches';

// Helper to check if color has hex mapping
function hasColorHex(colorCode: string): boolean {
  const normalized = colorCode.toUpperCase().replace(/[_\s-]/g, '_');
  if (FALLBACK_COLORS[normalized]) return true;
  
  const sortedKeys = Object.keys(FALLBACK_COLORS).sort((a, b) => b.length - a.length);
  for (const key of sortedKeys) {
    if (normalized.includes(key) || key.includes(normalized)) return true;
  }
  
  const baseColors = ['BLACK', 'WHITE', 'NAVY', 'RED', 'BLUE', 'GREEN', 'GRAY', 'GREY', 'ORANGE', 'PURPLE', 'PINK', 'YELLOW', 'BROWN'];
  for (const base of baseColors) {
    if (normalized.includes(base)) return true;
  }
  
  return false;
}

const sku = process.argv[2]?.toUpperCase();

if (!sku) {
  console.error('Usage: npx tsx scripts/verify-product.ts <SKU>');
  process.exit(1);
}

interface DiagnosticResult {
  sku: string;
  found: boolean;
  canonicalStyleId?: string;
  colors: {
    total: number;
    withHex: number;
    missingHex: string[];
  };
  sizes: {
    total: number;
    codes: string[];
    ordered: string[];
    correctOrder: boolean;
  };
  warehouses: {
    total: number;
    withNames: number;
    withZeroRows: string[];
    allMapped: boolean;
  };
  media: {
    total: number;
    byColor: Record<string, number>;
    unmatchedColors: string[];
  };
  categoryPages: {
    appearsIn: string[];
    missingFrom: string[];
  };
}

async function main() {
  console.log(`\n🔍 Verifying product: ${sku}\n`);

  // Step 1: Search for the product
  const searchResults = await searchCanonicalStyles(sku, { limit: 5 });
  const product = searchResults.items.find(
    (item) => item.styleNumber === sku || item.suppliers.some((s) => s.supplierPartId === sku)
  );

  if (!product?.canonicalStyleId) {
    console.error(`❌ Product ${sku} not found in search results`);
    console.log(`   Searched: ${searchResults.items.length} results`);
    process.exit(1);
  }

  const canonicalStyleId = product.canonicalStyleId;
  console.log(`✅ Found: ${canonicalStyleId}\n`);

  // Step 2: Get full product detail
  const detail = await getCanonicalProductDetail(canonicalStyleId);
  if (!detail) {
    console.error(`❌ Could not load product detail for ${canonicalStyleId}`);
    process.exit(1);
  }

  // Step 3: Analyze first supplier (or SanMar if available)
  const sanmarIndex = detail.suppliers.findIndex((s) => s.supplier === 'SANMAR');
  const supplier = detail.suppliers[sanmarIndex >= 0 ? sanmarIndex : 0];

  if (!supplier) {
    console.error(`❌ No suppliers found`);
    process.exit(1);
  }

  console.log(`📊 Analyzing supplier: ${supplier.supplier} (${supplier.supplierPartId})\n`);

  // Step 4: Colors analysis
  const colors = supplier.product?.colors || [];
  const colorsWithHex = colors.filter((c) => hasColorHex(c.colorCode));
  const missingHex = colors
    .filter((c) => !hasColorHex(c.colorCode))
    .map((c) => c.colorCode);

  // Step 5: Sizes analysis
  const sizes = supplier.product?.sizes || [];
  const sizeCodes = sizes.map((s) => s.sizeCode);
  const expectedOrder = ['XXS', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL', '6XL'];
  const ordered = sizeCodes.sort((a, b) => {
    const aIdx = expectedOrder.findIndex((o) => o.toUpperCase() === a.toUpperCase());
    const bIdx = expectedOrder.findIndex((o) => o.toUpperCase() === b.toUpperCase());
    if (aIdx >= 0 && bIdx >= 0) return aIdx - bIdx;
    if (aIdx >= 0) return -1;
    if (bIdx >= 0) return 1;
    return a.localeCompare(b, undefined, { numeric: true });
  });
  const correctOrder = JSON.stringify(ordered) === JSON.stringify(sizeCodes);

  // Step 6: Warehouses analysis
  const warehouses = supplier.inventory?.warehouses || [];
  const warehousesWithNames = warehouses.filter((wh) => wh.warehouseName && wh.warehouseName.trim().length > 0);
  const inventoryRows = supplier.inventory?.rows || [];
  const warehouseIdsWithData = new Set(
    inventoryRows.flatMap((row) => row.warehouses?.map((w) => w.warehouseId) || [])
  );
  const warehousesWithZeroRows = warehouses
    .filter((wh) => !warehouseIdsWithData.has(wh.warehouseId))
    .map((wh) => wh.warehouseId);

  // Step 7: Media analysis
  const media = supplier.product?.media || [];
  const mediaByColor: Record<string, number> = {};
  const colorCodes = new Set(colors.map((c) => c.colorCode.toUpperCase()));
  media.forEach((m) => {
    const color = m.colorCode?.toUpperCase() || 'GLOBAL';
    mediaByColor[color] = (mediaByColor[color] || 0) + 1;
  });
  const unmatchedColors = colors
    .filter((c) => !mediaByColor[c.colorCode.toUpperCase()] && !mediaByColor['GLOBAL'])
    .map((c) => c.colorCode);

  // Step 8: Category pages analysis
  const categoryQueries: Record<string, string[]> = {
    't-shirts': ['5000', '64000', 'BC3001', 'G500', 'PC43'],
    'polos-knits': ['A230'],
    'fleece': ['PC78H', 'PC90H', '18500'],
    'hats': ['C1717', 'C112'],
    'outerwear': ['J317'],
    'workwear': ['CSJ60'],
    'bags': ['BG403'],
    'womens': ['64000L'],
  };
  const appearsIn: string[] = [];
  const missingFrom: string[] = [];
  
  for (const [category, skus] of Object.entries(categoryQueries)) {
    if (skus.includes(sku) || skus.some((s) => s.toUpperCase() === sku.toUpperCase())) {
      // Check if it would appear in search
      const categorySearch = await searchCanonicalStyles(sku, { limit: 10 });
      if (categorySearch.items.some((item) => item.canonicalStyleId === canonicalStyleId)) {
        appearsIn.push(category);
      } else {
        missingFrom.push(category);
      }
    }
  }

  // Step 9: Output results
  const result: DiagnosticResult = {
    sku,
    found: true,
    canonicalStyleId,
    colors: {
      total: colors.length,
      withHex: colorsWithHex.length,
      missingHex,
    },
    sizes: {
      total: sizes.length,
      codes: sizeCodes,
      ordered,
      correctOrder,
    },
    warehouses: {
      total: warehouses.length,
      withNames: warehousesWithNames.length,
      withZeroRows: warehousesWithZeroRows,
      allMapped: warehousesWithZeroRows.length === 0 || warehousesWithNames.length === warehouses.length,
    },
    media: {
      total: media.length,
      byColor: mediaByColor,
      unmatchedColors,
    },
    categoryPages: {
      appearsIn,
      missingFrom,
    },
  };

  console.log(JSON.stringify(result, null, 2));
  console.log('\n📋 Summary:\n');
  console.log(`   Colors: ${result.colors.total} total, ${result.colors.withHex} with hex mapping`);
  if (result.colors.missingHex.length > 0) {
    console.log(`   ⚠️  Missing hex: ${result.colors.missingHex.slice(0, 5).join(', ')}${result.colors.missingHex.length > 5 ? '...' : ''}`);
  }
  console.log(`   Sizes: ${result.sizes.total} total, order ${result.sizes.correctOrder ? '✅ correct' : '❌ incorrect'}`);
  console.log(`   Warehouses: ${result.warehouses.total} total, ${result.warehouses.withNames} with names`);
  if (result.warehouses.withZeroRows.length > 0) {
    console.log(`   ⚠️  Warehouses with zero rows: ${result.warehouses.withZeroRows.slice(0, 5).join(', ')}`);
  }
  console.log(`   Media: ${result.media.total} total, ${Object.keys(result.media.byColor).length} colors`);
  if (result.media.unmatchedColors.length > 0) {
    console.log(`   ⚠️  Colors without media: ${result.media.unmatchedColors.slice(0, 5).join(', ')}`);
  }
  if (result.categoryPages.missingFrom.length > 0) {
    console.log(`   ⚠️  Missing from categories: ${result.categoryPages.missingFrom.join(', ')}`);
  }
  console.log();
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});

