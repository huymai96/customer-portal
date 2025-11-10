import Link from "next/link";

import { dashboardFetch, dashboardFetchText, DashboardRequestError } from "@/lib/api-client";
import { getPortalConfig, isPortalConfigured, PortalConfigError } from "@/lib/config";
import type { OrdersResponse, ProductsResponse, PortalQuotesResponse } from "@/lib/types";
import { parseCsv } from "@/lib/csv";
import { formatCurrency } from "@/lib/utils";
import { PageHeader } from "@/components/portal/page-header";
import { PortalPageShell, SectionCard, StatTile } from "@/components/portal/page-shell";
import { LeadTimeChart } from "@/components/portal/lead-time-chart";
import {
  Activity,
  Boxes,
  TrendingUp,
  PiggyBank,
  Quote,
  Truck,
  ShoppingBag,
  AlertTriangle,
  ArrowUpRight,
  ShieldCheck,
  Zap,
} from "lucide-react";

interface DashboardSummary {
  totalOrders: number;
  recentOrders: OrdersResponse["orders"];
  productCount: number;
  openQuotes: number;
  convertedQuotes: number;
  outstandingBalance: number;
  fulfillment: {
    averageLeadTimeDays: number | null;
    awaitingShipment: number;
    ordersThisWeek: number;
    trend: Array<{ label: string; value: number }>;
  };
}

const FEATURED_COLLECTIONS = [
  {
    name: "Momentum Capsule",
    blurb: "Embroidered fleece + water bottles for onboarding kits",
    cta: "Preview drop",
    href: "/portal/quotes/new",
  },
  {
    name: "Eco Essentials",
    blurb: "Organic tees + recycled totes ready for same-week turn",
    cta: "Build quote",
    href: "/portal/inventory",
  },
];

const CONSOLE_SNIPPET = `import { PricingClient } from "@promos-ink/sdk";

const client = new PricingClient({
  baseUrl: "https://dashboard.promosinkwall-e.com",
  apiKey: process.env.PORTAL_API_KEY,
});

const quote = await client.quotes.create({
  sku: "ST700",
  quantity: 144,
  decoration: "dtf",
});

console.log(quote.total);
`;

const USAGE_GAUGES = [
  { label: "API quota", percent: 72, tooltip: "1.4k / 2k calls" },
  { label: "Art approvals", percent: 54, tooltip: "13 in review" },
  { label: "Fulfillment capacity", percent: 81, tooltip: "DTF tunnel at 81%" },
];

const COPILOT_MESSAGES = [
  {
    role: "assistant",
    message: "Hi! I’m WALL-E Copilot. Want me to prep a reorder kit or analyze quote win-rates?",
  },
  {
    role: "user",
    message: "Show SKUs that dipped below 25 units in the last 7 days",
  },
  {
    role: "assistant",
    message: "Six SKUs match. Linking to replenishment workflow and notifying Carla.",
  },
];

const KNOWLEDGE_FEED = [
  { heading: "Playbook · Seasonal drops", summary: "Pair retro fleece with metallic transfers for premium bundles." },
  { heading: "Workflow · API migration", summary: "v2 SDK now ships with retry + idempotency helpers." },
  { heading: "Spotlight · Sustainability", summary: "Eco Essentials drop produced 32% higher reorder rate." },
];

function getDefaultMonth() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

async function getSummary(): Promise<{ data: DashboardSummary | null; error?: string }> {
  if (!isPortalConfigured()) {
    return { data: null };
  }

  const config = getPortalConfig();
  const month = getDefaultMonth();

  try {
    const [ordersResponse, productsResponse, quotesResponse, invoicesCsv] = await Promise.all([
      dashboardFetch<OrdersResponse>("/api/v1/orders", { searchParams: { limit: 5 } }),
      dashboardFetch<ProductsResponse>("/api/v1/products", { searchParams: { limit: 1 } }),
      dashboardFetch<PortalQuotesResponse>("/api/portal/quotes", { searchParams: { limit: 100 } }),
      config.customerId
        ? dashboardFetchText("/api/admin/invoices/export", {
            searchParams: { customer_id: config.customerId, month },
          })
        : Promise.resolve(""),
    ]);

    const totalOrders = ordersResponse?.pagination?.total ?? ordersResponse?.orders?.length ?? 0;
    const productCount = productsResponse?.pagination?.total ?? productsResponse?.products?.length ?? 0;
    const quotes = quotesResponse?.quotes ?? [];
    const openQuotes = quotes.filter((quote) => quote.status !== "converted").length;
    const convertedQuotes = quotes.filter((quote) => quote.status === "converted").length;

    let outstandingBalance = 0;
    const trimmed = invoicesCsv?.trim?.() ?? "";
    if (trimmed) {
      if (trimmed.startsWith("{")) {
        try {
          const json = JSON.parse(trimmed) as { csv?: string };
          if (json.csv) {
            const rows = parseCsv(json.csv).rows;
            outstandingBalance = rows.reduce((sum, row) => sum + Number(row.amount_due || 0), 0);
          }
        } catch {
          outstandingBalance = 0;
        }
      } else {
        const rows = parseCsv(trimmed).rows;
        outstandingBalance = rows.reduce((sum, row) => sum + Number(row.amount_due || 0), 0);
      }
    }

    const fulfillmentMetrics = computeFulfillmentMetrics(ordersResponse?.orders ?? []);

    return {
      data: {
        totalOrders,
        recentOrders: ordersResponse?.orders ?? [],
        productCount,
        openQuotes,
        convertedQuotes,
        outstandingBalance,
        fulfillment: fulfillmentMetrics,
      },
    };
  } catch (error) {
    if (error instanceof PortalConfigError) {
      return { data: null, error: error.message };
    }
    if (error instanceof DashboardRequestError) {
      return { data: null, error: error.message };
    }
    return { data: null, error: (error as Error).message };
  }
}

