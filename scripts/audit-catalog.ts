#!/usr/bin/env tsx
import 'tsconfig-paths/register';
import fs from 'node:fs';
import path from 'node:path';

import { SupplierSource } from '@prisma/client';

function loadEnvFile(fileName = '.env.local'): void {
  const filePath = path.resolve(process.cwd(), fileName);
  if (!fs.existsSync(filePath)) {
    console.warn(`[audit-catalog] Env file not found: ${filePath}`);
    return;
  }
  const contents = fs.readFileSync(filePath, 'utf-8');
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([A-Z0-9_]+)=(.*)$/i);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key]) continue;
    const value = rawValue.replace(/^"|"$/g, '');
    process.env[key] = value;
  }
}

loadEnvFile();

interface SupplierBreakdown {
  supplier: SupplierSource;
  totalLinks: number;
  withProduct: number;
  missingProduct: number;
}

async function main() {
  const { prisma } = await import('@/lib/prisma');

  const [productCount, inventoryCount, canonicalCount, linkCount] = await Promise.all([
    prisma.product.count(),
    prisma.productInventory.count(),
    prisma.canonicalStyle.count(),
    prisma.supplierProductLink.count(),
  ]);

  const crossSupplierCount = await prisma.canonicalStyle.count({
    where: {
      AND: [
        { supplierLinks: { some: { supplier: SupplierSource.SANMAR } } },
        { supplierLinks: { some: { supplier: SupplierSource.SSACTIVEWEAR } } },
      ],
    },
  });

  const sanmarOnly = await prisma.canonicalStyle.count({
    where: {
      supplierLinks: {
        some: { supplier: SupplierSource.SANMAR },
      },
      NOT: {
        supplierLinks: {
          some: { supplier: SupplierSource.SSACTIVEWEAR },
        },
      },
    },
  });

  const ssOnly = await prisma.canonicalStyle.count({
    where: {
      supplierLinks: {
        some: { supplier: SupplierSource.SSACTIVEWEAR },
      },
      NOT: {
        supplierLinks: {
          some: { supplier: SupplierSource.SANMAR },
        },
      },
    },
  });

  const [links, products] = await Promise.all([
    prisma.supplierProductLink.findMany({
      select: { supplier: true, supplierPartId: true },
    }),
    prisma.product.findMany({
      select: { supplierPartId: true },
    }),
  ]);

  const productSet = new Set(products.map((p) => p.supplierPartId.toUpperCase()));
  const supplierStats = new Map<SupplierSource, SupplierBreakdown>();

  for (const supplier of Object.values(SupplierSource)) {
    supplierStats.set(supplier, {
      supplier,
      totalLinks: 0,
      withProduct: 0,
      missingProduct: 0,
    });
  }

  for (const link of links) {
    const stats = supplierStats.get(link.supplier)!;
    stats.totalLinks += 1;
    if (productSet.has(link.supplierPartId.toUpperCase())) {
      stats.withProduct += 1;
    } else {
      stats.missingProduct += 1;
    }
  }

  const latestStyles = await prisma.canonicalStyle.findMany({
    orderBy: { updatedAt: 'desc' },
    take: 5,
    include: {
      supplierLinks: true,
    },
  });

  console.log('\n=== Catalog Audit ===');
  console.log(`Products: ${productCount}`);
  console.log(`Inventory rows: ${inventoryCount}`);
  console.log(`Canonical styles: ${canonicalCount}`);
  console.log(`Supplier links: ${linkCount}`);
  console.log(`Cross-supplier styles (SanMar + S&S): ${crossSupplierCount}`);
  console.log(`SanMar-only canonical styles: ${sanmarOnly}`);
  console.log(`S&S-only canonical styles: ${ssOnly}`);

  console.log('\nSupplier coverage:');
  for (const stats of supplierStats.values()) {
    console.log(
      `  ${stats.supplier}: ${stats.totalLinks} links (${stats.withProduct} with product, ${stats.missingProduct} missing product)`
    );
  }

  console.log('\nLatest canonical styles:');
  for (const style of latestStyles) {
    const supplierList = style.supplierLinks.map((link) => `${link.supplier}:${link.supplierPartId}`).join(', ');
    console.log(`  ${style.styleNumber} • ${style.displayName} (${style.brand ?? 'Unknown'}) -> ${supplierList}`);
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('Catalog audit failed', error);
  process.exit(1);
});

