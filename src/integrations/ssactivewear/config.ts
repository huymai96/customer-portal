/**
 * SSActivewear Integration Configuration
 * 
 * Credentials and endpoints for both PromoStandards (SOAP) and REST API v2.
 * Per S&S support: the same account number + API key work for both services.
 */

const REQUIRED_ENV_VARS = [
  'SSACTIVEWEAR_ACCOUNT_NUMBER',
  'SSACTIVEWEAR_API_KEY',
] as const;

export interface SsaConfig {
  accountNumber: string;
  apiKey: string;
  promoStandardsProductUrl: string;
  promoStandardsInventoryUrl: string;
  restBaseUrl: string;
}

export function loadConfig(): SsaConfig {
  for (const key of REQUIRED_ENV_VARS) {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }

  return {
    accountNumber: process.env.SSACTIVEWEAR_ACCOUNT_NUMBER!.trim(),
    apiKey: process.env.SSACTIVEWEAR_API_KEY!.trim(),
    promoStandardsProductUrl:
      process.env.SSACTIVEWEAR_PROMOSTANDARDS_PRODUCT_URL?.trim() ||
      'https://promostandards.ssactivewear.com/productdata/v2/productdataservicev2.svc',
    promoStandardsInventoryUrl:
      process.env.SSACTIVEWEAR_PROMOSTANDARDS_INVENTORY_URL?.trim() ||
      'https://promostandards.ssactivewear.com/inventory/v2/inventoryservice.svc',
    restBaseUrl:
      process.env.SSACTIVEWEAR_REST_BASE_URL?.trim() ||
      'https://api.ssactivewear.com/V2',
  };
}

/**
 * Normalize a product ID to SSActivewear's format.
 * SSActivewear uses a "B" prefix + 5-digit style number (e.g., "B00060" for Gildan 5000).
 */
export function toSsaProductId(productId: string): string {
  const trimmed = productId.trim().toUpperCase();
  
  // Already has B prefix and looks valid
  if (trimmed.startsWith('B') && trimmed.length >= 6) {
    return trimmed;
  }
  
  // Extract digits only
  const digits = trimmed.replace(/[^0-9]/gu, '');
  if (digits.length === 0) {
    return trimmed; // Return as-is if no digits found
  }
  
  // Pad to 5 digits and add B prefix
  const paddedDigits = digits.length >= 5 
    ? digits.slice(-5) 
    : digits.padStart(5, '0');
  
  return `B${paddedDigits}`;
}

/**
 * Convert SSActivewear product ID to style number (remove B prefix).
 */
export function toStyleNumber(productId: string): string {
  const normalized = toSsaProductId(productId);
  return normalized.startsWith('B') ? normalized.slice(1) : normalized;
}

