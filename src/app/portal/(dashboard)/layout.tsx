import { ReactNode } from "react";
import Link from "next/link";

import { auth0 } from "@/lib/auth0";
import { getPortalConfig, isPortalConfigured } from "@/lib/config";
import { PortalNav } from "@/components/portal/portal-nav";
import { PortalRailNav } from "@/components/portal/portal-rail-nav";
import { PortalUserMenu } from "@/components/portal/portal-user-menu";
import { Badge } from "@/components/ui/badge";
import { ProjectCartProvider } from "@/components/projects/project-cart-context";
import {
  GaugeCircle,
  ClipboardList,
  CreditCard,
  KeyRound,
  Sparkles,
  UserRound,
  UserCheck,
  BellRing,
  ShoppingCart,
  Search,
  Cpu,
  Binary,
  MoonStar,
  Boxes,
  PackageSearch,
} from "lucide-react";
import { CommandPalette } from "@/components/portal/command-palette";

const NAV_ITEMS = [
  { href: "/portal", label: "Overview", icon: <GaugeCircle className="h-5 w-5" /> },
  { href: "/portal/projects", label: "Projects", icon: <ShoppingCart className="h-5 w-5" /> },
  { href: "/portal/inventory", label: "Inventory", icon: <Boxes className="h-5 w-5" /> },
  { href: "/portal/orders", label: "Orders", icon: <ClipboardList className="h-5 w-5" /> },
  { href: "/portal/billing", label: "Billing", icon: <CreditCard className="h-5 w-5" /> },
  { href: "/portal/api-keys", label: "API Keys", icon: <KeyRound className="h-5 w-5" /> },
  { href: "/portal/access-requests", label: "Access Requests", icon: <UserCheck className="h-5 w-5" /> },
  { href: "/portal/whats-new", label: "What’s New", icon: <Sparkles className="h-5 w-5" /> },
];

const COMMAND_ITEMS = [
  ...NAV_ITEMS,
  { href: "/portal/catalog", label: "Browse products", icon: <PackageSearch className="h-5 w-5" /> },
];

const ADMIN_NAV_ITEM = {
  href: "/portal/access-requests",
  label: "Approvals",
  icon: <UserRound className="h-5 w-5" />,
};

const WALL_E_WORDMARK = (
  <div className="flex flex-col gap-1">
    <span className="text-base font-semibold tracking-[0.6em] text-white">WALL-E</span>
    <span className="text-xs font-medium text-cyan-200/80">Promos Ink Commerce Intelligence</span>
  </div>
);

