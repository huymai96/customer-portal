import type {
  ProductColorway,
  ProductMediaGroup,
  ProductRecord,
  ProductSize,
  ProductSkuMapEntry,
} from '@/lib/types';

import { loadConfig, toStyleNumber, toSsaProductId } from './config';
import {
  InventoryRecord,
  ParsedInventory,
  ParsedProduct,
  computeSizeSort,
  htmlToLines,
  normalizeImageUrl,
  sanitizeCode,
} from './parser';

interface RestWarehouse {
  warehouseAbbr: string;
  qty: number | string;
}

interface RestProduct {
  sku: string;
  styleID: number | string;
  brandName?: string;
  styleName?: string;
  colorName?: string;
  colorCode?: string;
  colorFrontImage?: string;
  colorBackImage?: string;
  colorSideImage?: string;
  colorDirectSideImage?: string;
  colorSwatchImage?: string;
  sizeName?: string;
  sizeCode?: string;
  sizeOrder?: string;
  qty?: number | string;
  warehouses?: RestWarehouse[];
  colorGroupName?: string;
  colorFamily?: string;
  baseCategoryID?: string;
  caseQty?: number | string;
  unitWeight?: number | string;
  mapPrice?: number | string;
  piecePrice?: number | string;
  salePrice?: number | string;
  customerPrice?: number | string;
}

interface RestStyle {
  styleName?: string;
  brandName?: string;
  title?: string;
  description?: string;
  baseCategory?: string;
  categories?: string;
  lineName?: string;
}

interface RestBundle {
  products: RestProduct[];
  style?: RestStyle | null;
}

function buildAuthHeader(accountNumber: string, apiKey: string): string {
  return `Basic ${Buffer.from(`${accountNumber}:${apiKey}`).toString('base64')}`;
}

async function fetchRest<T>(
  path: string,
  params: Record<string, string | undefined>
): Promise<T> {
  const config = loadConfig();
  const url = new URL(path, config.restBaseUrl);

  for (const [key, value] of Object.entries(params)) {
    if (value != null && value !== '') {
      url.searchParams.set(key, value);
    }
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: buildAuthHeader(config.accountNumber, config.apiKey),
    },
  });

  if (!response.ok) {
    const payload = await response.text();
    throw new Error(
      `SSActivewear REST request failed: ${response.status} ${response.statusText} - ${payload}`
    );
  }

  return response.json() as Promise<T>;
}

async function fetchRestProducts(styleNumber: string): Promise<RestProduct[]> {
  const data = await fetchRest<RestProduct[]>('/products', { style: styleNumber });
  if (!Array.isArray(data)) {
    return [];
  }
  return data;
}

async function fetchRestStyle(styleNumber: string): Promise<RestStyle | null> {
  const data = await fetchRest<RestStyle[]>('/styles', { style: styleNumber });
  if (!Array.isArray(data) || data.length === 0) {
    return null;
  }
  return data[0] ?? null;
}

export async function fetchRestBundle(productId: string): Promise<RestBundle> {
  const styleNumber = toStyleNumber(toSsaProductId(productId));
  const [products, style] = await Promise.all([
    fetchRestProducts(styleNumber),
    fetchRestStyle(styleNumber).catch(() => null),
  ]);

  return { products, style };
}

function normalizeWarehouseQuantity(entry: RestWarehouse): number {
  return Number.parseInt(String(entry?.qty ?? 0), 10) || 0;
}

