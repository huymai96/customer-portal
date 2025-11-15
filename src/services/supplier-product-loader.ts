import { SupplierSource } from '@prisma/client';

import type { ProductMediaGroup, ProductRecord } from '@/lib/types';
import { getProductBySupplierPartId } from '@/services/catalog-repository';
import {
  fetchProductWithFallback,
  isSsActivewearPart,
} from '@/integrations/ssactivewear/service';
import {
  getCanonicalStyleByAnySupplierPart,
  getCanonicalStyleByStyleNumber,
} from '@/services/canonical-style';

export interface SupplierProductBundle {
  canonicalStyle?:
    | {
        id: string | null;
        styleNumber: string;
        displayName: string;
        brand?: string | null;
      }
    | null;
  products: Partial<Record<SupplierSource, ProductRecord>>;
  metadata: Partial<
    Record<
      SupplierSource,
      {
        source?: string;
        warnings?: string[];
      }
    >
  >;
  primarySupplier?: SupplierSource;
  primaryProduct?: ProductRecord | null;
}

const PREFERRED_SUPPLIER_ORDER: SupplierSource[] = [
  SupplierSource.SANMAR,
  SupplierSource.SSACTIVEWEAR,
];

export async function loadSupplierProducts(identifier: string): Promise<SupplierProductBundle> {
  const normalized = identifier.trim().toUpperCase();
  const products: Partial<Record<SupplierSource, ProductRecord>> = {};
  const mergedMediaMap = new Map<string, Map<string, Set<string>>>();
  const metadata: SupplierProductBundle['metadata'] = {};

  const canonical =
    (await getCanonicalStyleByAnySupplierPart(normalized)) ??
    (await getCanonicalStyleByStyleNumber(normalized));

  if (canonical) {
    await Promise.all(
      canonical.supplierLinks.map(async (link) => {
        if (products[link.supplier]) {
          if (link.supplierPartId === normalized) {
            // this supplier already satisfies the request directly, no need to duplicate
            return;
          }
          return;
        }

        if (link.supplier === SupplierSource.SANMAR) {
          const sanmar = await getProductBySupplierPartId(link.supplierPartId).catch(() => null);
          if (sanmar) {
            products[SupplierSource.SANMAR] = sanmar;
          }
        } else if (link.supplier === SupplierSource.SSACTIVEWEAR) {
          const ssResult = await fetchProductWithFallback(link.supplierPartId).catch(() => null);
          if (ssResult?.product) {
            products[SupplierSource.SSACTIVEWEAR] = ssResult.product;
            metadata[SupplierSource.SSACTIVEWEAR] = {
              source: ssResult.source,
              warnings: ssResult.warnings,
            };
          }
        }
      })
    );
  }

  // Direct lookup fallbacks when canonical style hasn't been linked yet
  if (!products[SupplierSource.SANMAR]) {
    const sanmarDirect = await getProductBySupplierPartId(normalized).catch(() => null);
    if (sanmarDirect) {
      products[SupplierSource.SANMAR] = sanmarDirect;
      mergeMedia(mergedMediaMap, sanmarDirect.media ?? [], 'SANMAR');
    }
  }

  if (!products[SupplierSource.SSACTIVEWEAR] && isSsActivewearPart(normalized)) {
    const ssDirect = await fetchProductWithFallback(normalized).catch(() => null);
    if (ssDirect?.product) {
      products[SupplierSource.SSACTIVEWEAR] = ssDirect.product;
      mergeMedia(mergedMediaMap, ssDirect.product.media ?? [], 'SSACTIVEWEAR');
      metadata[SupplierSource.SSACTIVEWEAR] = {
        source: ssDirect.source,
        warnings: ssDirect.warnings,
      };
    }
  }

  const primarySupplier = PREFERRED_SUPPLIER_ORDER.find((supplier) => products[supplier]);
  const primaryProduct = primarySupplier ? products[primarySupplier] ?? null : null;

  const canonicalSummary = canonical
    ? {
        id: canonical.id,
        styleNumber: canonical.styleNumber,
        displayName: canonical.displayName,
        brand: canonical.brand,
      }
    : primaryProduct
      ? {
          id: null,
          styleNumber: normalized,
          displayName: primaryProduct.name,
          brand: primaryProduct.brand,
        }
      : null;

  return {
    canonicalStyle: canonicalSummary,
    products: mergeProductsWithMedia(products, mergedMediaMap),
    metadata,
    primarySupplier,
    primaryProduct,
  };
}

function mergeMedia(
  map: Map<string, Map<string, Set<string>>>,
  mediaGroups: ProductMediaGroup[],
  supplierLabel: string
) {
  for (const group of mediaGroups) {
    if (!group.urls?.length) continue;
    const colorKey = group.colorCode?.toUpperCase() ?? 'GLOBAL';
    if (!map.has(colorKey)) {
      map.set(colorKey, new Map());
    }
    const supplierMap = map.get(colorKey)!;
    const supplierKey = supplierLabel;
    if (!supplierMap.has(supplierKey)) {
      supplierMap.set(supplierKey, new Set<string>());
    }
    const urlSet = supplierMap.get(supplierKey)!;
    for (const url of group.urls) {
      if (url) {
        urlSet.add(url);
      }
    }
  }
}

function mergeProductsWithMedia(
  products: Partial<Record<SupplierSource, ProductRecord>>,
  mergedMediaMap: Map<string, Map<string, Set<string>>>
): Partial<Record<SupplierSource, ProductRecord>> {
  if (!mergedMediaMap.size) {
    return products;
  }

  const enhanced: Partial<Record<SupplierSource, ProductRecord>> = {};
  for (const [supplier, product] of Object.entries(products) as Array<[SupplierSource, ProductRecord | undefined]>) {
    if (!product) continue;
    const media: ProductMediaGroup[] = [];
    for (const [color, supplierMap] of mergedMediaMap.entries()) {
      const primarySupplier = supplierMap.has(supplier) ? supplier : Array.from(supplierMap.keys())[0];
      const urls = Array.from(supplierMap.get(primarySupplier) ?? []);
      if (!urls.length) continue;
      media.push({ colorCode: color === 'GLOBAL' ? 'GLOBAL' : color, urls });
    }
    enhanced[supplier] = {
      ...product,
      media: media.length ? media : product.media ?? [],
    };
  }
  return enhanced;
}

