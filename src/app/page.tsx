import Link from 'next/link';

export default function Home() {
  return (
    <main className="page-shell">
      <section className="page-section text-center">
        <h1 className="text-3xl font-semibold text-slate-900">Promos Ink Customer Portal</h1>
        <p className="mt-4 text-base text-slate-600">
          Explore SanMar products, stage decoration-ready carts, and submit production orders.
        </p>
        <div className="mt-8">
          <Link
            className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
            href="/portal/catalog"
          >
            Browse Catalog
          </Link>
        </div>
      </section>
    </main>
  );
}