export function buildProductFromRest(productId: string, bundle: RestBundle): ParsedProduct {
  if (!bundle.products || bundle.products.length === 0) {
    throw new Error(`No SSActivewear REST product data available for ${productId}`);
  }

  const supplierPartId = toSsaProductId(productId).toUpperCase();
  const colors = new Map<string, ProductColorway>();
  const sizes = new Map<string, ProductSize>();
  const skuMap = new Map<string, ProductSkuMapEntry>();
  const mediaMap = new Map<string, Set<string>>();
  const keywords = new Set<string>();

  const firstProduct = bundle.products[0];
  const styleInfo = bundle.style ?? null;

  const name = styleInfo?.title ?? firstProduct.styleName ?? supplierPartId;
  const brand = styleInfo?.brandName ?? firstProduct.brandName ?? '';

  const description = htmlToLines(styleInfo?.description ?? null);

  if (styleInfo?.baseCategory) keywords.add(styleInfo.baseCategory.toLowerCase());
  if (styleInfo?.categories) {
    styleInfo.categories
      .split(',')
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean)
      .forEach((entry) => keywords.add(entry));
  }

  for (const product of bundle.products) {
    const colorName = product.colorName ?? 'Default';
    const colorCode = sanitizeCode(colorName, `${supplierPartId}_COLOR`);

    if (!colors.has(colorCode)) {
      colors.set(colorCode, {
        colorCode,
        colorName,
        supplierVariantId: product.colorCode ?? undefined,
        swatchUrl: product.colorSwatchImage
          ? normalizeImageUrl(product.colorSwatchImage)
          : undefined,
      });
      keywords.add(colorName.toLowerCase());
      if (product.colorFamily) keywords.add(product.colorFamily.toLowerCase());
      if (product.colorGroupName) keywords.add(product.colorGroupName.toLowerCase());
    }

    const sizeName = product.sizeName ?? 'OSFA';
    const sizeCode = sanitizeCode(sizeName, 'OSFA');
    if (!sizes.has(sizeCode)) {
      sizes.set(sizeCode, {
        code: sizeCode,
        display: sizeName,
        sort: computeSizeSort(sizeName),
      });
    }

    const sku = product.sku ?? `${supplierPartId}_${colorCode}_${sizeCode}`;
    const mapKey = `${colorCode}::${sizeCode}`;
    if (!skuMap.has(mapKey)) {
      skuMap.set(mapKey, {
        supplierPartId: supplierPartId,
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
    for (const rawUrl of imageCandidates) {
      if (rawUrl) {
        mediaSet.add(normalizeImageUrl(rawUrl));
      }
    }
    mediaMap.set(colorCode, mediaSet);
  }

  if (colors.size === 0) {
    colors.set('DEFAULT', { colorCode: 'DEFAULT', colorName: 'Default' });
  }

  if (sizes.size === 0) {
    sizes.set('OSFA', { code: 'OSFA', display: 'One Size', sort: 0 });
  }

  const mediaGroups: ProductMediaGroup[] = Array.from(mediaMap.entries()).map(
    ([colorCode, urls]) => ({
      colorCode,
      urls: Array.from(urls).filter(Boolean),
    })
  );

  const attributes: Record<string, unknown> = {
    styleId: bundle.products[0]?.styleID,
    baseCategoryId: bundle.products[0]?.baseCategoryID,
    lineName: styleInfo?.lineName,
  };

  const firstColor = colors.values().next().value;
  const defaultColor = typeof firstColor?.colorCode === 'string' ? firstColor.colorCode : supplierPartId;

  const product: ProductRecord = {
    id: supplierPartId,
    supplierPartId,
    name: name || supplierPartId,
    brand: brand ?? '',
    defaultColor,
    colors: Array.from(colors.values()),
    sizes: Array.from(sizes.values()).sort((a, b) => a.sort - b.sort),
    media: mediaGroups,
    skuMap: Array.from(skuMap.values()),
    description: description.length > 0 ? description : undefined,
    attributes,
  };

  return {
    supplierPartId,
    product,
    keywords: Array.from(keywords),
  };
}

export function buildInventoryFromRest(productId: string, products: RestProduct[]): ParsedInventory {
  const supplierPartId = toSsaProductId(productId).toUpperCase();

  const records: InventoryRecord[] = products.map((entry) => {
    const colorName = entry.colorName ?? 'Default';
    const sizeName = entry.sizeName ?? 'OSFA';
    const colorCode = sanitizeCode(colorName, `${supplierPartId}_COLOR`);
    const sizeCode = sanitizeCode(sizeName, 'OSFA');
    const warehouses =
      entry.warehouses?.map((warehouse) => ({
        warehouseId: warehouse.warehouseAbbr ?? 'UNKNOWN',
        quantity: normalizeWarehouseQuantity(warehouse),
      })) ?? [];

    const totalQty =
      warehouses.reduce((sum, warehouse) => sum + warehouse.quantity, 0) ||
      Number.parseInt(String(entry.qty ?? 0), 10) ||
      0;

    return {
      supplierPartId,
      supplierSku: entry.sku ?? `${supplierPartId}_${colorCode}_${sizeCode}`,
      colorCode,
      sizeCode,
      totalQty,
      warehouses,
    };
  });

  return {
    supplierPartId,
    records,
  };
}


