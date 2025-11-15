/**
 * SSActivewear Integration Configuration
 *
 * REST API credentials (Basic Auth) + base URL.
 */

const REQUIRED_ENV_VARS = [
  'SSACTIVEWEAR_ACCOUNT_NUMBER',
  'SSACTIVEWEAR_API_KEY',
] as const;

export interface SsaConfig {
  accountNumber: string;
  apiKey: string;
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
    restBaseUrl:
      process.env.SSACTIVEWEAR_REST_BASE_URL?.trim() ||
      'https://api.ssactivewear.com/V2',
  };
}

/**
 * Normalize a product ID to SSActivewear's format.
 * SSActivewear uses a "B" prefix + 5-digit style number (e.g., "B00060" for Gildan 5000).
 */
const B_PREFIX_STYLE = /^B\d{5}$/u;
const DIGITS_ONLY = /^\d+$/u;

function normalizeIdentifier(value: string): string {
  return value.trim().toUpperCase();
}

/**
 * Normalize an input into the supplier's internal part ID format.
 * - If the caller already passes the B-prefixed ID, keep it.
 * - If the caller passes only digits, pad to 5 and prefix with B.
 * - If letters are present (e.g., A230), keep the value as-is because the API
 *   expects that literal manufacturer style.
 */
export function toSsaProductId(productId: string): string {
  const normalized = normalizeIdentifier(productId);
  if (!normalized) {
    throw new Error('Product ID is required');
  }

  if (B_PREFIX_STYLE.test(normalized)) {
    return normalized;
  }

  if (DIGITS_ONLY.test(normalized)) {
    return `B${normalized.padStart(5, '0')}`;
  }

  return normalized;
}

/**
 * Convert supplier ID into the style key that S&S endpoints expect.
 */
export function toStyleNumber(productId: string): string {
  const normalized = normalizeIdentifier(productId);
  if (B_PREFIX_STYLE.test(normalized)) {
    return normalized.slice(1);
  }
  return normalized;
}

export function normalizeStyleLookupKey(productId: string): string {
  return normalizeIdentifier(productId);
}
