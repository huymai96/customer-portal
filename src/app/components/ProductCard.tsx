import type { SampleProduct } from './site-data';

interface ProductCardProps {
  product: SampleProduct;
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <div className="flex flex-col rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lg">
      <div className="h-48 w-full bg-gradient-to-br from-slate-100 to-slate-200 p-4">
        <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-300 text-sm text-slate-400">
          Image coming soon
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">{product.brand}</p>
        <h3 className="text-lg font-semibold text-slate-900">{product.name}</h3>
        <p className="text-sm text-slate-500">
          From <span className="font-semibold text-slate-900">{formatPrice(product.price)}</span>
        </p>
        <p className="text-xs text-slate-400">Popular color: {product.color}</p>
      </div>
    </div>
  );
}

function formatPrice(price: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(price);
}

