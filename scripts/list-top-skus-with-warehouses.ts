#!/usr/bin/env tsx

import 'tsconfig-paths/register';
import { config } from 'dotenv';
import path from 'path';

const envFiles = ['.env.local', '.env'];
for (const envFile of envFiles) {
  const envPath = path.resolve(process.cwd(), envFile);
  config({ path: envPath, override: false });
}

import { prisma } from '@/lib/prisma';

async function main() {
  console.log('Finding top 5 SKUs with warehouse data...\n');

  // Get all inventory rows with warehouses
  const inventoryRows = await prisma.productInventory.findMany({
    where: {
      warehouses: {
        not: null,
      },
    },
    select: {
      supplierPartId: true,
      colorCode: true,
      sizeCode: true,
      totalQty: true,
      warehouses: true,
    },
  });

  // Group by supplierPartId
  const skuMap = new Map<string, {
    supplierPartId: string;
    totalRows: number;
    totalWarehouses: number;
    sampleWarehouses: Array<{ warehouseId: string; quantity: number }>;
    totalQty: number;
  }>();

  for (const row of inventoryRows) {
    const warehouses = Array.isArray(row.warehouses) ? row.warehouses : [];
    if (warehouses.length === 0) continue;

    const existing = skuMap.get(row.supplierPartId);
    if (existing) {
      existing.totalRows++;
      existing.totalQty += row.totalQty;
      // Collect unique warehouses
      const warehouseIds = new Set(existing.sampleWarehouses.map(w => w.warehouseId));
      for (const wh of warehouses) {
        if (!warehouseIds.has(wh.warehouseId)) {
          existing.sampleWarehouses.push(wh);
          existing.totalWarehouses = Math.max(existing.totalWarehouses, warehouseIds.size + 1);
        }
      }
    } else {
      skuMap.set(row.supplierPartId, {
        supplierPartId: row.supplierPartId,
        totalRows: 1,
        totalWarehouses: warehouses.length,
        sampleWarehouses: warehouses.slice(0, 5), // First 5 warehouses as sample
        totalQty: row.totalQty,
      });
    }
  }

  // Sort by total rows (most inventory data)
  const sortedSkus = Array.from(skuMap.values())
    .sort((a, b) => b.totalRows - a.totalRows)
    .slice(0, 5);

  console.log('Top 5 SKUs with Warehouse Data:\n');
  for (let i = 0; i < sortedSkus.length; i++) {
    const sku = sortedSkus[i];
    console.log(`${i + 1}. ${sku.supplierPartId}`);
    console.log(`   Inventory Rows: ${sku.totalRows}`);
    console.log(`   Unique Warehouses: ${sku.totalWarehouses}`);
    console.log(`   Total Quantity: ${sku.totalQty.toLocaleString()}`);
    console.log(`   Sample Warehouses:`);
    for (const wh of sku.sampleWarehouses.slice(0, 3)) {
      console.log(`     - ${wh.warehouseId}: ${wh.quantity.toLocaleString()} qty`);
    }
    if (sku.sampleWarehouses.length > 3) {
      console.log(`     ... and ${sku.sampleWarehouses.length - 3} more`);
    }
    console.log('');
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});

