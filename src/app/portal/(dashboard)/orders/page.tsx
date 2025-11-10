import { PageHeader } from "@/components/portal/page-header";
import { TableHeader } from "@/components/ui/table-header";
import { buttonVariants } from "@/components/ui/button";
import { dashboardFetch } from "@/lib/api-client";
import { DashboardRequestError } from "@/lib/api-client";
import { PortalConfigError, isPortalConfigured } from "@/lib/config";
import type { OrdersResponse } from "@/lib/types";
import { cn } from "@/lib/utils";

interface OrdersPageProps {
  searchParams?: Promise<{
    page?: string;
    limit?: string;
  }>;
}

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
  const configured = isPortalConfigured();
  const resolvedParams = searchParams ? await searchParams : undefined;
  const limit = Math.min(Number(resolvedParams?.limit || 25), 100);
  const currentPage = Math.max(Number(resolvedParams?.page || 1), 1);
  const offset = (currentPage - 1) * limit;

  let orders: OrdersResponse["orders"] = [];
  let pagination = {
    total: 0,
    limit,
    offset,
    has_more: false,
  };
  let error: string | null = null;

  if (configured) {
    try {
      const response = await dashboardFetch<OrdersResponse>("/api/v1/orders", {
        searchParams: { limit: String(limit), offset: String(offset) },
      });
      orders = response.orders || [];
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
    params.set("page", String(page));
    params.set("limit", String(limit));
    return `/portal/orders?${params.toString()}`;
  };

  return (
    <section className="space-y-8">
      <PageHeader
        title="Orders"
        description="Monitor fulfillment status, production routing, and shipment tracking in real time."
      />

      {error && (
        <div className="card border border-rose-200 bg-rose-50/90 p-4 text-sm text-rose-700">
          <p className="font-semibold text-rose-800">Unable to load order history.</p>
          <p className="mt-1 text-rose-700/90">{error}</p>
          <a className={buttonVariants("secondary") + " mt-3 w-fit"} href={makePageLink(currentPage)}>
            Try again
          </a>
        </div>
      )}

      {!configured && (
        <div className="card border border-amber-200 bg-amber-50/80 p-5 text-sm text-amber-900">
          Configure API credentials to pull your customer’s order history.
        </div>
      )}

      {configured && !error && (
        <div className="card overflow-hidden">
          <TableHeader title="Order log" description="Latest 25 orders synced from the fulfillment API." />
          <div className="overflow-x-auto px-4 pb-4 pt-2">
            <table className="table-grid text-sm">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Status</th>
                  <th>Method</th>
                  <th>Est. ship</th>
                  <th>Created</th>
                  <th>Tracking</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.order_id}>
                    <td className="font-mono text-xs text-slate-500">{order.order_number}</td>
                    <td className="capitalize text-slate-700">{order.status || "-"}</td>
                    <td className="uppercase text-slate-600">{order.production_method || "-"}</td>
                    <td className="text-slate-600">
                      {order.estimated_ship_date
                        ? new Date(order.estimated_ship_date).toLocaleDateString()
                        : "-"}
                    </td>
                    <td className="text-slate-600">{new Date(order.created_at).toLocaleString()}</td>
                    <td className="text-slate-600">
                      {order.tracking_url ? (
                        <a
                          href={order.tracking_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-700"
                        >
                          {order.tracking_number || "Track"}
                        </a>
                      ) : (
                        <span className="text-slate-400">Pending</span>
                      )}
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-slate-500">
                      No orders yet. Submit a test order via the API to see it appear here within seconds.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {configured && !error && totalPages > 1 && (
        <div className="flex items-center justify-between">
          {(() => {
            const disabled = currentPage === 1;
            return (
              <a
                className={cn(buttonVariants("secondary"), disabled && "pointer-events-none opacity-50")}
                href={disabled ? "#" : makePageLink(Math.max(1, currentPage - 1))}
                aria-disabled={disabled}
              >
                Previous
              </a>
            );
          })()}
          <p className="text-sm text-slate-500">
            Page {currentPage} of {totalPages}
          </p>
          {(() => {
            const disabled = !pagination.has_more && currentPage >= totalPages;
            return (
              <a
                className={cn(buttonVariants("secondary"), disabled && "pointer-events-none opacity-50")}
                href={disabled ? "#" : makePageLink(Math.min(totalPages, currentPage + 1))}
                aria-disabled={disabled}
              >
                Next
              </a>
            );
          })()}
        </div>
      )}
    </section>
  );
}


