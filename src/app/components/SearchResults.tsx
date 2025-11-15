import Image from 'next/image';
import Link from 'next/link';

import type { SearchHit } from '@/lib/search';
import type { SupplierCode } from '@/lib/types';

import { POPULAR_CATEGORIES } from './site-data';

const SUPPLIER_LABELS: Record<SupplierCode, string> = {
  SANMAR: 'SanMar',
  SSACTIVEWEAR: 'S&S Activewear',
};

interface SearchResultsProps {
  query: string;
  results: SearchHit[];
}

export function SearchResults({ query, results }: SearchResultsProps) {
  const hasQuery = query.trim().length > 0;
  const displayQuery = hasQuery ? `&quot;${query}&quot;` : 'your filters';

  if (!results.length) {
    return (
      <section className="space-y-6 rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-rose-500">No products found</p>
        <div className="space-y-3">
          <h2 className="text-2xl font-semibold text-slate-900">We couldn&apos;t find {displayQuery}</h2>
          <p className="text-sm text-slate-500">
            Double-check the style code or try searching by brand, product type, or keyword.
          </p>
        </div>
        <ul className="mx-auto max-w-md list-disc space-y-1 text-left text-sm text-slate-600">
          <li>Check that the style number matches the supplier catalog (e.g., PC43, 5000, ST350).</li>
          <li>Try combining brand and style (e.g., &quot;Gildan 5000&quot; or &quot;Port &amp; Company PC4&quot;).</li>
          <li>Browse a category below to keep the conversation moving.</li>
        </ul>
        <div className="flex flex-wrap justify-center gap-3">
          {POPULAR_CATEGORIES.map((category) => (
            <Link
              key={category}
              href={`/category/${slugify(category)}`}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-brand-400 hover:text-brand-600"
            >
              {category}
            </Link>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-500">Results</p>
        <div className="flex flex-wrap items-baseline gap-2">
          <h2 className="text-2xl font-semibold text-slate-900">
            {hasQuery ? `Matching styles for ${displayQuery}` : 'Featured styles ready to browse'}
          </h2>
          <span className="text-sm text-slate-500">
            {results.length} recommendation{results.length === 1 ? '' : 's'}
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {results.map((hit) => {
          const { product } = hit;
          const totalOnHand = product.suppliers.reduce(
            (sum, supplier) =>
              sum + supplier.inventoryByWarehouse.reduce((supplierSum, entry) => supplierSum + entry.onHand, 0),
            0
          );

          return (
            <Link
              key={product.styleCode}
              href={`/product/${encodeURIComponent(product.styleCode)}`}
              className="block rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
            >
              <article className="flex flex-col gap-4 lg:flex-row">
                <div className="relative h-40 w-full overflow-hidden rounded-2xl bg-slate-100 lg:h-32 lg:w-48">
                  <Image
                    src={product.defaultImageUrl}
                    alt={`${product.brand} ${product.name}`}
                    fill
                    sizes="192px"
                    className="object-cover"
                  />
                </div>
                <div className="flex flex-1 flex-col gap-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Style {product.styleCode}
                    </span>
                    <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-600">
                      {hit.reason}
                    </span>
                    <span className="text-xs text-slate-400">
                      {product.suppliers.length} supplier{product.suppliers.length === 1 ? '' : 's'}
                    </span>
                    <span className="text-xs text-slate-400">
                      {Intl.NumberFormat('en-US').format(totalOnHand)} pcs across network
                    </span>
                  </div>
                  <div>
                    <p className="text-sm uppercase tracking-[0.3em] text-slate-500">{product.brand}</p>
                    <h3 className="text-xl font-semibold text-slate-900">{product.name}</h3>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
                    {product.categories.map((category) => (
                      <span key={`${product.styleCode}-${category}`} className="rounded-full bg-slate-100 px-3 py-1">
                        {category}
                      </span>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                    {product.suppliers.map((supplier) => {
                      const supplierTotal = supplier.inventoryByWarehouse.reduce(
                        (sum, entry) => sum + entry.onHand,
                        0
                      );
                      return (
                        <div key={`${product.styleCode}-${supplier.supplier}`}>
                          <p className="font-semibold">{SUPPLIER_LABELS[supplier.supplier]}</p>
                          <p className="text-xs uppercase tracking-wide text-slate-400">{supplier.supplierSku}</p>
                          <p>{Intl.NumberFormat('en-US').format(supplierTotal)} pcs ready</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </article>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function slugify(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
