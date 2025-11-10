import { getProductBySupplierPartId } from '@/data/catalog';
import type { ProductRecord } from '@/lib/types';

export async function getProductRecord(supplierPartId: string): Promise<ProductRecord> {
  const record = getProductBySupplierPartId(supplierPartId);
  if (!record) {
    throw new Error(`Product ${supplierPartId} not found`);
  }
  return record;
}


