#!/usr/bin/env tsx
/**
 * Manual S&S Activewear inventory sync
 * 
 * Syncs inventory for a specific supplier part ID or all S&S products
 * 
 * Usage:
 *   npx tsx scripts/sync-ssa-inventory-manual.ts [supplierPartId]
 *   npx tsx scripts/sync-ssa-inventory-manual.ts A230
 *   npx tsx scripts/sync-ssa-inventory-manual.ts  # syncs all S&S products
 */

import 'tsconfig-paths/register';
import { config } from 'dotenv';
import path from 'path';

const envFiles = ['.env.local', '.env'];
for (const envFile of envFiles) {
  const envPath = path.resolve(process.cwd(), envFile);
  config({ path: envPath, override: false });
}

import { loadConfig } from '@/integrations/ssactivewear/config';
import { prisma } from '@/lib/prisma';

interface SsaProduct {
  sku: string;
  colorCode?: string;
  sizeCode?: string;
  qty?: number | string;
  warehouses?: Array<{
    warehouseAbbr: string;
    qty: number | string;
  }>;
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
    throw new Error(`API returned ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

async function syncInventoryForProduct(supplierPartId: string): Promise<number> {
  console.log(`\nSyncing ${supplierPartId}...`);
  const products = await fetchInventoryForPartNumber(supplierPartId);
  
  if (products.length === 0) {
    console.log(`  ⚠️  No products found for ${supplierPartId}`);
    return 0;
  }

  console.log(`  Found ${products.length} product variants`);

  const inventoryMap = new Map<string, { totalQty: number; warehouses: Array<{ warehouseId: string; warehouseName?: string; quantity: number }> }>();
  
  for (const product of products) {
    const colorCode = product.colorCode || 'DEFAULT';
    const sizeCode = product.sizeCode || 'OSFA';
    const key = `${colorCode}::${sizeCode}`;
    
    let totalQty = 0;
    const warehouses: Array<{ warehouseId: string; warehouseName?: string; quantity: number }> = [];
    
    if (product.warehouses && Array.isArray(product.warehouses)) {
      for (const warehouse of product.warehouses) {
        const qty = Number.parseInt(String(warehouse.qty || 0), 10) || 0;
        totalQty += qty;
        if (qty > 0 || warehouse.warehouseAbbr) {
          warehouses.push({
            warehouseId: warehouse.warehouseAbbr || 'UNKNOWN',
            warehouseName: warehouse.warehouseAbbr || undefined,
            quantity: qty,
          });
        }
      }
    } else if (product.qty != null) {
      totalQty = Number.parseInt(String(product.qty), 10) || 0;
    }
    
    const existing = inventoryMap.get(key);
    if (existing) {
      existing.totalQty += totalQty;
      // Merge warehouses by warehouseId
      const warehouseMap = new Map<string, { warehouseId: string; warehouseName?: string; quantity: number }>();
      for (const wh of existing.warehouses) {
        warehouseMap.set(wh.warehouseId, wh);
      }
      for (const wh of warehouses) {
        const existingWh = warehouseMap.get(wh.warehouseId);
        if (existingWh) {
          existingWh.quantity += wh.quantity;
        } else {
          warehouseMap.set(wh.warehouseId, wh);
        }
      }
      existing.warehouses = Array.from(warehouseMap.values());
    } else {
      inventoryMap.set(key, { totalQty, warehouses });
    }
  }

  const now = new Date();
  let updatedCount = 0;
  let warehouseCount = 0;

  for (const [key, data] of inventoryMap.entries()) {
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
        totalQty: data.totalQty,
        warehouses: data.warehouses.length > 0 ? data.warehouses : undefined,
        fetchedAt: now,
      },
      update: {
        totalQty: data.totalQty,
        warehouses: data.warehouses.length > 0 ? data.warehouses : undefined,
        fetchedAt: now,
      },
    });

    updatedCount++;
    warehouseCount += data.warehouses.length;
  }

  console.log(`  ✅ Updated ${updatedCount} inventory rows with ${warehouseCount} total warehouse entries`);
  return inventoryMap.size;
}

async function main() {
  const supplierPartId = process.argv[2];

  if (supplierPartId) {
    // Sync specific product
    console.log(`\n🔄 Manual S&S Activewear inventory sync for: ${supplierPartId}\n`);
    try {
      await syncInventoryForProduct(supplierPartId);
      console.log(`\n✅ Sync complete for ${supplierPartId}`);
    } catch (error) {
      console.error(`\n❌ Error syncing ${supplierPartId}:`, error);
      process.exit(1);
    }
  } else {
    // Sync all S&S products (limit to 100 to avoid timeout)
    console.log(`\n🔄 Manual S&S Activewear inventory sync for all products\n`);
    
    const products = await prisma.product.findMany({
      where: {
        supplierPartId: {
          not: { startsWith: 'SM' },
        },
      },
      select: {
        supplierPartId: true,
        brand: true,
      },
      take: 100,
      orderBy: {
        updatedAt: 'asc',
      },
    });

    console.log(`Found ${products.length} S&S products to sync\n`);

    let successCount = 0;
    let errorCount = 0;

    for (const product of products) {
      try {
        await syncInventoryForProduct(product.supplierPartId);
        successCount++;
      } catch (error) {
        console.error(`  ❌ Error syncing ${product.supplierPartId}:`, error);
        errorCount++;
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`  ✅ Success: ${successCount}`);
    console.log(`  ❌ Errors: ${errorCount}`);
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});

