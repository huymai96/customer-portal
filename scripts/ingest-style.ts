#!/usr/bin/env tsx

import 'tsconfig-paths/register';
import path from 'node:path';
import { config } from 'dotenv';

const envFiles = ['.env.local', '.env'];
for (const envFile of envFiles) {
  const envPath = path.resolve(process.cwd(), envFile);
  config({ path: envPath, override: false });
}

import { SupplierSource } from '@prisma/client';

import { fetchProductWithFallback, fetchInventoryWithFallback } from '@/integrations/ssactivewear/service';
import { prisma } from '@/lib/prisma';
import { ensureCanonicalStyleLink, guessCanonicalStyleNumber } from '@/services/canonical-style';
import { importSanmarCatalog } from '@/services/sanmar/importer';
import { importSanmarDipInventory } from '@/services/sanmar/dip-importer';

interface SsInventorySizeEntry {
  qty: number;
  colorCode?: string;
  warehouses?: Array<{ warehouseId: string; warehouseName?: string; quantity: number }>;
}

interface CliArgs {
  supplier: SupplierSource;
  styleCode: string;
}

function parseArgs(): CliArgs {
  const [supplierArg, styleArg] = process.argv.slice(2);

  if (!supplierArg || !styleArg) {
    throw new Error('Usage: npm run ingest:style -- <SANMAR|SSACTIVEWEAR> <styleCode>');
  }

  const normalizedSupplier = supplierArg.trim().toUpperCase();
  if (normalizedSupplier !== 'SANMAR' && normalizedSupplier !== 'SSACTIVEWEAR') {
    throw new Error(`Unsupported supplier "${supplierArg}". Must be SANMAR or SSACTIVEWEAR.`);
  }

  return {
    supplier: normalizedSupplier as SupplierSource,
    styleCode: styleArg.trim().toUpperCase(),
  };
}

async function ingestSanmarStyle(styleCode: string) {
  const baseDir = path.resolve(process.env.SANMAR_LOCAL_DIR ?? 'tmp/sanmar');
  const sdlPath = process.env.SANMAR_SDL_PATH ?? path.join(baseDir, 'SanMar_SDL_N.csv');
  const dipPath = process.env.SANMAR_DIP_PATH ?? path.join(baseDir, 'sanmar_dip.txt');

  console.log(`[SANMAR:${styleCode}] Ingesting catalog data from ${sdlPath}`);
  const catalogResult = await importSanmarCatalog({
    sdlPath,
    styleFilter: [styleCode],
  });
  if (catalogResult.missingStyles.length) {
    throw new Error(
      `[SANMAR:${styleCode}] Style not present in catalog CSV. Checked ${
        catalogResult.processed
      } rows. Missing styles: ${catalogResult.missingStyles.join(', ')}`
    );
  }

  console.log(
    `[SANMAR:${styleCode}] Catalog ingest complete (created: ${catalogResult.created}, updated: ${catalogResult.updated})`
  );

  console.log(`[SANMAR:${styleCode}] Ingesting inventory data from ${dipPath}`);
  const inventoryResult = await importSanmarDipInventory({
    dipPath,
    styleFilter: [styleCode],
  });
  if (inventoryResult.missingStyles.length) {
    throw new Error(
      `[SANMAR:${styleCode}] Style not present in DIP inventory file. Missing styles: ${inventoryResult.missingStyles.join(
        ', '
      )}`
    );
  }
  console.log(
    `[SANMAR:${styleCode}] Inventory ingest complete with ${inventoryResult.processed} rows processed`
  );
}

async function ingestSsCatalog(styleCode: string) {
  console.log(`[SSACTIVEWEAR:${styleCode}] Fetching catalog data...`);
  const result = await fetchProductWithFallback(styleCode);

  const { product } = result;
  await prisma.product.upsert({
    where: { supplierPartId: product.supplierPartId },
    create: {
      supplierPartId: product.supplierPartId,
      name: product.name,
      brand: product.brand ?? null,
      defaultColor: product.defaultColor,
      description: product.description ? JSON.parse(JSON.stringify(product.description)) : undefined,
      colors: {
        create: product.colors.map((color) => ({
          colorCode: color.colorCode,
          colorName: color.colorName,
          supplierVariantId: color.supplierVariantId ?? null,
          swatchUrl: color.swatchUrl ?? null,
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
          supplierSku: sku.supplierSku ?? `${product.supplierPartId}_${sku.colorCode}_${sku.sizeCode}`,
        })),
      },
    },
    update: {
      name: product.name,
      brand: product.brand ?? null,
      defaultColor: product.defaultColor,
      description: product.description ? JSON.parse(JSON.stringify(product.description)) : undefined,
      colors: {
        deleteMany: {},
        create: product.colors.map((color) => ({
          colorCode: color.colorCode,
          colorName: color.colorName,
          supplierVariantId: color.supplierVariantId ?? null,
          swatchUrl: color.swatchUrl ?? null,
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
          supplierSku: sku.supplierSku ?? `${product.supplierPartId}_${sku.colorCode}_${sku.sizeCode}`,
        })),
      },
    },
  });

  await ensureCanonicalStyleLink(prisma, {
    supplier: SupplierSource.SSACTIVEWEAR,
    supplierPartId: product.supplierPartId,
    styleNumber: guessCanonicalStyleNumber({
      supplier: SupplierSource.SSACTIVEWEAR,
      supplierPartId: product.supplierPartId,
      brand: product.brand ?? undefined,
    }),
    displayName: product.name,
    brand: product.brand ?? undefined,
  });

  console.log(
    `[SSACTIVEWEAR:${styleCode}] Catalog ingest complete (${product.colors.length} colors, ${product.sizes.length} sizes)`
  );
}

