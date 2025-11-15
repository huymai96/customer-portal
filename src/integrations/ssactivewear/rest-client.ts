/**
 * SSActivewear REST API v2 Client
 * 
 * Fallback mechanism when PromoStandards SOAP is unavailable.
 * Uses the same account number + API key for authentication (Basic Auth).
 * 
 * API Documentation: https://api.ssactivewear.com/V2
 */

import { loadConfig, normalizeStyleLookupKey, toStyleNumber } from './config';

interface RestProduct {
  sku: string;
  styleID: number | string;
  brandName?: string;
  styleName?: string;
  colorName?: string;
  colorCode?: string;
  colorFrontImage?: string;
  colorBackImage?: string;
  colorSideImage?: string;
  colorDirectSideImage?: string;
  colorSwatchImage?: string;
  sizeName?: string;
  sizeCode?: string;
  sizeOrder?: string | number;
  qty?: number | string;
  warehouses?: Array<{
    warehouseAbbr: string;
    qty: number | string;
  }>;
  colorGroupName?: string;
  colorFamily?: string;
  baseCategoryID?: string | number;
  caseQty?: number | string;
  unitWeight?: number | string;
  mapPrice?: number | string;
  piecePrice?: number | string;
  salePrice?: number | string;
  customerPrice?: number | string;
}

interface RestStyle {
  styleID?: number | string;
  styleName?: string;
  brandName?: string;
  title?: string;
  description?: string;
  baseCategory?: string;
  categories?: string;
  lineName?: string;
}

interface RestStyleHints {
  styleId?: number | string;
  brandName?: string;
  styleName?: string;
}

export interface RestBundle {
  products: RestProduct[];
  style: RestStyle | null;
}

const RATE_LIMIT_MIN_REMAINING = 1;
const RATE_LIMIT_DEFAULT_WAIT_MS = 1100;
let nextAllowedAt = 0;

class SsApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public payload: string,
    public url: string
  ) {
    super(message);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildAuthHeader(accountNumber: string, apiKey: string): string {
  const credentials = `${accountNumber}:${apiKey}`;
  return `Basic ${Buffer.from(credentials).toString('base64')}`;
}

async function enforceRateLimitWindow(): Promise<void> {
  const now = Date.now();
  if (now < nextAllowedAt) {
    await sleep(nextAllowedAt - now);
  }
}

function updateRateLimitWindow(response: Response): void {
  const remainingHeader = response.headers.get('X-Rate-Limit-Remaining');
  if (!remainingHeader) {
    return;
  }
  const remaining = Number.parseFloat(remainingHeader);
  if (!Number.isFinite(remaining) || remaining > RATE_LIMIT_MIN_REMAINING) {
    return;
  }
  const resetHeader = response.headers.get('X-Rate-Limit-Reset');
  const resetSeconds = resetHeader ? Number.parseFloat(resetHeader) : null;
  const waitMs =
    resetSeconds && Number.isFinite(resetSeconds) && resetSeconds > 0
      ? Math.max(resetSeconds * 1000, RATE_LIMIT_DEFAULT_WAIT_MS)
      : RATE_LIMIT_DEFAULT_WAIT_MS;
  nextAllowedAt = Date.now() + waitMs;
}

async function fetchRest<T>(
  path: string,
  params: Record<string, string | undefined> = {}
): Promise<T> {
  await enforceRateLimitWindow();
  const config = loadConfig();
  const base = config.restBaseUrl.endsWith('/')
    ? config.restBaseUrl
    : `${config.restBaseUrl}/`;
  const normalizedPath = path.replace(/^\/+/, '');
  const url = new URL(normalizedPath, base);

  for (const [key, value] of Object.entries(params)) {
    if (value != null && value !== '') {
      url.searchParams.set(key, value);
    }
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: buildAuthHeader(config.accountNumber, config.apiKey),
    },
    cache: 'no-store',
    next: { revalidate: 0 },
  });
  updateRateLimitWindow(response);

  if (!response.ok) {
    const payload = await response.text();
    throw new SsApiError(
      `SSActivewear REST request failed: ${response.status} ${response.statusText}`,
      response.status,
      payload,
      url.toString()
    );
  }

  return response.json() as Promise<T>;
}

/**
 * Fetch all products (SKUs) for a given style identifier using the documented
 * endpoints. We attempt direct /products/{style}, the partnumber query string,
 * and finally fall back to the legacy style param for backwards compatibility.
 */
