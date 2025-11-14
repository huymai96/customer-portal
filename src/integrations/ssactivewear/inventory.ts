import { loadConfig, toSsaProductId } from './config';
import { callPromoStandards } from './client';

const INVENTORY_NAMESPACE = 'http://www.promostandards.org/WSDL/Inventory/2.0.0/';
const INVENTORY_SHARED_NAMESPACE = 'http://www.promostandards.org/WSDL/Inventory/2.0.0/SharedObjects/';

interface InventoryRequestOptions {
  productId: string;
  color?: string;
  size?: string;
  warehouseId?: string;
}

export async function getInventoryLevels(options: InventoryRequestOptions): Promise<string> {
  const config = loadConfig();
  const productId = toSsaProductId(options.productId);

  const requestBody = `
    <GetInventoryLevelsRequest xmlns="${INVENTORY_NAMESPACE}" xmlns:shared="${INVENTORY_SHARED_NAMESPACE}">
      <shared:wsVersion>2.0.0</shared:wsVersion>
      <shared:id>${config.username}</shared:id>
      <shared:password>${config.password}</shared:password>
      <shared:productId>${productId}</shared:productId>
      ${
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
          : ''
      }
    </GetInventoryLevelsRequest>
  `;

  return callPromoStandards({ service: 'inventory', action: 'getInventoryLevels', body: requestBody });
}

