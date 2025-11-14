/**
 * SSActivewear PromoStandards Inventory Service v2.0
 * 
 * Endpoints:
 * - getInventoryLevels: Retrieve real-time inventory for a product
 * - getFilterValues: Get available filter values (colors, sizes, warehouses)
 */

import { loadConfig, toSsaProductId } from './config';
import { callPromoStandards } from './soap-client';

const INVENTORY_NAMESPACE = 'http://www.promostandards.org/WSDL/Inventory/2.0.0/';
const SHARED_NAMESPACE = 'http://www.promostandards.org/WSDL/Inventory/2.0.0/SharedObjects/';

export interface GetInventoryLevelsOptions {
  productId: string;
  color?: string;
  size?: string;
  warehouseId?: string;
}

export interface GetFilterValuesOptions {
  productId: string;
}

/**
 * Fetch real-time inventory levels for a product.
 * Optionally filter by color, size, or warehouse.
 */
export async function getInventoryLevels(
  options: GetInventoryLevelsOptions
): Promise<string> {
  const config = loadConfig();
  const productId = toSsaProductId(options.productId);

  const filterXml =
    options.color || options.size || options.warehouseId
      ? `<shared:Filter>
        ${options.color ? `<shared:partId>${options.color}</shared:partId>` : ''}
        ${
          options.size
            ? `<shared:LabelSizeArray><shared:labelSize>${options.size.toUpperCase()}</shared:labelSize></shared:LabelSizeArray>`
            : ''
        }
        ${
          options.warehouseId
            ? `<shared:SelectionArray><shared:selection>${options.warehouseId}</shared:selection></shared:SelectionArray>`
            : ''
        }
      </shared:Filter>`
      : '';

  const requestBody = `
    <GetInventoryLevelsRequest xmlns="${INVENTORY_NAMESPACE}" xmlns:shared="${SHARED_NAMESPACE}">
      <shared:wsVersion>2.0.0</shared:wsVersion>
      <shared:id>${config.accountNumber}</shared:id>
      <shared:password>${config.apiKey}</shared:password>
      <shared:productId>${productId}</shared:productId>
      ${filterXml}
    </GetInventoryLevelsRequest>
  `;

  return callPromoStandards({
    service: 'inventory',
    action: 'getInventoryLevels',
    body: requestBody,
  });
}

/**
 * Fetch available filter values (colors, sizes, warehouses) for a product.
 */
export async function getFilterValues(
  options: GetFilterValuesOptions
): Promise<string> {
  const config = loadConfig();
  const productId = toSsaProductId(options.productId);

  const requestBody = `
    <GetFilterValuesRequest xmlns="${INVENTORY_NAMESPACE}" xmlns:shared="${SHARED_NAMESPACE}">
      <shared:wsVersion>2.0.0</shared:wsVersion>
      <shared:id>${config.accountNumber}</shared:id>
      <shared:password>${config.apiKey}</shared:password>
      <shared:productId>${productId}</shared:productId>
    </GetFilterValuesRequest>
  `;

  return callPromoStandards({
    service: 'inventory',
    action: 'getFilterValues',
    body: requestBody,
  });
}

