/* eslint-disable @typescript-eslint/no-explicit-any */
import { decode } from 'he';
import { parseStringPromise, processors } from 'xml2js';

import type {
  ProductColorway,
  ProductMediaGroup,
  ProductRecord,
  ProductSize,
  ProductSkuMapEntry,
} from '@/lib/types';

const xmlOptions = {
  explicitArray: false,
  tagNameProcessors: [processors.stripPrefix],
  attrNameProcessors: [processors.stripPrefix],
};

export type DataSource = 'promostandards' | 'rest';

export interface ParsedProduct {
  supplierPartId: string;
  product: ProductRecord;
  keywords: string[];
}

export interface InventoryRecord {
  supplierPartId: string;
  supplierSku: string;
  colorCode: string;
  sizeCode: string;
  totalQty: number;
  warehouses: Array<{ warehouseId: string; quantity: number }>;
}

export interface ParsedInventory {
  supplierPartId: string;
  records: InventoryRecord[];
}

export function sanitizeCode(value: string | null | undefined, fallback: string): string {
  if (!value) return fallback;
  const normalized = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/gu, '')
    .replace(/[^a-z0-9]/giu, '')
    .toUpperCase();
  return normalized.length > 0 ? normalized : fallback;
}

function ensureArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function getText(node: unknown): string | null {
  if (node == null) return null;

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

export function htmlToLines(html: string | null): string[] {
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
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export function computeSizeSort(sizeLabel: string): number {
  const ORDER = [
    'XXXS',
    'XXS',
    'XS',
    'S',
    'SM',
    'M',
    'MED',
    'L',
    'LG',
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

  const normalized = sizeLabel.replace(/[^a-z0-9]/giu, '').toUpperCase();
  const index = ORDER.indexOf(normalized);
  if (index >= 0) {
    return index;
  }

  const numericMatch = sizeLabel.match(/(\d+)[^0-9]*$/u);
  if (numericMatch) {
    return ORDER.length + Number.parseInt(numericMatch[1], 10);
  }

  return ORDER.length + 999;
}

function accumulateAttributes(product: any): Record<string, unknown> {
  const attributes: Record<string, unknown> = {};

  const brandName = getText(product.productBrand?.brandName);
  if (brandName) attributes.brandName = brandName;

  const priceExpires = getText(product.priceExpiresDate);
  if (priceExpires) attributes.priceExpiresDate = priceExpires;

  const compliance = getText(product.complianceInfoAvailable);
  if (compliance) attributes.complianceInfoAvailable = compliance === 'true';

  const lineName = getText(product.lineName);
  if (lineName) attributes.lineName = lineName;

  const marketingPoints = ensureArray(product.ProductMarketingPointArray?.ProductMarketingPoint)
    .map((entry: any) => getText(entry?.Text))
    .filter((entry: string | null): entry is string => Boolean(entry));

  if (marketingPoints.length > 0) {
    attributes.marketingPoints = marketingPoints;
  }

  const priceGroups = ensureArray(product.ProductPriceGroupArray?.ProductPriceGroup).map(
    (entry: any) => ({
      priceType: getText(entry?.priceType),
      price: getText(entry?.price),
      currency: getText(entry?.currency),
    })
  );

  if (priceGroups.length > 0) {
    attributes.priceGroups = priceGroups;
  }

  const fobPoints = ensureArray(product.FobPointArray?.FobPoint).map((entry: any) => ({
    id: getText(entry?.fobId),
    city: getText(entry?.fobCity),
    state: getText(entry?.fobState),
    postalCode: getText(entry?.fobPostalCode),
    country: getText(entry?.fobCountry),
  }));

  if (fobPoints.length > 0) {
    attributes.fobPoints = fobPoints;
  }

  return attributes;
}

function collectMediaFromPart(
  part: any,
  colorCode: string,
  mediaMap: Map<string, Set<string>>
) {
  const mediaSet = mediaMap.get(colorCode) ?? new Set<string>();
  const partImages = [
    getText(part.frontImage),
    getText(part.backImage),
    getText(part.additionalImage),
  ].filter((url): url is string => Boolean(url));

  for (const url of partImages) {
    mediaSet.add(normalizeImageUrl(url));
  }

  const imageArray = ensureArray(part.ImageArray?.Image);
  for (const image of imageArray) {
    const url = getText(image?.url);
    if (url) {
      mediaSet.add(normalizeImageUrl(url));
    }
  }

  mediaMap.set(colorCode, mediaSet);
}

export function normalizeImageUrl(raw: string | null): string {
  if (!raw) return '';
  if (/^https?:\/\//iu.test(raw)) {
    return raw;
  }
  const cleaned = raw.replace(/^\/+/u, '');
  return `https://cdn.ssactivewear.com/${cleaned}`;
}

export async function parseProductResponse(xmlPayload: string): Promise<ParsedProduct> {
  const parsed = await parseStringPromise(xmlPayload, xmlOptions);
  const product = parsed?.Envelope?.Body?.GetProductResponse?.Product;
  if (!product) {
    throw new Error('Unable to parse SSActivewear product payload');
  }

  const supplierPartId = getText(product.productId)?.toUpperCase();
  if (!supplierPartId) {
    throw new Error('Missing productId in SSActivewear product payload');
  }

  const colors = new Map<string, ProductColorway>();
  const sizes = new Map<string, ProductSize>();
  const skuMap = new Map<string, ProductSkuMapEntry>();
  const mediaMap = new Map<string, Set<string>>();
  const keywords = new Set<string>();

  const name = getText(product.productName) ?? supplierPartId;
  const attributes = accumulateAttributes(product);
  const description = htmlToLines(getText(product.description));

  const categoryKeywords = ensureArray(product.ProductCategoryArray?.ProductCategory)
    .map((entry: any) => getText(entry?.category))
    .filter((entry: string | null): entry is string => Boolean(entry));
  categoryKeywords.forEach((keyword) => keywords.add(keyword.toLowerCase()));

  const productKeywords = ensureArray(product.ProductKeywordArray?.ProductKeyword)
    .map((entry: any) => getText(entry?.keyword))
    .filter((entry: string | null): entry is string => Boolean(entry));
  productKeywords.forEach((keyword) => keywords.add(keyword.toLowerCase()));

  const primaryImage = normalizeImageUrl(getText(product.primaryImageUrl));
  if (primaryImage) {
    const defaultSet = mediaMap.get('DEFAULT') ?? new Set<string>();
    defaultSet.add(primaryImage);
    mediaMap.set('DEFAULT', defaultSet);
  }

  const productParts = ensureArray(product.ProductPartArray?.ProductPart);
  for (const part of productParts) {
    const partId = getText(part.partId) ?? supplierPartId;
    const gtin = getText(part.gtin);

    const colorEntry = ensureArray(part.ColorArray?.Color)[0];
    const colorName = colorEntry
      ? getText(colorEntry.colorName) ?? getText(colorEntry.standardColorName)
      : null;
    const colorCode = colorName
      ? sanitizeCode(colorName, `${supplierPartId}_COLOR`)
      : `${supplierPartId}_COLOR`;

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
        code: sizeCode,
        display: sizeLabel,
        sort: computeSizeSort(sizeLabel),
      });
    }

    const supplierSku = partId ?? gtin ?? `${supplierPartId}_${colorCode}_${sizeCode}`;
    const skuKey = `${colorCode}::${sizeCode}`;
    if (!skuMap.has(skuKey)) {
      skuMap.set(skuKey, {
        supplierPartId,
        colorCode,
        sizeCode,
        supplierSku,
      });
    }

    collectMediaFromPart(part, colorCode, mediaMap);
  }

  if (colors.size === 0) {
    colors.set('DEFAULT', {
      colorCode: 'DEFAULT',
      colorName: 'Default',
    });
  }

  if (sizes.size === 0) {
    sizes.set('OSFA', { code: 'OSFA', display: 'One Size', sort: 0 });
  }

  const firstColor = colors.values().next().value;
  const defaultColor = firstColor && typeof firstColor.colorCode === 'string' ? firstColor.colorCode : 'DEFAULT';

  const mediaGroups: ProductMediaGroup[] = Array.from(mediaMap.entries()).map(
    ([colorCode, urls]) => ({
      colorCode,
      urls: Array.from(urls).filter(Boolean),
    })
  );

  const productRecord: ProductRecord = {
    id: supplierPartId,
    supplierPartId,
    name,
    brand: typeof attributes.brandName === 'string' ? (attributes.brandName as string) : '',
    defaultColor,
    colors: Array.from(colors.values()),
    sizes: Array.from(sizes.values()).sort((a, b) => a.sort - b.sort),
    media: mediaGroups,
    skuMap: Array.from(skuMap.values()),
    description: description.length > 0 ? description : undefined,
    attributes: Object.keys(attributes).length > 0 ? attributes : undefined,
  };

  return {
    supplierPartId,
    product: productRecord,
    keywords: Array.from(keywords),
  };
}

