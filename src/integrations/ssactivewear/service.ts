/**
 * Unified SSActivewear Service Layer
 * 
 * Attempts PromoStandards SOAP first, falls back to REST API v2 on failure.
 * Returns structured data with source tracking and warnings.
 */

import type { InventorySnapshot, ProductRecord } from '@/lib/types';

import { toSsaProductId } from './config';
import { getProduct } from './product-data';
import { getInventoryLevels } from './inventory-service';
import { fetchRestBundle } from './rest-client';
import { parseProductXml, parseInventoryXml } from './xml-parser';
import { buildProductFromRest, buildInventoryFromRest } from './rest-parser';

export type DataSource = 'promostandards' | 'rest';

interface BaseResult {
  source: DataSource;
  fetchedAt: string;
  warnings?: string[];
}

export interface ProductResult extends BaseResult {
  product: ProductRecord;
}

export interface InventoryResult extends BaseResult {
  inventory: InventorySnapshot;
}

function aggregateErrors(errors: unknown[]): Error {
  if (errors.length === 1) {
    const [error] = errors;
    return error instanceof Error ? error : new Error(String(error));
  }
  const message = errors
    .map((error, index) => {
      if (error instanceof Error) {
        return `${index + 1}. ${error.message}`;
      }
      return `${index + 1}. ${String(error)}`;
    })
    .join('\n');
  return new Error(`Multiple failures encountered:\n${message}`);
}

function createWarnings(errors: unknown[]): string[] | undefined {
  if (errors.length === 0) {
    return undefined;
  }
  return errors.map((error) => {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  });
}

/**
 * Fetch product data with PromoStandards → REST fallback.
 */
export async function fetchProductWithFallback(productId: string): Promise<ProductResult> {
  const attemptErrors: unknown[] = [];
  const normalizedId = toSsaProductId(productId);

  // Attempt 1: PromoStandards SOAP
  try {
    const xml = await getProduct({ productId: normalizedId });
    const product = await parseProductXml(xml, normalizedId);
    return {
      product,
      source: 'promostandards',
      fetchedAt: new Date().toISOString(),
    };
  } catch (error) {
    attemptErrors.push(error);
  }

  // Attempt 2: REST API v2
  try {
    const bundle = await fetchRestBundle(normalizedId);
    const product = buildProductFromRest(normalizedId, bundle);
    return {
      product,
      source: 'rest',
      fetchedAt: new Date().toISOString(),
      warnings: createWarnings(attemptErrors),
    };
  } catch (error) {
    attemptErrors.push(error);
  }

  throw aggregateErrors(attemptErrors);
}

/**
 * Fetch inventory data with PromoStandards → REST fallback.
 */
export async function fetchInventoryWithFallback(
  productId: string,
  colorCode?: string
): Promise<InventoryResult> {
  const attemptErrors: unknown[] = [];
  const normalizedId = toSsaProductId(productId);

  // Attempt 1: PromoStandards SOAP
  try {
    const xml = await getInventoryLevels({ 
      productId: normalizedId,
      color: colorCode,
    });
    const inventory = await parseInventoryXml(xml, normalizedId, colorCode);
    return {
      inventory,
      source: 'promostandards',
      fetchedAt: new Date().toISOString(),
    };
  } catch (error) {
    attemptErrors.push(error);
  }

  // Attempt 2: REST API v2
  try {
    const bundle = await fetchRestBundle(normalizedId);
    const inventory = buildInventoryFromRest(bundle.products, colorCode);
    return {
      inventory,
      source: 'rest',
      fetchedAt: new Date().toISOString(),
      warnings: createWarnings(attemptErrors),
    };
  } catch (error) {
    attemptErrors.push(error);
  }

  throw aggregateErrors(attemptErrors);
}

/**
 * Build color-specific inventory snapshot from full inventory result.
 * Used by API routes that need per-color inventory.
 */
export function buildColorInventorySnapshot(
  inventory: InventorySnapshot,
  _colorCode: string
): InventorySnapshot {
  // SSActivewear inventory is already aggregated by size across all colors
  // This function exists for API compatibility but returns the full snapshot
  return {
    bySize: inventory.bySize,
    fetchedAt: inventory.fetchedAt,
    cacheStatus: inventory.cacheStatus,
  };
}

/**
 * Check if a product ID belongs to SSActivewear.
 * SSActivewear uses "B" prefix + 5-digit style numbers.
 */
export function isSsActivewearPart(partId: string): boolean {
  const normalized = partId.trim().toUpperCase();
  
  // Has B prefix
  if (normalized.startsWith('B') && normalized.length > 1) {
    return true;
  }

  // Has 4+ digits (likely a style number without prefix)
  const digitsOnly = normalized.replace(/[^0-9]/gu, '');
  return digitsOnly.length >= 4;
}

