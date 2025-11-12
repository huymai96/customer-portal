import { PrismaClient, Product } from '@prisma/client';

import { prisma } from '@/lib/prisma';

const DEFAULT_CATALOG_ENDPOINT = 'https://ws.sanmar.com/ps/api/v2/catalog';
const DEFAULT_PAGE_SIZE = Number.parseInt(process.env.SANMAR_CATALOG_PAGE_SIZE ?? '100', 10);

type UnknownRecord = Record<string, unknown>;

interface CatalogPageCursor {
  pageNumber: number;
}

interface PromoStandardsCatalogResponse {
  products?: unknown;
  Products?: unknown;
  Product?: unknown;
  data?: {
    products?: unknown;
    Products?: unknown;
    Product?: unknown;
  };
  result?: {
    products?: unknown;
    Products?: unknown;
    Product?: unknown;
  };
  pagination?: {
    nextPage?: number | string | null;
    pageNumber?: number;
    totalPages?: number;
  };
  PageInfo?: {
    NextPage?: number | string | null;
    PageNumber?: number;
    TotalPages?: number;
  };
}

interface NormalizedProduct {
  supplierPartId: string;
  name: string;
  brand?: string | null;
  defaultColor?: string | null;
  description: string[];
  attributes: Record<string, string>;
  colors: Array<{
    colorCode: string;
    colorName?: string | null;
    supplierVariantId?: string | null;
    swatchUrl?: string | null;
  }>;
  sizes: Array<{
    sizeCode: string;
    display?: string | null;
    sort?: number | null;
  }>;
  media: Array<{
    colorCode?: string | null;
    url: string;
    position?: number | null;
  }>;
  skus: Array<{
    colorCode: string;
    sizeCode: string;
    supplierSku: string;
  }>;
  keywords: string[];
}

export interface SanmarCatalogSyncOptions {
  modifiedSince?: Date;
  pageSize?: number;
  maxPages?: number;
  dryRun?: boolean;
}

