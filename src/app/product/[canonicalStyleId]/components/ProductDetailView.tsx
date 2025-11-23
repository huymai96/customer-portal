'use client';

import { useEffect, useMemo, useState } from 'react';

import type { CanonicalProductDetail } from '@/services/product-service';
import { extractSizesFromInventory } from '@/lib/catalog/inventory-matrix';
import { ProductHero } from './ProductHero';
import { ProductMeta } from './ProductMeta';
import { CartPanel } from './CartPanel';
import { InventoryMatrixSection } from './InventoryMatrixSection';
import { ColorSwatches } from './ColorSwatches';

interface ProductDetailViewProps {
  detail: CanonicalProductDetail;
}

export function ProductDetailView({ detail }: ProductDetailViewProps) {
  // Filter out suppliers with no data (no colors, sizes, or inventory)
  const validSuppliers = useMemo(() => {
    return detail.suppliers.filter((s) => {
      const hasColors = (s.product?.colors?.length ?? 0) > 0;
      const hasSizes = (s.product?.sizes?.length ?? 0) > 0;
      const hasInventory = (s.inventory?.rows?.length ?? 0) > 0;
      return hasColors || hasSizes || hasInventory;
    });
  }, [detail.suppliers]);

  // Find SanMar supplier first if available, otherwise use first supplier
  const sanmarIndex = validSuppliers.findIndex((s) => s.supplier === 'SANMAR');
  const [selectedSupplierIndex, setSelectedSupplierIndex] = useState(
    validSuppliers.length > 0 ? (sanmarIndex >= 0 ? sanmarIndex : 0) : 0
  );
  const selectedSupplier = validSuppliers.length > 0 ? validSuppliers[selectedSupplierIndex] : null;

  const colorOptions = useMemo(
    () =>
      selectedSupplier?.product?.colors?.map((color) => ({
        colorCode: color.colorCode,
        colorName: color.colorName,
        swatchUrl: color.swatchUrl ?? undefined,
      })) ?? [],
    [selectedSupplier?.product?.colors]
  );

  const [selectedColorCode, setSelectedColorCode] = useState<string>('');

  useEffect(() => {
    const firstColor = colorOptions[0]?.colorCode ?? '';
    if (firstColor) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedColorCode(firstColor);
    }
  }, [colorOptions]);

  const sizeOrder = useMemo(() => {
    if (!selectedSupplier) return [];
    const productSizes = selectedSupplier.product?.sizes?.map((size) => size.sizeCode) ?? [];
    const inventoryRows = selectedSupplier.inventory?.rows ?? [];
    const extracted = extractSizesFromInventory(productSizes, inventoryRows);
    // Ensure sizes are properly sorted (should already be sorted by extractSizesFromInventory, but double-check)
    return extracted;
  }, [selectedSupplier]);

  return (
    <main className="mx-auto w-full max-w-[1400px] px-4 py-6">
      <div className="grid gap-6 lg:grid-cols-[320px,1fr,340px]">
        <div className="space-y-4">
          <ProductHero
            productName={detail.canonicalStyle.displayName}
            brand={detail.canonicalStyle.brand}
            media={selectedSupplier?.product?.media || []}
            selectedColorCode={selectedColorCode}
          />

          {colorOptions.length > 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <ColorSwatches
                colors={colorOptions}
                selectedColorCode={selectedColorCode}
                onSelectColor={setSelectedColorCode}
                styleCode={currentSupplier?.supplierPartId}
              />
            </div>
          ) : validSuppliers.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm text-slate-500">No product data available for this style.</p>
            </div>
          ) : null}
        </div>

        <div className="space-y-6">
          <ProductMeta
            canonicalStyle={detail.canonicalStyle}
            suppliers={validSuppliers}
            selectedSupplierIndex={selectedSupplierIndex}
            onSupplierChange={setSelectedSupplierIndex}
            allSuppliersCount={detail.suppliers.length}
          />

            {selectedSupplier && (
              <InventoryMatrixSection
                supplier={selectedSupplier}
                selectedColorCode={selectedColorCode}
                allSizes={sizeOrder}
              />
            )}
        </div>

        <div className="lg:sticky lg:top-6 lg:self-start">
          <CartPanel
            canonicalStyleId={detail.canonicalStyle.id}
            styleNumber={detail.canonicalStyle.styleNumber}
            displayName={detail.canonicalStyle.displayName}
            brand={detail.canonicalStyle.brand}
            supplier={selectedSupplier?.supplier || 'SANMAR'}
            supplierPartId={selectedSupplier?.supplierPartId || detail.canonicalStyle.styleNumber}
            selectedColorCode={selectedColorCode}
            selectedColorName={
              colorOptions.find((color) => color.colorCode === selectedColorCode)?.colorName ??
              selectedColorCode
            }
            allSizes={sizeOrder}
          />
        </div>
      </div>
    </main>
  );
}
