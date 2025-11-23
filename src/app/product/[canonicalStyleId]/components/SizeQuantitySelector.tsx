'use client';

import clsx from 'clsx';

import type { SizeOption } from './types';

interface SizeQuantitySelectorProps {
  sizes: SizeOption[];
  values: Record<string, number>;
  onChange: (sizeCode: string, quantity: number) => void;
  disabled?: boolean;
}

export function SizeQuantitySelector({ sizes, values, onChange, disabled }: SizeQuantitySelectorProps) {
  if (!sizes.length) {
    return <p className="text-sm text-slate-500">No size data available for this supplier.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm text-slate-600">
        <p className="font-semibold">Select quantities</p>
        <p className="text-xs text-slate-400">Enter per-size quantities</p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {sizes.map((size) => {
          const key = size.sizeCode;
          const quantity = values[key] ?? 0;
          return (
            <label
              key={key}
              className={clsx(
                'flex items-center justify-between rounded-2xl border px-3 py-2 text-sm shadow-sm transition',
                quantity > 0 ? 'border-brand-400 bg-brand-50' : 'border-slate-200 bg-white'
              )}
            >
              <span className="font-semibold text-slate-700">{size.display ?? size.sizeCode}</span>
              <input
                type="number"
                min={0}
                value={quantity}
                disabled={disabled}
                onChange={(event) => onChange(key, Number(event.target.value))}
                className="h-8 w-16 rounded-lg border border-slate-300 bg-white px-2 text-right text-sm font-semibold text-slate-700 focus:border-brand-500 focus:outline-none"
              />
            </label>
          );
        })}
      </div>
    </div>
  );
}


