import { getProductBySupplierPartId } from '@/services/catalog-repository';
import type { ProductRecord } from '@/lib/types';
import {
  fetchProductWithFallback,
  isSsActivewearPart,
} from '@/integrations/ssactivewear/service';

export async function getProductRecord(supplierPartId: string): Promise<ProductRecord> {
  const normalized = supplierPartId.toUpperCase();
  const record = await getProductBySupplierPartId(normalized);
  if (record) {
    return record;
  }

  if (isSsActivewearPart(normalized)) {
    const result = await fetchProductWithFallback(normalized);
    return result.product;
  }

  throw new Error(`Product ${supplierPartId} not found`);
}


