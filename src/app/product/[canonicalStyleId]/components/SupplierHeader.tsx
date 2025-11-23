'use client';

import type { SupplierProductDetail } from '@/services/product-service';

interface SupplierHeaderProps {
  supplier: SupplierProductDetail;
  canonicalStyleNumber: string;
  selectedColorName?: string;
}

export function SupplierHeader({
  supplier,
  canonicalStyleNumber,
  selectedColorName,
}: SupplierHeaderProps) {
  const product = supplier.product;
  const description = normalizeDescription(product?.description);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
        {product?.brand ? <span>{product.brand}</span> : null}
        <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] tracking-[0.2em] text-slate-600">
          Style {canonicalStyleNumber}
        </span>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] tracking-[0.2em] text-slate-600">
          {supplier.supplier} • {supplier.supplierPartId}
        </span>
      </div>
      <div className="space-y-2">
        <h2 className="text-3xl font-semibold text-slate-900">{product?.name ?? supplier.supplierPartId}</h2>
        {selectedColorName ? (
          <p className="text-sm text-slate-500">
            Selected color: <span className="font-semibold text-slate-900">{selectedColorName}</span>
          </p>
        ) : null}
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-3 text-sm text-slate-600">
          {description ? <p>{description}</p> : <p>Detailed product description coming soon.</p>}
          <FeatureList supplier={supplier} />
        </div>
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 shadow-inner">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Pricing</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">$ --.--</p>
          <p className="text-xs text-slate-500">
            Final pricing available after quote. Contact your rep or add to a project to see negotiated pricing.
          </p>
          <div className="mt-4 grid gap-2 text-xs">
            <PlaceholderPriceRow label="Piece" />
            <PlaceholderPriceRow label="Dozen" />
            <PlaceholderPriceRow label="Case" />
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureList({ supplier }: { supplier: SupplierProductDetail }) {
  const product = supplier.product;
  const details: string[] = [];

  if (product?.sizes?.length) {
    const sizeLabels = product.sizes
      .map((size) => size.display ?? size.sizeCode)
      .filter(Boolean)
      .slice(0, 8)
      .join(', ');
    details.push(`Available sizes: ${sizeLabels}`);
  }

  if (product?.colors?.length) {
    const colorLabels = product.colors
      .map((color) => color.colorName ?? color.colorCode)
      .filter(Boolean)
      .slice(0, 6)
      .join(', ');
    details.push(`Top colors: ${colorLabels}`);
  }

  if (supplier.inventory.warehouses.length) {
    details.push(`Warehouses: ${supplier.inventory.warehouses.length} regions in stock`);
  }

  if (details.length === 0) {
    details.push('Heavyweight cotton body', 'Decoration-ready seams', 'Stocked across national warehouses');
  }

  return (
    <ul className="grid gap-1 text-slate-500">
      {details.map((item) => (
        <li key={item}>• {item}</li>
      ))}
    </ul>
  );
}

function PlaceholderPriceRow({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white/70 px-3 py-2">
      <span className="font-semibold text-slate-600">{label}</span>
      <span className="font-semibold text-slate-400">$ --.--</span>
    </div>
  );
}

function normalizeDescription(description: unknown): string | null {
  if (!description) return null;
  if (Array.isArray(description)) {
    return description.filter((value): value is string => typeof value === 'string').join(' ');
  }
  if (typeof description === 'string') {
    return description;
  }
  return null;
}


