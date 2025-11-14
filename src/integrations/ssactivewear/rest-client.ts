/**
 * SSActivewear REST API v2 Client
 * 
 * Fallback mechanism when PromoStandards SOAP is unavailable.
 * Uses the same account number + API key for authentication (Basic Auth).
 * 
 * API Documentation: https://api.ssactivewear.com/V2
 */

import { loadConfig, toStyleNumber } from './config';

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

function buildAuthHeader(accountNumber: string, apiKey: string): string {
  const credentials = `${accountNumber}:${apiKey}`;
  return `Basic ${Buffer.from(credentials).toString('base64')}`;
}

async function fetchRest<T>(
  path: string,
  params: Record<string, string | undefined> = {}
): Promise<T> {
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

  if (!response.ok) {
    const payload = await response.text();
    throw new Error(
      `SSActivewear REST request failed: ${response.status} ${response.statusText} - ${payload}`
    );
  }

  return response.json() as Promise<T>;
}

/**
 * Fetch all products (SKUs) for a given style number or part number.
 * 
 * NOTE: SSActivewear uses different identifiers:
 * - `style` parameter searches by styleName (e.g., "5000" for Bella+Canvas)
 * - For Gildan products, we need to use partNumber (e.g., "00060" for Gildan 5000)
 * 
 * We try both approaches to maximize compatibility.
 */
export async function fetchRestProducts(identifier: string): Promise<RestProduct[]> {
  // For identifiers that look like manufacturer style numbers (e.g., "5000"),
  // convert to SSActivewear partNumber format first (e.g., "00060")
  const partNumber = identifier.replace(/^B/i, '').padStart(5, '0');

  // Try searching by partNumber first (most reliable for Gildan products)
  try {
    const data = await fetchRest<RestProduct[]>('/products', { style: partNumber });
    if (Array.isArray(data) && data.length > 0) {
      return data;
    }
    // If we got an empty array, don't return it yet - try the original identifier
  } catch {
    // PartNumber search failed with error, will try original identifier next
  }

  // If partNumber search returns empty or fails, try the original identifier
  // This handles cases where the identifier is already in the correct format
  try {
    const data = await fetchRest<RestProduct[]>('/products', { style: identifier });
    if (Array.isArray(data) && data.length > 0) {
      return data;
    }
  } catch {
    // Both attempts failed
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
  const partNumber = identifier.replace(/^B/i, '').padStart(5, '0');

  // Try searching by partNumber first
  try {
    const data = await fetchRest<RestStyle[]>('/styles', { style: partNumber });
    if (Array.isArray(data) && data.length > 0) {
      candidates.push(...data);
    }
  } catch {
    // Ignore and try fallback
  }

  // Try with original identifier if we still don't have a match
  if (candidates.length === 0 || partNumber !== identifier) {
    try {
      const data = await fetchRest<RestStyle[]>('/styles', { style: identifier });
      if (Array.isArray(data) && data.length > 0) {
        candidates.push(...data);
      }
    } catch {
      // Ignore
    }
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
  const products = await fetchRestProducts(styleNumber);
  const primaryProduct = products[0];

  const style = await fetchRestStyle(styleNumber, {
    styleId: primaryProduct?.styleID,
    brandName: primaryProduct?.brandName,
    styleName: primaryProduct?.styleName,
  }).catch(() => null);

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