export default async function PortalOverviewPage() {
  const summary = await getSummary();
  const configured = isPortalConfigured();

  const heroStats = [
    {
      label: "Active orders",
      value: formatNumber(summary.data?.totalOrders),
      helper: "Currently in production",
      icon: Activity,
    },
    {
      label: "Catalog SKUs",
      value: formatNumber(summary.data?.productCount),
      helper: "Ready to personalise",
      icon: Boxes,
    },
    {
      label: "Portal status",
      value: configured ? "Connected" : "Needs setup",
      helper: configured ? "API credentials detected" : "Add API base URL + keys",
      icon: ShieldCheck,
    },
  ];

  const pipelineStats = summary.data
    ? [
        {
          label: "Quotes awaiting follow-up",
          value: formatNumber(summary.data.openQuotes),
          helper: "Nurture high-intent buyers",
          icon: Quote,
        },
        {
          label: "Converted quotes",
          value: formatNumber(summary.data.convertedQuotes),
          helper: "Closed won this month",
          icon: TrendingUp,
        },
        {
          label: "Outstanding balance",
          value: formatCurrency(summary.data.outstandingBalance),
          helper: "Invoices due on receipt",
          icon: PiggyBank,
        },
      ]
    : [];

  const recentOrders = summary.data?.recentOrders ?? [];

  return (
    <PortalPageShell
      header={
        <PageHeader
          overline="WALL-E overview"
          title="Commerce-grade command center"
          description="Replay live orders, quotes, and billing signals in a single view. Reorder core programs, spotlight new merch capsules, and keep fulfillment velocity on track."
          helper={configured ? undefined : "Demo data shown – connect API credentials to unlock live automation."}
          actions={
            <div className="cluster">
              <Link href="/portal/quotes/new" className="glass-button">
                <ShoppingBag className="h-4 w-4" /> Launch a program
              </Link>
              <Link href="/portal/orders" className="glass-button">
                <Truck className="h-4 w-4" /> Monitor fulfillment
              </Link>
            </div>
          }
        />
      }
    >
      {summary.error && (
        <SectionCard
          overline="Status"
          title="Live data is temporarily unavailable"
          description="Update NEXT_PUBLIC_API_BASE_URL with the active dashboard deployment, then redeploy the portal."
          headerSlot={<AlertTriangle className="h-5 w-5 text-amber-200" />}
        >
          <div className="stack-sm text-sm text-amber-100/85">
            <p>{summariseError(summary.error)}</p>
          </div>
        </SectionCard>
      )}

      <SectionCard
        overline="Snapshot"
        title="Operational pulse"
        description="Live totals across production, catalog, and portal automation."
      >
        <div className="auto-grid">
          {heroStats.map(({ label, value, helper, icon: Icon }) => (
            <StatTile key={label} label={label} value={value} helper={helper} icon={<Icon className="h-5 w-5 text-cyan-200" />} />
          ))}
        </div>
      </SectionCard>

      {summary.data && pipelineStats.length > 0 && (
        <SectionCard
          overline="Pipeline"
          title="Quote & billing watchlist"
          description="Keep revenue workstreams moving—triage follow-ups, celebrate wins, and monitor invoice exposure."
          actions={
            <Link href="/portal/quotes" className="glass-button">
              Manage quotes
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          }
        >
          <div className="auto-grid">
            {pipelineStats.map(({ label, value, helper, icon: Icon }) => (
              <StatTile key={label} label={label} value={value} helper={helper} icon={<Icon className="h-5 w-5 text-cyan-200" />} />
            ))}
          </div>
        </SectionCard>
      )}

      {summary.data && (
        <SectionCard
          overline="Fulfillment"
          title="Velocity snapshot"
          description="Measure how quickly orders are projected to leave the dock."
          actions={
            <Link href="/portal/orders" className="glass-button">
              View orders
            </Link>
          }
        >
          <div className="auto-grid">
            <StatTile
              label="Avg lead time"
              value={formatLeadTime(summary.data.fulfillment.averageLeadTimeDays)}
              helper="Created → estimated ship"
              icon={<Truck className="h-5 w-5 text-cyan-200" />}
            />
            <StatTile
              label="Awaiting shipment"
              value={formatNumber(summary.data.fulfillment.awaitingShipment)}
              helper="Orders not yet marked shipped"
            />
            <StatTile
              label="Orders this week"
              value={formatNumber(summary.data.fulfillment.ordersThisWeek)}
              helper="Created in the last 7 days"
            />
          </div>
          <div className="stack-sm">
            <span className="overline">Lead time trend (last 7 days)</span>
            {summary.data.fulfillment.trend.length > 0 ? (
              <LeadTimeChart data={summary.data.fulfillment.trend} />
            ) : (
              <p className="text-xs text-slate-400">Insufficient order history to chart lead time.</p>
            )}
          </div>
        </SectionCard>
      )}

      <SectionCard
        overline="Automation"
        title="Telemetry & Copilot"
        description="Monitor traffic, explore the SDK, and lean on WALL-E assistant for contextual insights."
      >
        <div className="auto-grid">
          <div className="stack-sm">
            <span className="overline">Interactive console</span>
            <pre className="code-block text-xs text-cyan-100/90">{CONSOLE_SNIPPET}</pre>
          </div>
          <div className="stack-sm">
            <span className="overline">Usage telemetry</span>
            <div className="stack-sm">
              {USAGE_GAUGES.map((gauge) => (
                <UsageMeter key={gauge.label} {...gauge} />
              ))}
            </div>
          </div>
          <div className="stack-sm">
            <div className="cluster" style={{ justifyContent: "space-between" }}>
              <span className="overline">Copilot assistant</span>
              <button className="glass-button">
                <Zap className="h-3.5 w-3.5" /> Generate insight
              </button>
            </div>
            <div className="stack-sm text-sm text-slate-200/80">
              {COPILOT_MESSAGES.map((entry, index) => (
                <div key={index} className="rounded-xl border border-white/12 bg-white/8 px-4 py-3">
                  <span className="overline">{entry.role === "assistant" ? "assistant" : "you"}</span>
                  <p className="mt-1 text-sm text-white/85">{entry.message}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        overline="Programs"
        title="Merch spotlight & playbooks"
        description="Activate capsules, share enablement notes, and tap the concierge team for white-glove support."
      >
        <div className="auto-grid">
          <div className="stack-md">
            <span className="overline">Merch spotlight</span>
            <ul className="stack-sm">
              {FEATURED_COLLECTIONS.map((collection) => (
                <li key={collection.name} className="stack-xs rounded-xl border border-white/12 bg-white/6 p-4">
                  <div className="cluster" style={{ justifyContent: "space-between" }}>
                    <p className="text-sm font-semibold text-white">{collection.name}</p>
                    <Link href={collection.href} className="glass-button">
                      {collection.cta}
                      <ArrowUpRight className="h-3 w-3" />
                    </Link>
                  </div>
                  <p className="muted text-sm">{collection.blurb}</p>
                </li>
              ))}
            </ul>
          </div>
          <div className="stack-md">
            <span className="overline">Knowledge feed</span>
            <ul className="stack-sm">
              {KNOWLEDGE_FEED.map((item) => (
                <li key={item.heading} className="stack-xs rounded-xl border border-white/12 bg-white/6 p-4">
                  <p className="overline" style={{ letterSpacing: "0.2em" }}>
                    {item.heading}
                  </p>
                  <p className="muted text-sm">{item.summary}</p>
                </li>
              ))}
            </ul>
            <div className="stack-xs rounded-xl border border-white/12 bg-white/6 p-4 text-sm text-slate-200/80">
              <span className="overline">Concierge assist</span>
              <p>
                Need creative direction, kitting support, or a logistics partner? Email {" "}
                <a href="mailto:support@promosink.com" className="text-cyan-300 hover:text-cyan-200">
                  support@promosink.com
                </a>{" "}
                for white-glove help.
              </p>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        overline="Fulfillment"
        title="Recent orders"
        description="Live feed from Promos Ink fulfillment (GET /api/v1/orders)."
        actions={
          <Link href="/portal/orders" className="glass-button">
            View all orders
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        }
      >
        <div className="overflow-x-auto">
          <table className="table-grid text-sm">
            <thead>
              <tr>
                <th>Order #</th>
                <th>Status</th>
                <th>Method</th>
                <th>Ship date</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((order) => (
                <tr key={order.order_id}>
                  <td data-label="Order #" className="font-mono text-xs text-cyan-200/90">
                    {order.order_number}
                  </td>
                  <td data-label="Status" className="capitalize">
                    {order.status || "-"}
                  </td>
                  <td data-label="Method" className="uppercase text-xs tracking-[0.2em] text-slate-300/70">
                    {order.production_method || "-"}
                  </td>
                  <td data-label="Ship date">
                    {order.estimated_ship_date ? new Date(order.estimated_ship_date).toLocaleDateString() : "-"}
                  </td>
                  <td data-label="Created">
                    {new Date(order.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {recentOrders.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-sm text-slate-300/60">
                    No orders available yet. Push new orders via the API to populate this feed.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </PortalPageShell>
  );
}

function formatNumber(value?: number | null) {
  if (value == null) return "0";
  return value.toLocaleString();
}

function summariseError(message?: string) {
  if (!message) return "Unknown error.";
  if (message.includes("deployment could not be found")) {
    return "The dashboard deployment URL returned 404. Update it to the live dashboard deployment";
  }
  return message;
}

interface UsageMeterProps {
  label: string;
  percent: number;
  tooltip: string;
}

function UsageMeter({ label, percent, tooltip }: UsageMeterProps) {
  return (
    <div className="stack-xs">
      <div className="cluster" style={{ justifyContent: "space-between" }}>
        <span className="overline" style={{ letterSpacing: "0.24em" }}>
          {label}
        </span>
        <span className="muted text-xs">{tooltip}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-white/12">
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan-400/80 to-violet-500/70"
          style={{ width: `${Math.min(Math.max(percent, 0), 100)}%` }}
        />
      </div>
    </div>
  );
}

function computeFulfillmentMetrics(orders: OrdersResponse["orders"]): DashboardSummary["fulfillment"] {
  if (!orders || orders.length === 0) {
    return {
      averageLeadTimeDays: null,
      awaitingShipment: 0,
      ordersThisWeek: 0,
      trend: [],
    };
  }

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const trendBucket: Record<string, { total: number; count: number }> = {};

  let awaitingShipment = 0;
  let ordersThisWeek = 0;
  const leadTimes: number[] = [];

  for (const order of orders) {
    if (!order) continue;

    if (order.created_at) {
      const createdAt = new Date(order.created_at);
      if (!Number.isNaN(createdAt.getTime()) && createdAt >= sevenDaysAgo) {
        ordersThisWeek += 1;
      }

      if (order.estimated_ship_date) {
        const estimatedShip = new Date(order.estimated_ship_date);
        if (!Number.isNaN(estimatedShip.getTime())) {
          const diffMs = estimatedShip.getTime() - createdAt.getTime();
          if (diffMs > 0) {
            leadTimes.push(diffMs / (1000 * 60 * 60 * 24));
            const bucketKey = createdAt.toLocaleDateString();
            if (!trendBucket[bucketKey]) {
              trendBucket[bucketKey] = { total: 0, count: 0 };
            }
            trendBucket[bucketKey].total += diffMs / (1000 * 60 * 60 * 24);
            trendBucket[bucketKey].count += 1;
          }
        }
      }
    }

    const status = order.status?.toLowerCase?.() ?? "";
    if (status && !["shipped", "delivered", "completed", "fulfilled"].includes(status)) {
      awaitingShipment += 1;
    }
  }

  const averageLeadTimeDays = leadTimes.length > 0
    ? leadTimes.reduce((sum, value) => sum + value, 0) / leadTimes.length
    : null;

  return {
    averageLeadTimeDays,
    awaitingShipment,
    ordersThisWeek,
    trend: Object.entries(trendBucket)
      .map(([label, { total, count }]) => ({ label, value: total / count }))
      .sort((a, b) => new Date(a.label).getTime() - new Date(b.label).getTime()),
  };
}

function formatLeadTime(value: number | null): string {
  if (value == null || Number.isNaN(value)) {
    return "—";
  }

  if (value < 1) {
    return `${Math.round(value * 24)} hrs`;
  }

  return `${value.toFixed(1)} days`;
}


