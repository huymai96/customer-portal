export const dynamic = 'force-dynamic';

import CatalogSearch from '@/components/catalog/catalog-search';
import CatalogSearchResults from '@/components/catalog/catalog-search-results';
import { CatalogBrowse } from '@/components/catalog/catalog-browse';
import type { SupplierCode } from '@/lib/types';

interface CatalogPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const RESULTS_PER_PAGE = 20;

function toArray(value?: string | string[]): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function normalizeSupplierCodes(values: string[]): SupplierCode[] {
  return values
    .map((value) => value.toUpperCase())
    .filter((value): value is SupplierCode => value === 'SANMAR' || value === 'SSACTIVEWEAR');
}

function parseSingleParam(value?: string | string[]): string | undefined {
  if (!value) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const resolvedSearchParams = await searchParams;
  const query = parseSingleParam(resolvedSearchParams.query) ?? '';
  const suppliers = normalizeSupplierCodes(
    toArray(resolvedSearchParams.supplier as string | string[] | undefined)
  );

  const sortParam = parseSingleParam(resolvedSearchParams.sort);
  const initialSort: 'relevance' | 'supplier' | 'price' | 'stock' =
    sortParam === 'supplier' || sortParam === 'price' || sortParam === 'stock'
      ? sortParam
      : 'relevance';

  const inStockParam = parseSingleParam(resolvedSearchParams.inStockOnly);
  const inStockOnly =
    inStockParam === 'true' || inStockParam === '1' || inStockParam === 'yes';

  const pageParam = parseSingleParam(resolvedSearchParams.page);
  const parsedPage = pageParam ? Number.parseInt(pageParam, 10) : 1;
  const page = Number.isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;

  return (
    <div className="space-y-8">
      <section className="page-section space-y-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">Catalog</p>
          <h1 className="text-3xl font-semibold text-slate-900">Find a Product</h1>
          <p className="mt-2 text-sm text-slate-500">
            Search across SanMar and S&amp;S Activewear. Compare suppliers side by side, view live inventory,
            and stage decoration-ready cart lines.
          </p>
        </div>
        <CatalogSearch initialQuery={query} initialSuppliers={suppliers} initialSort={initialSort} />
      </section>
      <section className="page-section space-y-6">
        <CatalogBrowse />
      </section>
      <section className="page-section">
        <CatalogSearchResults
          query={query}
          suppliers={suppliers}
          sort={initialSort}
          page={page}
          limit={RESULTS_PER_PAGE}
          inStockOnly={inStockOnly}
        />
      </section>
    </div>
  );
}

