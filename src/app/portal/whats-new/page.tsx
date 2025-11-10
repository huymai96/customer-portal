import { PageHeader } from "@/components/portal/page-header";

const entries = [
  {
    date: "2025-11-07",
    title: "Customer portal UI refresh",
    bullets: [
      "Gradient hero, navigation icons, and rebuilt overview cards for clearer hierarchy.",
      "Insights panel highlights quotes awaiting follow-up, conversions, and outstanding balance.",
      "Added command palette (⌘K / Ctrl+K) for quick navigation and search.",
    ],
  },
  {
    date: "2025-11-05",
    title: "Quote persistence groundwork",
    bullets: [
      "Quotes now store routing + pricing results in Neon for portal history.",
      "Convert-to-order button bridges directly into the production API.",
    ],
  },
];

export default function WhatsNewPage() {
  return (
    <section className="space-y-8">
      <PageHeader
        title="What’s new"
        description="Changelog of improvements shipped to the Promos Ink customer workspace."
      />
      <div className="space-y-6">
        {entries.map((entry) => (
          <article key={entry.date} className="card p-6">
            <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
              <h2 className="text-lg font-semibold text-slate-900">{entry.title}</h2>
              <time className="text-sm uppercase tracking-[0.2em] text-slate-400">{entry.date}</time>
            </div>
            <ul className="mt-4 space-y-2 text-sm text-slate-600">
              {entry.bullets.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-1 h-1.5 w-1.5 flex-none rounded-full bg-blue-500" />
                  <p>{item}</p>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
