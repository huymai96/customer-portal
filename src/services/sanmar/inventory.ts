import { kv } from '@vercel/kv';

import { prisma } from '@/lib/prisma';
import type { InventorySnapshot, InventoryQty } from '@/lib/types';

const CACHE_PREFIX = 'sanmar:inventory';
const DEFAULT_TTL = Number.parseInt(process.env.SANMAR_INVENTORY_CACHE_TTL ?? '60', 10);
const DEFAULT_ENDPOINT = 'https://ws.sanmar.com/ps/api/v2/inventory/GetInventoryAvailability';

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value || value.length === 0) {
    throw new Error(`Environment variable ${key} is required`);
  }
  return value;
}

interface UpstreamInventoryRow {
  size?: string;
  Size?: string;
  sizeCode?: string;
  size_code?: string;
  SizeCode?: string;
  qty?: number;
  Qty?: number;
  quantity?: number;
  Quantity?: number;
  onHand?: number;
  on_hand?: number;
  OnHand?: number;
  backorderDate?: string;
  backOrderDate?: string;
  backorder_date?: string;
  BackOrderDate?: string;
  estimatedArrivalDate?: string;
  EstimatedArrivalDate?: string;
  eta?: string;
}

interface UpstreamInventoryResponse {
  inventory?: UpstreamInventoryRow[];
  Inventory?: UpstreamInventoryRow[];
  data?: {
    inventory?: UpstreamInventoryRow[];
    Inventory?: UpstreamInventoryRow[];
  };
  result?: {
    inventory?: UpstreamInventoryRow[];
    Inventory?: UpstreamInventoryRow[];
  };
}

const kvEnabled = Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

function getCacheKey(partId: string, colorCode: string) {
  return `${CACHE_PREFIX}:${partId.toUpperCase()}:${colorCode.toUpperCase()}`;
}

function coerceNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeRows(rows: UpstreamInventoryRow[] | undefined): Record<string, InventoryQty> {
  const bySize: Record<string, InventoryQty> = {};
  if (!rows?.length) {
    return bySize;
  }

  for (const row of rows) {
    const rawCode =
      row.sizeCode ??
      row.SizeCode ??
      row.size_code ??
      row.size ??
      row.Size ??
      null;

    if (!rawCode) {
      continue;
    }

    const sizeCode = String(rawCode).trim().toUpperCase();
    if (!sizeCode) {
      continue;
    }

    const qty = coerceNumber(
      row.qty ?? row.Qty ?? row.quantity ?? row.Quantity ?? row.onHand ?? row.on_hand ?? row.OnHand ?? 0
    );
    const eta =
      row.backorderDate ??
      row.backOrderDate ??
      row.backorder_date ??
      row.BackOrderDate ??
      row.estimatedArrivalDate ??
      row.EstimatedArrivalDate ??
      row.eta ??
      undefined;

    const entry: InventoryQty = { qty };
    if (eta) {
      const normalizedEta = new Date(eta);
      if (!Number.isNaN(normalizedEta.valueOf())) {
        entry.backorderDate = normalizedEta.toISOString();
      }
    }

    bySize[sizeCode] = entry;
  }

  return bySize;
}

async function readCache(cacheKey: string): Promise<InventorySnapshot | null> {
  if (!kvEnabled) {
    return null;
  }

  try {
    const cached = await kv.get<InventorySnapshot>(cacheKey);
    if (!cached) {
      return null;
    }
    return {
      ...cached,
      cacheStatus: 'hit',
    };
  } catch (error) {
    console.warn('SanMar inventory cache read failed', error);
    return null;
  }
}

async function writeCache(cacheKey: string, snapshot: InventorySnapshot, ttl: number): Promise<void> {
  if (!kvEnabled) {
    return;
  }

  try {
    await kv.set(cacheKey, snapshot, { ex: ttl });
  } catch (error) {
    console.warn('SanMar inventory cache write failed', error);
  }
}

function extractRows(data: UpstreamInventoryResponse): UpstreamInventoryRow[] {
  return (
    data.inventory ??
    data.Inventory ??
    data.data?.inventory ??
    data.data?.Inventory ??
    data.result?.inventory ??
    data.result?.Inventory ??
    []
  );
}

async function fetchUpstream(partId: string, colorCode: string): Promise<InventorySnapshot> {
  const endpoint =
    process.env.SANMAR_PROMOSTANDARDS_INVENTORY_URL ??
    process.env.SANMAR_PROMOSTANDARDS_URL ??
    DEFAULT_ENDPOINT;
  const username = requireEnv('SANMAR_PROMOSTANDARDS_USERNAME');
  const password = requireEnv('SANMAR_PROMOSTANDARDS_PASSWORD');
  const customerId = requireEnv('SANMAR_ACCOUNT_NUMBER');

  if (!username || !password) {
    throw new Error('SanMar PromoStandards credentials are not configured');
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  if (process.env.SANMAR_PROMOSTANDARDS_TOKEN) {
    headers.Authorization = `Bearer ${process.env.SANMAR_PROMOSTANDARDS_TOKEN}`;
  } else {
    const basicAuth = Buffer.from(`${username}:${password}`, 'utf8').toString('base64');
    headers.Authorization = `Basic ${basicAuth}`;
  }

  const payload = {
    Identity: {
      CustomerId: customerId,
      Username: username,
      Password: password,
    },
    Criteria: {
      PartID: partId,
      Color: colorCode,
      IncludeSizes: true,
      WarehouseIds: process.env.SANMAR_WAREHOUSE_IDS?.split(',').map((entry) => entry.trim()) ?? ['ALL'],
      Quantity: 0,
      UOM: 'EA',
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
    throw new Error(`SanMar inventory request failed: ${response.status} ${text}`);
  }

  const data = (await response.json()) as UpstreamInventoryResponse;
  const rows = extractRows(data);
  const bySize = normalizeRows(rows);

  return {
    bySize,
    fetchedAt: new Date().toISOString(),
    cacheStatus: 'refreshed',
  } satisfies InventorySnapshot;
}

export async function getSanmarInventorySnapshot(
  partId: string,
  colorCode: string
): Promise<InventorySnapshot> {
  const cacheKey = getCacheKey(partId, colorCode);
  const cached = await readCache(cacheKey);

  if (cached) {
    queueMicrotask(async () => {
      try {
        const fresh = await fetchUpstream(partId, colorCode);
        await writeCache(cacheKey, fresh, DEFAULT_TTL);
      } catch (error) {
        console.warn('SanMar inventory background refresh failed', error);
      }
    });

    return cached;
  }

  const fresh = await fetchUpstream(partId, colorCode);
  await writeCache(cacheKey, fresh, DEFAULT_TTL);
  return fresh;
}

export async function getStoredInventorySnapshot(
  partId: string,
  colorCode: string
): Promise<InventorySnapshot | null> {
  const items = await prisma.productInventory.findMany({
    where: {
      supplierPartId: partId.toUpperCase(),
      colorCode: colorCode.toUpperCase(),
    },
  });

  if (!items.length) {
    return null;
  }

  const bySize: Record<string, InventoryQty> = {};
  let latestFetchedAt = items[0].fetchedAt;

  for (const item of items) {
    bySize[item.sizeCode.toUpperCase()] = { qty: item.totalQty };
    if (item.fetchedAt > latestFetchedAt) {
      latestFetchedAt = item.fetchedAt;
    }
  }

  return {
    bySize,
    fetchedAt: latestFetchedAt.toISOString(),
    cacheStatus: 'stale',
  };
}
