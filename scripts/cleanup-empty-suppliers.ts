#!/usr/bin/env tsx
/**
 * Cleanup Empty Supplier Links
 * 
 * Removes supplier links that have no associated product data:
 * - 0 colors
 * - 0 sizes
 * - 0 inventory rows
 * 
 * These are typically duplicates or data quality issues that don't affect functionality.
 */

import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';

// Load environment variables
config({ path: '.env.local' });

const prisma = new PrismaClient();

interface EmptySupplierLink {
  canonicalStyleNumber: string;
  supplier: 'SANMAR' | 'SSACTIVEWEAR';
  supplierPartId: string;
}

const EMPTY_SUPPLIERS_TO_REMOVE: EmptySupplierLink[] = [
  {
    canonicalStyleNumber: '1717',
    supplier: 'SANMAR',
    supplierPartId: 'C1717',
  },
  {
    canonicalStyleNumber: '1717',
    supplier: 'SSACTIVEWEAR',
    supplierPartId: 'B01717',
  },
  {
    canonicalStyleNumber: '5000',
    supplier: 'SANMAR',
    supplierPartId: 'G500',
  },
  {
    canonicalStyleNumber: '5000',
    supplier: 'SSACTIVEWEAR',
    supplierPartId: 'B00060',
  },
];

async function verifyEmptySupplier(link: EmptySupplierLink): Promise<boolean> {
  // Find the canonical style
  const canonicalStyle = await prisma.canonicalStyle.findUnique({
    where: { styleNumber: link.canonicalStyleNumber },
    select: { id: true },
  });

  if (!canonicalStyle) {
    console.log(`⚠️  Canonical style ${link.canonicalStyleNumber} not found`);
    return false;
  }

  // Find the supplier link
  const supplierLink = await prisma.supplierProductLink.findFirst({
    where: {
      canonicalStyleId: canonicalStyle.id,
      supplier: link.supplier,
      supplierPartId: link.supplierPartId,
    },
    select: {
      id: true,
      supplierPartId: true,
    },
  });

  if (!supplierLink) {
    console.log(`⚠️  Supplier link not found: ${link.supplier} ${link.supplierPartId}`);
    return false;
  }

  // Check if there's an associated product
  const product = await prisma.product.findUnique({
    where: { supplierPartId: supplierLink.supplierPartId },
    select: {
      id: true,
      supplierPartId: true,
      _count: {
        select: {
          colors: true,
          sizes: true,
        },
      },
    },
  });

  if (product) {
    const inventoryCount = await prisma.productInventory.count({
      where: { productId: product.id },
    });

    const isEmpty =
      product._count.colors === 0 &&
      product._count.sizes === 0 &&
      inventoryCount === 0;

    if (!isEmpty) {
      console.log(
        `⚠️  Product ${link.supplierPartId} is NOT empty: ${product._count.colors} colors, ${product._count.sizes} sizes, ${inventoryCount} inventory rows`
      );
      return false;
    }

    console.log(`✓ Verified ${link.supplier} ${link.supplierPartId} is empty`);
    return true;
  }

  // No product linked - safe to remove
  console.log(`✓ Verified ${link.supplier} ${link.supplierPartId} has no product`);
  return true;
}

async function removeEmptySupplier(link: EmptySupplierLink): Promise<void> {
  const canonicalStyle = await prisma.canonicalStyle.findUnique({
    where: { styleNumber: link.canonicalStyleNumber },
    select: { id: true },
  });

  if (!canonicalStyle) {
    throw new Error(`Canonical style ${link.canonicalStyleNumber} not found`);
  }

  // Delete the supplier link
  const deleted = await prisma.supplierProductLink.deleteMany({
    where: {
      canonicalStyleId: canonicalStyle.id,
      supplier: link.supplier,
      supplierPartId: link.supplierPartId,
    },
  });

  console.log(
    `  🗑️  Removed ${link.supplier} ${link.supplierPartId} (${deleted.count} record(s))`
  );

  // Check if the associated product is now orphaned (no other supplier links)
  const product = await prisma.product.findUnique({
    where: { supplierPartId: link.supplierPartId },
    select: {
      id: true,
      supplierPartId: true,
    },
  });

  if (product) {
    // Check if any other supplier links reference this supplierPartId
    const otherLinks = await prisma.supplierProductLink.count({
      where: { supplierPartId: link.supplierPartId },
    });

    if (otherLinks === 0) {
      // No other links - safe to delete the product
      await prisma.product.delete({
        where: { id: product.id },
      });
      console.log(
        `  🗑️  Removed orphaned product ${product.supplierPartId}`
      );
    }
  }
}

async function main() {
  console.log('🧹 Cleaning up empty supplier links...\n');

  let verified = 0;
  let removed = 0;
  let skipped = 0;

  for (const link of EMPTY_SUPPLIERS_TO_REMOVE) {
    console.log(
      `\nChecking: ${link.canonicalStyleNumber} → ${link.supplier} ${link.supplierPartId}`
    );

    const isEmpty = await verifyEmptySupplier(link);

    if (isEmpty) {
      verified++;
      try {
        await removeEmptySupplier(link);
        removed++;
      } catch (error) {
        console.error(`  ❌ Failed to remove: ${error}`);
        skipped++;
      }
    } else {
      skipped++;
    }
  }

  console.log('\n✅ Cleanup complete!');
  console.log(`   Verified: ${verified}`);
  console.log(`   Removed: ${removed}`);
  console.log(`   Skipped: ${skipped}`);
}

main()
  .catch((error) => {
    console.error('❌ Error during cleanup:', error);
    process.exitCode = 1;
  })
  .finally(() => {
    prisma.$disconnect();
  });

