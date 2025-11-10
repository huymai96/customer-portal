'use client';

import { ReactNode, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";

export interface PortalNavItem {
  href: string;
  label: string;
  icon?: ReactNode;
}

interface PortalNavProps {
  items: PortalNavItem[];
}

export function PortalNav({ items }: PortalNavProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <nav className="relative z-10 border-t border-white/10 bg-slate-900/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 text-slate-200/80 sm:px-6">
        <button
          type="button"
          className="flex items-center gap-2 rounded-full border border-white/20 px-3 py-1 text-xs font-medium text-white/90 md:hidden"
          onClick={() => setOpen((prev) => !prev)}
        >
          <Menu className="h-4 w-4" />
          Navigate
        </button>
        <span className="hidden text-xs uppercase tracking-[0.35em] text-white/60 md:block">
          Command palette (⌘K)
        </span>
      </div>
      <div className={`mx-auto w-full max-w-6xl transition-all md:px-6 ${open ? "max-h-60" : "max-h-0 md:max-h-none"}`}>
        <ul className="flex w-full flex-wrap gap-2 overflow-x-auto px-4 pb-3 text-sm text-white/80 md:px-0">
          {items.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <li key={item.href} className="flex-shrink-0">
                <Link
                  href={item.href}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 font-medium transition ${
                    isActive
                      ? "bg-white text-slate-900 shadow-lg"
                      : "hover:bg-white/10 hover:text-white"
                  }`}
                  aria-current={isActive ? "page" : undefined}
                >
                  {item.icon ? <span className="h-4 w-4 text-current">{item.icon}</span> : null}
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}


