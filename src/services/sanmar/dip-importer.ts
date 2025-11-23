import { createReadStream } from "fs";
import path from "path";
import { parse } from "csv-parse";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { normalizeSanmarWarehouseId } from "@/lib/catalog/warehouse-names";
import { parseDecimal, sanitizeCode } from "@/services/sanmar/importer";

interface ImportDipOptions {
  dipPath: string;
  dryRun?: boolean;
  styleFilter?: string[];
}

interface WarehouseQty {
  warehouseId: string;
  warehouseName?: string | null;
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

interface ImportDipResult {
  processed: number;
  created: number;
  matchedStyles: string[];
  missingStyles: string[];
}

const PIPE_DELIMITER = "|";

export async function importSanmarDipInventory(options: ImportDipOptions): Promise<ImportDipResult> {
  const { dipPath, dryRun = false, styleFilter } = options;
  const resolvedPath = path.resolve(dipPath);

  const aggregates = new Map<string, InventoryAggregate>();
  const fetchedAt = new Date();
  const filterSet =
    styleFilter && styleFilter.length > 0
      ? new Set(styleFilter.map((style) => style.trim().toUpperCase()))
      : undefined;
  const matchedStyles = new Set<string>();

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
      .on("data", (record: Record<string, string>) => {
        const supplierPartId = record.catalog_no?.trim();
        const colorName = record.catalog_color?.trim();
        const size = record.size?.trim();
        const warehouseId = record.whse_no?.trim();
        const warehouseName = record.whse_name?.trim();
        const qtyRaw = record.quantity?.trim();

        if (!supplierPartId || !colorName || !size || !warehouseId || !qtyRaw) {
          return;
        }

        const normalizedSupplierPartId = supplierPartId.toUpperCase();
        if (filterSet && !filterSet.has(normalizedSupplierPartId)) {
          return;
        }

        matchedStyles.add(normalizedSupplierPartId);

        const colorCode = sanitizeCode(colorName, colorName);
        const sizeCode = size.toUpperCase();
        const quantity = Number.parseInt(qtyRaw, 10);
        if (!Number.isFinite(quantity)) {
          return;
        }

        const normalizedWarehouse = normalizeSanmarWarehouseId(warehouseId, warehouseName);

        const key = `${normalizedSupplierPartId}::${colorCode}::${sizeCode}`;
        const entry = aggregates.get(key) ?? {
          supplierPartId: normalizedSupplierPartId,
          colorName,
          colorCode,
          sizeCode,
          totalQty: 0,
          warehouses: [],
          pieceWeight: parseDecimal(record.piece_weight),
        };

        entry.totalQty += quantity;
        entry.warehouses.push({
          warehouseId: normalizedWarehouse.warehouseId,
          warehouseName: normalizedWarehouse.warehouseName,
          quantity,
        });
        aggregates.set(key, entry);
      })
      .on("error", reject)
      .on("end", () => resolve());
  });

  const entries = Array.from(aggregates.values());
  const missingStyles =
    filterSet && filterSet.size > 0
      ? Array.from(filterSet.values()).filter((style) => !matchedStyles.has(style))
      : [];

  if (dryRun) {
    return {
      processed: entries.length,
      created: 0,
      matchedStyles: Array.from(matchedStyles.values()),
      missingStyles,
    };
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
  const colorLookup = buildColorLookup(products);

  const aggregated = new Map<
    string,
    {
      supplierPartId: string;
      colorCode: string;
      sizeCode: string;
      totalQty: number;
      warehouses: Map<string, { warehouseName?: string | null; quantity: number }>;
      fetchedAt: Date;
      productId?: string;
    }
  >();

  for (const entry of entries) {
    const productId = productMap.get(entry.supplierPartId);
    const resolvedColorCode = resolveColorCode(entry, colorLookup.get(entry.supplierPartId));
    const key = `${entry.supplierPartId}::${resolvedColorCode}::${entry.sizeCode}`;
    const record =
      aggregated.get(key) ?? {
        supplierPartId: entry.supplierPartId,
        colorCode: resolvedColorCode,
        sizeCode: entry.sizeCode,
        totalQty: 0,
        warehouses: new Map<string, { warehouseName?: string | null; quantity: number }>(),
        fetchedAt,
        productId,
      };

    record.totalQty += entry.totalQty;
    for (const warehouse of entry.warehouses) {
      const existing = record.warehouses.get(warehouse.warehouseId);
      record.warehouses.set(warehouse.warehouseId, {
        warehouseName: warehouse.warehouseName ?? existing?.warehouseName ?? null,
        quantity: (existing?.quantity ?? 0) + warehouse.quantity,
      });
    }

    aggregated.set(key, record);
  }

  for (const record of aggregated.values()) {
    const warehousesJson = Array.from(record.warehouses.entries()).map(([warehouseId, info]) => ({
      warehouseId,
      warehouseName: info.warehouseName,
      quantity: info.quantity,
    }));

    await prisma.productInventory.upsert({
      where: {
        supplierPartId_colorCode_sizeCode: {
          supplierPartId: record.supplierPartId,
          colorCode: record.colorCode,
          sizeCode: record.sizeCode,
        },
      },
      create: {
        productId: record.productId,
        supplierPartId: record.supplierPartId,
        colorCode: record.colorCode,
        sizeCode: record.sizeCode,
        totalQty: record.totalQty,
        warehouses: warehousesJson as unknown as Prisma.JsonArray,
        fetchedAt: record.fetchedAt,
      },
      update: {
        productId: record.productId,
        totalQty: record.totalQty,
        warehouses: warehousesJson as unknown as Prisma.JsonArray,
        fetchedAt: record.fetchedAt,
      },
    });
  }

  return {
    processed: entries.length,
    created: aggregated.size,
    matchedStyles: Array.from(matchedStyles.values()),
    missingStyles,
  };
}

function buildColorLookup(
  products: Array<{
    supplierPartId: string;
    colors: Array<{ colorCode: string; colorName: string | null }>;
  }>
): Map<string, Map<string, string>> {
  const lookup = new Map<string, Map<string, string>>();
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
    lookup.set(product.supplierPartId, map);
  }
  return lookup;
}

function resolveColorCode(
  entry: InventoryAggregate,
  lookup: Map<string, string> | undefined
): string {
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
  const alnum = trimmed.replace(/[^A-Z0-9]/g, "");
  const noVowels = alnum.replace(/[AEIOU]/g, "");
  const deduped = dedupe(noVowels);
  return [alnum, noVowels, deduped].filter(Boolean);
}

function dedupe(input: string): string {
  if (!input) {
    return input;
  }
  let result = "";
  let previous = "";
  for (const char of input) {
    if (char !== previous) {
      result += char;
      previous = char;
    }
  }
  return result;
}