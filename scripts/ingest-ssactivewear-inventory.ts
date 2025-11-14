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

  const { inventory } = result;
  const sizeCount = Object.keys(inventory.bySize).length;
  console.log(`[${productId}] Found inventory for ${sizeCount} sizes`);

  // For now, just log the inventory - in production you'd upsert to ProductInventory table
  for (const [sizeCode, qty] of Object.entries(inventory.bySize)) {
    console.log(`  ${sizeCode}: ${qty.qty} units${qty.backorderDate ? ` (backorder: ${qty.backorderDate})` : ''}`);
  }

  console.log(`[${productId}] Inventory fetch complete`);
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

