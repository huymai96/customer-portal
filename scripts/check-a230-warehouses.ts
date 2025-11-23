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
  console.log('Checking A230 inventory data...\n');

  const inventoryRows = await prisma.productInventory.findMany({
    where: {
      supplierPartId: 'A230',
    },
    select: {
      colorCode: true,
      sizeCode: true,
      totalQty: true,
      warehouses: true,
    },
    take: 5, // Check first 5 rows
  });

  console.log(`Found ${inventoryRows.length} inventory rows (showing first 5)\n`);

  for (const row of inventoryRows) {
    console.log(`Color: ${row.colorCode}, Size: ${row.sizeCode}, TotalQty: ${row.totalQty}`);
    console.log(`Warehouses:`, JSON.stringify(row.warehouses, null, 2));
    console.log(`Warehouses type: ${typeof row.warehouses}, isArray: ${Array.isArray(row.warehouses)}`);
    console.log('---\n');
  }

  // Count rows with warehouses
  const allRows = await prisma.productInventory.findMany({
    where: {
      supplierPartId: 'A230',
    },
    select: {
      warehouses: true,
    },
  });

  const rowsWithWarehouses = allRows.filter((r) => {
    return Array.isArray(r.warehouses) && r.warehouses.length > 0;
  });

  console.log(`\nTotal A230 inventory rows: ${allRows.length}`);
  console.log(`Rows with warehouses array: ${rowsWithWarehouses.length}`);
  console.log(`Rows without warehouses: ${allRows.length - rowsWithWarehouses.length}`);

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});

