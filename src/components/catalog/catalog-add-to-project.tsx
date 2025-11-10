"use client";

import { FormEvent, useMemo, useState } from "react";

import { useProjectCart } from "@/components/projects/project-cart-context";

interface VariantSizeEntry {
  size: string;
  sku: string;
  available?: number;
}

interface CatalogAddToProjectProps {
  sku: string;
  productName: string;
  supplier: string;
  color?: string;
  styleNumber?: string;
  imageUrl?: string;
  variants: VariantSizeEntry[];
}

export function CatalogAddToProject({ sku, productName, supplier, color, styleNumber, imageUrl, variants }: CatalogAddToProjectProps) {
  const { addItem } = useProjectCart();
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [status, setStatus] = useState<"idle" | "success">("idle");

  const orderedVariants = useMemo(() => {
    return [...variants].sort((a, b) => a.size.localeCompare(b.size, undefined, { numeric: true }));
  }, [variants]);

  const totalSelected = useMemo(
    () => Object.values(quantities).reduce((sum, qty) => sum + (Number.isFinite(qty) ? qty : 0), 0),
    [quantities]
  );

  const handleQuantityChange = (size: string, value: string) => {
    const parsed = Number.parseInt(value, 10);
    setQuantities((prev) => ({
      ...prev,
      [size]: Number.isNaN(parsed) ? 0 : Math.max(0, parsed),
    }));
    setStatus("idle");
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const breakdown = orderedVariants
      .map((variant) => ({
        size: variant.size,
        quantity: quantities[variant.size] ?? 0,
        available: variant.available,
      }))
      .filter((entry) => entry.quantity > 0);

    if (breakdown.length === 0) {
      return;
    }

    addItem({
      sku,
      productName,
      supplier,
      color,
      styleNumber,
      imageUrl,
      sizeBreakdown: breakdown,
    });

    setQuantities({});
    setStatus("success");
  };

  return (
    <form className="stack-sm" onSubmit={handleSubmit}>
      <div className="overflow-x-auto">
        <table className="table-grid text-sm">
          <thead>
            <tr>
              <th>Size</th>
              <th>Available</th>
              <th>Quantity</th>
            </tr>
          </thead>
          <tbody>
            {orderedVariants.map((variant) => {
              const value = quantities[variant.size] ?? 0;
              return (
                <tr key={variant.size}>
                  <td data-label="Size" className="font-medium text-white/90">
                    {variant.size}
                  </td>
                  <td data-label="Available" className="text-slate-300/70">
                    {variant.available ?? "—"}
                  </td>
                  <td data-label="Quantity" className="text-slate-100">
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={value === 0 ? "" : value}
                      onChange={(event) => handleQuantityChange(variant.size, event.target.value)}
                      className="w-full rounded-lg border border-white/12 bg-white/5 px-3 py-1 text-sm text-white focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                      placeholder="0"
                      inputMode="numeric"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-slate-300/70">Total selected: {totalSelected}</p>
        <button type="submit" className="glass-button w-full sm:w-auto">
          Add to project
        </button>
      </div>
      {status === "success" ? (
        <p className="text-xs text-emerald-300/90">Added to project workspace.</p>
      ) : null}
    </form>
  );
}
