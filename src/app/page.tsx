import { CategoryGrid } from './components/CategoryGrid';
import { Header } from './components/Header';
import { CATEGORY_TILES } from './components/site-data';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-12 px-4 pb-16 pt-10">
        <section className="grid gap-8 rounded-3xl bg-white p-8 shadow-lg lg:grid-cols-[3fr,2fr]">
          <div className="space-y-6">
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-brand-600">
              Apparel & Hardgoods
            </p>
            <h1 className="text-4xl font-semibold leading-tight text-slate-900">
              Search once, quote twice, deliver faster.
            </h1>
            <p className="text-sm text-slate-600">
              Promos Ink unifies SanMar and S&amp;S Activewear data so your merchandising, creative, and
              production teams stay in sync. Use the global search above or browse curated assortments below.
            </p>
            <div className="flex flex-wrap gap-3 text-sm font-semibold text-slate-600">
              <span className="rounded-full bg-slate-100 px-4 py-2">Live inventory snapshots</span>
              <span className="rounded-full bg-slate-100 px-4 py-2">Pricing &amp; decoration ready</span>
              <span className="rounded-full bg-slate-100 px-4 py-2">B2B client portals</span>
            </div>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-brand-50 to-white p-6 text-sm text-slate-600">
            <h2 className="text-xl font-semibold text-slate-900">Why Promos Ink</h2>
            <ul className="mt-4 space-y-3">
              {[
                'Promo-ready assortments curated by account and channel.',
                'Supplier comparison view with price + stock guidance.',
                'Decoration workflows mapped to live orders.',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-1 h-2 w-2 rounded-full bg-brand-500" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <CategoryGrid categories={CATEGORY_TILES} />
      </main>
    </div>
  );
}