export async function parseInventoryResponse(
  xmlPayload: string,
  supplierPartId?: string
): Promise<ParsedInventory> {
  const parsed = await parseStringPromise(xmlPayload, xmlOptions);
  const inventory = parsed?.Envelope?.Body?.GetInventoryLevelsResponse?.Inventory;

  if (!inventory) {
    if (supplierPartId) {
      return { supplierPartId, records: [] };
    }
    throw new Error('Unable to parse SSActivewear inventory payload');
  }

  const partId = getText(inventory.productId)?.toUpperCase() ?? supplierPartId;
  if (!partId) {
    throw new Error('Missing productId in SSActivewear inventory payload');
  }

  const records: InventoryRecord[] = [];
  const partArray = ensureArray(inventory.PartInventoryArray?.PartInventory);

  for (const part of partArray) {
    const partSku = getText(part.partId) ?? partId;
    const colorName = getText(part.partColor) ?? 'Default';
    const sizeLabel = getText(part.labelSize) ?? 'OSFA';
    const quantityValue = getText(part.quantityAvailable?.Quantity?.value) ?? '0';

    const colorCode = sanitizeCode(colorName, `${partId}_COLOR`);
    const sizeCode = sanitizeCode(sizeLabel, 'OSFA');

    const warehouses = ensureArray(part.InventoryLocationArray?.InventoryLocation).map(
      (location: any) => ({
        warehouseId: getText(location.inventoryLocationId) ?? 'UNKNOWN',
        quantity:
          Number.parseInt(
            getText(location.inventoryLocationQuantity?.Quantity?.value) ?? '0',
            10
          ) || 0,
      })
    );

    const totalQty =
      Number.parseInt(quantityValue, 10) ||
      warehouses.reduce((sum, warehouse) => sum + warehouse.quantity, 0);

    records.push({
      supplierPartId: partId,
      supplierSku: partSku,
      colorCode,
      sizeCode,
      totalQty,
      warehouses,
    });
  }

  return {
    supplierPartId: partId,
    records,
  };
}


