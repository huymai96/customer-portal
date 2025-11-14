/* eslint-disable @typescript-eslint/no-explicit-any */
import { kv } from '@vercel/kv';
import { parseStringPromise } from 'xml2js';
import type { ParserOptions } from 'xml2js';

import { prisma } from '@/lib/prisma';
import type { InventorySnapshot, InventoryQty } from '@/lib/types';

const CACHE_PREFIX = 'sanmar:inventory';
const DEFAULT_TTL = Number.parseInt(process.env.SANMAR_INVENTORY_CACHE_TTL ?? '60', 10);
const DEFAULT_ENDPOINT = 'https://ws.sanmar.com:8080/promostandards/InventoryServiceBindingV2final';
const INVENTORY_NAMESPACE = 'http://www.promostandards.org/WSDL/Inventory/2.0.0/';
const SHARED_NAMESPACE = 'http://www.promostandards.org/WSDL/Inventory/2.0.0/SharedObjects/';
const SOAP_ACTION = 'getInventoryLevels';

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value || value.length === 0) {
    throw new Error(`Environment variable ${key} is required`);
  }
  return value;
}

const kvEnabled = Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

function getCacheKey(partId: string, colorCode: string) {
  return `${CACHE_PREFIX}:${partId.toUpperCase()}:${colorCode.toUpperCase()}`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function stripPrefix(name: string): string {
  return name.replace(/^.+:/u, '');
}

function trimValue(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

function toArray<T>(value: T | T[] | undefined | null): T[] {
  if (value === undefined || value === null) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function coerceQuantity(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
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

function buildEnvelope(partId: string, colorCode: string, accountNumber: string, password: string): string {
  const trimmedColor = colorCode.trim();
  const filterXml = trimmedColor
    ? `<shared:Filter><shared:PartColorArray><shared:partColor>${escapeXml(trimmedColor)}</shared:partColor></shared:PartColorArray></shared:Filter>`
    : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:inv="${INVENTORY_NAMESPACE}" xmlns:shared="${SHARED_NAMESPACE}">
  <soapenv:Header/>
  <soapenv:Body>
    <inv:GetInventoryLevelsRequest>
      <shared:wsVersion>2.0.0</shared:wsVersion>
      <shared:id>${escapeXml(accountNumber)}</shared:id>
      <shared:password>${escapeXml(password)}</shared:password>
      <shared:productId>${escapeXml(partId.trim())}</shared:productId>
      ${filterXml}
    </inv:GetInventoryLevelsRequest>
  </soapenv:Body>
</soapenv:Envelope>`;
}

async function fetchUpstream(partId: string, colorCode: string): Promise<InventorySnapshot> {
  const endpoint =
    process.env.SANMAR_PROMOSTANDARDS_INVENTORY_URL ??
    process.env.SANMAR_PROMOSTANDARDS_URL ??
    DEFAULT_ENDPOINT;
  const username = requireEnv('SANMAR_PROMOSTANDARDS_USERNAME');
  const password = requireEnv('SANMAR_PROMOSTANDARDS_PASSWORD');
  const accountNumber = process.env.SANMAR_ACCOUNT_NUMBER ?? username;

  const trimmedPartId = partId.trim();
  if (!trimmedPartId) {
    throw new Error('SanMar inventory lookup requires a product ID');
  }

  const envelope = buildEnvelope(trimmedPartId, colorCode, accountNumber, password);

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      SOAPAction: SOAP_ACTION,
    },
    body: envelope,
    cache: 'no-store',
    next: { revalidate: 0 },
  });

  const xml = await response.text();

  if (!response.ok) {
    throw new Error(`SanMar inventory request failed: ${response.status} ${xml}`);
  }

  const parserOptions: ParserOptions = {
    explicitArray: false,
    ignoreAttrs: true,
    tagNameProcessors: [stripPrefix],
    valueProcessors: [trimValue],
  };

  const parsed = (await parseStringPromise(xml, parserOptions)) as Record<string, any>;

  const body = parsed?.Envelope?.Body;
  const inventoryResponse = body?.GetInventoryLevelsResponse;
  if (!inventoryResponse) {
    throw new Error('SanMar inventory response was missing GetInventoryLevelsResponse');
  }

  const serviceMessages = toArray(inventoryResponse.ServiceMessageArray?.ServiceMessage);
  const blockingMessage = serviceMessages.find(
    (message) => String(message?.severity ?? '').toLowerCase() === 'error'
  );
  if (blockingMessage) {
    const description = blockingMessage.description ? ` - ${blockingMessage.description}` : '';
    throw new Error(`SanMar inventory request returned error code ${blockingMessage.code}${description}`);
  }

  const partInventoryArray = toArray(inventoryResponse.Inventory?.PartInventoryArray?.PartInventory);
  const bySize: Record<string, InventoryQty> = {};

  for (const part of partInventoryArray) {
    if (!part) {
      continue;
    }

    const sizeSource = part.labelSize ?? part.partId ?? part.attributeSelection;
    if (!sizeSource) {
      continue;
    }

    const sizeCode = String(sizeSource).trim().toUpperCase();
    if (!sizeCode) {
      continue;
    }

    let totalQty = 0;
    let earliestAvailability: string | undefined;

    const locations = toArray(part.InventoryLocationArray?.InventoryLocation);
    if (locations.length > 0) {
      for (const location of locations) {
        const locationQty = location?.inventoryLocationQuantity?.Quantity?.value;
        totalQty += coerceQuantity(locationQty);

        const futureAvailability = toArray(location?.FutureAvailabilityArray?.FutureAvailability);
        for (const future of futureAvailability) {
          const availableOn = future?.availableOn;
          if (availableOn) {
            const date = new Date(availableOn);
            if (!Number.isNaN(date.valueOf())) {
              const iso = date.toISOString();
              if (!earliestAvailability || iso < earliestAvailability) {
                earliestAvailability = iso;
              }
            }
          }
        }
      }
    } else if (part.quantityAvailable?.Quantity?.value !== undefined) {
      totalQty = coerceQuantity(part.quantityAvailable.Quantity.value);
    }

    const entry: InventoryQty = { qty: totalQty };
    if (earliestAvailability) {
      entry.backorderDate = earliestAvailability;
    }

    if (bySize[sizeCode]) {
      bySize[sizeCode].qty += entry.qty;
      if (!bySize[sizeCode].backorderDate && entry.backorderDate) {
        bySize[sizeCode].backorderDate = entry.backorderDate;
      }
    } else {
      bySize[sizeCode] = entry;
    }
  }

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
