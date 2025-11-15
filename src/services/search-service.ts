import { Prisma, SupplierSource } from '@prisma/client';
import { kv } from '@vercel/kv';

import { prisma } from '@/lib/prisma';
import type { ProductRecord } from '@/lib/types';
import { loadSupplierProducts } from '@/services/supplier-product-loader';

export interface SupplierSearchSummary {
  supplier: SupplierSource;
  supplierPartId: string;
  brand?: string | null;
}

export interface CanonicalSearchResult {
  canonicalStyleId: string | null;
  styleNumber: string;
  displayName: string;
  brand?: string | null;
  primarySupplier?: SupplierSource;
  primarySupplierPartId: string;
  suppliers: SupplierSearchSummary[];
  price?: {
    min?: number;
    max?: number;
    currency?: string;
  };
  availability?: {
    suppliersInStock: number;
    totalSuppliers: number;
  };
  primarySupplierInStock?: boolean;
  score: number;
}

const CACHE_NAMESPACE = 'search:v1';
const CACHE_TTL_SECONDS = 60;

const SUPPLIER_PRIORITY: SupplierSource[] = [
  SupplierSource.SANMAR,
  SupplierSource.SSACTIVEWEAR,
];

function normalizeQuery(query: string): string {
  return query.trim().toUpperCase();
}

interface SearchOptions {
  limit?: number;
  offset?: number;
  suppliers?: SupplierSource[];
  sort?: 'relevance' | 'supplier' | 'price' | 'stock';
  inStockOnly?: boolean;
}

interface CanonicalSearchPayload {
  items: CanonicalSearchResult[];
  total: number;
}

