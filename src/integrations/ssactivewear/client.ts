import { loadConfig } from './config';

type PromoStandardsService = 'product' | 'inventory' | 'pricing' | 'order-status' | 'purchase-order';

interface CallOptions {
  service: PromoStandardsService;
  action: string;
  body: string;
  timeoutMs?: number;
}

const SERVICE_ENDPOINT_MAP: Record<PromoStandardsService, keyof ReturnType<typeof loadConfig>> = {
  product: 'productUrl',
  inventory: 'inventoryUrl',
  pricing: 'pricingUrl',
  'order-status': 'orderStatusUrl',
  'purchase-order': 'purchaseOrderUrl',
};

function resolveEndpoint(service: PromoStandardsService, config: ReturnType<typeof loadConfig>): string {
  const key = SERVICE_ENDPOINT_MAP[service];
  const endpoint = config[key];
  if (!endpoint) {
    throw new Error(`Missing PromoStandards endpoint for SSActivewear service: ${service}`);
  }
  return endpoint;
}

function buildEnvelope(body: string): string {
  return `
    <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
      <soapenv:Header/>
      <soapenv:Body>
        ${body}
      </soapenv:Body>
    </soapenv:Envelope>
  `.trim();
}

export async function callPromoStandards({ service, action, body, timeoutMs = 30000 }: CallOptions): Promise<string> {
  const config = loadConfig();
  const endpoint = resolveEndpoint(service, config);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const envelope = buildEnvelope(body);
    if (process.env.DEBUG_SSA_PROMO === 'true') {
      console.debug('[SSActivewear SOAP Request]', envelope);
    }
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        SOAPAction: action,
      },
      body: envelope,
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorPayload = await response.text();
      throw new Error(
        `PromoStandards request failed: ${response.status} ${response.statusText} - ${errorPayload}`
      );
    }

    return response.text();
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`PromoStandards request to ${service} exceeded ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

