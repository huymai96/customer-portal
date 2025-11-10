import { notFound } from 'next/navigation';

import { ProjectCartProvider } from '@/components/projects/project-cart-context';
import { ProductDetail } from '@/components/catalog/product-detail';
import { ProjectCartPanel } from '@/components/projects/project-cart-panel';
import { getProductRecord } from '@/lib/server-api';

interface CatalogProductPageProps {
  params: Promise<{ productId: string }>;
}

export default async function CatalogProductPage({ params }: CatalogProductPageProps) {
  const { productId } = await params;
  const supplierPartId = decodeURIComponent(productId);

  const product = await getProductRecord(supplierPartId).catch((error) => {
    console.error('Failed to load product', error);
    return null;
  });

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
          <ProjectCartPanel />
        </section>
      </div>
    </ProjectCartProvider>
  );
}
