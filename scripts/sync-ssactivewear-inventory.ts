#!/usr/bin/env tsx
/**
 * SSActivewear Inventory Sync
 * 
 * Syncs current inventory levels for all SSActivewear products in the database.
 * Should be run frequently (hourly/daily) to keep stock levels current.
 * 
 * Usage:
 *   npm run sync:ssa:inventory
 *   npm run sync:ssa:inventory -- --limit 100  # Test with first 100 products
 *   npm run sync:ssa:inventory -- --brands "Gildan"  # Specific brands only
 */

import 'tsconfig-paths/register';
import { loadConfig } from '@/integrations/ssactivewear/config';
import { prisma } from '@/lib/prisma';

interface CliOptions {
  limit?: number;
  brands?: string[];
}

interface SsaProduct {
  sku: string;
  styleID: number;
  colorCode?: string;
  sizeCode?: string;
  qty?: number | string;
  warehouses?: Array<{
    warehouseAbbr: string;
    qty: number | string;
  }>;
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const options: CliOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--limit' && args[i + 1]) {
      options.limit = Number.parseInt(args[++i], 10);
    } else if (arg === '--brands' && args[i + 1]) {
      options.brands = args[++i].split(',').map((b) => b.trim());
    }
  }

  return options;
}

async function fetchInventoryForPartNumber(partNumber: string): Promise<SsaProduct[]> {
  const config = loadConfig();
  const auth = `Basic ${Buffer.from(`${config.accountNumber}:${config.apiKey}`).toString('base64')}`;
  
  const response = await fetch(`${config.restBaseUrl}/products/?partnumber=${partNumber}`, {
    headers: { Authorization: auth },
  });

  if (!response.ok) {
    if (response.status === 404) {
      return [];
    }
    throw new Error(`Failed to fetch inventory for ${partNumber}: ${response.status}`);
  }

  return response.json();
}

async function syncInventoryForProduct(supplierPartId: string, brand: string): Promise<void> {
  const products = await fetchInventoryForPartNumber(supplierPartId);
  
  if (products.length === 0) {
    console.log(`[${brand} ${supplierPartId}] ⚠️  No inventory data found`);
    return;
  }

  // Group inventory by color-size combination
  const inventoryMap = new Map<string, number>();
  
  for (const product of products) {
    const colorCode = product.colorCode || 'DEFAULT';
    const sizeCode = product.sizeCode || 'OSFA';
    const key = `${colorCode}::${sizeCode}`;
    
    let totalQty = 0;
    if (product.warehouses && Array.isArray(product.warehouses)) {
      for (const warehouse of product.warehouses) {
        totalQty += Number.parseInt(String(warehouse.qty || 0), 10) || 0;
      }
    } else if (product.qty != null) {
      totalQty = Number.parseInt(String(product.qty), 10) || 0;
    }
    
    inventoryMap.set(key, (inventoryMap.get(key) || 0) + totalQty);
  }

  // Upsert inventory snapshots
  const now = new Date();
  for (const [key, totalQty] of inventoryMap.entries()) {
    const [colorCode, sizeCode] = key.split('::');
    
    await prisma.productInventory.upsert({
      where: {
        supplierPartId_colorCode_sizeCode: {
          supplierPartId,
          colorCode,
          sizeCode,
        },
      },
      create: {
        supplierPartId,
        colorCode,
        sizeCode,
        totalQty,
        fetchedAt: now,
      },
      update: {
        totalQty,
        fetchedAt: now,
      },
    });
  }

  const totalUnits = Array.from(inventoryMap.values()).reduce((sum, qty) => sum + qty, 0);
  console.log(`[${brand} ${supplierPartId}] ✅ Updated ${inventoryMap.size} SKUs, ${totalUnits.toLocaleString()} total units`);
}

async function main() {
  const options = parseArgs();
  
  console.log('=== SSActivewear Inventory Sync ===\n');

  // Get all SSActivewear products from database
  const whereClause: {
    supplierPartId: { not: { startsWith: string } };
    brand?: { in: string[] };
  } = {
    supplierPartId: {
      not: {
        startsWith: 'SM',  // Exclude SanMar products
      },
    },
  };

  if (options.brands && options.brands.length > 0) {
    whereClause.brand = {
      in: options.brands,
    };
  }

  const products = await prisma.product.findMany({
    where: whereClause,
    select: {
      supplierPartId: true,
      brand: true,
      name: true,
    },
    take: options.limit,
  });

  console.log(`Found ${products.length} SSActivewear products to sync\n`);

  const startTime = Date.now();
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    try {
      await syncInventoryForProduct(product.supplierPartId, product.brand || 'Unknown');
      successCount++;
      
      // Rate limiting: 60 requests/min
      if (i < products.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1100));
      }
    } catch (error) {
      errorCount++;
      console.error(`[${product.brand} ${product.supplierPartId}] ❌ Error:`, error instanceof Error ? error.message : error);
    }

    // Progress update every 10 products
    if ((i + 1) % 10 === 0) {
      const elapsed = (Date.now() - startTime) / 1000;
      const rate = (i + 1) / elapsed;
      const remaining = products.length - (i + 1);
      const eta = remaining / rate;
      console.log(`\n📊 Progress: ${i + 1}/${products.length} (${rate.toFixed(1)} products/sec, ETA: ${Math.ceil(eta / 60)}min)\n`);
    }
  }

  const totalTime = (Date.now() - startTime) / 1000;
  console.log('\n=== Inventory Sync Complete ===');
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

