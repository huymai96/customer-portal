import type { Prisma } from '@prisma/client';

import { prisma } from '@/lib/prisma';
import type {
  ProductRecord,
  ProductMediaGroup,
  ProductSize,
  ProductColorway,
  ProductSkuMapEntry,
  ProductInventorySummary,
} from '@/lib/types';

type PrismaProduct = Prisma.ProductGetPayload<{
  include: {
    colors: true;
    sizes: true;
    media: true;
    skus: true;
    keywords: true;
    inventory: true;
  };
}>;

function mapProduct(product: PrismaProduct): ProductRecord {
  const colors: ProductColorway[] = product.colors.map((color) => ({
    colorCode: color.colorCode,
    colorName: color.colorName ?? color.colorCode,
    supplierVariantId: color.supplierVariantId ?? undefined,
    swatchUrl: color.swatchUrl ?? undefined,
  }));

  const sizes: ProductSize[] = product.sizes
    .map((size) => ({
      code: size.sizeCode,
      display: size.display ?? size.sizeCode,
      sort: size.sort ?? 0,
    }))
    .sort((a, b) => a.sort - b.sort || a.code.localeCompare(b.code));

  const mediaMap = new Map<string, ProductMediaGroup>();
  for (const item of product.media) {
    const colorCode = item.colorCode ?? product.defaultColor ?? 'DEFAULT';
    const key = colorCode;
    if (!mediaMap.has(key)) {
      mediaMap.set(key, { colorCode, urls: [] });
    }
    const group = mediaMap.get(key)!;
    if (!group.urls.includes(item.url)) {
      group.urls.push(item.url);
    }
  }

  const media: ProductMediaGroup[] = Array.from(mediaMap.values()).map((group) => ({
    colorCode: group.colorCode,
    urls: group.urls,
  }));

  const skuMap: ProductSkuMapEntry[] = product.skus.map((sku) => ({
    supplierPartId: product.supplierPartId,
    colorCode: sku.colorCode,
    sizeCode: sku.sizeCode,
    supplierSku: sku.supplierSku,
  }));

  const inventory: ProductInventorySummary[] | undefined = product.inventory?.map((entry) => ({
    colorCode: entry.colorCode,
    sizeCode: entry.sizeCode,
    totalQty: entry.totalQty,
    fetchedAt: entry.fetchedAt.toISOString(),
    warehouses: Array.isArray(entry.warehouses) ? (entry.warehouses as Array<{ warehouseId: string; quantity: number }>) : undefined,
  }));

  return {
    id: product.id,
    supplierPartId: product.supplierPartId,
    name: product.name,
    brand: product.brand ?? undefined,
    defaultColor: product.defaultColor ?? colors[0]?.colorCode ?? 'DEFAULT',
    colors,
    sizes,
    media,
    skuMap,
    description: Array.isArray(product.description) ? (product.description as string[]) : [],
    attributes: product.attributes ?? undefined,
    inventory,
  };
}

export async function listCatalogProducts(limit = 50): Promise<ProductRecord[]> {
  const products = await prisma.product.findMany({
    take: limit,
    orderBy: { supplierPartId: 'asc' },
    include: { colors: true, sizes: true, media: true, skus: true, keywords: true, inventory: true },
  });
  return products.map(mapProduct);
}

export async function searchCatalogProducts(query: string, limit = 20) {
  const trimmed = query.trim();
  if (!trimmed) {
    return [] as Array<{ supplierPartId: string; name: string; brand: string | null }>; 
  }

  const products = await prisma.product.findMany({
    where: {
      OR: [
        { supplierPartId: { contains: trimmed, mode: 'insensitive' } },
        { name: { contains: trimmed, mode: 'insensitive' } },
        { brand: { contains: trimmed, mode: 'insensitive' } },
        { keywords: { some: { keyword: { contains: trimmed, mode: 'insensitive' } } } },
      ],
    },
    take: limit,
    orderBy: { supplierPartId: 'asc' },
    select: {
      supplierPartId: true,
      name: true,
      brand: true,
    },
  });

  return products.map((product) => ({
    supplierPartId: product.supplierPartId,
    name: product.name,
    brand: product.brand ?? null,
  }));
}

export async function getProductBySupplierPartId(partId: string): Promise<ProductRecord | null> {
  const product = await prisma.product.findUnique({
    where: { supplierPartId: partId.toUpperCase() },
    include: { colors: true, sizes: true, media: true, skus: true, keywords: true, inventory: true },
  });

  return product ? mapProduct(product) : null;
}

export async function getProductBaseBlankCost(partId: string): Promise<number | null> {
  const product = await prisma.product.findUnique({
    where: { supplierPartId: partId.toUpperCase() },
    select: { attributes: true },
  });

  if (!product?.attributes) {
    return null;
  }

  const attributes = product.attributes as Record<string, unknown>;
  const piecePriceCandidate = attributes.piecePrice;
  if (typeof piecePriceCandidate === 'number') {
    return piecePriceCandidate;
  }

  if (typeof piecePriceCandidate === 'string') {
    const parsed = Number.parseFloat(piecePriceCandidate);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}
