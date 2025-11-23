import path from 'path';
import { config } from 'dotenv';

const envFiles = ['.env.local', '.env'];
for (const envFile of envFiles) {
  const envPath = path.resolve(process.cwd(), envFile);
  config({ path: envPath, override: false });
}

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const supplierPartId = 'PC43';
  
  // Check Product table
  const product = await prisma.product.findUnique({
    where: { supplierPartId },
    include: {
      colors: { orderBy: { colorCode: 'asc' } },
      sizes: { orderBy: { sizeCode: 'asc' } },
      media: { orderBy: { url: 'asc' } },
    },
  });

  // Check Inventory
  const inventory = await prisma.productInventory.findMany({
    where: { supplierPartId },
  });

  // Get unique colors from inventory
  const inventoryColors = new Set(inventory.map((inv) => inv.colorCode));
  
  // Get unique sizes from inventory
  const inventorySizes = new Set(inventory.map((inv) => inv.sizeCode));

  // Get unique warehouses
  const warehouseIds = new Set<string>();
  for (const inv of inventory) {
    if (Array.isArray(inv.warehouses)) {
      for (const wh of inv.warehouses as Array<{ warehouseId: string }>) {
        warehouseIds.add(wh.warehouseId);
      }
    }
  }

  console.log(JSON.stringify({
    product: product ? {
      exists: true,
      name: product.name,
      brand: product.brand,
      colors: {
        count: product.colors.length,
        codes: product.colors.map((c) => c.colorCode),
      },
      sizes: {
        count: product.sizes.length,
        codes: product.sizes.map((s) => s.sizeCode),
      },
      media: {
        count: product.media.length,
        urls: product.media.slice(0, 5).map((m) => m.url),
      },
    } : { exists: false },
    inventory: {
      rows: inventory.length,
      colors: {
        count: inventoryColors.size,
        codes: Array.from(inventoryColors).sort(),
      },
      sizes: {
        count: inventorySizes.size,
        codes: Array.from(inventorySizes).sort(),
      },
      warehouses: {
        count: warehouseIds.size,
        ids: Array.from(warehouseIds).sort(),
      },
    },
    issues: {
      missingColors: Array.from(inventoryColors).filter((c) => 
        !product?.colors.some((pc) => pc.colorCode === c)
      ),
      missingSizes: Array.from(inventorySizes).filter((s) =>
        !product?.sizes.some((ps) => ps.sizeCode === s)
      ),
      productMissing: !product,
    },
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });



