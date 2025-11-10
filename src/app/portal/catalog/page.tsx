import CatalogSearch from '@/components/catalog/catalog-search';

export default function CatalogPage() {
  return (
    <div className="space-y-8">
      <section className="page-section space-y-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">Catalog</p>
          <h1 className="text-3xl font-semibold text-slate-900">Find a Product</h1>
          <p className="mt-2 text-sm text-slate-500">
            Search by SanMar style number or keyword. Select a color to view live inventory and stage
            decoration-ready cart lines.
          </p>
        </div>
        <CatalogSearch />
      </section>
    </div>
  );
}


