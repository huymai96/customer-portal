'use client';

import { useMemo, useState } from 'react';
import clsx from 'clsx';

import type { SupplierProductDetail } from '@/services/product-service';

import { SupplierSection } from './components/SupplierSection';

interface SupplierTabsProps {
  suppliers: SupplierProductDetail[];
  styleNumber: string;
  canonicalStyleId: string;
}

export function SupplierTabs({ suppliers, styleNumber, canonicalStyleId }: SupplierTabsProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedColors, setSelectedColors] = useState<Record<string, string | undefined>>({});

  const supplierKeys = useMemo(
    () => suppliers.map((supplier) => buildSupplierKey(supplier)),
    [suppliers]
  );

  const activeSupplier = suppliers[activeIndex];
  if (!activeSupplier) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
        Supplier data will appear here once catalog ingest completes.
      </div>
    );
  }

  const activeKey = supplierKeys[activeIndex];
  const activeColor = activeKey ? selectedColors[activeKey] : undefined;

  function handleColorChange(key: string, colorCode: string) {
    setSelectedColors((prev) => ({ ...prev, [key]: colorCode }));
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-3">
        {suppliers.map((supplier, index) => {
          const key = supplierKeys[index];
          const isActive = index === activeIndex;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={clsx(
                'rounded-full border px-5 py-2 text-sm font-semibold shadow-sm transition',
                isActive
                  ? 'border-brand-500 bg-brand-600 text-white ring-2 ring-brand-200'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              )}
            >
              {supplier.supplier} • {supplier.supplierPartId}
            </button>
          );
        })}
      </div>

      <SupplierSection
        supplier={activeSupplier}
        canonicalStyleId={canonicalStyleId}
        canonicalStyleNumber={styleNumber}
        selectedColorCode={activeColor}
        onColorChange={(color) => activeKey && handleColorChange(activeKey, color)}
      />
    </div>
  );
}

function buildSupplierKey(supplier: SupplierProductDetail): string {
  return `${supplier.supplier}-${supplier.supplierPartId}`;
}