export async function searchCanonicalStyles(
  query: string,
  { limit = 20, offset = 0, suppliers = [], sort = 'relevance', inStockOnly = false }: SearchOptions = {}
): Promise<CanonicalSearchPayload> {
  const normalized = normalizeQuery(query);
  if (!normalized) {
    return { items: [], total: 0 };
  }

  const supplierKey = suppliers.length ? suppliers.sort().join(',') : 'ALL';
  const cacheKey = `${CACHE_NAMESPACE}:${normalized}:${limit}:${offset}:${supplierKey}:${sort}:${inStockOnly}`;
  if (kv) {
    try {
      const cached = await kv.get<CanonicalSearchPayload>(cacheKey);
      if (cached) {
        return cached;
      }
    } catch (error) {
      console.warn('KV read failed for search cache', error);
    }
  }

  const whereClause: Prisma.CanonicalStyleWhereInput = {
    OR: [
      { styleNumber: { contains: normalized, mode: 'insensitive' } },
      { displayName: { contains: normalized, mode: 'insensitive' } },
      { brand: { contains: normalized, mode: 'insensitive' } },
      {
        supplierLinks: {
          some: {
            supplierPartId: { contains: normalized, mode: 'insensitive' },
          },
        },
      },
    ],
    ...(suppliers.length
      ? {
          supplierLinks: {
            some: {
              supplier: { in: suppliers },
            },
          },
        }
      : {}),
  };

  const [canonicalStyles, total] = await Promise.all([
    prisma.canonicalStyle.findMany({
      where: whereClause,
      include: { supplierLinks: true },
      orderBy: [{ styleNumber: 'asc' }],
      take: limit,
      skip: offset,
    }),
    prisma.canonicalStyle.count({
      where: whereClause,
    }),
  ]);

  const items = (
    await Promise.all(
      canonicalStyles.map(async (style) => {
        const suppliersEntries = style.supplierLinks.map((link) => ({
          supplier: link.supplier,
          supplierPartId: link.supplierPartId,
          brand: style.brand,
        }));
        const primarySupplier =
          SUPPLIER_PRIORITY.find((supplier) =>
            suppliersEntries.some((entry) => entry.supplier === supplier)
          ) ?? suppliersEntries[0]?.supplier;
        const primaryEntry =
          suppliersEntries.find((entry) => entry.supplier === primarySupplier) ?? suppliersEntries[0];

        const bundle = await loadSupplierProducts(style.styleNumber).catch((error) => {
          console.warn(
            `[SearchService] Failed to load supplier bundle for ${style.styleNumber}:`,
            error
          );
          return null;
        });

        const supplierMetrics = suppliersEntries.map((entry) => {
          const product = bundle?.products?.[entry.supplier];
          const price = extractProductPrice(product);
          const totalQty = computeInventoryTotal(product);
          const inStock = totalQty > 0;
          return {
            supplier: entry.supplier,
            price,
            inStock,
          };
        });

        const availableSuppliers = supplierMetrics.filter((metric) => metric.inStock).length;
        const priceValues = supplierMetrics
          .map((metric) => metric.price)
          .filter((price): price is number => price != null);

        const result: CanonicalSearchResult = {
          canonicalStyleId: style.id,
          styleNumber: style.styleNumber,
          displayName: style.displayName,
          brand: style.brand ?? undefined,
          primarySupplier,
          primarySupplierPartId:
            bundle?.primaryProduct?.supplierPartId ??
            primaryEntry?.supplierPartId ??
            style.styleNumber,
          suppliers: suppliersEntries,
          price: priceValues.length
            ? {
                min: Math.min(...priceValues),
                max: Math.max(...priceValues),
                currency: 'USD',
              }
            : undefined,
          availability: {
            suppliersInStock: availableSuppliers,
            totalSuppliers: suppliersEntries.length,
          },
          primarySupplierInStock: supplierMetrics.some(
            (metric) => metric.supplier === primarySupplier && metric.inStock
          ),
          score: computeScore(
            normalized,
            style.styleNumber,
            style.displayName ?? '',
            suppliersEntries
          ),
        };

        if (inStockOnly && result.availability?.suppliersInStock === 0) {
          return null;
        }

        return result;
      })
    )
  ).filter((item): item is CanonicalSearchResult => item !== null);

  switch (sort) {
    case 'supplier':
      items.sort((a, b) => b.suppliers.length - a.suppliers.length || b.score - a.score);
      break;
    case 'price':
      items.sort((a, b) => {
        const aPrice = a.price?.min ?? Number.POSITIVE_INFINITY;
        const bPrice = b.price?.min ?? Number.POSITIVE_INFINITY;
        if (!Number.isFinite(aPrice) && !Number.isFinite(bPrice)) {
          return b.score - a.score;
        }
        if (!Number.isFinite(aPrice)) return 1;
        if (!Number.isFinite(bPrice)) return -1;
        return aPrice - bPrice || b.score - a.score;
      });
      break;
    case 'stock':
      items.sort((a, b) => {
        const aStock = a.availability?.suppliersInStock ?? 0;
        const bStock = b.availability?.suppliersInStock ?? 0;
        return bStock - aStock || b.score - a.score;
      });
      break;
    default:
      items.sort((a, b) => b.score - a.score);
  }

  const payload: CanonicalSearchPayload = { items, total };

  if (kv) {
    try {
      await kv.set(cacheKey, payload, { ex: CACHE_TTL_SECONDS });
    } catch (error) {
      console.warn('KV write failed for search cache', error);
    }
  }

  return payload;
}

function computeScore(
  query: string,
  styleNumber: string,
  displayName: string,
  suppliers: SupplierSearchSummary[]
): number {
  let score = 0;
  if (styleNumber.startsWith(query)) {
    score += 50;
  } else if (styleNumber.includes(query)) {
    score += 25;
  }
  if (displayName.toUpperCase().includes(query)) {
    score += 20;
  }
  if (suppliers.some((supplier) => supplier.supplierPartId.startsWith(query))) {
    score += 15;
  }
  score += suppliers.length * 5;
  return score;
}

function extractProductPrice(product?: ProductRecord | null): number | null {
  if (!product?.attributes || typeof product.attributes !== 'object') {
    return null;
  }
  const attributes = product.attributes as Record<string, unknown>;
  const candidates = [
    attributes.customerPrice,
    attributes.salePrice,
    attributes.piecePrice,
    attributes.maxPiecePrice,
  ];
  for (const candidate of candidates) {
    const parsed = toNumber(candidate);
    if (parsed != null) {
      return parsed;
    }
  }
  return null;
}

function computeInventoryTotal(product?: ProductRecord | null): number {
  if (!product?.inventory || product.inventory.length === 0) {
    return 0;
  }
  return product.inventory.reduce((sum, entry) => sum + (entry.totalQty ?? 0), 0);
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

