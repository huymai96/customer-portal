import { notFound } from 'next/navigation';

import { ProjectCartProvider } from '@/components/projects/project-cart-context';
import { ProductDetail } from '@/components/catalog/product-detail';
import { ProjectCartPanel } from '@/components/projects/project-cart-panel';
import { SupplierComparison } from '@/components/catalog/supplier-comparison';
import { getProductBySupplierPartId } from '@/services/catalog-repository';
import { fetchProductWithFallback, isSsActivewearPart } from '@/integrations/ssactivewear/service';

interface CatalogProductPageProps {
  params: Promise<{ productId: string }>;
}

export default async function CatalogProductPage({ params }: CatalogProductPageProps) {
  const { productId } = await params;
  const supplierPartId = decodeURIComponent(productId).toUpperCase();

  const [sanmarProduct, ssActivewearResult] = await Promise.all([
    getProductBySupplierPartId(supplierPartId).catch(() => null),
    isSsActivewearPart(supplierPartId)
      ? fetchProductWithFallback(supplierPartId).catch((error) => {
          console.error('Failed to load SSActivewear fallback product', supplierPartId, error);
          return null;
        })
      : Promise.resolve(null),
  ]);

  const product = sanmarProduct ?? ssActivewearResult?.product ?? null;

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
            sanmar={sanmarProduct}
            ssactivewear={ssActivewearResult?.product ?? null}
          />
        </section>
        <section className="page-section">
          <ProjectCartPanel />
        </section>
      </div>
    </ProjectCartProvider>
  );
}
