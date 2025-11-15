/**
 * REST Parser for SSActivewear REST API v2 Responses
 * 
 * Converts REST JSON into ProductRecord and InventorySnapshot types.
 */

import { decode } from 'he';
import type {
  InventorySnapshot,
  ProductRecord,
  ProductColorway,
  ProductSize,
  ProductMediaGroup,
  ProductSkuMapEntry,
  ProductInventorySummary,
} from '@/lib/types';
import type { RestBundle } from './rest-client';

function sanitizeCode(input: string, fallback: string): string {
  const trimmed = input.trim().toUpperCase();
  return trimmed.replace(/[^A-Z0-9_-]/gu, '_') || fallback;
}

function htmlToLines(html: string | null): string[] | undefined {
  if (!html) return undefined;
  const decoded = decode(html);
  const lines = decoded
    .split(/<br\s*\/?>/giu)
    .map((line) => line.replace(/<[^>]+>/gu, '').trim())
    .filter(Boolean);
  return lines.length > 0 ? lines : undefined;
}

function normalizeImageUrl(raw: string | null): string | null {
  if (!raw) return null;
  if (/^https?:\/\//iu.test(raw)) {
    return raw;
  }
  const cleaned = raw.replace(/^\/+/u, '');
  return `https://cdn.ssactivewear.com/${cleaned}`;
}

/**
 * Build ProductRecord from REST API bundle.
 */
export function buildProductFromRest(productId: string, bundle: RestBundle): ProductRecord {
  if (!bundle.products || bundle.products.length === 0) {
    throw new Error(`No SSActivewear REST product data available for ${productId}`);
  }

  const colors = new Map<string, ProductColorway>();
  const sizes = new Map<string, ProductSize>();
  const skuMap = new Map<string, ProductSkuMapEntry>();
  const inventoryMap = new Map<string, number>();
  let minPiecePrice: number | null = null;
  let maxPiecePrice: number | null = null;
  const mediaMap = new Map<string, Set<string>>();

  const firstProduct = bundle.products[0];
  const styleInfo = bundle.style;

  const name = styleInfo?.title || firstProduct.styleName || productId;
  const brand = styleInfo?.brandName || firstProduct.brandName || '';
  const description = htmlToLines(styleInfo?.description || null);

  for (const product of bundle.products) {
    const colorName = product.colorName || 'Default';
    const colorCode = sanitizeCode(colorName, `${productId}_COLOR`);

    if (!colors.has(colorCode)) {
      colors.set(colorCode, {
        colorCode,
        colorName,
        supplierVariantId: product.colorCode || undefined,
        swatchUrl: product.colorSwatchImage
          ? normalizeImageUrl(product.colorSwatchImage)
          : undefined,
      });
    }

    const sizeName = product.sizeName || 'OSFA';
    const sizeCode = sanitizeCode(sizeName, 'OSFA');
    const sizeOrder = Number.parseInt(String(product.sizeOrder || 0), 10) || 0;

    if (!sizes.has(sizeCode)) {
      sizes.set(sizeCode, {
        code: sizeCode,
        display: sizeName,
        sort: sizeOrder,
      });
    }

    const sku = product.sku || `${productId}_${colorCode}_${sizeCode}`;
    const mapKey = `${colorCode}::${sizeCode}`;
    if (!skuMap.has(mapKey)) {
      skuMap.set(mapKey, {
        supplierPartId: productId,
        colorCode,
        sizeCode,
        supplierSku: sku,
      });
    }

    const mediaSet = mediaMap.get(colorCode) ?? new Set<string>();
    const imageCandidates = [
      product.colorFrontImage,
      product.colorBackImage,
      product.colorSideImage,
      product.colorDirectSideImage,
    ];
    for (const candidate of imageCandidates) {
      if (candidate) {
        const normalized = normalizeImageUrl(candidate);
        if (normalized) {
          mediaSet.add(normalized);
        }
      }
    }
    mediaMap.set(colorCode, mediaSet);

    const qty = computeTotalQuantity(product);
    if (qty > 0) {
      inventoryMap.set(mapKey, (inventoryMap.get(mapKey) ?? 0) + qty);
    }

    const priceCandidate = toNumber(
      product.customerPrice ?? product.salePrice ?? product.piecePrice ?? product.mapPrice
    );
    if (priceCandidate != null) {
      minPiecePrice = minPiecePrice == null ? priceCandidate : Math.min(minPiecePrice, priceCandidate);
      maxPiecePrice = maxPiecePrice == null ? priceCandidate : Math.max(maxPiecePrice, priceCandidate);
    }
  }

  const defaultColor = colors.values().next().value?.colorCode || 'DEFAULT';

  const mediaGroups: ProductMediaGroup[] = Array.from(mediaMap.entries()).map(
    ([colorCode, urls]) => ({
      colorCode,
      urls: Array.from(urls),
    })
  );

  const inventory: ProductInventorySummary[] = Array.from(inventoryMap.entries()).map(
    ([key, totalQty]) => {
      const [colorCode, sizeCode] = key.split('::');
      return {
        colorCode,
        sizeCode,
        totalQty,
        fetchedAt: new Date().toISOString(),
      };
    }
  );

  const attributes: Record<string, unknown> = {};
  if (minPiecePrice != null) {
    attributes.piecePrice = minPiecePrice;
  }
  if (maxPiecePrice != null && maxPiecePrice !== minPiecePrice) {
    attributes.maxPiecePrice = maxPiecePrice;
  }

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
    description,
    inventory: inventory.length ? inventory : undefined,
    attributes: Object.keys(attributes).length ? attributes : undefined,
  };
}

/**
 * Build InventorySnapshot from REST API products.
 */
export function buildInventoryFromRest(
  products: RestBundle['products'],
  colorCode?: string
): InventorySnapshot {
  const bySize: InventorySnapshot['bySize'] = {};

  for (const product of products) {
    // Filter by color if specified
    if (colorCode) {
      const productColorName = product.colorName || 'Default';
      const productColorCode = sanitizeCode(productColorName, 'DEFAULT');
      if (productColorCode !== colorCode.toUpperCase()) {
        continue;
      }
    }

    const sizeName = product.sizeName || 'OSFA';
    const sizeCode = sanitizeCode(sizeName, 'OSFA');

    let totalQty = 0;
    if (product.warehouses && Array.isArray(product.warehouses)) {
      for (const warehouse of product.warehouses) {
        const qty = Number.parseInt(String(warehouse.qty || 0), 10) || 0;
        totalQty += qty;
      }
    } else if (product.qty != null) {
      totalQty = Number.parseInt(String(product.qty), 10) || 0;
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

function computeTotalQuantity(product: RestBundle['products'][number]): number {
  if (product.warehouses && Array.isArray(product.warehouses)) {
    return product.warehouses.reduce((sum, warehouse) => {
      const qty = Number.parseInt(String(warehouse.qty ?? 0), 10) || 0;
      return sum + qty;
    }, 0);
  }
  if (product.qty != null) {
    return Number.parseInt(String(product.qty), 10) || 0;
  }
  return 0;
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const normalized = value.replace(/[^0-9.]/gu, '');
    if (!normalized) {
      return null;
    }
    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