async function ingestSsInventory(styleCode: string) {
  console.log(`[SSACTIVEWEAR:${styleCode}] Fetching inventory...`);
  const result = await fetchInventoryWithFallback(styleCode);

  const product = await prisma.product.findUnique({
    where: { supplierPartId: styleCode.toUpperCase() },
    select: { id: true },
  });

  if (!product) {
    throw new Error(`[SSACTIVEWEAR:${styleCode}] Product not found after catalog ingest.`);
  }

  const fetchedAt = new Date();
  const sizeEntries = Object.entries(result.inventory.bySize as Record<string, SsInventorySizeEntry>);
  for (const [sizeCodeRaw, entry] of sizeEntries) {
    const normalizedSize = sizeCodeRaw.trim().toUpperCase();
    const normalizedColor = (entry.colorCode ?? 'ALL').trim().toUpperCase();
    const warehouses =
      entry.warehouses?.map((warehouse: { warehouseId: string; warehouseName?: string; quantity: number }) => ({
        warehouseId: warehouse.warehouseId,
        warehouseName: warehouse.warehouseName,
        quantity: warehouse.quantity,
      })) ?? undefined;

    await prisma.productInventory.upsert({
      where: {
        supplierPartId_colorCode_sizeCode: {
          supplierPartId: styleCode.toUpperCase(),
          colorCode: normalizedColor,
          sizeCode: normalizedSize,
        },
      },
      create: {
        productId: product.id,
        supplierPartId: styleCode.toUpperCase(),
        colorCode: normalizedColor,
        sizeCode: normalizedSize,
        totalQty: entry.qty,
        warehouses,
        fetchedAt,
      },
      update: {
        productId: product.id,
        totalQty: entry.qty,
        warehouses,
        fetchedAt,
      },
    });
  }

  console.log(`[SSACTIVEWEAR:${styleCode}] Inventory ingest complete (${sizeEntries.length} sizes).`);
}

async function summarizeStyle(supplier: SupplierSource, supplierPartId: string) {
  const canonical = await prisma.canonicalStyle.findFirst({
    where: {
      supplierLinks: {
        some: {
          supplier,
          supplierPartId: supplierPartId.toUpperCase(),
        },
      },
    },
    include: { supplierLinks: true },
  });

  if (!canonical) {
    throw new Error(
      `[${supplier}:${supplierPartId}] No canonical style found after ingest. Verify canonical mapping.`
    );
  }

  const product = await prisma.product.findUnique({
    where: { supplierPartId: supplierPartId.toUpperCase() },
    include: { colors: true, sizes: true },
  });
  const inventoryRows = await prisma.productInventory.findMany({
    where: { supplierPartId: supplierPartId.toUpperCase() },
  });

  const warehouseTotals = new Map<string, number>();
  for (const row of inventoryRows) {
    if (Array.isArray(row.warehouses)) {
      for (const warehouse of row.warehouses as Array<{ warehouseId: string; quantity: number }>) {
        warehouseTotals.set(
          warehouse.warehouseId,
          (warehouseTotals.get(warehouse.warehouseId) ?? 0) + warehouse.quantity
        );
      }
    }
  }

  console.log('--- Canonical Summary ---');
  console.table({
    canonicalStyleId: canonical.id,
    styleNumber: canonical.styleNumber,
    displayName: canonical.displayName,
    brand: canonical.brand ?? 'N/A',
    suppliersLinked: canonical.supplierLinks.length,
  });

  if (canonical.supplierLinks.length) {
    console.log('Suppliers:');
    for (const link of canonical.supplierLinks) {
      console.log(`  - ${link.supplier}: ${link.supplierPartId}`);
    }
  }

  if (product) {
    console.table({
      supplierPartId: supplierPartId.toUpperCase(),
      totalColors: product.colors.length,
      totalSizes: product.sizes.length,
      inventoryRows: inventoryRows.length,
    });
  } else {
    console.warn(`[${supplier}:${supplierPartId}] Product record not found for summary.`);
  }

  if (warehouseTotals.size > 0) {
    console.log('Warehouse totals:');
    for (const [warehouseId, quantity] of warehouseTotals.entries()) {
      console.log(`  ${warehouseId}: ${quantity} pcs`);
    }
  } else {
    console.log('No warehouse data available.');
  }
}

async function runUnifiedIngest(args: CliArgs) {
  if (args.supplier === SupplierSource.SANMAR) {
    await ingestSanmarStyle(args.styleCode);
  } else if (args.supplier === SupplierSource.SSACTIVEWEAR) {
    await ingestSsCatalog(args.styleCode);
    await ingestSsInventory(args.styleCode);
  } else {
    throw new Error(`Unsupported supplier: ${args.supplier}`);
  }

  await summarizeStyle(args.supplier, args.styleCode);
}

async function main() {
  const args = parseArgs();
  await runUnifiedIngest(args);
}

main()
  .catch((error) => {
    console.error('[ingest:style] Failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

