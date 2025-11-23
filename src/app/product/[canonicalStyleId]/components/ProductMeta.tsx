'use client';

import type { SupplierProductDetail } from '@/services/product-service';

interface ProductMetaProps {
  canonicalStyle: {
    id: string;
    styleNumber: string;
    displayName: string;
    brand?: string | null;
  };
  suppliers: SupplierProductDetail[];
  selectedSupplierIndex: number;
  onSupplierChange: (index: number) => void;
  allSuppliersCount?: number; // Total suppliers including hidden ones
}

const SUPPLIER_LABELS: Record<string, string> = {
  SANMAR: 'SanMar',
  SSACTIVEWEAR: 'S&S Activewear',
};

export function ProductMeta({
  canonicalStyle,
  suppliers,
  selectedSupplierIndex,
  onSupplierChange,
  allSuppliersCount,
}: ProductMetaProps) {
  const selectedSupplier = suppliers[selectedSupplierIndex];
  const hasHiddenSuppliers = allSuppliersCount !== undefined && allSuppliersCount > suppliers.length;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      {/* Brand + Style Number */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {canonicalStyle.brand && (
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
            {canonicalStyle.brand}
          </span>
        )}
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
          Style {canonicalStyle.styleNumber}
        </span>
      </div>

      {/* Product Title */}
      <h1 className="mb-4 text-2xl font-semibold text-slate-900 lg:text-3xl">
        {canonicalStyle.displayName}
      </h1>

      {/* Supplier Tabs/Pills */}
      {suppliers.length > 1 && (
        <div className="mb-6">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
            Available from
          </p>
          <div className="flex flex-wrap gap-2">
            {suppliers.map((supplier, index) => {
              const supplierLabel = SUPPLIER_LABELS[supplier.supplier] || supplier.supplier;
              const displayLabel = supplier.supplierPartId
                ? `${supplierLabel} (${supplier.supplierPartId})`
                : supplierLabel;
              return (
                <button
                  key={`${supplier.supplier}-${supplier.supplierPartId}`}
                  type="button"
                  onClick={() => onSupplierChange(index)}
                  className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                    index === selectedSupplierIndex
                      ? 'border-brand-500 bg-brand-50 text-brand-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {displayLabel}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {suppliers.length === 1 && (
        <div className="mb-6">
          <span className="inline-flex rounded-full border border-brand-500 bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700">
            {SUPPLIER_LABELS[selectedSupplier.supplier] || selectedSupplier.supplier}
          </span>
        </div>
      )}

      {/* Product Details / Attributes */}
      <div className="space-y-3 border-t border-slate-200 pt-4">
        <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
          Product Details
        </h3>
        <ul className="space-y-2 text-sm text-slate-700">
          <li className="flex items-start gap-2">
            <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand-500" />
            <span>
              <strong>Supplier Part ID:</strong> {selectedSupplier.supplierPartId}
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand-500" />
            <span>
              <strong>Colors:</strong> {selectedSupplier.product?.colors.length || 0} available
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand-500" />
            <span>
              <strong>Sizes:</strong> {selectedSupplier.product?.sizes.length || 0} available
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand-500" />
            <span>Unisex fit, ready to decorate</span>
          </li>
        </ul>
        {hasHiddenSuppliers && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            <p className="font-semibold">Note:</p>
            <p>
              {allSuppliersCount! - suppliers.length} supplier{allSuppliersCount! - suppliers.length === 1 ? '' : 's'} {allSuppliersCount! - suppliers.length === 1 ? 'is' : 'are'} hidden because there is currently no inventory data available.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

