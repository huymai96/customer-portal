import { Prisma, PrismaClient, Product, SupplierSource } from '@prisma/client';

import { prisma } from '@/lib/prisma';
import { ensureCanonicalStyleLink, guessCanonicalStyleNumber } from '@/services/canonical-style';
import { invokeSoapOperation } from '@/lib/sanmar/soapClient';
import type { GenericSoapClient } from '@/lib/sanmar/soapClient';

const DEFAULT_PAGE_SIZE = Number.parseInt(process.env.SANMAR_CATALOG_PAGE_SIZE ?? '100', 10);

type UnknownRecord = Record<string, unknown>;

interface CatalogPageCursor {
  pageNumber: number;
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
  soapClient?: GenericSoapClient;
  soapOperation?: string;
}

interface CatalogPageResult {
  items: NormalizedProduct[];
  nextCursor: CatalogPageCursor | null;
  rawCount: number;
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

  const rawDescriptions = (
    record.description ??
    record.Description ??
    record.descriptions ??
    record.Descriptions ??
    record.marketingCopy ??
    record.MarketingCopy
  ) as (string | unknown) | Array<string | unknown> | null | undefined;
  const descriptionCandidates = toArray<string | unknown>(rawDescriptions);
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

  const rawColors = (
    record.colors ?? record.Colors ?? record.colorways ?? record.Colorways ?? record.Colorway
  ) as UnknownRecord | UnknownRecord[] | null | undefined;
  const colorEntries = toArray<UnknownRecord>(rawColors);
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
    .filter(Boolean) as NormalizedProduct['colors'];

  const rawSizes = (
    record.sizes ?? record.Sizes ?? record.sizeChart ?? record.SizeChart ?? record.Size
  ) as UnknownRecord | UnknownRecord[] | null | undefined;
  const sizeEntries = toArray<UnknownRecord>(rawSizes);
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
    .filter(Boolean) as NormalizedProduct['sizes'];

  const rawMedia = (
    record.media ?? record.Media ?? record.images ?? record.Images ?? record.image ?? record.Image
  ) as UnknownRecord | UnknownRecord[] | null | undefined;
  const mediaCollections = toArray<UnknownRecord>(rawMedia);
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

  const rawSkus = (
    record.skuMap ?? record.SkuMap ?? record.sku ?? record.Sku ?? record.skus ?? record.Skus
  ) as UnknownRecord | UnknownRecord[] | null | undefined;
  const skuEntries = toArray<UnknownRecord>(rawSkus);
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
    .filter(Boolean) as NormalizedProduct['skus'];

  const rawKeywords = (
    record.keywords ??
    record.Keywords ??
    record.tags ??
    record.Tags ??
    record.searchTerms ??
    record.SearchTerms
  ) as (string | unknown) | Array<string | unknown> | null | undefined;
  const keywordEntries = toArray<string | unknown>(rawKeywords);
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

function getEnvOrDefault(name: string, fallback: string): string {
  return process.env[name]?.trim() || fallback;
}

function wrapRequestBody(requestKey: string, body: Record<string, unknown>) {
  if (requestKey === '__root__') {
    return body;
  }
  return { [requestKey]: body };
}

function getNestedValue(source: unknown, path: string): unknown {
  if (!source) return undefined;
  const segments = path.split('.').filter(Boolean);
  let current: unknown = source;
  for (const segment of segments) {
    if (current && typeof current === 'object' && segment in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[segment];
    } else {
      return undefined;
    }
  }
  return current;
}

function extractSoapProducts(payload: unknown): { records: UnknownRecord[]; totalPages?: number } {
  const candidatePaths = [
    'GetProductsResult.Products.Product',
    'GetProductDataResult.Products.Product',
    'Products.Product',
    'ProductData.Products.Product',
    'Product',
  ];

  for (const path of candidatePaths) {
    const value = getNestedValue(payload, path);
    const records = toArray(value as UnknownRecord | UnknownRecord[] | null | undefined);
    if (records.length) {
      const totalPages =
        readNumber(getNestedValue(payload, 'GetProductsResult.TotalPages')) ??
        readNumber(getNestedValue(payload, 'Products.TotalPages')) ??
        readNumber(getNestedValue(payload, 'Paging.TotalPages'));
      return { records, totalPages: totalPages ?? undefined };
    }
  }

  return { records: [] };
}

async function fetchCatalogPage(
  soapClient: GenericSoapClient,
  cursor: CatalogPageCursor | null,
  options: SanmarCatalogSyncOptions
): Promise<CatalogPageResult> {
  if (!soapClient) {
    throw new Error('SanMar SOAP client not provided');
  }

  const operation = options.soapOperation ?? getEnvOrDefault('SANMAR_PRODUCT_OPERATION', 'GetProducts');
  const requestKey = getEnvOrDefault('SANMAR_PRODUCT_REQUEST_KEY', 'request');
  const pageField = getEnvOrDefault('SANMAR_PRODUCT_PAGE_FIELD', 'Page');
  const pageSizeField = getEnvOrDefault('SANMAR_PRODUCT_PAGE_SIZE_FIELD', 'PageSize');
  const includeInactiveField = getEnvOrDefault('SANMAR_PRODUCT_INCLUDE_INACTIVE_FIELD', 'IncludeInactive');
  const includeDiscontinuedField = getEnvOrDefault(
    'SANMAR_PRODUCT_INCLUDE_DISCONTINUED_FIELD',
    'IncludeDiscontinued'
  );
  const modifiedField = getEnvOrDefault('SANMAR_PRODUCT_MODIFIED_FIELD', 'ModifiedSince');

  const pageNumber = cursor?.pageNumber ?? 1;
  const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;

  const requestBody: Record<string, unknown> = {
    [pageField]: pageNumber,
    [pageSizeField]: pageSize,
    [includeInactiveField]: true,
    [includeDiscontinuedField]: true,
  };

  if (options.modifiedSince) {
    requestBody[modifiedField] = options.modifiedSince.toISOString();
  }

  const payload = wrapRequestBody(requestKey, requestBody);
  const soapResponse = await invokeSoapOperation(soapClient, operation, payload);
  const { records, totalPages } = extractSoapProducts(soapResponse);

  const normalized = records
    .map((record) => normalizeProduct(record))
    .filter((record): record is NormalizedProduct => Boolean(record));

  const hasMore = totalPages ? pageNumber < totalPages : normalized.length === pageSize;
  const nextCursor = hasMore ? { pageNumber: pageNumber + 1 } : null;

  return {
    items: normalized,
    nextCursor,
    rawCount: records.length,
  };
}

async function upsertProduct(
  tx: PrismaClient | Prisma.TransactionClient,
  product: NormalizedProduct
): Promise<'created' | 'updated'> {
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

  await ensureCanonicalStyleLink(tx, {
    supplier: SupplierSource.SANMAR,
    supplierPartId: product.supplierPartId,
    styleNumber: guessCanonicalStyleNumber({
      supplier: SupplierSource.SANMAR,
      supplierPartId: product.supplierPartId,
      brand: product.brand ?? undefined,
    }),
    displayName: product.name,
    brand: product.brand ?? undefined,
  });

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
  const soapClient = options.soapClient;
  if (!soapClient) {
    throw new Error('SanMar SOAP client missing. Pass `soapClient` to syncSanmarCatalog.');
  }

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

    const pageResult = await fetchCatalogPage(soapClient, cursor, options);
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
