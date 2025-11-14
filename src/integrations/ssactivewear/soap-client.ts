/**
 * Generic SOAP client for SSActivewear PromoStandards v2.0 services.
 * 
 * Per SSActivewear documentation, credentials are passed in the SOAP body
 * (not WS-Security headers). Account number + API key authenticate both
 * PromoStandards and REST endpoints.
 */

import { loadConfig } from './config';

interface SoapCallOptions {
  service: 'product' | 'inventory';
  action: string;
  body: string;
}

function buildEnvelope(body: string): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Header/>
  <soapenv:Body>
    ${body}
  </soapenv:Body>
</soapenv:Envelope>`.trim();
}

export async function callPromoStandards(options: SoapCallOptions): Promise<string> {
  const config = loadConfig();
  
  const endpoint =
    options.service === 'product'
      ? config.promoStandardsProductUrl
      : config.promoStandardsInventoryUrl;

  const envelope = buildEnvelope(options.body);

  if (process.env.DEBUG_SSA_PROMO === 'true') {
    console.debug('[SSActivewear SOAP Request]', {
      endpoint,
      action: options.action,
      envelope,
    });
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      SOAPAction: options.action,
    },
    body: envelope,
    cache: 'no-store',
    next: { revalidate: 0 },
  });

  const xml = await response.text();

  if (!response.ok) {
    throw new Error(
      `PromoStandards request failed: ${response.status} ${response.statusText} - ${xml}`
    );
  }

  if (process.env.DEBUG_SSA_PROMO === 'true') {
    console.debug('[SSActivewear SOAP Response]', xml);
  }

  return xml;
}

