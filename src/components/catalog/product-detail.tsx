'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';
import useSWR from 'swr';
import clsx from 'clsx';

import type { ProductRecord, ProductSize, ProductColorway } from '@/lib/types';
import { fetchInventorySnapshot } from '@/lib/api';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useProjectCart } from '@/components/projects/project-cart-context';

interface ProductDetailProps {
  product: ProductRecord;
}

interface SizeRow {
  size: ProductSize;
  available: number | null;
  backorderDate?: string;
  supplierSku?: string | null;
  disabled: boolean;
}

const LOW_STOCK_THRESHOLD = 24;

function normalizeColorCode(color: string | undefined | null) {
  return color?.trim().toUpperCase() ?? '';
}

function colorDisplayName(colorways: ProductColorway[], colorCode: string) {
  const match = colorways.find((color) => normalizeColorCode(color.colorCode) === normalizeColorCode(colorCode));
  return match?.colorName ?? colorCode;
}

export function ProductDetail({ product }: ProductDetailProps) {
  const addLine = useProjectCart((state) => state.addLine);

  const colorways = useMemo(() => product.colors ?? [], [product.colors]);
  const initialColorCode = useMemo(() => {
    const preferred = normalizeColorCode(product.defaultColor);
    if (preferred) {
      return preferred;
    }
    return normalizeColorCode(colorways[0]?.colorCode);
  }, [product.defaultColor, colorways]);

  const [activeColor, setActiveColor] = useState(initialColorCode);
  const debouncedColor = useDebouncedValue(activeColor, 250);
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const skuLookup = useMemo(() => {
    const lookup = new Map<string, string | null>();
    for (const entry of product.skuMap ?? []) {
      const key = `${normalizeColorCode(entry.colorCode)}::${entry.sizeCode.toUpperCase()}`;
      lookup.set(key, entry.supplierSku ?? null);
    }
    return lookup;
  }, [product.skuMap]);

  const sizesByColor = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const entry of product.skuMap ?? []) {
      const colorKey = normalizeColorCode(entry.colorCode);
      const sizeKey = entry.sizeCode.toUpperCase();
      const set = map.get(colorKey) ?? new Set<string>();
      set.add(sizeKey);
      map.set(colorKey, set);
    }
    return map;
  }, [product.skuMap]);

  const imagesByColor = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const media of product.media ?? []) {
      const key = normalizeColorCode(media.colorCode);
      const list = map.get(key) ?? [];
      map.set(key, [...list, ...media.urls]);
    }
    return map;
  }, [product.media]);

  const activeImageSet = imagesByColor.get(activeColor) ?? imagesByColor.get(initialColorCode) ?? [];

  const { data: inventory, isLoading: inventoryLoading } = useSWR(
    debouncedColor ? ['inventory', product.supplierPartId, debouncedColor] : null,
    ([, supplierPartId, colorCode]) => fetchInventorySnapshot(supplierPartId, colorCode),
    {
      revalidateOnFocus: false,
      keepPreviousData: true,
    }
  );


  const sizeRows: SizeRow[] = useMemo(() => {
    const availableSizes = sizesByColor.get(activeColor) ?? new Set<string>();

    return (product.sizes ?? []).map((size) => {
      const normalized = size.code.toUpperCase();
      const key = `${activeColor}::${normalized}`;
      const supplierSku = skuLookup.get(key) ?? null;
      const availableEntry =
        inventory?.bySize?.[normalized] ??
        inventory?.bySize?.[size.code] ??
        inventory?.bySize?.[size.code.toLowerCase()];
      const disabled = !availableSizes.has(normalized) || !supplierSku;

      return {
        size,
        supplierSku,
        disabled,
        available: disabled ? null : availableEntry?.qty ?? 0,
        backorderDate: availableEntry?.backorderDate,
      };
    });
  }, [product.sizes, inventory, activeColor, skuLookup, sizesByColor]);

  const totalAvailable = useMemo(() => {
    return sizeRows.reduce((sum, row) => sum + (row.available ?? 0), 0);
  }, [sizeRows]);

  const handleQuantityChange = (sizeCode: string, value: string) => {
    setQuantities((prev) => ({
      ...prev,
      [sizeCode]: value,
    }));
  };

  const clearForm = () => {
    setQuantities({});
  };

  const handleAddToCart = (event: React.FormEvent) => {
    event.preventDefault();
    setStatusMessage(null);
    setErrorMessage(null);

    const entries = Object.entries(quantities)
      .map(([sizeCode, value]) => ({
        sizeCode,
        qty: Number.parseInt(value, 10),
      }))
      .filter(({ qty }) => Number.isFinite(qty) && qty > 0);

    if (entries.length === 0) {
      setErrorMessage('Enter at least one size quantity.');
      return;
    }

    const problematic = entries.find(({ sizeCode, qty }) => {
      const row = sizeRows.find((item) => item.size.code.toUpperCase() === sizeCode.toUpperCase());
      if (!row || row.disabled) return true;
      if (row.available !== null && qty > row.available) {
        return true;
      }
      return false;
    });

    if (problematic) {
      setErrorMessage('Quantity exceeds available inventory or size unavailable for this color.');
      return;
    }

    for (const entry of entries) {
      const row = sizeRows.find((item) => item.size.code.toUpperCase() === entry.sizeCode.toUpperCase());
      if (!row || row.disabled) continue;
      addLine({
        supplierPartId: product.supplierPartId,
        colorCode: activeColor,
        sizeCode: row.size.code,
        qty: entry.qty,
        supplierSku: row.supplierSku,
        decoration: null,
      });
    }

    clearForm();
    setStatusMessage('Added to project cart.');
  };

  const colorName = colorDisplayName(colorways, activeColor);

  return (
    <div className="stack-2xl">
      <header className="stack-sm">
        <p className="overline text-brand-500">SanMar Workflow</p>
        <h1 className="text-3xl font-semibold text-slate-900">{product.name}</h1>
        <p className="text-sm text-slate-500">{product.brand} • Style {product.supplierPartId}</p>
      </header>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <section className="stack-xl">
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-2">
            {activeImageSet.length > 0 ? (
              <Image
                src={activeImageSet[0]}
                alt={`${product.name} in ${colorName}`}
                width={960}
                height={960}
                className="h-auto w-full rounded-2xl object-cover"
                priority
              />
            ) : (
              <div className="aspect-[4/5] grid place-content-center rounded-2xl bg-slate-900/5 text-sm text-slate-400">
                No imagery for this color yet.
              </div>
            )}

            {activeImageSet.length > 1 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {activeImageSet.slice(0, 6).map((url, index) => (
                  <Image
                    key={url}
                    src={url}
                    alt={`${product.name} detail ${index + 1}`}
                    width={120}
                    height={120}
                    className="h-20 w-20 rounded-xl object-cover"
                  />
                ))}
              </div>
            ) : null}
          </div>

          <div className="stack-sm">
            <span className="overline">Available colors</span>
            <div className="flex flex-wrap gap-2">
              {colorways.map((color) => {
                const code = normalizeColorCode(color.colorCode);
                const isActive = code === activeColor;
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => {
                      setActiveColor(code);
                      setQuantities({});
                      setStatusMessage(null);
                      setErrorMessage(null);
                    }}
                    className={clsx(
                      'rounded-full border px-4 py-2 text-sm transition',
                      isActive
                        ? 'border-brand-500 bg-brand-500/20 text-brand-600'
                        : 'border-slate-200 text-slate-600 hover:border-brand-400'
                    )}
                  >
                    {color.colorName || code}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section className="stack-xl">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
              <div>
                <p className="font-semibold text-slate-900">{colorName}</p>
                <p>Supplier part • {product.supplierPartId}</p>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-wide text-slate-400">Total available</p>
                <p className="text-lg font-semibold text-emerald-600">{totalAvailable}</p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <p>{inventoryLoading ? 'Fetching live inventory…' : 'Live inventory snapshot'}</p>
                {inventory?.fetchedAt ? (
                  <p>Updated {new Date(inventory.fetchedAt).toLocaleTimeString()}</p>
                ) : null}
              </div>

              <form onSubmit={handleAddToCart} className="space-y-4">
                <div className="overflow-hidden rounded-2xl border border-slate-200">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-2 text-left">Size</th>
                        <th className="px-4 py-2 text-left">Available</th>
                        <th className="px-4 py-2 text-left">Backorder</th>
                        <th className="px-4 py-2 text-left">Qty</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sizeRows.map((row) => {
                        const normalized = row.size.code.toUpperCase();
                        const value = quantities[normalized] ?? '';
                        const lowStock = typeof row.available === 'number' && row.available > 0 && row.available <= LOW_STOCK_THRESHOLD;
                        return (
                          <tr key={normalized} className={row.disabled ? 'bg-slate-50/60 text-slate-400' : ''}>
                            <td className="px-4 py-3 font-semibold text-slate-700">{row.size.display}</td>
                            <td className="px-4 py-3">
                              {row.disabled ? '—' : row.available === 0 ? (
                                <span className="font-medium text-rose-500">Out</span>
                              ) : (
                                <span className={lowStock ? 'font-medium text-amber-600' : 'font-medium text-slate-700'}>
                                  {row.available}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-xs text-slate-500">
                              {row.backorderDate ? new Date(row.backorderDate).toLocaleDateString() : '—'}
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="number"
                                min={0}
                                step={1}
                                value={value}
                                onChange={(event) => handleQuantityChange(normalized, event.target.value)}
                                disabled={row.disabled}
                                className="w-20 rounded-lg border border-slate-200 px-3 py-1 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 disabled:cursor-not-allowed disabled:bg-slate-100"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {errorMessage ? <p className="text-sm text-rose-500">{errorMessage}</p> : null}
                {statusMessage ? <p className="text-sm text-emerald-600">{statusMessage}</p> : null}

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-slate-500">We validate quantities against live inventory before staging.</p>
                  <button
                    type="submit"
                    className="rounded-full bg-brand-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                  >
                    Add to project cart
                  </button>
                </div>
              </form>
            </div>
          </div>

          {product.description?.length ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900">Product notes</h2>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-600">
                {product.description.map((bullet, index) => (
                  <li key={index}>{bullet}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}


