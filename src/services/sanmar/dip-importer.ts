import { createReadStream } from 'fs';
import path from 'path';
import { parse } from 'csv-parse';
import { Prisma } from '@prisma/client';

import { prisma } from '@/lib/prisma';
import { sanitizeCode, parseDecimal } from '@/services/sanmar/importer';

interface ImportDipOptions {
  dipPath: string;
  dryRun?: boolean;
}

interface WarehouseQty {
  warehouseId: string;
  quantity: number;
}

interface InventoryAggregate {
  supplierPartId: string;
  colorName: string;
  colorCode: string;
  sizeCode: string;
  totalQty: number;
  warehouses: WarehouseQty[];
  pieceWeight?: number | null;
}

const PIPE_DELIMITER = '|';

export async function importSanmarDipInventory(options: ImportDipOptions) {
  const { dipPath, dryRun = false } = options;
  const resolvedPath = path.resolve(dipPath);

  const aggregates = new Map<string, InventoryAggregate>();
  const fetchedAt = new Date();

  await new Promise<void>((resolve, reject) => {
    createReadStream(resolvedPath)
      .pipe(
        parse({
          columns: true,
          delimiter: PIPE_DELIMITER,
          skip_empty_lines: true,
          trim: true,
        })
      )
      .on('data', (record: Record<string, string>) => {
        const supplierPartId = record.catalog_no?.trim();
        const colorName = record.catalog_color?.trim();
        const size = record.size?.trim();
        const warehouseId = record.whse_no?.trim();
        const qtyRaw = record.quantity?.trim();

        if (!supplierPartId || !colorName || !size || !warehouseId || !qtyRaw) {
          return;
        }

        const colorCode = sanitizeCode(colorName, colorName);
        const sizeCode = size.toUpperCase();
        const quantity = Number.parseInt(qtyRaw, 10);
        if (!Number.isFinite(quantity)) {
          return;
        }

        const key = `${supplierPartId.toUpperCase()}::${colorCode}::${sizeCode}`;
        const entry = aggregates.get(key) ?? {
          supplierPartId: supplierPartId.toUpperCase(),
          colorName,
          colorCode,
          sizeCode,
          totalQty: 0,
          warehouses: [],
          pieceWeight: parseDecimal(record.piece_weight),
        };

        entry.totalQty += quantity;
        entry.warehouses.push({ warehouseId, quantity });
        aggregates.set(key, entry);
      })
      .on('error', reject)
      .on('end', () => resolve());
  });

  const entries = Array.from(aggregates.values());
  if (dryRun) {
    return { processed: entries.length, created: 0 }; // No DB writes in dry run
  }

  const supplierPartIds = Array.from(new Set(entries.map((entry) => entry.supplierPartId)));
  const products = await prisma.product.findMany({
    where: { supplierPartId: { in: supplierPartIds } },
    select: {
      id: true,
      supplierPartId: true,
      colors: { select: { colorCode: true, colorName: true } },
    },
  });
  const productMap = new Map(products.map((product) => [product.supplierPartId, product.id]));
  const colorLookup = new Map<string, Map<string, string>>();
  for (const product of products) {
    const map = new Map<string, string>();
    for (const color of product.colors) {
      if (!color.colorName) continue;
      for (const key of buildKeyVariants(color.colorName)) {
        if (!map.has(key)) {
          map.set(key, color.colorCode);
        }
      }
    }
    colorLookup.set(product.supplierPartId, map);
  }

  const aggregated = new Map<
    string,
    {
      supplierPartId: string;
      colorCode: string;
      sizeCode: string;
      totalQty: number;
      warehouses: Map<string, number>;
      fetchedAt: Date;
      productId?: string;
    }
  >();

  for (const entry of entries) {
    const productId = productMap.get(entry.supplierPartId);
    const colorCode = resolveColorCode(entry, colorLookup.get(entry.supplierPartId));
    const key = `${entry.supplierPartId}::${colorCode}::${entry.sizeCode}`;
    const record =
      aggregated.get(key) ?? {
        supplierPartId: entry.supplierPartId,
        colorCode,
        sizeCode: entry.sizeCode,
        totalQty: 0,
        warehouses: new Map<string, number>(),
        fetchedAt,
        productId,
      };

    record.totalQty += entry.totalQty;
    for (const warehouse of entry.warehouses) {
      const existingQty = record.warehouses.get(warehouse.warehouseId) ?? 0;
      record.warehouses.set(warehouse.warehouseId, existingQty + warehouse.quantity);
    }

    aggregated.set(key, record);
  }

  const data = Array.from(aggregated.values()).map((record) => ({
    supplierPartId: record.supplierPartId,
    colorCode: record.colorCode,
    sizeCode: record.sizeCode,
    totalQty: record.totalQty,
    warehouses: Array.from(record.warehouses.entries()).map(([warehouseId, quantity]) => ({
      warehouseId,
      quantity,
    })) as unknown as Prisma.JsonArray,
    fetchedAt: record.fetchedAt,
    productId: record.productId,
  }));

  await prisma.productInventory.deleteMany({});
  if (data.length > 0) {
    await prisma.productInventory.createMany({ data });
  }

  return { processed: entries.length, created: entries.length };
}

function resolveColorCode(
  entry: InventoryAggregate,
  lookup: Map<string, string> | undefined
) {
  if (!lookup) {
    return entry.colorCode;
  }
  for (const key of buildKeyVariants(entry.colorName)) {
    const match = lookup.get(key);
    if (match) {
      return match;
    }
  }
  return entry.colorCode;
}

function buildKeyVariants(name: string): string[] {
  const trimmed = name.trim().toUpperCase();
  const alnum = trimmed.replace(/[^A-Z0-9]/g, '');
  const noVowels = alnum.replace(/[AEIOU]/g, '');
  const deduped = dedupe(noVowels);
  return [alnum, noVowels, deduped].filter(Boolean);
}

function dedupe(input: string): string {
  if (!input) {
    return input;
  }
  let result = '';
  let previous = '';
  for (const char of input) {
    if (char !== previous) {
      result += char;
      previous = char;
    }
  }
  return result;
}