export async function fetchRestProducts(identifier: string | string[]): Promise<RestProduct[]> {
  const rawKeys = Array.isArray(identifier) ? identifier : [identifier];
  const uniqueKeys = Array.from(
    new Set(
      rawKeys
        .map((key) => normalizeStyleLookupKey(key))
        .filter((key) => Boolean(key))
    )
  );

  const attempts: Array<() => Promise<RestProduct[]>> = [];
  let lastError: Error | null = null;

  for (const key of uniqueKeys) {
    attempts.push(() => fetchRest<RestProduct[]>('/products', { style: key }));
    attempts.push(() => fetchRest<RestProduct[]>('/products', { partnumber: key }));
    if (/^\d+$/u.test(key)) {
      attempts.push(() => fetchRest<RestProduct[]>('/products', { styleid: key }));
    }
    attempts.push(() => fetchRest<RestProduct[]>('/products', { search: key }));
  }

  for (const attempt of attempts) {
    try {
      const data = await attempt();
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
    } catch (error) {
      if (error instanceof SsApiError && (error.status === 401 || error.status === 403)) {
        throw error;
      }
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  if (lastError) {
    throw lastError;
  }

  return [];
}

/**
 * Fetch style metadata (name, description, categories).
 */
export async function fetchRestStyle(
  identifier: string,
  hints?: RestStyleHints
): Promise<RestStyle | null> {
  const candidates: RestStyle[] = [];
  const lookupKey = normalizeStyleLookupKey(identifier);
  const attempts: Array<() => Promise<RestStyle | RestStyle[] | null>> = [
    () => fetchRest<RestStyle | RestStyle[] | null>(`/styles/${encodeURIComponent(lookupKey)}`),
    () => fetchRest<RestStyle[] | null>('/styles', { partnumber: lookupKey }),
  ];

  if (/^\d+$/u.test(lookupKey)) {
    attempts.push(() => fetchRest<RestStyle[] | null>('/styles', { styleid: lookupKey }));
  }

  attempts.push(() => fetchRest<RestStyle[] | null>('/styles', { search: lookupKey }));
  let lastError: Error | null = null;

  for (const attempt of attempts) {
    try {
      const data = await attempt();
      if (!data) {
        continue;
      }
      const list = Array.isArray(data) ? data : [data];
      if (list.length > 0) {
        candidates.push(...list);
      }
    } catch (error) {
      if (error instanceof SsApiError && (error.status === 401 || error.status === 403)) {
        throw error;
      }
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  if (candidates.length === 0 && lastError) {
    throw lastError;
  }

  if (candidates.length === 0) {
    return null;
  }

  return selectMatchingStyle(candidates, hints);
}

/**
 * Fetch complete bundle: products + style metadata.
 */
export async function fetchRestBundle(productId: string): Promise<RestBundle> {
  const styleNumber = toStyleNumber(productId);
  const lookupKeys = new Set<string>();
  addLookupValue(lookupKeys, styleNumber);

  const initialStyle = await fetchRestStyle(styleNumber).catch(() => null);
  if (initialStyle) {
    addLookupValue(lookupKeys, initialStyle.partNumber);
    addLookupValue(lookupKeys, initialStyle.styleID);
    addLookupValue(
      lookupKeys,
      initialStyle.brandName && initialStyle.styleName
        ? `${initialStyle.brandName} ${initialStyle.styleName}`
        : null
    );
  }

  const products = await fetchRestProducts(Array.from(lookupKeys));
  const primaryProduct = products[0];

  const style =
    initialStyle ??
    (await fetchRestStyle(styleNumber, {
      styleId: primaryProduct?.styleID,
      brandName: primaryProduct?.brandName,
      styleName: primaryProduct?.styleName,
    }).catch(() => null));

  return { products, style };
}

function selectMatchingStyle(styles: RestStyle[], hints?: RestStyleHints): RestStyle | null {
  if (!styles.length) {
    return null;
  }

  if (hints?.styleId != null) {
    const target = Number(hints.styleId);
    const match = styles.find((style) => Number(style.styleID) === target);
    if (match) {
      return match;
    }
  }

  if (hints?.brandName) {
    const target = hints.brandName.trim().toUpperCase();
    const match = styles.find((style) => style.brandName?.trim().toUpperCase() === target);
    if (match) {
      return match;
    }
  }

  if (hints?.styleName) {
    const target = hints.styleName.trim().toUpperCase();
    const match = styles.find((style) => style.styleName?.trim().toUpperCase() === target);
    if (match) {
      return match;
    }
  }

  return styles[0];
}

function addLookupValue(target: Set<string>, value: unknown): void {
  if (value == null) {
    return;
  }
  const normalized = normalizeStyleLookupKey(String(value));
  if (normalized) {
    target.add(normalized);
  }
}

