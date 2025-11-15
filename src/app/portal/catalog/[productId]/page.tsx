import { notFound } from 'next/navigation';

import { SupplierSource } from '@prisma/client';
import { ProjectCartProvider } from '@/components/projects/project-cart-context';
import { ProductDetail } from '@/components/catalog/product-detail';
import { ProjectCartPanel } from '@/components/projects/project-cart-panel';
import { SupplierComparison } from '@/components/catalog/supplier-comparison';
import { getSupplierProductBundle } from '@/lib/server-api';

interface CatalogProductPageProps {
  params: Promise<{ productId: string }>;
}

export default async function CatalogProductPage({ params }: CatalogProductPageProps) {
  const { productId } = await params;
  const supplierPartId = decodeURIComponent(productId);

  const bundle = await getSupplierProductBundle(supplierPartId);
  const product = bundle.primaryProduct;

  if (!product) {
    notFound();
  }

  return (
    <ProjectCartProvider>
      <div className="page-shell space-y-10">
        <section className="page-section">
          <ProductDetail product={product} />
        </section>
        <section className="page-section">
          <SupplierComparison
            sanmar={bundle.products[SupplierSource.SANMAR] ?? null}
            ssactivewear={bundle.products[SupplierSource.SSACTIVEWEAR] ?? null}
          />
        </section>
        <section className="page-section">
          <ProjectCartPanel />
        </section>
      </div>
    </ProjectCartProvider>
  );
}
