'use client';

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ArrowRight } from "lucide-react";
import type { PortalNavItem } from "./portal-nav";

export interface CommandPaletteProps {
  navItems: PortalNavItem[];
}

export function CommandPalette({ navItems }: CommandPaletteProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const items = useMemo(() => {
    if (!query) return navItems;
    return navItems.filter((item) => item.label.toLowerCase().includes(query.toLowerCase()));
  }, [navItems, query]);

  const handleKeydown = useCallback((event: KeyboardEvent) => {
    const isMac = /(Mac|iPhone|iPod|iPad)/i.test(navigator.platform);
    if ((isMac && event.metaKey && event.key.toLowerCase() === "k") || (!isMac && event.ctrlKey && event.key.toLowerCase() === "k")) {
      event.preventDefault();
      setOpen((prev) => !prev);
    }
    if (open && event.key === "Escape") {
      setOpen(false);
    }
  }, [open]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [handleKeydown]);

  const onSelect = (href: string) => {
    setOpen(false);
    setQuery("");
    router.push(href);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 hidden rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm font-medium text-slate-600 shadow-lg backdrop-blur transition hover:bg-white md:flex md:items-center md:gap-2"
        aria-label="Open command palette"
      >
        <Search className="h-4 w-4" />
        Search (⌘K)
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xl">
            <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search destinations…"
                className="flex-1 border-none text-sm text-slate-700 outline-none"
              />
              <span className="text-xs uppercase tracking-[0.2em] text-slate-400">Esc</span>
            </div>
            <ul className="mt-3 max-h-72 overflow-y-auto text-sm text-slate-600">
              {items.length === 0 ? (
                <li className="rounded-lg px-3 py-2 text-center text-slate-400">No matches. Try another keyword.</li>
              ) : (
                items.map((item) => (
                  <li key={item.href}>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left transition hover:bg-slate-100"
                      onClick={() => onSelect(item.href)}
                    >
                      <span className="flex items-center gap-2">
                        {item.icon ? <span className="h-4 w-4 text-slate-500">{item.icon}</span> : null}
                        {item.label}
                      </span>
                      <ArrowRight className="h-4 w-4 text-slate-400" />
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      ) : null}
    </>
  );
}
