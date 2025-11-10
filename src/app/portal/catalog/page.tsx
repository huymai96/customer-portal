import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/portal/page-header";
import { PortalPageShell, SectionCard } from "@/components/portal/page-shell";
import { dashboardFetch } from "@/lib/api-client";
import { DashboardRequestError } from "@/lib/api-client";
import { PortalConfigError, isPortalConfigured } from "@/lib/config";
import type { ProductsResponse } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { CatalogSearchCard } from "@/components/catalog/catalog-search-card";
import { ProjectCartProvider } from "@/components/projects/project-cart-context";

interface CatalogPageProps {
  searchParams?: Promise<{
    q?: string;
  }>;
}

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const configured = isPortalConfigured();
  const resolvedParams = searchParams ? await searchParams : undefined;
  const query = resolvedParams?.q?.trim() ?? "";

  let products: ProductsResponse["products"] = [];
  let error: string | null = null;
  let smartSearchFallback = false;

  if (configured && query) {
    const normalizedSku = query.replace(/\s+/g, "").toUpperCase();
    const looksLikeSku = /^[A-Z0-9-]{3,}$/i.test(normalizedSku);

    if (looksLikeSku) {
      try {
        const exactResponse = await dashboardFetch<ProductsResponse>("/api/v1/products", {
          searchParams: {
            sku: normalizedSku,
            limit: "1",
          },
        });

        const exactMatch = exactResponse.products?.[0];
        if (exactMatch) {
          redirect(`/portal/catalog/${encodeURIComponent(exactMatch.sku)}`);
        }

        smartSearchFallback = true;
      } catch (exactError) {
        smartSearchFallback = true;
        if (exactError instanceof PortalConfigError || exactError instanceof DashboardRequestError) {
          error = exactError.message;
        }
      }
    }

    if (!error) {
      try {
        const response = await dashboardFetch<ProductsResponse>("/api/v1/products", {
          searchParams: {
            search: query,
            limit: "25",
          },
        });

        products = response.products ?? [];
      } catch (err) {
        if (err instanceof PortalConfigError || err instanceof DashboardRequestError) {
          error = err.message;
        } else {
          error = (err as Error).message;
        }
      }
    }
  }

  return (
    <ProjectCartProvider>
      <PortalPageShell
        header={
          <PageHeader
            overline="Catalog"
            title="Discover decorated SKUs"
            description="Search the supplier catalog, inspect live inventory, and add items to your project."
          />
        }
      >
        <SectionCard overline="Search" title="Find products">
          <CatalogSearchCard initialQuery={query} />
        </SectionCard>

        {!configured && (
          <SectionCard
            overline="Configuration"
            title="Connect supplier data"
            description="Add dashboard credentials to unlock live catalog search."
          >
            <p className="muted text-sm">Once connected, your team can browse SanMar and S&S inventory directly from the portal.</p>
          </SectionCard>
        )}

        {error && (
          <SectionCard overline="Error" title="Unable to load catalog" description={error}>
            <p className="muted text-sm">Check your API credentials or try searching again in a few moments.</p>
          </SectionCard>
        )}

        {configured && query && !error && (
          <SectionCard
            overline="Results"
            title={products.length > 0 ? `Showing ${products.length} matches` : "No results"}
            description={products.length > 0 ? "Select a product to inspect live inventory and variants." : undefined}
          >
            {smartSearchFallback && (
              <div className="rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-xs text-amber-100">
                <strong className="font-semibold">Smart search:</strong> No exact SKU match for <span className="font-mono text-amber-50">{query}</span>. Showing related catalog items instead.
              </div>
            )}
            {products.length === 0 ? (
              <p className="muted text-sm">Try a different keyword or search by supplier SKU.</p>
            ) : (
              <div className="auto-grid">
                {products.map((product) => (
                  <article key={product.sku} className="stack-sm rounded-2xl border border-white/12 bg-white/5 p-4 text-sm text-slate-200/85">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="stack-xs">
                        <span className="overline">{product.supplier}</span>
                        <h3 className="text-base font-semibold text-white">{product.product_name}</h3>
                        <p className="text-xs text-slate-300/70">Style {product.style_number || "—"}</p>
                      </div>
                      {product.image_url ? (
                        <Image
                          src={product.image_url}
                          alt={product.product_name}
                          width={64}
                          height={64}
                          className="h-16 w-16 rounded-xl border border-white/10 object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-xs text-slate-300/70">
                        Color {product.color || "—"} • Size {product.size || "—"}
                      </p>
                      <p className="text-xs text-slate-300/70">Qty available {product.inventory?.available ?? 0}</p>
                    </div>
                    <p className="text-xs text-slate-400/70">Wholesale {formatCurrency(product.wholesale_price)}</p>
                    <Link
                      href={`/portal/catalog/${product.sku}`}
                      className="glass-button w-full sm:w-auto"
                    >
                      View product
                    </Link>
                  </article>
                ))}
              </div>
            )}
          </SectionCard>
        )}
      </PortalPageShell>
    </ProjectCartProvider>
  );
}
