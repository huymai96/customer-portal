import Link from 'next/link';

import { Header } from '@/app/components/Header';

export default function DecoratePage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10">
        <header className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-500">Decoration</p>
          <h1 className="text-3xl font-semibold text-slate-900">Add decoration to your order</h1>
        </header>

        <section className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto max-w-lg space-y-4">
            <div className="flex h-20 w-20 mx-auto items-center justify-center rounded-full bg-brand-100 text-3xl">
              🎨
            </div>
            <h2 className="text-2xl font-semibold text-slate-900">Decoration workflow coming soon</h2>
            <p className="text-sm text-slate-600">
              This page will allow you to specify decoration methods (screen print, embroidery, DTG), upload
              artwork, select placement, and request quotes.
            </p>
            <div className="flex justify-center gap-3 pt-4">
              <Link
                href="/cart"
                className="rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                Back to Cart
              </Link>
              <Link
                href="/search"
                className="rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
              >
                Browse More Products
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}


