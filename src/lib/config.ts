export interface PortalConfig {
  apiBaseUrl: string;
  apiKey: string;
  apiSecret: string;
  customerId: string;
  customerName: string;
}

export class PortalConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PortalConfigError";
  }
}

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || "").trim().replace(/\/$/, "");
const API_KEY = (process.env.PORTAL_API_KEY || "").trim();
const API_SECRET = (process.env.PORTAL_API_SECRET || "").trim();
const CUSTOMER_ID = (process.env.PORTAL_CUSTOMER_ID || "").trim();
const CUSTOMER_NAME = (process.env.PORTAL_CUSTOMER_NAME || "").trim();

export function getPortalConfig(): PortalConfig {
  return {
    apiBaseUrl: API_BASE_URL,
    apiKey: API_KEY,
    apiSecret: API_SECRET,
    customerId: CUSTOMER_ID,
    customerName: CUSTOMER_NAME,
  };
}

export function isPortalConfigured(): boolean {
  const config = getPortalConfig();
  return Boolean(config.apiBaseUrl && config.apiKey && config.apiSecret && config.customerId);
}

export function assertPortalConfigured(): void {
  if (!isPortalConfigured()) {
    throw new PortalConfigError(
      "Portal environment variables missing. Set NEXT_PUBLIC_API_BASE_URL, PORTAL_API_KEY, PORTAL_API_SECRET, and PORTAL_CUSTOMER_ID."
    );
  }
}


