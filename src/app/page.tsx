import Link from "next/link";

const FEATURES = [
  {
    title: "Live supplier inventory",
    description: "SanMar and S&S catalog data refreshed in minutes with supplier-aware routing.",
  },
  {
    title: "Instant quote workflows",
    description: "Generate decorated pricing, share approvals, and convert to production orders with one click.",
  },
  {
    title: "Billing + analytics",
    description: "Give customers transparency on invoices, payments, and API usage in a single workspace.",
  },
];

export default function LandingPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_70%_at_10%_-10%,rgba(59,130,246,0.55),rgba(15,23,42,0.1)_70%,transparent_90%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-white/5 via-white/0 to-transparent" />

      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-16 px-6 pb-24 pt-24 lg:flex-row lg:items-center lg:gap-20 lg:pt-28">
        <div className="flex-1 space-y-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-slate-200">
            Promos Ink Fulfillment OS
          </span>
          <h1 className="text-4xl font-semibold leading-tight text-white md:text-5xl">
            A customer portal your sales reps are proud to send.
          </h1>
          <p className="max-w-2xl text-lg text-slate-200/90">
            Live supplier inventory, instant quote flows, and transparent billing—packaged into one branded experience that rides on top of the Promos Ink production capacity dashboard.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/portal/login"
              className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-900 shadow-lg transition hover:bg-slate-200"
            >
              Enter customer workspace
            </Link>
            <Link
              href="https://dashboard-fsne5x1p1-promos-ink.vercel.app/api-documentation"
              target="_blank"
              className="inline-flex items-center justify-center rounded-full border border-white/30 px-6 py-3 text-sm font-semibold text-slate-100 transition hover:border-white/70 hover:bg-white/10"
            >
              View API docs
            </Link>
          </div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-300/70">
            Need help connecting suppliers or accounting? Roadmap guidance lives inside the portal.
          </p>
        </div>

        <div className="flex-1 space-y-6 rounded-2xl border border-white/10 bg-white/5 p-8 shadow-[0_35px_60px_-30px_rgba(15,23,42,0.55)] backdrop-blur">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-100/80">
            Why customers stick around
          </p>
          <ul className="space-y-5 text-sm text-slate-100/85">
            {FEATURES.map((feature) => (
              <li key={feature.title} className="rounded-xl border border-white/10 bg-white/5 px-4 py-4 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.65)]">
                <p className="text-base font-semibold text-white">{feature.title}</p>
                <p className="mt-1 text-sm text-slate-200/80">{feature.description}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  );
}
