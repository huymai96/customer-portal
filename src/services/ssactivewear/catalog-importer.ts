/* eslint-disable @typescript-eslint/no-explicit-any */
import { decode } from 'he';
import { parseStringPromise, processors } from 'xml2js';
import { Prisma } from '@prisma/client';

import { prisma } from '@/lib/prisma';
import { sanitizeCode } from '@/services/sanmar/importer';
import { getProduct } from '@/integrations/ssactivewear/catalog';

type JsonRecord = Record<string, unknown>;

interface ColorRecord {
  colorCode: string;
  colorName: string;
  supplierVariantId?: string;
}

interface SizeRecord {
  sizeCode: string;
  display: string;
  sort?: number;
}

interface MediaRecord {
  url: string;
  colorCode?: string | null;
  position?: number | null;
}

interface SkuRecord {
  colorCode: string;
  sizeCode: string;
  supplierSku: string;
}

const xmlOptions = {
  explicitArray: false,
  tagNameProcessors: [processors.stripPrefix],
  attrNameProcessors: [processors.stripPrefix],
};

function ensureArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function getText(node: unknown): string | null {
  if (node == null) {
    return null;
  }

  if (typeof node === 'string') {
    const decoded = decode(node);
    const trimmed = decoded.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (typeof node === 'object') {
    const candidate = (node as { _: unknown })._;
    if (typeof candidate === 'string') {
      const decoded = decode(candidate);
      const trimmed = decoded.trim();
      return trimmed.length > 0 ? trimmed : null;
    }
  }

  return null;
}

function normalizeImageUrl(raw: string | null): string | null {
  if (!raw) return null;
  if (/^https?:\/\//iu.test(raw)) {
    return raw;
  }
  const cleaned = raw.replace(/^\/+/u, '');
  return `https://cdn.ssactivewear.com/${cleaned}`;
}

const SIZE_ORDER = [
  'XXXS',
  'XXS',
  'XS',
  'S',
  'SM',
  'M',
  'MED',
  'L',
  'XL',
  '2XL',
  'XXL',
  '3XL',
  'XXX L',
  '4XL',
  '5XL',
  '6XL',
  'OSFA',
  'OS',
];

function normalizeSizeToken(input: string): string {
  return input.replace(/[^a-z0-9]+/giu, '').toUpperCase();
}

function computeSizeSort(sizeLabel: string): number {
  const normalized = normalizeSizeToken(sizeLabel);
  const index = SIZE_ORDER.indexOf(normalized);
  if (index >= 0) {
    return index;
  }

  const numericMatch = sizeLabel.match(/(\d+)[^0-9]*$/u);
  if (numericMatch) {
    return SIZE_ORDER.length + Number.parseInt(numericMatch[1], 10);
  }

  return SIZE_ORDER.length + 999;
}

function htmlToLines(html: string | null): string[] {
  if (!html) return [];
  const decoded = decode(html);
  const normalized = decoded
    .replace(/<\/(li|p)>/giu, '\n')
    .replace(/<br\s*\/?>/giu, '\n')
    .replace(/<\/div>/giu, '\n')
    .replace(/<[^>]+>/giu, ' ')
    .replace(/\r?\n+/gu, '\n')
    .replace(/\s+/gu, ' ')
    .trim();

  return normalized
    .split('\n')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function accumulateAttributes(product: any): JsonRecord {
  const attributes: JsonRecord = {};
  const brandName = getText(product.productBrand?.brandName);
  if (brandName) attributes.brandName = brandName;

  const priceExpires = getText(product.priceExpiresDate);
  if (priceExpires) attributes.priceExpiresDate = priceExpires;

  const compliance = getText(product.complianceInfoAvailable);
  if (compliance) attributes.complianceInfoAvailable = compliance === 'true';

  const lineName = getText(product.lineName);
  if (lineName) attributes.lineName = lineName;

  const marketingPoints = ensureArray(product.ProductMarketingPointArray?.ProductMarketingPoint)
    .map((entry: any) => getText(entry.Text))
    .filter((entry: string | null): entry is string => Boolean(entry));

  if (marketingPoints.length > 0) {
    attributes.marketingPoints = marketingPoints;
  }

  const priceGroups = ensureArray(product.ProductPriceGroupArray?.ProductPriceGroup).map(
    (entry: any) => ({
      priceType: getText(entry.priceType),
      price: getText(entry.price),
      currency: getText(entry.currency),
    })
  );

  if (priceGroups.length > 0) {
    attributes.priceGroups = priceGroups;
  }

  const fobPoints = ensureArray(product.FobPointArray?.FobPoint).map((entry: any) => ({
    id: getText(entry.fobId),
    city: getText(entry.fobCity),
    state: getText(entry.fobState),
    postalCode: getText(entry.fobPostalCode),
    country: getText(entry.fobCountry),
  }));

  if (fobPoints.length > 0) {
    attributes.fobPoints = fobPoints;
  }

  return attributes;
}

export interface ImportResult {
  processed: number;
  created: number;
  updated: number;
}

export async function importSsactivewearProduct(productId: string): Promise<'created' | 'updated' | 'skipped'> {
  const trimmedId = productId.trim();
  if (!trimmedId) {
    throw new Error('Product ID is required');
  }

  const xmlPayload = await getProduct({ productId: trimmedId });
  const parsed = await parseStringPromise(xmlPayload, xmlOptions);
  const product = parsed?.Envelope?.Body?.GetProductResponse?.Product;

  if (!product) {
    throw new Error(`Unable to parse SSActivewear product response for ${trimmedId}`);
  }

  const supplierPartId = getText(product.productId)?.toUpperCase();
  if (!supplierPartId) {
    throw new Error(`Missing productId in SSActivewear payload for ${trimmedId}`);
  }

  const colors = new Map<string, ColorRecord>();
  const sizes = new Map<string, SizeRecord>();
  const media = new Map<string, MediaRecord>();
  const skus = new Map<string, SkuRecord>();
  const keywords = new Set<string>();

  const name = getText(product.productName) ?? supplierPartId;
  const descriptionLines = htmlToLines(getText(product.description));
  const attributes = accumulateAttributes(product);

  const categoryKeywords = ensureArray(product.ProductCategoryArray?.ProductCategory)
    .map((entry: any) => getText(entry.category))
    .filter((entry: string | null): entry is string => Boolean(entry));

  for (const keyword of categoryKeywords) {
    keywords.add(keyword.toLowerCase());
  }

  const productKeywords = ensureArray(product.ProductKeywordArray?.ProductKeyword)
    .map((entry: any) => getText(entry.keyword))
    .filter((entry: string | null): entry is string => Boolean(entry));

  for (const keyword of productKeywords) {
    keywords.add(keyword.toLowerCase());
  }

  const primaryImage = normalizeImageUrl(getText(product.primaryImageUrl));
  if (primaryImage) {
    media.set(primaryImage, { url: primaryImage, colorCode: null });
  }

  const productParts = ensureArray(product.ProductPartArray?.ProductPart);

  for (const part of productParts) {
    const partId = getText(part.partId);
    const gtin = getText(part.gtin);

    const colorEntry = ensureArray(part.ColorArray?.Color)[0];
    const colorName = colorEntry ? getText(colorEntry.colorName) ?? getText(colorEntry.standardColorName) : null;

    const colorCode =
      colorName && colorName.length > 0
        ? sanitizeCode(colorName, `${supplierPartId}_DEFAULT`)
        : `${supplierPartId}_DEFAULT`;

    if (colorName && !colors.has(colorCode)) {
      colors.set(colorCode, {
        colorCode,
        colorName,
        supplierVariantId: getText(colorEntry?.standardColorName) ?? undefined,
      });
      keywords.add(colorName.toLowerCase());
    }

    const sizeLabel = getText(part.ApparelSize?.labelSize) ?? 'OSFA';
    const sizeCode = sanitizeCode(sizeLabel, 'OSFA');
    if (!sizes.has(sizeCode)) {
      sizes.set(sizeCode, {
        sizeCode,
        display: sizeLabel,
        sort: computeSizeSort(sizeLabel),
      });
    }

    const supplierSku = partId ?? gtin ?? `${supplierPartId}_${colorCode}_${sizeCode}`;
    const skuKey = `${colorCode}::${sizeCode}`;
    if (!skus.has(skuKey)) {
      skus.set(skuKey, {
        colorCode,
        sizeCode,
        supplierSku,
      });
    }
  }

  if (colors.size === 0) {
    colors.set('DEFAULT', {
      colorCode: 'DEFAULT',
      colorName: 'Default',
    });
  }

  const firstColor = colors.values().next().value;
  const defaultColor = firstColor ? firstColor.colorCode : 'DEFAULT';

  const productData = {
    supplierPartId,
    name,
    brand: attributes.brandName ? String(attributes.brandName) : null,
    defaultColor,
    description:
      descriptionLines.length > 0
        ? (descriptionLines as unknown as Prisma.JsonArray)
        : undefined,
    attributes: Object.keys(attributes).length > 0 ? (attributes as Prisma.JsonObject) : undefined,
  };

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.product.findUnique({
      where: { supplierPartId },
      select: { id: true },
    });

    const productRecord = existing
      ? await tx.product.update({ where: { id: existing.id }, data: productData })
      : await tx.product.create({ data: productData });

    if (existing) {
      await tx.productColor.deleteMany({ where: { productId: productRecord.id } });
      await tx.productSize.deleteMany({ where: { productId: productRecord.id } });
      await tx.productMedia.deleteMany({ where: { productId: productRecord.id } });
      await tx.productSku.deleteMany({ where: { productId: productRecord.id } });
      await tx.productKeyword.deleteMany({ where: { productId: productRecord.id } });
    }

    const colorRecords = Array.from(colors.values()).map((color) => ({
      productId: productRecord.id,
      colorCode: color.colorCode,
      colorName: color.colorName,
      supplierVariantId: color.supplierVariantId,
    }));

    if (colorRecords.length > 0) {
      await tx.productColor.createMany({ data: colorRecords, skipDuplicates: true });
    }

    const sizeRecords = Array.from(sizes.values()).map((size) => ({
      productId: productRecord.id,
      sizeCode: size.sizeCode,
      display: size.display,
      sort: size.sort ?? undefined,
    }));

    if (sizeRecords.length > 0) {
      await tx.productSize.createMany({ data: sizeRecords, skipDuplicates: true });
    }

    const mediaRecords = Array.from(media.values()).map((item, index) => ({
      productId: productRecord.id,
      url: item.url,
      colorCode: item.colorCode ?? undefined,
      position: item.position ?? index,
    }));

    if (mediaRecords.length > 0) {
      await tx.productMedia.createMany({ data: mediaRecords, skipDuplicates: true });
    }

    const skuRecords = Array.from(skus.values()).map((sku) => ({
      productId: productRecord.id,
      colorCode: sku.colorCode,
      sizeCode: sku.sizeCode,
      supplierSku: sku.supplierSku,
    }));

    if (skuRecords.length > 0) {
      await tx.productSku.createMany({ data: skuRecords, skipDuplicates: true });
    }

    const keywordRecords = Array.from(keywords.values()).map((keyword) => ({
      productId: productRecord.id,
      keyword,
    }));

    if (keywordRecords.length > 0) {
      await tx.productKeyword.createMany({ data: keywordRecords, skipDuplicates: true });
    }

    return existing ? 'updated' : 'created';
  });

  return result;
}


