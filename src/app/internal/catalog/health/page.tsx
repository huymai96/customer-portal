'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import { Header } from '@/app/components/Header';

interface HealthIssue {
  canonicalStyleId: string;
  styleNumber: string;
  displayName: string;
  brand?: string | null;
  issues: string[];
  suppliers: Array<{
    supplier: string;
    supplierPartId: string;
    colors: number;
    sizes: number;
    warehouses: number;
    inventoryRows: number;
  }>;
}

interface HealthResponse {
  timestamp: string;
  totalStyles: number;
  stylesWithIssues: number;
  successRate: string;
  issues: HealthIssue[];
}

export default function CatalogHealthPage() {
  const [healthData, setHealthData] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHealthData() {
      try {
        setLoading(true);
        const response = await fetch('/api/internal/catalog/health');
        if (!response.ok) {
          throw new Error('Failed to fetch health data');
        }
        const data = await response.json();
        setHealthData(data);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unknown error');
        setHealthData({
          timestamp: new Date().toISOString(),
          totalStyles: 0,
          stylesWithIssues: 0,
          successRate: '0.0',
          issues: [],
        });
      } finally {
        setLoading(false);
      }
    }

    fetchHealthData();
    // Refresh every 60 seconds
    const interval = setInterval(fetchHealthData, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !healthData) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header />
        <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-10">
          <div className="text-center">Loading health data...</div>
        </main>
      </div>
    );
  }

  const data = healthData || {
    timestamp: new Date().toISOString(),
    totalStyles: 0,
    stylesWithIssues: 0,
    successRate: '0.0',
    issues: [],
  };

  const isHealthy = data.stylesWithIssues === 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-10">
        <header className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-500">Internal</p>
              <h1 className="text-3xl font-semibold text-slate-900">Catalog Health Status</h1>
              <p className="text-sm text-slate-500">Last updated: {new Date(data.timestamp).toLocaleString()}</p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
            >
              Refresh
            </button>
          </div>
        </header>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Total Styles</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{data.totalStyles}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Styles with Issues</p>
            <p className={`mt-2 text-3xl font-semibold ${data.stylesWithIssues > 0 ? 'text-amber-600' : 'text-green-600'}`}>
              {data.stylesWithIssues}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Success Rate</p>
            <p className={`mt-2 text-3xl font-semibold ${isHealthy ? 'text-green-600' : 'text-amber-600'}`}>
              {data.successRate}%
            </p>
          </div>
        </div>

        {/* Status Banner */}
        {isHealthy ? (
          <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm font-semibold text-green-800">All styles are healthy</p>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-sm font-semibold text-amber-800">
                {data.stylesWithIssues} style{data.stylesWithIssues === 1 ? '' : 's'} need attention
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-semibold text-red-800">Error: {error}</p>
          </div>
        )}

        {/* Issues Table */}
        {data.issues.length > 0 && (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Issues Found</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-100 text-xs uppercase tracking-[0.3em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left">Style</th>
                    <th className="px-4 py-3 text-left">Brand</th>
                    <th className="px-4 py-3 text-left">Suppliers</th>
                    <th className="px-4 py-3 text-left">Issues</th>
                    <th className="px-4 py-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.issues.map((issue) => (
                    <tr key={issue.canonicalStyleId} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{issue.styleNumber}</div>
                        <div className="text-xs text-slate-500">{issue.displayName}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{issue.brand || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          {issue.suppliers.map((s) => (
                            <div key={s.supplierPartId} className="text-xs">
                              <span className="font-medium">{s.supplier}</span> ({s.supplierPartId}):{' '}
                              <span className="text-slate-500">
                                {s.colors} colors, {s.sizes} sizes, {s.warehouses} warehouses, {s.inventoryRows} rows
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <ul className="space-y-1">
                          {issue.issues.map((i, idx) => (
                            <li key={idx} className="text-xs text-amber-700">
                              • {i}
                            </li>
                          ))}
                        </ul>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/product/${issue.canonicalStyleId}`}
                          className="text-xs font-semibold text-brand-600 hover:text-brand-700"
                        >
                          View →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {data.issues.length === 0 && !error && (
          <section className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <svg className="mx-auto h-12 w-12 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="mt-4 text-xl font-semibold text-slate-900">All styles are healthy</h2>
            <p className="mt-2 text-sm text-slate-500">No issues found in the catalog</p>
          </section>
        )}
      </main>
    </div>
  );
}

