"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface CatalogSearchCardProps {
  initialQuery?: string;
}

interface Suggestion {
  sku: string;
  supplier: string;
  productName: string;
  color?: string;
  size?: string;
}

const MIN_CHARS_FOR_SUGGESTIONS = 2;
const DEBOUNCE_MS = 200;

export function CatalogSearchCard({ initialQuery = "" }: CatalogSearchCardProps) {
  const [query, setQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    if (query.trim().length < MIN_CHARS_FOR_SUGGESTIONS) {
      setSuggestions([]);
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      try {
        setLoading(true);
        const response = await fetch(`/portal/api/catalog/search?q=${encodeURIComponent(query.trim())}`, {
          signal: controller.signal,
          headers: { accept: "application/json" },
        });

        if (!response.ok) {
          setSuggestions([]);
          return;
        }

        const data = (await response.json()) as { suggestions?: Suggestion[] };
        setSuggestions(data.suggestions ?? []);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setSuggestions([]);
        }
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [query]);

  const hasSuggestions = suggestions.length > 0;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    router.push(`/portal/catalog?q=${encodeURIComponent(trimmed)}`);
  };

  const suggestionList = useMemo(() => {
    if (!hasSuggestions) return null;

    return (
      <div className="stack-xs rounded-xl border border-white/12 bg-white/5 p-3 text-sm text-slate-200/85">
        <span className="overline">Suggestions</span>
        <ul className="stack-xs">
          {suggestions.map((suggestion) => (
            <li key={suggestion.sku}>
              <Link
                href={`/portal/catalog/${suggestion.sku}`}
                className="flex flex-col gap-1 rounded-lg border border-white/10 bg-white/4 px-3 py-2 transition hover:border-cyan-400/50 hover:text-white"
              >
                <span className="font-semibold text-white/95">{suggestion.productName}</span>
                <span className="flex flex-wrap gap-2 text-xs text-slate-300/70">
                  <span className="font-mono text-cyan-200/80">{suggestion.sku}</span>
                  <span>• {suggestion.supplier}</span>
                  {suggestion.color ? <span>• {suggestion.color}</span> : null}
                  {suggestion.size ? <span>• Size {suggestion.size}</span> : null}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );
  }, [hasSuggestions, suggestions]);

  return (
    <form className="auto-grid" onSubmit={handleSubmit} role="search" aria-label="Catalog search">
      <div className="stack-xs">
        <label className="overline" htmlFor="catalog-query">
          Keyword or SKU
        </label>
        <input
          id="catalog-query"
          name="q"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="e.g. PC54 or Port & Company"
          autoComplete="off"
          className="w-full rounded-lg border border-white/12 bg-white/6 px-4 py-2 text-sm text-white transition focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
        />
        {loading ? <p className="text-xs text-slate-300/70">Searching suppliers…</p> : null}
        {suggestionList}
      </div>
      <div className="stack-xs">
        <span className="overline">Actions</span>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          <button type="submit" className="glass-button w-full sm:w-auto">
            Search catalog
          </button>
          {query && (
            <Link
              href="/portal/catalog"
              className="glass-button w-full sm:w-auto"
              onClick={() => setQuery("")}
            >
              Clear
            </Link>
          )}
        </div>
      </div>
    </form>
  );
}
