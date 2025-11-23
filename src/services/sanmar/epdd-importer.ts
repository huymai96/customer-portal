/**
 * SanMar EPDD (Extended Product Data) Importer
 * 
 * Processes SanMar_EPDD.csv which contains:
 * - Bulk inventory data
 * - Main category and subcategory data
 * - Additional product attributes
 * - Pricing information (if not in SDL)
 */

import { createReadStream } from 'fs';
import path from 'path';
import { parse } from 'csv-parse';
import { Prisma } from '@prisma/client';

import { prisma } from '@/lib/prisma';
import { sanitizeCode, parseDecimal } from '@/services/sanmar/importer';

interface ImportEpddOptions {
  epddPath: string;
  dryRun?: boolean;
  styleFilter?: string[];
}

interface EpddRecord {
  supplierPartId: string;
  mainCategory?: string | null;
  subCategory?: string | null;
  bulkInventory?: number | null;
  pricing?: Record<string, unknown>;
  attributes?: Record<string, unknown>;
}

export interface ImportEpddResult {
  processed: number;
  updated: number;
  matchedStyles: string[];
  missingStyles: string[];
}

export async function importSanmarEpdd(options: ImportEpddOptions): Promise<ImportEpddResult> {
  const { epddPath, dryRun = false, styleFilter } = options;
  const resolvedPath = path.resolve(epddPath);

  const epddData = new Map<string, EpddRecord>();
  const filterSet =
    styleFilter && styleFilter.length > 0
      ? new Set(styleFilter.map((style) => style.trim().toUpperCase()))
      : undefined;
  const matchedStyles = new Set<string>();

  let processedRows = 0;

  await new Promise<void>((resolve, reject) => {
    createReadStream(resolvedPath)
      .pipe(
        parse({
          columns: true,
          skip_empty_lines: true,
          relax_quotes: true,
        })
      )
      .on('data', (record: Record<string, string>) => {
        processedRows += 1;
        processEpddRecord(epddData, record, filterSet, matchedStyles);
      })
      .on('error', reject)
      .on('end', () => resolve());
  });

  let updated = 0;
  let processed = 0;

  for (const [supplierPartId, epddRecord] of epddData.entries()) {
    processed += 1;
    if (dryRun) {
      continue;
    }

    // Find existing product
    const product = await prisma.product.findUnique({
      where: { supplierPartId },
      select: { id: true, attributes: true },
    });

    if (!product) {
      // Product doesn't exist yet - will be created by SDL import
      continue;
    }

    // Merge EPDD data into product attributes
    const existingAttributes = (product.attributes as Prisma.JsonObject) ?? {};
    const updatedAttributes: Record<string, Prisma.JsonValue> = {
      ...existingAttributes,
      // Add EPDD-specific fields
      ...(epddRecord.mainCategory && { mainCategory: epddRecord.mainCategory }),
      ...(epddRecord.subCategory && { subCategory: epddRecord.subCategory }),
      ...(epddRecord.bulkInventory !== null && epddRecord.bulkInventory !== undefined && {
        bulkInventory: epddRecord.bulkInventory,
      }),
      // Merge any additional EPDD attributes
      ...(epddRecord.attributes ?? {}),
      // Merge pricing if provided
      ...(epddRecord.pricing && Object.keys(epddRecord.pricing).length > 0 && {
        pricing: epddRecord.pricing as Prisma.JsonValue,
      }),
    };

    await prisma.product.update({
      where: { id: product.id },
      data: {
        attributes: updatedAttributes,
      },
    });

    updated += 1;
  }

  const missingStyles =
    filterSet && filterSet.size > 0
      ? Array.from(filterSet.values()).filter((style) => !matchedStyles.has(style))
      : [];

  return {
    processed,
    updated,
    matchedStyles: Array.from(matchedStyles.values()),
    missingStyles,
  };
}

function processEpddRecord(
  epddData: Map<string, EpddRecord>,
  record: Record<string, string>,
  styleFilter?: Set<string>,
  matchedStyles?: Set<string>
) {
  // EPDD file structure may vary - adjust field names based on actual CSV columns
  // Common field names: STYLE#, MAIN_CATEGORY, SUB_CATEGORY, BULK_INVENTORY, etc.
  const styleRaw = record['STYLE#'] ?? record['STYLE'] ?? record['STYLE_NUMBER'] ?? record['PART_ID'];
  const style = styleRaw?.trim();
  if (!style) {
    return;
  }

  const supplierPartId = style.toUpperCase().trim();
  if (styleFilter && !styleFilter.has(supplierPartId)) {
    return;
  }
  if (matchedStyles) {
    matchedStyles.add(supplierPartId);
  }

  const mainCategory = (record['MAIN_CATEGORY'] ?? record['CATEGORY'] ?? record['MAIN_CAT'])?.trim() || null;
  const subCategory = (record['SUB_CATEGORY'] ?? record['SUB_CAT'] ?? record['SUB_CATEGORY_NAME'])?.trim() || null;
  const bulkInventoryRaw = record['BULK_INVENTORY'] ?? record['BULK_QTY'] ?? record['BULK_STOCK']?.trim();
  const bulkInventory = bulkInventoryRaw ? parseDecimal(bulkInventoryRaw) : null;

  // Extract pricing fields (adjust field names based on actual CSV)
  const pricing: Record<string, unknown> = {};
  if (record['PRICE'] || record['UNIT_PRICE']) {
    const price = parseDecimal(record['PRICE'] ?? record['UNIT_PRICE']);
    if (price !== null) {
      pricing.unitPrice = price;
    }
  }
  if (record['BULK_PRICE']) {
    const bulkPrice = parseDecimal(record['BULK_PRICE']);
    if (bulkPrice !== null) {
      pricing.bulkPrice = bulkPrice;
    }
  }

  // Collect any additional attributes
  const attributes: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    // Skip already processed fields
    if (
      ['STYLE#', 'STYLE', 'STYLE_NUMBER', 'PART_ID', 'MAIN_CATEGORY', 'CATEGORY', 'MAIN_CAT',
       'SUB_CATEGORY', 'SUB_CAT', 'SUB_CATEGORY_NAME', 'BULK_INVENTORY', 'BULK_QTY', 'BULK_STOCK',
       'PRICE', 'UNIT_PRICE', 'BULK_PRICE'].includes(key.toUpperCase())
    ) {
      continue;
    }
    if (value && value.trim()) {
      const normalizedKey = key.trim();
      // Try to parse as number if it looks numeric
      const numValue = parseDecimal(value);
      attributes[normalizedKey] = numValue !== null ? numValue : value.trim();
    }
  }

  const existing = epddData.get(supplierPartId);
  if (existing) {
    // Merge data (EPDD may have multiple rows per product)
    existing.mainCategory = existing.mainCategory || mainCategory;
    existing.subCategory = existing.subCategory || subCategory;
    existing.bulkInventory = existing.bulkInventory ?? bulkInventory;
    Object.assign(existing.pricing ??= {}, pricing);
    Object.assign(existing.attributes ??= {}, attributes);
  } else {
    epddData.set(supplierPartId, {
      supplierPartId,
      mainCategory,
      subCategory,
      bulkInventory,
      pricing: Object.keys(pricing).length > 0 ? pricing : undefined,
      attributes: Object.keys(attributes).length > 0 ? attributes : undefined,
    });
  }
}

