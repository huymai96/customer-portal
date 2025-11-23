import { Prisma, SupplierSource } from '@prisma/client';
import { kv } from '@vercel/kv';

import { prisma } from '@/lib/prisma';

export interface SupplierSearchSummary {
  supplier: SupplierSource;
  supplierPartId: string;
  brand?: string | null;
}

export interface ColorPreview {
  colorCode: string;
  colorName: string | null;
  swatchUrl?: string | null;
}

export interface CanonicalSearchResult {
  canonicalStyleId: string | null;
  styleNumber: string;
  displayName: string;
  brand?: string | null;
  primarySupplier?: SupplierSource;
  primarySupplierPartId: string;
  suppliers: SupplierSearchSummary[];
  colors?: ColorPreview[];
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

type CanonicalStyleWithLinks = Prisma.CanonicalStyleGetPayload<{
  include: { supplierLinks: true };
}>;

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

  // Enhanced search: match styleNumber, displayName, brand, supplierPartId, and exact matches
  const whereClause: Prisma.CanonicalStyleWhereInput = {
    OR: [
      // Exact matches (highest priority)
      { styleNumber: { equals: normalized, mode: 'insensitive' } },
      {
        supplierLinks: {
          some: {
            supplierPartId: { equals: normalized, mode: 'insensitive' },
          },
        },
      },
      // Contains matches
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
      canonicalStyles.map(async (style) => formatCanonicalStyle(style, normalized, inStockOnly))
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

async function formatCanonicalStyle(
  style: CanonicalStyleWithLinks,
  normalizedQuery: string,
  inStockOnly = false
): Promise<CanonicalSearchResult | null> {
  const suppliersEntries = style.supplierLinks.map((link) => ({
    supplier: link.supplier,
    supplierPartId: link.supplierPartId,
    brand: style.brand,
  }));
  if (suppliersEntries.length === 0) {
    return null;
  }

  const primarySupplier =
    SUPPLIER_PRIORITY.find((supplier) =>
      suppliersEntries.some((entry) => entry.supplier === supplier)
    ) ?? suppliersEntries[0]?.supplier;
  const primaryEntry =
    suppliersEntries.find((entry) => entry.supplier === primarySupplier) ?? suppliersEntries[0];

  // Fetch color preview (limit to first 12 colors for performance)
  let colors: ColorPreview[] = [];
  if (primaryEntry) {
    const productColors = await prisma.productColor.findMany({
      where: {
        product: {
          supplierPartId: primaryEntry.supplierPartId,
        },
      },
      select: {
        colorCode: true,
        colorName: true,
        swatchUrl: true,
      },
      take: 12,
      orderBy: {
        colorCode: 'asc',
      },
    });
    colors = productColors.map((c) => ({
      colorCode: c.colorCode,
      colorName: c.colorName,
      swatchUrl: c.swatchUrl,
    }));
  }

  const result: CanonicalSearchResult = {
    canonicalStyleId: style.id,
    styleNumber: style.styleNumber,
    displayName: style.displayName,
    brand: style.brand ?? undefined,
    primarySupplier,
    primarySupplierPartId: primaryEntry?.supplierPartId ?? style.styleNumber,
    suppliers: suppliersEntries,
    colors: colors.length > 0 ? colors : undefined,
    price: undefined,
    availability: undefined,
    primarySupplierInStock: undefined,
    score: computeScore(
      normalizedQuery,
      style.styleNumber,
      style.displayName ?? '',
      suppliersEntries
    ),
  };

  if (inStockOnly && result.availability?.suppliersInStock === 0) {
    return null;
  }

  return result;
}

export async function findExactCanonicalStyleMatch(
  query: string,
  suppliers: SupplierSource[] = []
): Promise<CanonicalSearchResult | null> {
  const normalized = normalizeQuery(query);
  if (!normalized) {
    return null;
  }

  const andConditions: Prisma.CanonicalStyleWhereInput[] = [
    {
      OR: [
        { styleNumber: { equals: normalized, mode: 'insensitive' } },
        {
          supplierLinks: {
            some: {
              supplierPartId: { equals: normalized, mode: 'insensitive' },
            },
          },
        },
      ],
    },
  ];

  if (suppliers.length > 0) {
    andConditions.push({
      supplierLinks: {
        some: {
          supplier: { in: suppliers },
        },
      },
    });
  }

  const where: Prisma.CanonicalStyleWhereInput = {
    AND: andConditions,
  };

  const matches = await prisma.canonicalStyle.findMany({
    where,
    include: { supplierLinks: true },
    take: 2,
  });

  if (matches.length !== 1) {
    return null;
  }

  return formatCanonicalStyle(matches[0], normalized) ?? null;
}

