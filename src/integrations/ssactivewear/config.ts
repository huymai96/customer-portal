const REQUIRED_ENV_VARS = [
  'SSACTIVEWEAR_PROMOSTANDARDS_USERNAME',
  'SSACTIVEWEAR_PROMOSTANDARDS_PASSWORD',
  'SSACTIVEWEAR_PROMOSTANDARDS_PRODUCT_URL',
  'SSACTIVEWEAR_PROMOSTANDARDS_INVENTORY_URL',
  'SSACTIVEWEAR_ACCOUNT_NUMBER',
  'SSACTIVEWEAR_API_KEY',
] as const;

type RequiredEnvVar = (typeof REQUIRED_ENV_VARS)[number];

function requireEnv(name: RequiredEnvVar): string {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export interface SsaConfig {
  username: string;
  password: string;
  productUrl: string;
  inventoryUrl: string;
  accountNumber: string;
  apiKey: string;
  restBaseUrl: string;
  pricingUrl?: string;
  orderStatusUrl?: string;
  purchaseOrderUrl?: string;
}

export function loadConfig(): SsaConfig {
  for (const name of REQUIRED_ENV_VARS) {
    requireEnv(name);
  }

  const baseConfig = {
    username: requireEnv('SSACTIVEWEAR_PROMOSTANDARDS_USERNAME'),
    password: requireEnv('SSACTIVEWEAR_PROMOSTANDARDS_PASSWORD'),
    productUrl: requireEnv('SSACTIVEWEAR_PROMOSTANDARDS_PRODUCT_URL'),
    inventoryUrl: requireEnv('SSACTIVEWEAR_PROMOSTANDARDS_INVENTORY_URL'),
    accountNumber: requireEnv('SSACTIVEWEAR_ACCOUNT_NUMBER'),
    apiKey: requireEnv('SSACTIVEWEAR_API_KEY'),
  };

  return {
    ...baseConfig,
    restBaseUrl: process.env.SSACTIVEWEAR_REST_BASE_URL?.trim() || 'https://api.ssactivewear.com/V2',
    pricingUrl: process.env.SSACTIVEWEAR_PROMOSTANDARDS_PPC_URL,
    orderStatusUrl: process.env.SSACTIVEWEAR_PROMOSTANDARDS_ORDER_STATUS_URL,
    purchaseOrderUrl: process.env.SSACTIVEWEAR_PROMOSTANDARDS_PURCHASE_ORDER_URL,
  };
}

export const PRODUCT_ID_PREFIX = 'B';

export function toSsaProductId(itemNumber: string): string {
  const normalized = itemNumber.trim().toUpperCase();
  if (normalized.startsWith(PRODUCT_ID_PREFIX)) {
    return normalized;
  }
  return `${PRODUCT_ID_PREFIX}${normalized}`;
}

export function toStyleNumber(productId: string): string {
  const digits = productId.trim().replace(/[^0-9]/gu, '');
  if (digits.length === 0) {
    return productId.trim();
  }
  if (digits.length >= 5) {
    return digits.slice(-5);
  }
  return digits.padStart(5, '0');
}


