import { createReadStream } from 'fs';
import path from 'path';
import { parse } from 'csv-parse';
import { Prisma } from '@prisma/client';

import { prisma } from '@/lib/prisma';

interface ProductAccumulator {
  supplierPartId: string;
  name: string;
  description: string[];
  brand?: string | null;
  defaultColor?: string | null;
  attributes: Record<string, unknown>;
  colors: Map<string, ProductColorAccumulator>;
  sizes: Map<string, ProductSizeAccumulator>;
  media: Map<string, ProductMediaAccumulator>;
  skus: Map<string, ProductSkuAccumulator>;
  keywords: Set<string>;
}

interface ProductColorAccumulator {
  colorCode: string;
  colorName: string;
  supplierVariantId?: string | null;
  swatchUrl?: string | null;
}

interface ProductSizeAccumulator {
  sizeCode: string;
  display: string;
  sort?: number | null;
}

interface ProductMediaAccumulator {
  url: string;
  colorCode?: string | null;
  position?: number | null;
}

interface ProductSkuAccumulator {
  colorCode: string;
  sizeCode: string;
  supplierSku: string;
}

export interface ImportOptions {
  sdlPath: string;
  dryRun?: boolean;
  limit?: number;
}

export interface ImportResult {
  processed: number;
  created: number;
  updated: number;
}

const NUMBER_REGEX = /-?[0-9]+(?:\.[0-9]+)?/u;

export function sanitizeCode(input: string, fallback: string): string {
  const normalized = input
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9]+/gu, '_')
    .replace(/^_+|_+$/gu, '')
    .toUpperCase();
  return normalized.length > 0 ? normalized : fallback;
}

function splitDescription(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const cleaned = raw.replace(/\r?\n/gu, ' ').replace(/\s+/gu, ' ').trim();
  return cleaned
    .split('|')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

export function parseDecimal(input: string | null | undefined): number | null {
  if (!input) return null;
  const sanitized = input.replace(/[^0-9.,-]/gu, '').replace(/,/gu, '');
  const match = NUMBER_REGEX.exec(sanitized);
  if (!match) return null;
  const value = Number.parseFloat(match[0]);
  return Number.isFinite(value) ? value : null;
}

function parseNumber(input: string | null | undefined): number | null {
  if (!input) return null;
  const match = NUMBER_REGEX.exec(input.replace(/,/gu, ''));
  if (!match) return null;
  const value = Number.parseFloat(match[0]);
  return Number.isFinite(value) ? value : null;
}

function addKeyword(target: Set<string>, value: string | null | undefined) {
  if (!value) return;
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return;
  target.add(trimmed);
}

export async function importSanmarCatalog(options: ImportOptions): Promise<ImportResult> {
  const { sdlPath, dryRun = false, limit } = options;
  const resolvedPath = path.resolve(sdlPath);
  const accumulators = new Map<string, ProductAccumulator>();

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
        if (limit && processedRows >= limit) {
          return;
        }
        processedRows += 1;
        processRecord(accumulators, record);
      })
      .on('error', reject)
      .on('end', () => resolve());
  });

  let created = 0;
  let updated = 0;
  let processed = 0;

  for (const accumulator of accumulators.values()) {
    processed += 1;
    if (dryRun) {
      continue;
    }

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.product.findUnique({
        where: { supplierPartId: accumulator.supplierPartId },
        select: { id: true },
      });

      const descriptionJson =
        accumulator.description.length > 0
          ? (accumulator.description as unknown as Prisma.JsonArray)
          : undefined;
      const attributesJson =
        Object.keys(accumulator.attributes).length > 0
          ? (accumulator.attributes as unknown as Prisma.JsonObject)
          : undefined;

      const data = {
        supplierPartId: accumulator.supplierPartId,
        name: accumulator.name,
        brand: accumulator.brand ?? null,
        defaultColor: accumulator.defaultColor ?? null,
        description: descriptionJson,
        attributes: attributesJson,
      };

      const product = existing
        ? await tx.product.update({ where: { id: existing.id }, data })
        : await tx.product.create({ data });

      if (existing) {
        await tx.productColor.deleteMany({ where: { productId: product.id } });
        await tx.productSize.deleteMany({ where: { productId: product.id } });
        await tx.productMedia.deleteMany({ where: { productId: product.id } });
        await tx.productSku.deleteMany({ where: { productId: product.id } });
        await tx.productKeyword.deleteMany({ where: { productId: product.id } });
      }

      const colors = Array.from(accumulator.colors.values()).map((color) => ({
        productId: product.id,
        colorCode: color.colorCode,
        colorName: color.colorName,
        supplierVariantId: color.supplierVariantId ?? undefined,
        swatchUrl: color.swatchUrl ?? undefined,
      }));

      if (colors.length) {
        await tx.productColor.createMany({ data: colors, skipDuplicates: true });
      }

      const sizes = Array.from(accumulator.sizes.values()).map((size) => ({
        productId: product.id,
        sizeCode: size.sizeCode,
        display: size.display,
        sort: size.sort ?? undefined,
      }));

      if (sizes.length) {
        await tx.productSize.createMany({ data: sizes, skipDuplicates: true });
      }

      const media = Array.from(accumulator.media.values()).map((item, index) => ({
        productId: product.id,
        url: item.url,
        colorCode: item.colorCode ?? undefined,
        position: item.position ?? index,
      }));

      if (media.length) {
        await tx.productMedia.createMany({ data: media, skipDuplicates: true });
      }

      const skus = Array.from(accumulator.skus.values()).map((sku) => ({
        productId: product.id,
        colorCode: sku.colorCode,
        sizeCode: sku.sizeCode,
        supplierSku: sku.supplierSku,
      }));

      if (skus.length) {
        await tx.productSku.createMany({ data: skus, skipDuplicates: true });
      }

      const keywords = Array.from(accumulator.keywords.values()).map((keyword) => ({
        productId: product.id,
        keyword,
      }));

      if (keywords.length) {
        await tx.productKeyword.createMany({ data: keywords, skipDuplicates: true });
      }

      return existing ? 'updated' : 'created';
    });

    if (result === 'created') {
      created += 1;
    } else {
      updated += 1;
    }
  }

  return { processed, created, updated };
}

