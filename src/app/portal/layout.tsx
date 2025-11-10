import type { ReactNode } from 'react';
import Link from 'next/link';

export default function PortalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="page-shell flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-wide text-brand-600">Promos Ink</p>
            <h1 className="text-2xl font-semibold text-slate-900">Customer Portal</h1>
          </div>
          <nav className="flex items-center gap-4 text-sm font-medium text-slate-600">
            <Link href="/portal/catalog" className="hover:text-slate-900">
              Catalog
            </Link>
            <Link href="/portal/projects" className="hover:text-slate-900">
              Projects
            </Link>
            <Link href="/portal/orders" className="hover:text-slate-900">
              Orders
            </Link>
          </nav>
        </div>
      </header>
      <main className="page-shell">{children}</main>
    </div>
  );
}


