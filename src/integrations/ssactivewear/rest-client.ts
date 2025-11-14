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
  styleName?: string;
  brandName?: string;
  title?: string;
  description?: string;
  baseCategory?: string;
  categories?: string;
  lineName?: string;
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
  const url = new URL(path, config.restBaseUrl);

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
  // Try searching by style first
  try {
    const data = await fetchRest<RestProduct[]>('/products', { style: identifier });
    if (Array.isArray(data) && data.length > 0) {
      return data;
    }
  } catch {
    // Style search failed, will try partNumber next
  }
  
  // If style search fails or returns no results, try searching by partNumber
  // For Gildan products, partNumber is often the 5-digit code (e.g., "00060")
  const partNumber = identifier.replace(/^B/i, '').padStart(5, '0');
  const data = await fetchRest<RestProduct[]>('/products', { style: partNumber });
  if (!Array.isArray(data)) {
    return [];
  }
  return data;
}

/**
 * Fetch style metadata (name, description, categories).
 */
export async function fetchRestStyle(identifier: string): Promise<RestStyle | null> {
  // Try searching by style first
  try {
    const data = await fetchRest<RestStyle[]>('/styles', { style: identifier });
    if (Array.isArray(data) && data.length > 0) {
      return data[0] ?? null;
    }
  } catch {
    // Style search failed, will try partNumber next
  }
  
  // Try with partNumber format
  const partNumber = identifier.replace(/^B/i, '').padStart(5, '0');
  const data = await fetchRest<RestStyle[]>('/styles', { style: partNumber });
  if (!Array.isArray(data) || data.length === 0) {
    return null;
  }
  return data[0] ?? null;
}

/**
 * Fetch complete bundle: products + style metadata.
 */
export async function fetchRestBundle(productId: string): Promise<RestBundle> {
  const styleNumber = toStyleNumber(productId);
  
  const [products, style] = await Promise.all([
    fetchRestProducts(styleNumber),
    fetchRestStyle(styleNumber).catch(() => null),
  ]);

  return { products, style };
}

