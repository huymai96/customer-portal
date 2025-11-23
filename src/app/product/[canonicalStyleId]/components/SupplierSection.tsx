'use client';

import clsx from 'clsx';
import { useEffect, useMemo, useState, useTransition } from 'react';

import type { SupplierProductDetail } from '@/services/product-service';
import type { AddToCartRequestPayload } from '@/lib/types';

import { ColorSwatches } from './ColorSwatches';
import { InventoryMatrix } from './InventoryMatrix';
import { ProductImages } from './ProductImages';
import { SizeQuantitySelector } from './SizeQuantitySelector';
import { SupplierHeader } from './SupplierHeader';
import type { ColorOption, SizeOption } from './types';

interface SupplierSectionProps {
  supplier: SupplierProductDetail;
  canonicalStyleId: string;
  canonicalStyleNumber: string;
  selectedColorCode?: string | null;
  onColorChange?: (colorCode: string) => void;
}

export function SupplierSection({
  supplier,
  canonicalStyleId,
  canonicalStyleNumber,
  selectedColorCode,
  onColorChange,
}: SupplierSectionProps) {
  const colorOptions = useMemo(() => buildColorOptions(supplier), [supplier]);
  const sizeOptions = useMemo(() => buildSizeOptions(supplier), [supplier]);

  const [localColor, setLocalColor] = useState<string | null>(colorOptions[0]?.colorCode ?? null);
  const [colorScope, setColorScope] = useState<'single' | 'all'>('all');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'warehouse' | 'color'>('warehouse');
  const [sizeQuantities, setSizeQuantities] = useState<Record<string, number>>({});
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!colorOptions.length) {
      setLocalColor(null);
      return;
    }
    if (selectedColorCode && colorOptions.some((color) => color.colorCode === selectedColorCode)) {
      setLocalColor(selectedColorCode);
      return;
    }
    if (!localColor || !colorOptions.some((color) => color.colorCode === localColor)) {
      setLocalColor(colorOptions[0]?.colorCode ?? null);
    }
  }, [colorOptions, localColor, selectedColorCode]);

  const activeColor = selectedColorCode ?? localColor ?? colorOptions[0]?.colorCode ?? null;
  const activeColorName =
    (activeColor && colorOptions.find((color) => color.colorCode === activeColor)?.colorName) ?? undefined;

  function handleColorSelect(colorCode: string) {
    setLocalColor(colorCode);
    onColorChange?.(colorCode);
    setColorScope('single');
    setSizeQuantities({});
    setStatus('idle');
    setStatusMessage(null);
  }

  function handleSizeChange(sizeCode: string, quantity: number) {
    setSizeQuantities((prev) => ({
      ...prev,
      [sizeCode]: Math.max(0, quantity),
    }));
    setStatus('idle');
    setStatusMessage(null);
  }

  async function handleAddToCart() {
    if (!activeColor) {
      setStatus('error');
      setStatusMessage('Please select a color.');
      return;
    }
    const entries = Object.entries(sizeQuantities)
      .map(([sizeCode, quantity]) => ({ sizeCode, quantity }))
      .filter((entry) => entry.quantity > 0);
    if (!entries.length) {
      setStatus('error');
      setStatusMessage('Set at least one size quantity.');
      return;
    }

    const payload: AddToCartRequestPayload = {
      canonicalStyleId,
      styleNumber: canonicalStyleNumber,
      displayName: supplier.product?.name ?? supplier.supplierPartId,
      brand: supplier.product?.brand ?? undefined,
      supplier: supplier.supplier,
      supplierPartId: supplier.supplierPartId,
      colorCode: activeColor,
      colorName:
        colorOptions.find((option) => option.colorCode === activeColor)?.colorName ?? undefined,
      sizeQuantities: entries,
    };

    startTransition(async () => {
      try {
        const response = await fetch('/api/cart/lines', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error ?? 'Unable to add to cart.');
        }
        setStatus('success');
        setStatusMessage('Added to cart.');
        setSizeQuantities({});
      } catch (error) {
        setStatus('error');
        setStatusMessage(error instanceof Error ? error.message : 'Unable to add to cart.');
      }
    });
  }

  const totalSelected = useMemo(
    () => Object.values(sizeQuantities).reduce((sum, qty) => sum + (qty || 0), 0),
    [sizeQuantities]
  );

  return (
    <div className="space-y-10">
      <SupplierHeader
        supplier={supplier}
        canonicalStyleNumber={canonicalStyleNumber}
        selectedColorName={activeColorName}
      />

      <div className="grid gap-10 lg:grid-cols-[1.2fr,0.8fr]">
        <ProductImages
          media={supplier.product?.media}
          productName={supplier.product?.name ?? supplier.supplierPartId}
          brand={supplier.product?.brand}
          selectedColorCode={activeColor ?? undefined}
        />
        <div className="space-y-6">
          <ColorSwatches
            colors={colorOptions}
            selectedColorCode={activeColor}
            onSelectColor={handleColorSelect}
          />
          <SizeQuantitySelector
            sizes={sizeOptions}
            values={sizeQuantities}
            onChange={handleSizeChange}
            disabled={isPending}
          />
          <div className="space-y-3">
            <button
              type="button"
              disabled={isPending}
              onClick={handleAddToCart}
              className="w-full rounded-full bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? 'Adding…' : totalSelected > 0 ? `Add ${totalSelected} to cart` : 'Add to cart'}
            </button>
            {statusMessage ? (
              <p
                className={clsx(
                  'text-center text-xs font-semibold uppercase tracking-[0.3em]',
                  status === 'success' ? 'text-emerald-600' : 'text-rose-500'
                )}
              >
                {statusMessage}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <InventoryMatrix
        rows={supplier.inventory.rows}
        sizes={sizeOptions}
        colors={colorOptions}
        warehouses={supplier.inventory.warehouses}
        selectedColorCode={activeColor}
        colorScope={colorScope}
        warehouseFilter={warehouseFilter}
        viewMode={viewMode}
        onColorScopeChange={setColorScope}
        onWarehouseFilterChange={setWarehouseFilter}
        onViewModeChange={setViewMode}
      />
    </div>
  );
}

function buildColorOptions(supplier: SupplierProductDetail): ColorOption[] {
  const map = new Map<string, ColorOption>();
  supplier.product?.colors.forEach((color) => {
    map.set(color.colorCode, {
      colorCode: color.colorCode,
      colorName: color.colorName,
      swatchUrl: color.swatchUrl ?? undefined,
    });
  });
  supplier.inventory.rows.forEach((row) => {
    if (!map.has(row.colorCode)) {
      map.set(row.colorCode, {
        colorCode: row.colorCode,
        colorName: humanizeCode(row.colorCode),
      });
    }
  });
  return Array.from(map.values()).sort((a, b) =>
    (a.colorName ?? a.colorCode).localeCompare(b.colorName ?? b.colorCode)
  );
}

function buildSizeOptions(supplier: SupplierProductDetail): SizeOption[] {
  const map = new Map<string, SizeOption>();
  supplier.product?.sizes.forEach((size) => {
    map.set(size.sizeCode, {
      sizeCode: size.sizeCode,
      display: size.display ?? size.sizeCode,
      sort: size.sort ?? undefined,
    });
  });
  supplier.inventory.rows.forEach((row) => {
    if (!map.has(row.sizeCode)) {
      map.set(row.sizeCode, {
        sizeCode: row.sizeCode,
        display: row.sizeCode,
      });
    }
  });
  return Array.from(map.values()).sort(sortSizes);
}

function sortSizes(a: SizeOption, b: SizeOption) {
  const aSort = a.sort ?? Number.MAX_SAFE_INTEGER;
  const bSort = b.sort ?? Number.MAX_SAFE_INTEGER;
  if (aSort === bSort) {
    return a.sizeCode.localeCompare(b.sizeCode);
  }
  return aSort - bSort;
}

function humanizeCode(value: string) {
  if (!value) return '';
  return value
    .replace(/[_-]+/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (match) => match.toUpperCase());
}


