"use client";

import Link from "next/link";
import { useMemo } from "react";

import { useProjectCart } from "@/components/projects/project-cart-context";

export function ProjectCartView() {
  const { items, totalUnits, updateSize, removeItem, clear } = useProjectCart();

  const hasItems = items.length > 0;

  const totalSkus = useMemo(() => items.length, [items.length]);

  if (!hasItems) {
    return (
      <div className="empty-state stack-sm">
        <h2 className="text-lg font-semibold text-white">No products staged yet</h2>
        <p className="text-sm text-slate-300/80">Search the catalog to add blanks before decorating.</p>
        <Link href="/portal/catalog" className="glass-button">
          Browse catalog
        </Link>
      </div>
    );
  }

  return (
    <div className="stack-lg">
      <div className="flex flex-col gap-3 rounded-2xl border border-white/12 bg-white/5 p-4 text-sm text-slate-200/80 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-slate-400/80">Project summary</p>
          <p className="text-base font-semibold text-white/95">{totalUnits} units across {totalSkus} SKUs</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button type="button" className="glass-button w-full sm:w-auto" onClick={() => clear()}>
            Clear project
          </button>
          <Link href="/portal/projects/decorate" className="glass-button w-full sm:w-auto">
            Proceed to decoration
          </Link>
        </div>
      </div>

      <div className="stack-lg">
        {items.map((item) => {
          const subtotal = item.sizeBreakdown.reduce((sum, entry) => sum + entry.quantity, 0);
          return (
            <section key={item.sku} className="stack-sm rounded-2xl border border-white/12 bg-white/5 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="stack-xs">
                  <span className="overline">{item.supplier}</span>
                  <h3 className="text-lg font-semibold text-white/95">{item.productName}</h3>
                  <div className="flex flex-wrap gap-2 text-xs text-slate-300/70">
                    <span className="font-mono text-cyan-200/80">{item.sku}</span>
                    {item.color ? <span>• {item.color}</span> : null}
                    {item.styleNumber ? <span>• Style {item.styleNumber}</span> : null}
                  </div>
                </div>
                <button type="button" className="glass-button w-full sm:w-auto" onClick={() => removeItem(item.sku)}>
                  Remove SKU
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="table-grid text-sm">
                  <thead>
                    <tr>
                      <th>Size</th>
                      <th>Quantity</th>
                      <th>Available</th>
                    </tr>
                  </thead>
                  <tbody>
                    {item.sizeBreakdown.map((entry) => (
                      <tr key={`${item.sku}-${entry.size}`}>
                        <td data-label="Size" className="font-medium text-white/90">
                          {entry.size}
                        </td>
                        <td data-label="Quantity">
                          <input
                            type="number"
                            min={0}
                            step={1}
                            value={entry.quantity}
                            onChange={(event) =>
                              updateSize(item.sku, entry.size, Math.max(0, Number.parseInt(event.target.value, 10) || 0))
                            }
                            className="w-full rounded-lg border border-white/12 bg-white/5 px-3 py-1 text-sm text-white focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                          />
                        </td>
                        <td data-label="Available" className="text-slate-300/70">
                          {entry.available ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-slate-400/70">Subtotal: {subtotal} units</p>
            </section>
          );
        })}
      </div>
    </div>
  );
}