interface CatalogPageResult {
  items: NormalizedProduct[];
  nextCursor: CatalogPageCursor | null;
  rawCount: number;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable ${name}`);
  }
  return value;
}

function toArray<T>(value: T | T[] | null | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function readString(value: unknown | undefined | null): string | null {
  if (typeof value === 'string') {
    return value.trim() || null;
  }
  if (typeof value === 'number') {
    return String(value).trim() || null;
  }
  return null;
}

function readNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeProduct(record: UnknownRecord): NormalizedProduct | null {
  const supplierPartId =
    readString(
      record.supplierPartId ??
        record.SupplierPartId ??
        record.SupplierPartID ??
        record.partId ??
        record.PartId ??
        record.PartID ??
        record.ProductId ??
        record.ProductID
    ) ?? undefined;

  if (!supplierPartId) {
    return null;
  }

  const name =
    readString(record.name ?? record.Name ?? record.productName ?? record.ProductName) ??
    supplierPartId;
  const brand = readString(record.brand ?? record.Brand ?? record.BrandName);
  const defaultColor = readString(
    record.defaultColor ?? record.DefaultColor ?? record.defaultColorCode ?? record.DefaultColorCode
  );

  const descriptionCandidates = toArray<string | unknown>(
    record.description ??
      record.Description ??
      record.descriptions ??
      record.Descriptions ??
      record.marketingCopy ??
      record.MarketingCopy
  );
  const description = descriptionCandidates
    .map((entry) => readString(entry) ?? null)
    .filter((entry): entry is string => Boolean(entry));

  const rawAttributes = (
    record.attributes ?? record.Attributes ?? record.attribute ?? record.Attribute
  ) as UnknownRecord | UnknownRecord[] | null | undefined;
  const attributeEntries = toArray<UnknownRecord>(rawAttributes);
  const attributes: Record<string, string> = {};
  for (const attr of attributeEntries) {
    const key =
      readString(attr?.name ?? attr?.Name ?? attr?.key ?? attr?.Key ?? attr?.attributeName) ?? null;
    const value = readString(attr?.value ?? attr?.Value ?? attr?.attributeValue) ?? null;
    if (key && value) {
      attributes[key] = value;
    }
  }

  const colorEntries = toArray<UnknownRecord>(
    record.colors ?? record.Colors ?? record.colorways ?? record.Colorways ?? record.Colorway
  );
  const colors = colorEntries
    .map((color) => {
      const colorCode =
        readString(
          color?.colorCode ??
            color?.ColorCode ??
            color?.code ??
            color?.Code ??
            color?.id ??
            color?.Id ??
            color?.colorId ??
            color?.ColorId
        ) ?? undefined;
      if (!colorCode) return null;
      return {
        colorCode: colorCode.toUpperCase(),
        colorName:
          readString(color?.colorName ?? color?.ColorName ?? color?.name ?? color?.Name) ?? null,
        supplierVariantId: readString(color?.supplierVariantId ?? color?.SupplierVariantId) ?? null,
        swatchUrl: readString(color?.swatchUrl ?? color?.SwatchUrl ?? color?.swatch) ?? null,
      };
    })
    .filter((entry): entry is NormalizedProduct['colors'][number] => Boolean(entry));

  const sizeEntries = toArray<UnknownRecord>(
    record.sizes ?? record.Sizes ?? record.sizeChart ?? record.SizeChart ?? record.Size
  );
  const sizes = sizeEntries
    .map((size) => {
      const sizeCode = readString(size?.sizeCode ?? size?.SizeCode ?? size?.code ?? size?.Code);
      if (!sizeCode) return null;
      const sortValue = readNumber(size?.sort ?? size?.Sort ?? size?.sequence ?? size?.Sequence);
      return {
        sizeCode: sizeCode.toUpperCase(),
        display:
          readString(size?.display ?? size?.Display ?? size?.name ?? size?.Name ?? size?.description) ??
          sizeCode,
        sort: sortValue ?? null,
      };
    })
    .filter((entry): entry is NormalizedProduct['sizes'][number] => Boolean(entry));

  const mediaCollections = toArray<UnknownRecord>(
    record.media ?? record.Media ?? record.images ?? record.Images ?? record.image ?? record.Image
  );
  const media: NormalizedProduct['media'] = [];
  for (const entry of mediaCollections) {
    if (entry && Array.isArray(entry)) {
      for (const nested of entry) {
        const url = readString(
          nested?.url ?? nested?.Url ?? nested?.imageUrl ?? nested?.ImageUrl ?? nested?.href
        );
        if (!url) continue;
        media.push({
          colorCode: readString(
            nested?.colorCode ??
              nested?.ColorCode ??
              nested?.color ??
              nested?.Color ??
              nested?.colorId ??
              nested?.ColorId
          )?.toUpperCase(),
          url,
          position: readNumber(nested?.position ?? nested?.Position ?? nested?.sequence ?? nested?.Sequence),
        });
      }
      continue;
    }

    const url = readString(
      entry?.url ?? entry?.Url ?? entry?.imageUrl ?? entry?.ImageUrl ?? entry?.href ?? entry?.Href
    );
    if (!url) continue;
    media.push({
      colorCode: readString(
        entry?.colorCode ?? entry?.ColorCode ?? entry?.color ?? entry?.Color ?? entry?.ColorId
      )?.toUpperCase(),
      url,
      position: readNumber(entry?.position ?? entry?.Position ?? entry?.sequence ?? entry?.Sequence),
    });
  }

  const skuEntries = toArray<UnknownRecord>(
    record.skus ?? record.Skus ?? record.sku ?? record.Sku ?? record.variants ?? record.Variants
  );
  const skus = skuEntries
    .map((sku) => {
      const colorCode =
        readString(
          sku?.colorCode ??
            sku?.ColorCode ??
            sku?.color ??
            sku?.Color ??
            sku?.ColorId ??
            sku?.colorId
        )?.toUpperCase();
      const sizeCode = readString(sku?.sizeCode ?? sku?.SizeCode ?? sku?.size ?? sku?.Size)?.toUpperCase();
      const supplierSku = readString(
        sku?.supplierSku ?? sku?.SupplierSku ?? sku?.SupplierSKU ?? sku?.sku ?? sku?.Sku ?? sku?.SKU
      );
      if (!colorCode || !sizeCode || !supplierSku) {
        return null;
      }
      return { colorCode, sizeCode, supplierSku };
    })
    .filter((entry): entry is NormalizedProduct['skus'][number] => Boolean(entry));

  const keywordEntries = toArray<string | unknown>(
    record.keywords ?? record.Keywords ?? record.tags ?? record.Tags
  );
  const keywords = keywordEntries
    .map((entry) => readString(entry) ?? null)
    .filter((entry): entry is string => Boolean(entry))
    .map((entry) => entry.toLowerCase());

  return {
    supplierPartId: supplierPartId.toUpperCase(),
    name,
    brand: brand ?? null,
    defaultColor: defaultColor?.toUpperCase() ?? null,
    description,
    attributes,
    colors,
    sizes,
    media,
    skus,
    keywords,
  };
}

function extractProducts(payload: PromoStandardsCatalogResponse): UnknownRecord[] {
  const candidates = [
    payload.products,
    payload.Products,
    payload.Product,
    payload.data?.products,
    payload.data?.Products,
    payload.data?.Product,
    payload.result?.products,
    payload.result?.Products,
    payload.result?.Product,
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    const list = toArray<UnknownRecord>(candidate as UnknownRecord | UnknownRecord[] | null | undefined);
    if (list.length > 0) {
      return list;
    }
  }

  return [];
}

function extractNextCursor(payload: PromoStandardsCatalogResponse, currentPage: number): CatalogPageCursor | null {
  const pageInfo = payload.pagination ?? payload.PageInfo;
  if (!pageInfo) {
    return null;
  }

  const nextPageCandidate =
    pageInfo.nextPage ?? pageInfo.NextPage ?? (pageInfo.pageNumber ?? pageInfo.PageNumber);

  const nextPage = readNumber(nextPageCandidate ?? currentPage + 1);
  const totalPages = readNumber(pageInfo.totalPages ?? pageInfo.TotalPages);

  if (!nextPage || (totalPages && nextPage > totalPages)) {
    return null;
  }

  if (nextPage === currentPage) {
    return null;
  }

  return { pageNumber: nextPage };
}

async function fetchCatalogPage(
  cursor: CatalogPageCursor | null,
  options: SanmarCatalogSyncOptions
): Promise<CatalogPageResult> {
  const endpoint =
    process.env.SANMAR_PROMOSTANDARDS_CATALOG_URL ??
    process.env.SUPPLIER_CATALOG_URL ??
    process.env.SANMAR_PROMOSTANDARDS_URL ??
    DEFAULT_CATALOG_ENDPOINT;

  const username = requireEnv('SANMAR_PROMOSTANDARDS_USERNAME');
  const password = requireEnv('SANMAR_PROMOSTANDARDS_PASSWORD');
  const account = requireEnv('SANMAR_ACCOUNT_NUMBER');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  if (process.env.SANMAR_PROMOSTANDARDS_TOKEN) {
    headers.Authorization = `Bearer ${process.env.SANMAR_PROMOSTANDARDS_TOKEN}`;
  } else {
    const basic = Buffer.from(`${username}:${password}`, 'utf8').toString('base64');
    headers.Authorization = `Basic ${basic}`;
  }

  const pageNumber = cursor?.pageNumber ?? 1;
  const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;

  const payload: Record<string, unknown> = {
    Identity: {
      Account: account,
      Username: username,
      Password: password,
    },
    Criteria: {
      PageNumber: pageNumber,
      PageSize: pageSize,
      IncludeDiscontinued: true,
      IncludeInactive: true,
      LastModifiedDate: options.modifiedSince?.toISOString(),
    },
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
    cache: 'no-store',
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`SanMar catalog request failed: ${response.status} ${text}`);
  }

  const json = (await response.json()) as PromoStandardsCatalogResponse;
  const rawProducts = extractProducts(json);
  const normalized = rawProducts
    .map((record) => normalizeProduct(record))
    .filter((record): record is NormalizedProduct => Boolean(record));

  const nextCursor = extractNextCursor(json, pageNumber);

  return {
    items: normalized,
    nextCursor,
    rawCount: rawProducts.length,
  };
}

async function upsertProduct(tx: PrismaClient, product: NormalizedProduct): Promise<'created' | 'updated'> {
  const existing = await tx.product.findUnique({
    where: { supplierPartId: product.supplierPartId },
    select: { id: true },
  });

  let dbProduct: Product;
  let status: 'created' | 'updated';

  if (existing) {
    dbProduct = await tx.product.update({
      where: { id: existing.id },
      data: {
        name: product.name,
        brand: product.brand,
        defaultColor: product.defaultColor,
        description: product.description.length ? product.description : undefined,
        attributes: Object.keys(product.attributes).length ? product.attributes : undefined,
      },
    });
    status = 'updated';
  } else {
    dbProduct = await tx.product.create({
      data: {
        supplierPartId: product.supplierPartId,
        name: product.name,
        brand: product.brand,
        defaultColor: product.defaultColor,
        description: product.description.length ? product.description : undefined,
        attributes: Object.keys(product.attributes).length ? product.attributes : undefined,
      },
    });
    status = 'created';
  }

  await tx.productColor.deleteMany({ where: { productId: dbProduct.id } });
  await tx.productSize.deleteMany({ where: { productId: dbProduct.id } });
  await tx.productMedia.deleteMany({ where: { productId: dbProduct.id } });
  await tx.productSku.deleteMany({ where: { productId: dbProduct.id } });
  await tx.productKeyword.deleteMany({ where: { productId: dbProduct.id } });

  if (product.colors.length) {
    await tx.productColor.createMany({
      data: product.colors.map((color) => ({
        productId: dbProduct.id,
        colorCode: color.colorCode,
        colorName: color.colorName ?? undefined,
        supplierVariantId: color.supplierVariantId ?? undefined,
        swatchUrl: color.swatchUrl ?? undefined,
      })),
      skipDuplicates: true,
    });
  }

  if (product.sizes.length) {
    await tx.productSize.createMany({
      data: product.sizes.map((size) => ({
        productId: dbProduct.id,
        sizeCode: size.sizeCode,
        display: size.display ?? undefined,
        sort: size.sort ?? undefined,
      })),
      skipDuplicates: true,
    });
  }

  if (product.media.length) {
    await tx.productMedia.createMany({
      data: product.media
        .filter((media) => Boolean(media.url))
        .map((media, index) => ({
          productId: dbProduct.id,
          colorCode: media.colorCode ?? undefined,
          url: media.url,
          position: media.position ?? index,
        })),
      skipDuplicates: true,
    });
  }

  if (product.skus.length) {
    await tx.productSku.createMany({
      data: product.skus.map((sku) => ({
        productId: dbProduct.id,
        colorCode: sku.colorCode,
        sizeCode: sku.sizeCode,
        supplierSku: sku.supplierSku,
      })),
      skipDuplicates: true,
    });
  }

  if (product.keywords.length) {
    await tx.productKeyword.createMany({
      data: product.keywords.map((keyword) => ({
        productId: dbProduct.id,
        keyword,
      })),
      skipDuplicates: true,
    });
  }

  return status;
}

export interface SanmarCatalogSyncResult {
  created: number;
  updated: number;
  processed: number;
  fetched: number;
  pages: number;
}

export async function syncSanmarCatalog(
  client: PrismaClient = prisma,
  options: SanmarCatalogSyncOptions = {}
): Promise<SanmarCatalogSyncResult> {
  let cursor: CatalogPageCursor | null = null;
  let page = 0;
  let fetched = 0;
  let created = 0;
  let updated = 0;

  const maxPages = options.maxPages ?? Number.POSITIVE_INFINITY;

  do {
    if (page >= maxPages) {
      break;
    }

    const pageResult = await fetchCatalogPage(cursor, options);
    page += 1;
    fetched += pageResult.rawCount;

    if (options.dryRun) {
      cursor = pageResult.nextCursor;
      continue;
    }

    for (const product of pageResult.items) {
      try {
        const status = await client.$transaction((tx) => upsertProduct(tx, product));
        if (status === 'created') {
          created += 1;
        } else {
          updated += 1;
        }
      } catch (error) {
        console.error(`Failed to upsert product ${product.supplierPartId}`, error);
      }
    }

    cursor = pageResult.nextCursor;
  } while (cursor);

  return {
    created,
    updated,
    processed: created + updated,
    fetched,
    pages: page,
  };
}
