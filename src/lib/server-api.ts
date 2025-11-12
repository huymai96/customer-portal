import { getProductBySupplierPartId } from '@/services/catalog-repository';
import type { ProductRecord } from '@/lib/types';

export async function getProductRecord(supplierPartId: string): Promise<ProductRecord> {
  const record = await getProductBySupplierPartId(supplierPartId);
  if (!record) {
    throw new Error(`Product ${supplierPartId} not found`);
  }
  return record;
}


