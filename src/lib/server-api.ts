import type { ProductRecord } from '@/lib/types';
import {
  loadSupplierProducts,
  type SupplierProductBundle,
} from '@/services/supplier-product-loader';

export async function getProductRecord(supplierPartId: string): Promise<ProductRecord> {
  const bundle = await loadSupplierProducts(supplierPartId);
  if (bundle.primaryProduct) {
    return bundle.primaryProduct;
  }
  throw new Error(`Product ${supplierPartId} not found`);
}

export async function getSupplierProductBundle(
  identifier: string
): Promise<SupplierProductBundle> {
  return loadSupplierProducts(identifier);
}
