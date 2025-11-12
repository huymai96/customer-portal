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
    select: { id: true, supplierPartId: true },
  });
  const productMap = new Map(products.map((product) => [product.supplierPartId, product.id]));

  const data = entries.map((entry) => {
    const warehousesPayload =
      entry.warehouses.length > 0 ? (entry.warehouses as unknown as Prisma.JsonArray) : undefined;

    const base = {
      supplierPartId: entry.supplierPartId,
      colorCode: entry.colorCode,
      sizeCode: entry.sizeCode,
      totalQty: entry.totalQty,
      warehouses: warehousesPayload,
      fetchedAt,
    } as {
      supplierPartId: string;
      colorCode: string;
      sizeCode: string;
      totalQty: number;
      warehouses?: Prisma.JsonArray;
      fetchedAt: Date;
      productId?: string;
    };

    const productId = productMap.get(entry.supplierPartId);
    if (productId) {
      base.productId = productId;
    }
    return base;
  });

  await prisma.productInventory.deleteMany({});
  if (data.length > 0) {
    await prisma.productInventory.createMany({ data });
  }

  return { processed: entries.length, created: entries.length };
}
