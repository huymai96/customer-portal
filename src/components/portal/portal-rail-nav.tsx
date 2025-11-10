'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export interface PortalRailNavItem {
  href: string;
  label: string;
  description?: string;
  icon?: ReactNode;
}

interface PortalRailNavProps {
  items: PortalRailNavItem[];
}

export function PortalRailNav({ items }: PortalRailNavProps) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-1 flex-col gap-1">
      {items.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`group flex items-center gap-3 rounded-2xl px-4 py-3 transition-all duration-200 ${
              isActive
                ? "bg-white text-slate-900 shadow-[0_18px_40px_rgba(15,23,42,0.2)]"
                : "text-slate-200/80 hover:bg-white/10 hover:text-white"
            }`}
            aria-current={isActive ? "page" : undefined}
          >
            {item.icon ? <span className={`h-5 w-5 ${isActive ? "text-slate-900" : "text-cyan-300/80 group-hover:text-cyan-200"}`}>{item.icon}</span> : null}
            <div className="flex flex-col">
              <span className="text-sm font-semibold tracking-tight">{item.label}</span>
              {item.description ? (
                <span className={`text-xs ${isActive ? "text-slate-600" : "text-slate-300/70"}`}>{item.description}</span>
              ) : null}
            </div>
          </Link>
        );
      })}
    </nav>
  );
}
