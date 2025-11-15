import Image from 'next/image';
import { notFound } from 'next/navigation';

import { Header } from '@/app/components/Header';
import { ProductInventory } from '@/app/components/ProductInventory';
import { getProductByStyleCode } from '@/lib/catalog';

interface ProductPageProps {
  params: Promise<{
    styleCode: string;
  }>;
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { styleCode } = await params;
  const product = getProductByStyleCode(styleCode);

  if (!product) {
    notFound();
  }

  const totalSuppliers = product.suppliers.length;
  const totalOnHand = product.suppliers.reduce(
    (sum, supplier) =>
      sum + supplier.inventoryByWarehouse.reduce((supplierSum, entry) => supplierSum + entry.onHand, 0),
    0
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-10">
        <section className="grid gap-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-[1.2fr,1fr]">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
              <span>{product.brand}</span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] tracking-[0.2em] text-slate-600">
                Style {product.styleCode}
              </span>
            </div>
            <h1 className="text-3xl font-semibold text-slate-900">{product.name}</h1>
            {product.description ? <p className="text-sm text-slate-600">{product.description}</p> : null}
            <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
              {product.categories.map((category) => (
                <span key={`${product.styleCode}-${category}`} className="rounded-full bg-slate-100 px-3 py-1">
                  {category}
                </span>
              ))}
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-slate-600">
              <span className="font-semibold text-slate-900">{totalSuppliers} supplier{totalSuppliers === 1 ? '' : 's'} linked</span>
              <span>{Intl.NumberFormat('en-US').format(totalOnHand)} units combined on-hand</span>
            </div>
          </div>

          <div className="flex items-center justify-center">
            <div className="relative aspect-square w-full max-w-sm overflow-hidden rounded-3xl bg-slate-100">
              <Image
                src={product.defaultImageUrl}
                alt={`${product.brand} ${product.name}`}
                fill
                sizes="(min-width: 768px) 400px, 90vw"
                className="object-cover"
                priority
              />
            </div>
          </div>
        </section>

        <ProductInventory suppliers={product.suppliers} />
      </main>
    </div>
  );
}
