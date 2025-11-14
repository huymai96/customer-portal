/**
 * SSActivewear PromoStandards Product Data Service v2.0
 * 
 * Endpoints:
 * - getProduct: Retrieve full product details for a single style
 * - getProductSellable: List all sellable products (optionally filtered by date)
 */

import { loadConfig, toSsaProductId } from './config';
import { callPromoStandards } from './soap-client';

const PRODUCT_DATA_NAMESPACE = 'http://www.promostandards.org/WSDL/ProductDataService/2.0.0/';
const SHARED_NAMESPACE = 'http://www.promostandards.org/WSDL/ProductDataService/2.0.0/SharedObjects/';

export interface GetProductOptions {
  productId: string;
  localizationCountry?: string;
  localizationLanguage?: string;
}

export interface GetProductSellableOptions {
  modifiedSince?: Date;
  localizationCountry?: string;
  localizationLanguage?: string;
}

/**
 * Fetch detailed product data for a single style.
 */
export async function getProduct(options: GetProductOptions): Promise<string> {
  const config = loadConfig();
  const productId = toSsaProductId(options.productId);
  const country = options.localizationCountry || 'US';
  const language = options.localizationLanguage || 'EN';

  const requestBody = `
    <GetProductRequest xmlns="${PRODUCT_DATA_NAMESPACE}" xmlns:shared="${SHARED_NAMESPACE}">
      <shared:wsVersion>2.0.0</shared:wsVersion>
      <shared:id>${config.accountNumber}</shared:id>
      <shared:password>${config.apiKey}</shared:password>
      <shared:localizationCountry>${country}</shared:localizationCountry>
      <shared:localizationLanguage>${language}</shared:localizationLanguage>
      <shared:productId>${productId}</shared:productId>
    </GetProductRequest>
  `;

  return callPromoStandards({
    service: 'product',
    action: 'getProduct',
    body: requestBody,
  });
}

/**
 * Fetch list of sellable products, optionally filtered by modification date.
 */
export async function getProductSellable(
  options: GetProductSellableOptions = {}
): Promise<string> {
  const config = loadConfig();
  const country = options.localizationCountry || 'US';
  const language = options.localizationLanguage || 'EN';

  const requestBody = `
    <GetProductSellableRequest xmlns="${PRODUCT_DATA_NAMESPACE}" xmlns:shared="${SHARED_NAMESPACE}">
      <shared:wsVersion>2.0.0</shared:wsVersion>
      <shared:id>${config.accountNumber}</shared:id>
      <shared:password>${config.apiKey}</shared:password>
      ${
        options.modifiedSince
          ? `<shared:lastChangeDate>${options.modifiedSince.toISOString()}</shared:lastChangeDate>`
          : ''
      }
      <shared:localizationCountry>${country}</shared:localizationCountry>
      <shared:localizationLanguage>${language}</shared:localizationLanguage>
      <shared:isSellable>true</shared:isSellable>
    </GetProductSellableRequest>
  `;

  return callPromoStandards({
    service: 'product',
    action: 'getProductSellable',
    body: requestBody,
  });
}