function processRecord(accumulators: Map<string, ProductAccumulator>, record: Record<string, string>) {
  const style = record['STYLE#']?.trim();
  if (!style) {
    return;
  }

  const supplierPartId = style.toUpperCase();
  const colorNameRaw = record.COLOR_NAME?.trim();
  const sizeRaw = record.SIZE?.trim();

  const colorCode = colorNameRaw
    ? sanitizeCode(colorNameRaw, `${supplierPartId}_DEFAULT`)
    : `${supplierPartId}_DEFAULT`;

  const sizeCode = sizeRaw ? sanitizeCode(sizeRaw, 'OSFA') : 'OSFA';
  const sizeDisplay = sizeRaw && sizeRaw.length > 0 ? sizeRaw : 'OSFA';
  const sizeIndex = record.SIZE_INDEX ? Number.parseInt(record.SIZE_INDEX, 10) : null;

  let accumulator = accumulators.get(supplierPartId);
  if (!accumulator) {
    accumulator = {
      supplierPartId,
      name: record.PRODUCT_TITLE?.trim() || supplierPartId,
      description: splitDescription(record.PRODUCT_DESCRIPTION),
      brand: record.MILL?.trim() || null,
      defaultColor: colorCode,
      attributes: buildAttributes(record),
      colors: new Map(),
      sizes: new Map(),
      media: new Map(),
      skus: new Map(),
      keywords: new Set(),
    };
    accumulators.set(supplierPartId, accumulator);
  }

  // Update description and attributes if we encounter additional information.
  if (accumulator.description.length === 0) {
    accumulator.description = splitDescription(record.PRODUCT_DESCRIPTION);
  }

  accumulator.attributes = { ...accumulator.attributes, ...buildAttributes(record) };

  if (colorNameRaw) {
    if (!accumulator.colors.has(colorCode)) {
      accumulator.colors.set(colorCode, {
        colorCode,
        colorName: colorNameRaw,
        supplierVariantId: record.SANMAR_MAINFRAME_COLOR?.trim() || null,
        swatchUrl: record.COLOR_SQUARE_IMAGE?.trim() || null,
      });
    }
  }

  if (!accumulator.sizes.has(sizeCode)) {
    accumulator.sizes.set(sizeCode, {
      sizeCode,
      display: sizeDisplay,
      sort: Number.isFinite(sizeIndex) ? sizeIndex! : undefined,
    });
  }

  const mediaSources: Array<{ url?: string | null; colorSpecific?: boolean }> = [
    { url: record.COLOR_PRODUCT_IMAGE, colorSpecific: true },
    { url: record.COLOR_PRODUCT_IMAGE_THUMBNAIL, colorSpecific: true },
    { url: record.PRODUCT_IMAGE, colorSpecific: false },
    { url: record.FRONT_MODEL_IMAGE_URL, colorSpecific: true },
    { url: record.BACK_MODEL_IMAGE_URL, colorSpecific: true },
    { url: record.FRONT_FLAT_IMAGE_URL, colorSpecific: true },
    { url: record.BACK_FLAT_IMAGE_URL, colorSpecific: true },
  ];

  for (const mediaSource of mediaSources) {
    const url = mediaSource.url?.trim();
    if (!url) continue;
    const key = `${mediaSource.colorSpecific ? colorCode : 'GLOBAL'}::${url}`;
    if (accumulator.media.has(key)) continue;
    accumulator.media.set(key, {
      url,
      colorCode: mediaSource.colorSpecific ? colorCode : null,
    });
  }

  const gtin = record.GTIN?.trim();
  const skuKey = `${colorCode}::${sizeCode}`;
  if (!accumulator.skus.has(skuKey)) {
    const supplierSku = gtin && gtin.length > 0 ? gtin : `${supplierPartId}_${colorCode}_${sizeCode}`;
    accumulator.skus.set(skuKey, {
      colorCode,
      sizeCode,
      supplierSku,
    });
  }

  addKeyword(accumulator.keywords, record.CATEGORY_NAME);
  addKeyword(accumulator.keywords, record.SUBCATEGORY_NAME);
  addKeyword(accumulator.keywords, accumulator.brand ?? undefined);
  addKeyword(accumulator.keywords, colorNameRaw);
}

