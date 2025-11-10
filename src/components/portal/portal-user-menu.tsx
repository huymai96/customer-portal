'use client';

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { LogOut, Settings, User } from "lucide-react";

import { cn } from "@/lib/utils";

interface PortalUserMenuProps {
  name: string;
  email?: string | null;
}

export function PortalUserMenu({ name, email }: PortalUserMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener("mousedown", handleClick);
    }

    return () => {
      document.removeEventListener("mousedown", handleClick);
    };
  }, [open]);

  const initials = name
    ? name
        .split(" ")
        .map((part) => part.charAt(0))
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : email?.charAt(0).toUpperCase() || "U";

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-3 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-left text-xs text-white transition hover:border-white/40 hover:bg-white/20"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/25 text-sm font-semibold text-white">
          {initials}
        </span>
        <span className="hidden flex-col text-white/90 md:flex">
          <span className="text-xs font-semibold leading-tight">{name}</span>
          {email ? <span className="text-[10px] text-white/70">{email}</span> : null}
        </span>
      </button>

      <div
        className={cn(
          "absolute right-0 z-20 mt-3 w-56 overflow-hidden rounded-xl border border-white/20 bg-slate-900/95 text-sm text-slate-200 shadow-lg backdrop-blur transition",
          open ? "visible opacity-100" : "invisible opacity-0"
        )}
      >
        <div className="border-b border-white/10 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-sm font-semibold text-white">
              {initials}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-white">{name}</span>
              {email ? <span className="text-xs text-slate-300">{email}</span> : null}
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-1 p-2">
          <Link
            href="/portal/account"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-200 transition hover:bg-white/10 hover:text-white"
            onClick={() => setOpen(false)}
          >
            <Settings className="h-4 w-4" />
            Account settings
          </Link>
          <a
            href="mailto:support@promosink.com"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-200 transition hover:bg-white/10 hover:text-white"
            onClick={() => setOpen(false)}
          >
            <User className="h-4 w-4" />
            Contact support
          </a>
        </div>
        <div className="border-t border-white/10 p-2">
          <form method="post" action="/auth/logout">
            <button
              type="submit"
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-200 transition hover:bg-white/10 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
