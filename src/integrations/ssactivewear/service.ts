import type { InventorySnapshot, ProductRecord } from '@/lib/types';

import { getProduct } from './catalog';
import { toSsaProductId } from './config';
import { getInventoryLevels } from './inventory';
import { DataSource, ParsedInventory, parseInventoryResponse, parseProductResponse } from './parser';
import {
  buildInventoryFromRest,
  buildProductFromRest,
  fetchRestBundle,
} from './rest';

interface BaseResult {
  source: DataSource;
  fetchedAt: string;
  warnings?: string[];
}

export interface ProductResult extends BaseResult {
  product: ProductRecord;
  keywords: string[];
}

export interface InventoryResult extends BaseResult {
  inventory: ParsedInventory;
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

export async function fetchProductWithFallback(productId: string): Promise<ProductResult> {
  const attemptErrors: unknown[] = [];
  const normalizedId = toSsaProductId(productId);

  try {
    const xml = await getProduct({ productId: normalizedId });
    const parsed = await parseProductResponse(xml);
    return {
      product: parsed.product,
      keywords: parsed.keywords,
      source: 'promostandards',
      fetchedAt: new Date().toISOString(),
    };
  } catch (error) {
    attemptErrors.push(error);
  }

  try {
    const bundle = await fetchRestBundle(normalizedId);
    const parsed = buildProductFromRest(normalizedId, bundle);
    return {
      product: parsed.product,
      keywords: parsed.keywords,
      source: 'rest',
      fetchedAt: new Date().toISOString(),
      warnings: createWarnings(attemptErrors),
    };
  } catch (error) {
    attemptErrors.push(error);
  }

  throw aggregateErrors(attemptErrors);
}

export async function fetchInventoryWithFallback(
  productId: string
): Promise<InventoryResult> {
  const attemptErrors: unknown[] = [];
  const normalizedId = toSsaProductId(productId);

  try {
    const xml = await getInventoryLevels({ productId: normalizedId });
    const parsed = await parseInventoryResponse(xml, normalizedId);
    return {
      inventory: parsed,
      source: 'promostandards',
      fetchedAt: new Date().toISOString(),
    };
  } catch (error) {
    attemptErrors.push(error);
  }

  try {
    const bundle = await fetchRestBundle(normalizedId);
    const parsed = buildInventoryFromRest(normalizedId, bundle.products ?? []);
    return {
      inventory: parsed,
      source: 'rest',
      fetchedAt: new Date().toISOString(),
      warnings: createWarnings(attemptErrors),
    };
  } catch (error) {
    attemptErrors.push(error);
  }

  throw aggregateErrors(attemptErrors);
}

export function buildColorInventorySnapshot(
  inventory: ParsedInventory,
  colorCode: string
): InventorySnapshot {
  const upperColor = colorCode.toUpperCase();
  const bySize: InventorySnapshot['bySize'] = {};

  for (const record of inventory.records) {
    if (record.colorCode.toUpperCase() !== upperColor) {
      continue;
    }

    const existing = bySize[record.sizeCode] ?? { qty: 0 };
    existing.qty += record.totalQty;
    bySize[record.sizeCode] = existing;
  }

  return {
    bySize,
    fetchedAt: new Date().toISOString(),
  };
}

export function isSsActivewearPart(partId: string): boolean {
  const normalized = partId.trim().toUpperCase();
  if (normalized.startsWith('B') && normalized.length > 1) {
    return true;
  }

  const digitsOnly = normalized.replace(/[^0-9]/gu, '');
  return digitsOnly.length >= 4;
}