function buildAttributes(record: Record<string, string>): Record<string, unknown> {
  const attributes: Record<string, unknown> = {};

  if (record.PRICE_TEXT) attributes.priceText = record.PRICE_TEXT.trim();
  if (record.SUGGESTED_PRICE) attributes.suggestedPrice = record.SUGGESTED_PRICE.trim();
  if (record.PRICE_GROUP) attributes.priceGroup = record.PRICE_GROUP.trim();
  if (record.CASE_SIZE) attributes.caseSize = parseNumber(record.CASE_SIZE) ?? record.CASE_SIZE.trim();
  if (record.PRODUCT_STATUS) attributes.productStatus = record.PRODUCT_STATUS.trim();
  if (record.MSRP) attributes.msrp = record.MSRP.trim();
  if (record.MAP_PRICING) attributes.mapPricing = record.MAP_PRICING.trim();
  if (record['COMPANION_STYLE']) attributes.companionStyles = record['COMPANION_STYLE'].trim();
  if (record.AVAILABLE_SIZES) attributes.availableSizes = record.AVAILABLE_SIZES.trim();
  if (record.PRODUCT_MEASUREMENTS) attributes.productMeasurements = record.PRODUCT_MEASUREMENTS.trim();
  if (record.PMS_COLOR) attributes.pmsColor = record.PMS_COLOR.trim();
  if (record.PIECE_WEIGHT) attributes.pieceWeight = parseDecimal(record.PIECE_WEIGHT) ?? record.PIECE_WEIGHT.trim();
  const piecePrice = parseDecimal(record.PIECE_PRICE);
  if (piecePrice !== null) attributes.piecePrice = piecePrice;
  const dozensPrice = parseDecimal(record.DOZENS_PRICE);
  if (dozensPrice !== null) attributes.dozensPrice = dozensPrice;
  const casePrice = parseDecimal(record.CASE_PRICE);
  if (casePrice !== null) attributes.casePrice = casePrice;
  const inventoryQty = parseNumber(record.QTY);
  if (inventoryQty !== null) attributes.inventoryQty = inventoryQty;

  return attributes;
}
