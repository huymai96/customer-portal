'use client';

import Link from 'next/link';
import { Suspense, useState } from 'react';

import { NAV_LINKS } from './site-data';
import { SearchBar } from './SearchBar';
import { CartCount } from './CartCount';

interface HeaderProps {
  showSearch?: boolean;
}

export function Header({ showSearch = true }: HeaderProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
      <div className="bg-slate-900 text-xs text-slate-200">
        <div className="mx-auto flex max-w-7xl items-center justify-end gap-6 px-4 py-2">
          <Link className="hover:text-white" href="/contact">
            Contact
          </Link>
          <Link className="hover:text-white" href="/portal/login">
            Login
          </Link>
          <Link className="hover:text-white" href="/portal/request-access">
            Create Account
          </Link>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 md:flex-row md:items-center">
        <div className="flex items-center justify-between gap-4 md:w-auto">
          <Link href="/" className="text-xl font-semibold tracking-tight text-slate-900">
            Promos Ink
          </Link>
          <div className="flex items-center gap-3 md:hidden">
            <button
              className="rounded-full border border-slate-200 p-2 text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
              type="button"
              onClick={() => setMobileNavOpen((prev) => !prev)}
              aria-label="Toggle menu"
            >
              <MenuIcon />
            </button>
          </div>
        </div>
        {showSearch && (
          <div className="w-full md:flex-1">
            <Suspense fallback={<SearchBarFallback />}>
              <SearchBar />
            </Suspense>
          </div>
        )}
        <div className="flex items-center justify-end gap-3 md:ml-auto">
          <button
            className="hidden rounded-full border border-slate-200 p-2 text-slate-500 transition hover:border-slate-300 hover:text-slate-700 md:inline-flex"
            type="button"
            aria-label="Favorites"
          >
            <HeartIcon />
          </button>
          <CartCount />
          <button
            className="hidden rounded-full border border-slate-200 p-2 text-slate-500 transition hover:border-slate-300 hover:text-slate-700 lg:hidden md:inline-flex"
            type="button"
            aria-label="Toggle menu"
            onClick={() => setMobileNavOpen((prev) => !prev)}
          >
            <MenuIcon />
          </button>
        </div>
      </div>

      <div className="border-t border-slate-200 bg-white/90">
        <nav className="mx-auto hidden max-w-7xl items-center justify-between px-4 py-3 text-sm font-semibold text-slate-600 lg:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.slug}
              className="rounded-full px-3 py-1 transition hover:bg-slate-100 hover:text-slate-900"
              href={`/category/${link.slug}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        {mobileNavOpen ? (
          <div className="lg:hidden">
            <nav className="space-y-1 border-t border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.slug}
                  className="block rounded-xl px-3 py-2 transition hover:bg-slate-100"
                  href={`/category/${link.slug}`}
                  onClick={() => setMobileNavOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        ) : null}
      </div>
    </header>
  );
}

function HeartIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-5 w-5">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M3.5 8.75c0-2.16 1.78-3.91 3.97-3.91 1.3 0 2.53.63 3.28 1.66a4.03 4.03 0 013.28-1.66c2.19 0 3.97 1.75 3.97 3.91 0 4.14-4.87 6.96-7.25 9.54C8.37 15.71 3.5 12.89 3.5 8.75z"
      />
    </svg>
  );
}


function MenuIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function SearchBarFallback() {
  return (
    <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 shadow-sm">
      <div className="h-10 flex-1 animate-pulse rounded bg-slate-100" />
      <div className="h-8 w-8 animate-pulse rounded-full bg-slate-100" />
    </div>
  );
}

