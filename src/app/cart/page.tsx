import Link from 'next/link';
import { cookies } from 'next/headers';

import { Header } from '@/app/components/Header';
import { CART_COOKIE_NAME, getCartById, serializeCart } from '@/services/cart-service';

export default async function CartPage() {
  const cookieStore = await cookies();
  const cartId = cookieStore.get(CART_COOKIE_NAME)?.value;

  const cart = cartId ? await getCartById(cartId) : null;
  const payload = serializeCart(cart);

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10">
        <header className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-500">Cart</p>
          <h1 className="text-3xl font-semibold text-slate-900">Your selected styles</h1>
        </header>

        {payload.lines.length === 0 ? (
          <EmptyCart />
        ) : (
          <>
            <section className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              {payload.lines.map((line) => (
                <article
                  key={line.id}
                  className="space-y-4 rounded-2xl border border-slate-100 bg-slate-50/80 p-4 shadow-inner"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                        {line.supplier}
                      </p>
                      <h2 className="text-lg font-semibold text-slate-900">{line.displayName}</h2>
                      <p className="text-sm text-slate-500">
                        Style {line.styleNumber} • Color {line.colorName ?? line.colorCode}
                      </p>
                    </div>
                    <Link
                      href={`/product/${line.canonicalStyleId}`}
                      className="text-sm font-semibold text-brand-600 hover:text-brand-700"
                    >
                      View product
                    </Link>
                  </div>
                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    <table className="min-w-full text-sm">
                      <thead className="bg-slate-100 text-xs uppercase tracking-[0.3em] text-slate-500">
                        <tr>
                          <th className="px-4 py-2 text-left">Size</th>
                          <th className="px-4 py-2 text-right">Qty</th>
                        </tr>
                      </thead>
                      <tbody>
                        {line.sizeQuantities.map((entry) => (
                          <tr key={entry.sizeCode} className="border-t border-slate-100">
                            <td className="px-4 py-2 font-semibold text-slate-800">{entry.sizeCode}</td>
                            <td className="px-4 py-2 text-right text-slate-600">{entry.quantity}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </article>
              ))}
            </section>
            <div className="flex justify-end">
              <Link
                href="/cart/decorate"
                className="rounded-full bg-brand-600 px-8 py-4 text-base font-semibold text-white shadow-lg transition hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
              >
                Continue to Decoration
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function EmptyCart() {
  return (
    <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">Cart empty</p>
      <h2 className="mt-3 text-2xl font-semibold text-slate-900">No styles selected yet</h2>
      <p className="mt-2 text-sm text-slate-500">
        Search the catalog to add SanMar and S&S styles, then come back to request quotes.
      </p>
      <div className="mt-6 flex justify-center">
        <Link
          href="/search"
          className="rounded-full bg-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
        >
          Browse catalog
        </Link>
      </div>
    </section>
  );
}