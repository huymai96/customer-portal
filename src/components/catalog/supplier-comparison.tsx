import type { ProductRecord } from '@/lib/types';

interface SupplierComparisonProps {
  sanmar?: ProductRecord | null;
  ssactivewear?: ProductRecord | null;
}

export function SupplierComparison({ sanmar, ssactivewear }: SupplierComparisonProps) {
  const suppliers: Array<{ id: string; label: string; product: ProductRecord }> = [];
  if (sanmar) {
    suppliers.push({ id: 'sanmar', label: 'SanMar', product: sanmar });
  }
  if (ssactivewear) {
    suppliers.push({ id: 'ssactivewear', label: 'SSActivewear', product: ssactivewear });
  }

  if (suppliers.length < 2) {
    return null;
  }

  return (
    <div className="stack-2xl">
      <header className="stack-xs">
        <p className="overline text-brand-500">Supplier comparison</p>
        <h2 className="text-xl font-semibold text-slate-900">SanMar vs SSActivewear availability</h2>
        <p className="text-sm text-slate-500">
          Live view of colors, size counts, and total available units for each supplier.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        {suppliers.map(({ id, label, product }) => (
          <SupplierTable key={id} label={label} product={product} />
        ))}
      </div>
    </div>
  );
}

interface SupplierTableProps {
  label: string;
  product: ProductRecord;
}

function SupplierTable({ label, product }: SupplierTableProps) {
  const rows = buildComparisonRows(product);
  const stats = computeStats(product);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white/70 shadow-sm backdrop-blur">
      <div className="border-b border-slate-100 px-4 py-3">
        <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
        <p className="text-base font-semibold text-slate-900">{product.name}</p>
        <p className="text-sm text-slate-500">{product.brand}</p>
      </div>
      <div className="grid grid-cols-3 gap-4 border-b border-slate-100 px-4 py-3 text-center">
        <Stat label="Colors" value={stats.colorCount} />
        <Stat label="Sizes" value={stats.sizeCount} />
        <Stat label="Live inventory" value={typeof stats.totalQty === 'number' ? stats.totalQty.toLocaleString() : '—'} />
      </div>
      <div className="max-h-80 overflow-auto">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2 text-left">Color</th>
              <th className="px-4 py-2 text-left">Sizes</th>
              <th className="px-4 py-2 text-left">Total qty</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={row.colorCode}>
                <td className="px-4 py-3 font-semibold text-slate-800">{row.colorName}</td>
                <td className="px-4 py-3 text-slate-500">{row.sizeSummary}</td>
                <td className="px-4 py-3 text-slate-700">
                  {typeof row.totalQty === 'number' ? row.totalQty.toLocaleString() : '—'}
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td className="px-4 py-3 text-sm text-slate-500" colSpan={3}>
                  No color data available yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function buildComparisonRows(product: ProductRecord) {
  const normalizeColor = (color?: string | null) => color?.trim().toUpperCase() ?? 'DEFAULT';

  const sizesByColor = new Map<string, Set<string>>();
  for (const sku of product.skuMap ?? []) {
    const colorKey = normalizeColor(sku.colorCode);
    const sizeKey = sku.sizeCode?.toUpperCase();
    if (!sizeKey) continue;
    const existing = sizesByColor.get(colorKey) ?? new Set<string>();
    existing.add(sizeKey);
    sizesByColor.set(colorKey, existing);
  }

  const inventoryByColor = new Map<string, number>();
  for (const entry of product.inventory ?? []) {
    const colorKey = normalizeColor(entry.colorCode);
    const current = inventoryByColor.get(colorKey) ?? 0;
    const qty = typeof entry.totalQty === 'number' ? entry.totalQty : 0;
    inventoryByColor.set(colorKey, current + qty);
  }

  return (product.colors ?? []).map((color) => {
    const colorKey = normalizeColor(color.colorCode);
    const sizeSet = sizesByColor.get(colorKey);
    return {
      colorCode: colorKey,
      colorName: color.colorName ?? colorKey,
      sizeSummary: sizeSet && sizeSet.size > 0 ? `${sizeSet.size} sizes` : '—',
      totalQty: inventoryByColor.get(colorKey) ?? null,
    };
  });
}

function computeStats(product: ProductRecord) {
  const colorCount = product.colors?.length ?? 0;
  const sizeCount = product.sizes?.length ?? 0;
  const totalQty = product.inventory?.reduce((sum, entry) => {
    return sum + (typeof entry.totalQty === 'number' ? entry.totalQty : 0);
  }, 0);
  return { colorCount, sizeCount, totalQty };
}

