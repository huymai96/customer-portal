import { loadConfig, toSsaProductId } from './config';
import { callPromoStandards } from './client';

const PRODUCT_DATA_NAMESPACE = 'http://www.promostandards.org/WSDL/ProductDataService/2.0.0/';
const PRODUCT_DATA_SHARED_NAMESPACE =
  'http://www.promostandards.org/WSDL/ProductDataService/2.0.0/SharedObjects/';

interface GetProductOptions {
  productId: string;
}

interface ListProductsOptions {
  modifiedSince?: Date;
  page?: number;
  pageSize?: number;
}

export async function getProduct(options: GetProductOptions): Promise<string> {
  const config = loadConfig();
  const productId = toSsaProductId(options.productId);

  const requestBody = `
    <GetProductRequest xmlns="${PRODUCT_DATA_NAMESPACE}" xmlns:shared="${PRODUCT_DATA_SHARED_NAMESPACE}">
      <shared:wsVersion>2.0.0</shared:wsVersion>
      <shared:id>${config.username}</shared:id>
      <shared:password>${config.password}</shared:password>
      <shared:localizationCountry>US</shared:localizationCountry>
      <shared:localizationLanguage>EN</shared:localizationLanguage>
      <shared:productId>${productId}</shared:productId>
    </GetProductRequest>
  `;

  return callPromoStandards({ service: 'product', action: 'getProduct', body: requestBody });
}

export async function getProductSellable(options: ListProductsOptions = {}): Promise<string> {
  const config = loadConfig();

  const requestBody = `
    <GetProductSellableRequest xmlns="${PRODUCT_DATA_NAMESPACE}" xmlns:shared="${PRODUCT_DATA_SHARED_NAMESPACE}">
      <shared:wsVersion>2.0.0</shared:wsVersion>
      <shared:id>${config.username}</shared:id>
      <shared:password>${config.password}</shared:password>
      ${
        options.modifiedSince
          ? `<shared:lastChangeDate>${options.modifiedSince.toISOString()}</shared:lastChangeDate>`
          : ''
      }
      <shared:localizationCountry>US</shared:localizationCountry>
      <shared:localizationLanguage>EN</shared:localizationLanguage>
      <shared:isSellable>true</shared:isSellable>
    </GetProductSellableRequest>
  `;

  return callPromoStandards({ service: 'product', action: 'getProductSellable', body: requestBody });
}

