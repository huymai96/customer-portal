import type { SupplierInventory } from '@/lib/catalog';
import type { SupplierCode } from '@/lib/types';

const SUPPLIER_LABELS: Record<SupplierCode, string> = {
  SANMAR: 'SanMar',
  SSACTIVEWEAR: 'S&S Activewear',
};

interface ProductInventoryProps {
  suppliers: SupplierInventory[];
}

export function ProductInventory({ suppliers }: ProductInventoryProps) {
  if (!suppliers.length) {
    return null;
  }

  return (
    <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-500">Inventory</p>
        <h2 className="text-2xl font-semibold text-slate-900">Multi-supplier availability</h2>
        <p className="text-sm text-slate-500">
          Compare warehouse depth from SanMar and S&amp;S Activewear without bouncing between tabs.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {suppliers.map((supplier) => {
          const totalOnHand = supplier.inventoryByWarehouse.reduce((sum, entry) => sum + entry.onHand, 0);
          return (
            <article
              key={`${supplier.supplier}-${supplier.supplierSku}`}
              className="rounded-2xl border border-slate-100 bg-slate-50 p-4 shadow-inner"
            >
              <div className="flex items-baseline justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                    {SUPPLIER_LABELS[supplier.supplier]}
                  </p>
                  <p className="text-sm font-semibold text-slate-900">{supplier.supplierSku}</p>
                </div>
                <p className="text-sm font-semibold text-brand-600">
                  {Intl.NumberFormat('en-US').format(totalOnHand)} pcs on hand
                </p>
              </div>

              <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Warehouse</th>
                      <th className="px-3 py-2 text-right">On-hand qty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                    {supplier.inventoryByWarehouse.map((warehouse) => (
                      <tr key={`${supplier.supplier}-${warehouse.warehouseName}`}>
                        <td className="px-3 py-2">{warehouse.warehouseName}</td>
                        <td className="px-3 py-2 text-right font-semibold">
                          {Intl.NumberFormat('en-US').format(warehouse.onHand)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