export default async function PortalDashboardLayout({ children }: { children: ReactNode }) {
  const config = getPortalConfig();
  const configured = isPortalConfigured();
  const session = await auth0.getSession();
  const user = session?.user;
  const displayName = user?.name || user?.email || "Authenticated user";
  const isInternal = user?.email?.endsWith("@promosink.com");
  const navItems = isInternal ? [...NAV_ITEMS, ADMIN_NAV_ITEM] : NAV_ITEMS;

  return (
    <ProjectCartProvider>
      <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(140%_120%_at_100%_0%,rgba(6,182,212,0.25),rgba(10,37,64,0.05)_45%,transparent_75%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(140%_120%_at_0%_0%,rgba(168,85,247,0.24),rgba(15,23,42,0)_60%)]" />

        <CommandPalette navItems={COMMAND_ITEMS} />

        <div className="relative flex min-h-screen">
          {/* Side Rail */}
          <aside className="hidden w-72 flex-col border-r border-white/10 bg-slate-950/70 p-6 backdrop-blur-2xl lg:flex">
            <div className="flex items-center justify-between pb-8">
              {WALL_E_WORDMARK}
              <span className="rounded-full border border-cyan-400/40 bg-cyan-400/10 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-cyan-200">2025</span>
            </div>

            <PortalRailNav
              items={navItems.map((item) => ({
                ...item,
                description:
                  item.href === "/portal"
                    ? "Snapshot & insights"
                    : item.href === "/portal/projects"
                      ? "Manage staged blanks"
                      : item.href === "/portal/inventory"
                        ? "Supplier availability"
                        : item.href === "/portal/orders"
                          ? "Track production"
                          : item.href === "/portal/billing"
                            ? "Ledger & wallet"
                            : item.href === "/portal/api-keys"
                              ? "Developer toolkit"
                              : item.href === "/portal/access-requests"
                                ? "Manage seats"
                                : item.href === "/portal/whats-new"
                                  ? "Latest drops"
                                  : undefined,
              }))}
            />

            <div className="mt-auto flex flex-col gap-4 pt-10">
              <div className="relative overflow-hidden rounded-3xl border border-white/5 bg-white/5 p-4 text-xs text-slate-200/80 shadow-[0_20px_40px_-28px_rgba(14,165,233,0.45)]">
                <div className="matrix-grid" aria-hidden />
                <p className="font-semibold text-white">Need a co-pilot?</p>
                <p className="mt-2 text-slate-300/80">
                  Chat with a merch strategist to curate launches, personalize packs, or plan seasonal drops.
                </p>
                <a
                  href="mailto:support@promosink.com"
                  className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-white/20"
                >
                  <Sparkles className="h-3.5 w-3.5" /> Connect us
                </a>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-300/70">
                  <Cpu className="h-4 w-4" /> API latency
                </p>
                <p className="mt-2 text-sm text-white">42 ms p95 · all systems nominal</p>
                <p className="text-[0.65rem] uppercase tracking-[0.35em] text-slate-400/70">last 5 minutes</p>
              </div>
              <p className="text-[0.7rem] text-slate-400/80">
                Logged in as
                <span className="ml-1 font-medium text-white">{displayName}</span>
              </p>
            </div>
          </aside>

          {/* Main content */}
          <div className="flex min-h-screen flex-1 flex-col">
            <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/70 backdrop-blur-xl">
              <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-1 items-center gap-3">
                  <span className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-white lg:hidden">
                    WALL-E
                  </span>
                  <div className="relative hidden w-full max-w-md items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-100 shadow-inner ring-offset-slate-900 transition focus-within:border-cyan-400/50 focus-within:ring-2 focus-within:ring-cyan-500/40 focus-within:ring-offset-2 md:flex">
                    <Search className="h-4 w-4 text-cyan-200/70" />
                    <input
                      type="search"
                      placeholder="Search SKUs, quotes, or shipments"
                      className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-300/60"
                    />
                    <kbd className="hidden rounded-full border border-white/15 px-2 py-1 text-[0.65rem] text-slate-300/60 md:block">⌘K</kbd>
                  </div>
                </div>
                <div className="flex items-center gap-2 md:gap-3">
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/75 transition hover:border-cyan-300/40 hover:text-white"
                    aria-label="Toggle theme"
                  >
                    <MoonStar className="h-4 w-4" /> Dark
                  </button>
                  <Link
                    href="/portal/quotes/new"
                    className="hidden items-center gap-2 rounded-full border border-cyan-400/40 bg-cyan-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100 transition hover:border-cyan-300 hover:bg-cyan-400/20 md:inline-flex"
                  >
                    <ShoppingCart className="h-4 w-4" /> Start quote
                  </Link>
                  <button className="relative inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-cyan-100 transition hover:border-cyan-400/40 hover:bg-cyan-400/10">
                    <BellRing className="h-4 w-4" />
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[0.55rem] font-semibold text-white">
                      3
                    </span>
                  </button>
                  <PortalUserMenu name={displayName} email={user?.email} />
                </div>
              </div>
              <div className="border-t border-white/10 px-4 pb-3 lg:hidden">
                <PortalNav items={navItems} />
              </div>
            </header>

            <main className="relative mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-4 pb-16 pt-10">
              <div className="grid gap-6 rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-[0_30px_80px_-60px_rgba(14,116,144,0.7)] backdrop-blur">
                <div className="grid gap-6 lg:grid-cols-12">
                  <div className="space-y-4 lg:col-span-7">
                    <Badge className="border-cyan-400/40 bg-cyan-400/15 text-cyan-100">Welcome back</Badge>
                    <h1 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">
                      WALL-E powers your merch universe.
                    </h1>
                    <p className="max-w-2xl text-sm text-slate-200/70">
                      {config.customerName ? `${config.customerName} can now reorder core programs, approve production, and track fulfillment from a single, commerce-grade workspace.` : "Unlock fast reorders, real-time production status, and curated drops—all in one ecommerce-grade workspace."}
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <Link
                        href="/portal/projects"
                        className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-lg transition hover:bg-slate-100"
                      >
                        Start project
                      </Link>
                      <Link
                        href="/portal/catalog"
                        className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:border-cyan-400/40 hover:bg-cyan-400/10"
                      >
                        <PackageSearch className="h-4 w-4" /> Browse products
                      </Link>
                    </div>
                  </div>
                  <div className="grid gap-3 rounded-3xl border border-white/15 bg-slate-950/40 p-4 lg:col-span-5">
                    <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-300/70">
                      <Binary className="h-4 w-4" /> Developer console
                    </h2>
                    <pre className="code-block text-xs text-cyan-100/90">
{`curl -X POST https://dashboard.promosinkwall-e.com/api/v1/quote \
  -H 'x-api-key: ${process.env.PORTAL_API_KEY ? "••••" : "<pk_live_...>"}' \
  -d '{"sku":"ST700","quantity":144,"decoration":"dtf"}'`}
                    </pre>
                    <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                      <MetricTile label="Open carts" value="7" caption="Awaiting checkout" />
                      <MetricTile label="Live quotes" value="$124K" caption="Across 5 campaigns" />
                      <MetricTile label="Shipments" value="3" caption="In transit today" />
                    </div>
                  </div>
                </div>
                {!configured ? (
                  <div className="rounded-2xl border border-amber-300/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
                    <p className="font-semibold">Connect data sources</p>
                    <p className="mt-1 text-amber-100/80">
                      Add <code className="font-mono text-xs">NEXT_PUBLIC_API_BASE_URL</code>, <code className="font-mono text-xs">PORTAL_API_KEY</code>, <code className="font-mono text-xs">PORTAL_API_SECRET</code>, and <code className="font-mono text-xs">PORTAL_CUSTOMER_ID</code> to unlock live reporting and commerce automation.
                    </p>
                  </div>
                ) : null}
              </div>

              <div className="space-y-10 pb-10">
                {children}
              </div>
            </main>

            <footer className="border-t border-white/5 bg-slate-950/70 py-6 text-sm text-slate-400/80">
              <div className="mx-auto flex w-full max-w-7xl flex-col justify-between gap-3 px-4 md:flex-row md:items-center">
                <p>© {new Date().getFullYear()} Promos Ink · WALL-E Commerce Cloud.</p>
                <div className="flex flex-wrap gap-4 text-xs uppercase tracking-[0.2em]">
                  <Link href="https://dashboard-fsne5x1p1-promos-ink.vercel.app/api-documentation" className="transition hover:text-cyan-200">
                    API docs
                  </Link>
                  <Link href="mailto:support@promosink.com" className="transition hover:text-cyan-200">
                    Support concierge
                  </Link>
                  <Link href="/portal/whats-new" className="transition hover:text-cyan-200">
                    Release notes
                  </Link>
                </div>
              </div>
            </footer>
          </div>
        </div>
      </div>
    </ProjectCartProvider>
  );
}

function MetricTile({ label, value, caption }: { label: string; value: string; caption: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 shadow-inner">
      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-slate-300/70">{label}</p>
      <p className="mt-1 text-xl font-semibold text-white">{value}</p>
      <p className="text-xs text-slate-300/70">{caption}</p>
    </div>
  );
}


