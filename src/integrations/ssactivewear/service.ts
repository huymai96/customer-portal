/**
 * SSActivewear REST-only Service Layer
 *
 * Provides catalog + inventory access backed solely by the V2 REST API.
 */

import type { InventorySnapshot, ProductRecord } from '@/lib/types';

import { toSsaProductId } from './config';
import { fetchRestBundle } from './rest-client';
import { buildProductFromRest, buildInventoryFromRest } from './rest-parser';

export type DataSource = 'rest';

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

/**
 * Fetch product data via SSActivewear REST API v2.
 */
export async function fetchProductWithFallback(productId: string): Promise<ProductResult> {
  const normalizedId = toSsaProductId(productId);
  const bundle = await fetchRestBundle(normalizedId);
  const product = buildProductFromRest(normalizedId, bundle);

  return {
    product,
    source: 'rest',
    fetchedAt: new Date().toISOString(),
    warnings: undefined,
  };
}

/**
 * Fetch inventory data via SSActivewear REST API v2.
 */
export async function fetchInventoryWithFallback(
  productId: string,
  colorCode?: string
): Promise<InventoryResult> {
  const normalizedId = toSsaProductId(productId);
  const bundle = await fetchRestBundle(normalizedId);
  const inventory = buildInventoryFromRest(bundle.products, colorCode);

  return {
    inventory,
    source: 'rest',
    fetchedAt: new Date().toISOString(),
    warnings: undefined,
  };
}

/**
 * Build color-specific inventory snapshot from full inventory result.
 * Used by API routes that need per-color inventory.
 */
export function buildColorInventorySnapshot(
  inventory: InventorySnapshot,
  colorCode: string
): InventorySnapshot {
  void colorCode;
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

