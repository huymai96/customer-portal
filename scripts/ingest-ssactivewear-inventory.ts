#!/usr/bin/env tsx
/**
 * SSActivewear Inventory Ingest Script
 * 
 * Usage:
 *   npm run ingest:ssa:inventory B00060
 *   npm run ingest:ssa:inventory B00060 BLACK
 */

import 'tsconfig-paths/register';
import { fetchInventoryWithFallback } from '@/integrations/ssactivewear/service';
import { prisma } from '@/lib/prisma';

interface CliOptions {
  productId: string;
  colorCode?: string;
}

function parseArgs(): CliOptions | null {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    return null;
  }

  return {
    productId: args[0],
    colorCode: args[1],
  };
}

interface InventorySizeEntry {
  qty: number;
  backorderDate?: string;
  colorCode?: string;
  warehouses?: Array<{ warehouseId: string; warehouseName?: string; quantity: number }>;
}

function normalizeColorCode(raw?: string): string {
  const trimmed = raw?.trim();
  if (!trimmed || trimmed.length === 0) {
    return 'ALL';
  }
  return trimmed.toUpperCase();
}

async function ingestInventory(productId: string, colorCode?: string): Promise<void> {
  console.log(`[${productId}] Fetching inventory data...`);
  if (colorCode) {
    console.log(`[${productId}] Filtering by color: ${colorCode}`);
  }

  const result = await fetchInventoryWithFallback(productId, colorCode);

  console.log(`[${productId}] Source: ${result.source}`);
  if (result.warnings) {
    console.warn(`[${productId}] Warnings:`, result.warnings);
  }

  const product = await prisma.product.findUnique({
    where: { supplierPartId: productId.toUpperCase() },
    select: { id: true },
  });

  if (!product) {
    console.warn(`[${productId}] No matching Product record found; skipping upsert.`);
    return;
  }

  const { inventory } = result;
  const sizeEntries = Object.entries(inventory.bySize as Record<string, InventorySizeEntry>);
  const fetchedAt = new Date();

  for (const [sizeCodeRaw, entry] of sizeEntries) {
    const normalizedSize = sizeCodeRaw.trim().toUpperCase();
    const rawColor = entry.colorCode ?? colorCode ?? 'ALL';
    const normalizedColor = normalizeColorCode(rawColor);

    const warehousesJson =
      entry.warehouses && entry.warehouses.length > 0
        ? entry.warehouses.map((warehouse) => ({
            warehouseId: warehouse.warehouseId,
            warehouseName: warehouse.warehouseName,
            quantity: warehouse.quantity,
          }))
        : undefined;

    await prisma.productInventory.upsert({
      where: {
        supplierPartId_colorCode_sizeCode: {
          supplierPartId: productId.toUpperCase(),
          colorCode: normalizedColor,
          sizeCode: normalizedSize,
        },
      },
      create: {
        productId: product.id,
        supplierPartId: productId.toUpperCase(),
        colorCode: normalizedColor,
        sizeCode: normalizedSize,
        totalQty: entry.qty,
        warehouses: warehousesJson,
        fetchedAt,
      },
      update: {
        productId: product.id,
        totalQty: entry.qty,
        warehouses: warehousesJson,
        fetchedAt,
      },
    });
  }

  console.log(`[${productId}] Upserted inventory for ${sizeEntries.length} sizes.`);
}

async function main() {
  const options = parseArgs();

  if (!options) {
    console.log('Usage: npm run ingest:ssa:inventory <productId> [colorCode]');
    console.log('Example: npm run ingest:ssa:inventory B00060');
    console.log('Example: npm run ingest:ssa:inventory B00060 BLACK');
    return;
  }

  try {
    await ingestInventory(options.productId, options.colorCode);
  } catch (error) {
    console.error(`[${options.productId}] Failed:`, error);
    process.exit(1);
  }

  console.log('Inventory ingest complete.');
}

main()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });

