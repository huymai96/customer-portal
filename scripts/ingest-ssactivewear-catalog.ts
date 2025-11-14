#!/usr/bin/env tsx
/**
 * SSActivewear Catalog Ingest Script
 * 
 * Usage:
 *   npm run ingest:ssa:catalog B00060 B12345
 *   npm run ingest:ssa:catalog -- --all
 */

import 'tsconfig-paths/register';
import { fetchProductWithFallback } from '@/integrations/ssactivewear/service';
import { prisma } from '@/lib/prisma';

interface CliOptions {
  productIds: string[];
  fetchAll: boolean;
}

function parseArgs(): CliOptions {
  const productIds: string[] = [];
  let fetchAll = false;

  for (const arg of process.argv.slice(2)) {
    if (arg === '--all') {
      fetchAll = true;
    } else if (!arg.startsWith('--')) {
      productIds.push(arg);
    }
  }

  return { productIds, fetchAll };
}

async function ingestProduct(productId: string): Promise<void> {
  console.log(`[${productId}] Fetching product data...`);
  
  const result = await fetchProductWithFallback(productId);
  
  console.log(`[${productId}] Source: ${result.source}`);
  if (result.warnings) {
    console.warn(`[${productId}] Warnings:`, result.warnings);
  }

  const { product } = result;

  console.log(`[${productId}] Upserting product record...`);
  await prisma.product.upsert({
    where: { supplierPartId: product.supplierPartId },
    create: {
      supplierPartId: product.supplierPartId,
      name: product.name,
      brand: product.brand || null,
      defaultColor: product.defaultColor,
      description: product.description ? JSON.parse(JSON.stringify(product.description)) : undefined,
      attributes: undefined,
      colors: {
        create: product.colors.map((color) => ({
          colorCode: color.colorCode,
          colorName: color.colorName,
          supplierVariantId: color.supplierVariantId || null,
          swatchUrl: color.swatchUrl || null,
        })),
      },
      sizes: {
        create: product.sizes.map((size) => ({
          sizeCode: size.code,
          display: size.display,
          sort: size.sort,
        })),
      },
      media: {
        create: product.media.flatMap((group) =>
          group.urls.map((url, index) => ({
            colorCode: group.colorCode,
            url,
            position: index,
          }))
        ),
      },
      skus: {
        create: product.skuMap.map((sku) => ({
          colorCode: sku.colorCode,
          sizeCode: sku.sizeCode,
          supplierSku: sku.supplierSku || `${product.supplierPartId}_${sku.colorCode}_${sku.sizeCode}`,
        })),
      },
    },
    update: {
      name: product.name,
      brand: product.brand || null,
      defaultColor: product.defaultColor,
      description: product.description ? JSON.parse(JSON.stringify(product.description)) : undefined,
      colors: {
        deleteMany: {},
        create: product.colors.map((color) => ({
          colorCode: color.colorCode,
          colorName: color.colorName,
          supplierVariantId: color.supplierVariantId || null,
          swatchUrl: color.swatchUrl || null,
        })),
      },
      sizes: {
        deleteMany: {},
        create: product.sizes.map((size) => ({
          sizeCode: size.code,
          display: size.display,
          sort: size.sort,
        })),
      },
      media: {
        deleteMany: {},
        create: product.media.flatMap((group) =>
          group.urls.map((url, index) => ({
            colorCode: group.colorCode,
            url,
            position: index,
          }))
        ),
      },
      skus: {
        deleteMany: {},
        create: product.skuMap.map((sku) => ({
          colorCode: sku.colorCode,
          sizeCode: sku.sizeCode,
          supplierSku: sku.supplierSku || `${product.supplierPartId}_${sku.colorCode}_${sku.sizeCode}`,
        })),
      },
    },
  });

  console.log(`[${productId}] Success: ${product.colors.length} colors, ${product.sizes.length} sizes`);
}

async function main() {
  const options = parseArgs();

  if (options.fetchAll) {
    console.error('--all mode not yet implemented. Please specify product IDs.');
    process.exit(1);
  }

  if (options.productIds.length === 0) {
    console.log('Usage: npm run ingest:ssa:catalog <productId> [...]');
    console.log('Example: npm run ingest:ssa:catalog B00060 B12345');
    return;
  }

  for (const productId of options.productIds) {
    try {
      await ingestProduct(productId);
    } catch (error) {
      console.error(`[${productId}] Failed:`, error);
    }
  }

  console.log('Catalog ingest complete.');
}

main()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });

