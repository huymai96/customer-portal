import Link from "next/link";
import type { ProductRecord } from "@/lib/types";

interface InventoryTableProps {
  products: ProductRecord[];
}

export function InventoryTable({ products }: InventoryTableProps) {
  if (products.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-10 text-center text-slate-500">
        No products found for the current filters.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="table-grid text-sm">
        <thead>
          <tr>
            <th>SKU</th>
            <th>Product</th>
            <th>Supplier</th>
            <th>Category</th>
            <th>Color</th>
            <th className="text-right">Available</th>
            <th>Methods</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.sku}>
              <td data-label="SKU" className="font-mono text-xs text-cyan-200/80">
                <Link href={`/portal/catalog/${product.sku}`}>{product.sku}</Link>
              </td>
              <td data-label="Product" className="text-slate-100">
                <div className="font-medium text-white/95">
                  <Link href={`/portal/catalog/${product.sku}`} className="hover:underline">
                    {product.product_name}
                  </Link>
                </div>
                <div className="text-xs text-slate-300/70">{product.brand}</div>
              </td>
              <td data-label="Supplier" className="capitalize text-slate-300/70">{product.supplier || "-"}</td>
              <td data-label="Category" className="text-slate-300/70">{product.category || "-"}</td>
              <td data-label="Color" className="text-slate-300/70">{product.color || "-"}</td>
              <td data-label="Available" className="text-right text-white/90">
                {product.inventory?.available?.toLocaleString() ?? "-"}
              </td>
              <td data-label="Methods" className="text-xs text-slate-300/70">
                {renderMethods(product)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function renderMethods(product: ProductRecord): string {
  const methods = product.decoration_methods || {};
  const enabled = Object.entries(methods)
    .filter(([, value]) => Boolean(value))
    .map(([key]) => key.replace(/_/g, " "));

  return enabled.length > 0 ? enabled.join(", ") : "—";
}


