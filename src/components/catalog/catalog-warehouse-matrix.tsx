interface WarehouseEntry {
  warehouse: string;
  label?: string;
  city?: string;
  state?: string;
  quantity: number;
  in_stock: boolean;
}

interface VariantWithInventory {
  sku: string;
  size?: string | null;
  inventory?: {
    warehouses?: WarehouseEntry[];
  };
}

interface CatalogWarehouseMatrixProps {
  variants: VariantWithInventory[];
}

interface MatrixRow {
  warehouse: string;
  label?: string;
  city?: string;
  state?: string;
  totals: Record<string, number>;
  totalQuantity: number;
}

function normalizeSize(size?: string | null): string {
  if (!size) return "OS";
  return size.trim().toUpperCase();
}

export function CatalogWarehouseMatrix({ variants }: CatalogWarehouseMatrixProps) {
  const sizes = Array.from(
    new Set(
      variants.map((variant) => normalizeSize(variant.size)).filter((size) => Boolean(size))
    )
  ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  const matrixMap = new Map<string, MatrixRow>();

  for (const variant of variants) {
    const size = normalizeSize(variant.size);
    const warehouseEntries = variant.inventory?.warehouses ?? [];

    for (const entry of warehouseEntries) {
      const existing = matrixMap.get(entry.warehouse);
      const totals = existing ? { ...existing.totals } : {};
      const current = totals[size] ?? 0;
      totals[size] = current + entry.quantity;

      const totalQuantity = Object.values(totals).reduce((sum, quantity) => sum + quantity, 0);

      matrixMap.set(entry.warehouse, {
        warehouse: entry.warehouse,
        label: entry.label,
        city: entry.city,
        state: entry.state,
        totals,
        totalQuantity,
      });
    }
  }

  const rows = Array.from(matrixMap.values()).sort((a, b) => {
    const labelA = a.label || a.warehouse;
    const labelB = b.label || b.warehouse;
    return labelA.localeCompare(labelB);
  });

  if (rows.length === 0) {
    return <p className="muted text-sm">No warehouse-level inventory available for this selection.</p>;
  }

  const totalPerSize: Record<string, number> = {};
  for (const size of sizes) {
    totalPerSize[size] = rows.reduce((sum, row) => sum + (row.totals[size] ?? 0), 0);
  }
  const grandTotal = Object.values(totalPerSize).reduce((sum, quantity) => sum + quantity, 0);

  return (
    <div className="overflow-x-auto">
      <table className="table-grid text-sm">
        <thead>
          <tr>
            <th>Warehouse</th>
            {sizes.map((size) => (
              <th key={size}>{size}</th>
            ))}
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.warehouse}>
              <td data-label="Warehouse" className="font-medium text-white/90">
                <div className="stack-xs">
                  <span>{row.label || row.warehouse}</span>
                  {(row.city || row.state) && (
                    <span className="text-xs text-slate-300/70">
                      {[row.city, row.state].filter(Boolean).join(", ")}
                    </span>
                  )}
                </div>
              </td>
              {sizes.map((size) => (
                <td key={`${row.warehouse}-${size}`} data-label={size} className="text-slate-100">
                  {row.totals[size] ?? 0}
                </td>
              ))}
              <td data-label="Total" className="font-semibold text-white">
                {row.totalQuantity}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td className="font-semibold text-white/90">Total inventory</td>
            {sizes.map((size) => (
              <td key={`total-${size}`} className="font-semibold text-white/90">
                {totalPerSize[size]}
              </td>
            ))}
            <td className="font-bold text-white">{grandTotal}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
