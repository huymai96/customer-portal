import { InventoryTable } from "@/components/inventory/inventory-table";
import { PageHeader } from "@/components/portal/page-header";
import { PortalPageShell, SectionCard } from "@/components/portal/page-shell";
import { dashboardFetch } from "@/lib/api-client";
import { DashboardRequestError } from "@/lib/api-client";
import { PortalConfigError, isPortalConfigured } from "@/lib/config";
import type { ProductsResponse } from "@/lib/types";
import { cn } from "@/lib/utils";

interface InventoryPageProps {
  searchParams?: Promise<{
    search?: string;
    supplier?: string;
    brand?: string;
    limit?: string;
    page?: string;
  }>;
}

export default async function InventoryPage({ searchParams }: InventoryPageProps) {
  const configured = isPortalConfigured();
  const resolvedParams = searchParams ? await searchParams : undefined;
  const limit = Math.min(Number(resolvedParams?.limit || 25), 100);
  const currentPage = Math.max(Number(resolvedParams?.page || 1), 1);
  const offset = (currentPage - 1) * limit;

  let products: ProductsResponse["products"] = [];
  let pagination = {
    total: 0,
    limit,
    offset,
    has_more: false,
  };
  let error: string | null = null;

  if (configured) {
    try {
      const response = await dashboardFetch<ProductsResponse>("/api/v1/products", {
        searchParams: {
          search: resolvedParams?.search,
          supplier: resolvedParams?.supplier,
          brand: resolvedParams?.brand,
          limit: String(limit),
          offset: String(offset),
        },
      });
      products = response.products || [];
      if (response.pagination) {
        pagination = response.pagination;
      }
    } catch (err) {
      if (err instanceof PortalConfigError || err instanceof DashboardRequestError) {
        error = err.message;
      } else {
        error = (err as Error).message;
      }
    }
  }

  const totalPages = pagination.limit
    ? Math.max(1, Math.ceil((pagination.total || 0) / pagination.limit))
    : 1;

  const makePageLink = (page: number) => {
    const params = new URLSearchParams();
    if (resolvedParams?.search) params.set("search", resolvedParams.search);
    if (resolvedParams?.supplier) params.set("supplier", resolvedParams.supplier);
    if (resolvedParams?.brand) params.set("brand", resolvedParams.brand);
    params.set("limit", String(limit));
    params.set("page", String(page));
    return `/portal/inventory?${params.toString()}`;
  };

  return (
    <PortalPageShell
      header={
        <PageHeader
          overline="Inventory"
          title="Live inventory"
          description="Filter supplier feeds and preflight decorated orders before they hit production."
        />
      }
    >
      <SectionCard
        overline="Filters"
        title="Stream supplier availability"
        description="Search across SanMar and S&S in real time."
      >
        <form className="auto-grid" method="get">
          <div className="stack-xs">
            <label className="overline" htmlFor="inventory-search">
              Search
            </label>
            <input
              id="inventory-search"
              name="search"
              defaultValue={resolvedParams?.search || ""}
              placeholder="Search by SKU, name, or brand"
              className="w-full rounded-lg border border-white/12 bg-white/6 px-3 py-2 text-sm text-white transition focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
            />
          </div>
          <div className="stack-xs">
            <label className="overline" htmlFor="inventory-supplier">
              Supplier
            </label>
            <select
              id="inventory-supplier"
              name="supplier"
              defaultValue={resolvedParams?.supplier || ""}
              className="w-full rounded-lg border border-white/12 bg-white/6 px-3 py-2 text-sm text-white transition focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
            >
              <option value="">All suppliers</option>
              <option value="sanmar">SanMar</option>
              <option value="ss_activewear">S&S Activewear</option>
            </select>
          </div>
          <div className="stack-xs">
            <label className="overline" htmlFor="inventory-brand">
              Brand
            </label>
            <input
              id="inventory-brand"
              name="brand"
              defaultValue={resolvedParams?.brand || ""}
              placeholder="Optional brand filter"
              className="w-full rounded-lg border border-white/12 bg-white/6 px-3 py-2 text-sm text-white transition focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
            />
          </div>
          <div className="stack-xs">
            <span className="overline">Actions</span>
            <div className="cluster" style={{ justifyContent: "flex-end" }}>
              <input type="hidden" name="limit" value={limit} />
              <input type="hidden" name="page" value={currentPage} />
              <button type="submit" className="glass-button">
                Apply filters
              </button>
              <a href="/portal/inventory" className="glass-button">
                Reset
              </a>
            </div>
          </div>
        </form>
      </SectionCard>

      {error && (
        <SectionCard overline="Error" title="Inventory lookup failed" description={error}>
          <div className="cluster" style={{ justifyContent: "flex-start" }}>
            <a href={makePageLink(currentPage)} className="glass-button">
              Try again
            </a>
          </div>
        </SectionCard>
      )}

      {!configured && !error && (
        <SectionCard
          overline="Configuration"
          title="Connect supplier credentials"
          description="Add SanMar and S&S integration keys in the dashboard to enable live inventory results."
        >
          <p className="muted text-sm">
            Once credentials are active, this workspace will stream live inventory availability from each supplier warehouse.
          </p>
        </SectionCard>
      )}

      {configured && !error && (
        <SectionCard
          overline="Inventory"
          title="Supplier availability"
          description="Stock levels streamed directly from your configured suppliers."
        >
          {products.length > 0 ? (
            <InventoryTable products={products} />
          ) : (
            <div className="empty-state">
              No results found. Try widening your search criteria or clearing filters.
            </div>
          )}
        </SectionCard>
      )}

      {configured && !error && totalPages > 1 && (
        <SectionCard overline="Pagination" title={`Page ${currentPage} of ${totalPages}`}>
          <div className="cluster" style={{ justifyContent: "space-between" }}>
            {(() => {
              const disabled = currentPage === 1;
              return (
                <a
                  className={cn("glass-button", disabled && "pointer-events-none opacity-50")}
                  href={disabled ? "#" : makePageLink(Math.max(1, currentPage - 1))}
                  aria-disabled={disabled}
                >
                  Previous
                </a>
              );
            })()}
            {(() => {
              const disabled = !pagination.has_more && currentPage >= totalPages;
              return (
                <a
                  className={cn("glass-button", disabled && "pointer-events-none opacity-50")}
                  href={disabled ? "#" : makePageLink(Math.min(totalPages, currentPage + 1))}
                  aria-disabled={disabled}
                >
                  Next
                </a>
              );
            })()}
          </div>
        </SectionCard>
      )}
    </PortalPageShell>
  );
}


