/**
 * XML Parser for SSActivewear PromoStandards SOAP Responses
 * 
 * Converts SOAP XML into ProductRecord and InventorySnapshot types.
 */

import { parseStringPromise } from 'xml2js';
import { decode } from 'he';
import type { InventorySnapshot, ProductRecord, ProductColorway, ProductSize, ProductMediaGroup, ProductSkuMapEntry } from '@/lib/types';

interface ParsedXml {
  [key: string]: unknown;
  Envelope?: {
    Body?: unknown;
    [key: string]: unknown;
  };
  Body?: unknown;
}

function stripPrefix(name: string): string {
  const colonIndex = name.indexOf(':');
  return colonIndex >= 0 ? name.slice(colonIndex + 1) : name;
}

function toArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function getText(node: unknown): string | null {
  if (node == null) return null;
  if (typeof node === 'string') {
    const decoded = decode(node);
    return decoded.trim() || null;
  }
  if (typeof node === 'object' && '_' in node) {
    const text = (node as { _: unknown })._;
    if (typeof text === 'string') {
      const decoded = decode(text);
      return decoded.trim() || null;
    }
  }
  return null;
}

function sanitizeCode(input: string, fallback: string): string {
  const trimmed = input.trim().toUpperCase();
  return trimmed.replace(/[^A-Z0-9_-]/gu, '_') || fallback;
}

/**
 * Parse PromoStandards GetProduct SOAP response into ProductRecord.
 */
export async function parseProductXml(xml: string, productId: string): Promise<ProductRecord> {
  const parsed = (await parseStringPromise(xml, {
    explicitArray: false,
    ignoreAttrs: true,
    tagNameProcessors: [stripPrefix],
    valueProcessors: [(value) => (typeof value === 'string' ? value.trim() : value)],
  })) as ParsedXml;

  const body = parsed?.Envelope?.Body as ParsedXml | undefined;
  const response = body?.GetProductResponse as ParsedXml | undefined;
  
  if (!response) {
    throw new Error('Invalid PromoStandards GetProduct response');
  }

  const product = response.Product as ParsedXml | undefined;
  if (!product) {
    throw new Error('Product data not found in response');
  }

  const name = getText(product.productName) || productId;
  const brand = getText(product.productBrand) || '';
  const description = getText(product.description);

  const colors = new Map<string, ProductColorway>();
  const sizes = new Map<string, ProductSize>();
  const skuMap = new Map<string, ProductSkuMapEntry>();
  const mediaMap = new Map<string, Set<string>>();

  // Parse color array
  const colorArray = toArray((product.ColorArray as ParsedXml | undefined)?.Color);
  for (const color of colorArray) {
    const colorName = getText((color as ParsedXml).colorName) || 'Default';
    const colorCode = sanitizeCode(colorName, `${productId}_COLOR`);
    
    if (!colors.has(colorCode)) {
      colors.set(colorCode, {
        colorCode,
        colorName,
        supplierVariantId: getText((color as ParsedXml).colorId) || undefined,
      });
    }
  }

  // Parse parts (SKUs)
  const partArray = toArray((product.PartArray as ParsedXml | undefined)?.Part);
  for (const part of partArray) {
    const partObj = part as ParsedXml;
    const colorName = getText(partObj.colorName) || 'Default';
    const colorCode = sanitizeCode(colorName, `${productId}_COLOR`);
    const sizeName = getText(partObj.labelSize) || 'OSFA';
    const sizeCode = sanitizeCode(sizeName, 'OSFA');
    const sku = getText(partObj.partId) || `${productId}_${colorCode}_${sizeCode}`;

    if (!sizes.has(sizeCode)) {
      sizes.set(sizeCode, {
        code: sizeCode,
        display: sizeName,
        sort: 0, // PromoStandards doesn't provide sort order
      });
    }

    const mapKey = `${colorCode}::${sizeCode}`;
    if (!skuMap.has(mapKey)) {
      skuMap.set(mapKey, {
        supplierPartId: productId,
        colorCode,
        sizeCode,
        supplierSku: sku,
      });
    }
  }

  // Parse media
  const mediaArray = toArray((product.MediaContentArray as ParsedXml | undefined)?.MediaContent);
  for (const media of mediaArray) {
    const mediaObj = media as ParsedXml;
    const url = getText(mediaObj.url);
    if (!url) continue;

    const colorName = getText(mediaObj.color) || null;
    const colorCode = colorName ? sanitizeCode(colorName, 'DEFAULT') : 'DEFAULT';

    const mediaSet = mediaMap.get(colorCode) ?? new Set<string>();
    mediaSet.add(url);
    mediaMap.set(colorCode, mediaSet);
  }

  const defaultColor = colors.values().next().value?.colorCode || 'DEFAULT';

  const mediaGroups: ProductMediaGroup[] = Array.from(mediaMap.entries()).map(
    ([colorCode, urls]) => ({
      colorCode,
      urls: Array.from(urls),
    })
  );

  return {
    id: productId,
    supplierPartId: productId,
    name,
    brand,
    defaultColor,
    colors: Array.from(colors.values()),
    sizes: Array.from(sizes.values()),
    media: mediaGroups,
    skuMap: Array.from(skuMap.values()),
    description: description ? [description] : undefined,
  };
}

/**
 * Parse PromoStandards GetInventoryLevels SOAP response into InventorySnapshot.
 */
export async function parseInventoryXml(
  xml: string,
  _productId: string,
  _colorCode?: string
): Promise<InventorySnapshot> {
  const parsed = (await parseStringPromise(xml, {
    explicitArray: false,
    ignoreAttrs: true,
    tagNameProcessors: [stripPrefix],
    valueProcessors: [(value) => (typeof value === 'string' ? value.trim() : value)],
  })) as ParsedXml;

  const body = parsed?.Envelope?.Body as ParsedXml | undefined;
  const response = body?.GetInventoryLevelsResponse as ParsedXml | undefined;
  
  if (!response) {
    throw new Error('Invalid PromoStandards GetInventoryLevels response');
  }

  const inventory = response.Inventory as ParsedXml | undefined;
  if (!inventory) {
    throw new Error('Inventory data not found in response');
  }

  const bySize: InventorySnapshot['bySize'] = {};

  const partArray = toArray((inventory.PartInventoryArray as ParsedXml | undefined)?.PartInventory);
  for (const part of partArray) {
    const partObj = part as ParsedXml;
    const sizeName = getText(partObj.labelSize) || getText(partObj.partId) || 'OSFA';
    const sizeCode = sanitizeCode(sizeName, 'OSFA');

    let totalQty = 0;
    const locations = toArray((partObj.InventoryLocationArray as ParsedXml | undefined)?.InventoryLocation);
    for (const location of locations) {
      const locationObj = location as ParsedXml;
      const qtyObj = (locationObj.inventoryLocationQuantity as ParsedXml | undefined)?.Quantity as ParsedXml | undefined;
      const qtyValue = qtyObj?.value;
      const qty = Number.parseInt(String(qtyValue || 0), 10) || 0;
      totalQty += qty;
    }

    if (bySize[sizeCode]) {
      bySize[sizeCode].qty += totalQty;
    } else {
      bySize[sizeCode] = { qty: totalQty };
    }
  }

  return {
    bySize,
    fetchedAt: new Date().toISOString(),
  };
}

