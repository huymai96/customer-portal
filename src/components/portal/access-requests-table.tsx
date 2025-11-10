'use client';

import { useMemo, useState, useTransition } from "react";

import { PortalAccessRequestRecord } from "@/lib/types";

type StatusSegment = "all" | "pending" | "approved" | "denied";

type DashboardFilters = {
  status: StatusSegment;
  manager: string;
  timeframe: "all" | "7" | "30";
  query: string;
};

interface AccessRequestsTableProps {
  requests: PortalAccessRequestRecord[];
  approverName: string;
}

export function AccessRequestsTable({ requests: initialRequests, approverName }: AccessRequestsTableProps) {
  const [requests, setRequests] = useState(initialRequests);
  const [filters, setFilters] = useState<DashboardFilters>({ status: "pending", manager: "all", timeframe: "all", query: "" });
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionNotes, setRejectionNotes] = useState<string>("");

  const managers = useMemo(() => {
    const unique = new Set<string>();
    requests.forEach((request) => {
      if (request.manager_email) {
        unique.add(request.manager_email.toLowerCase());
      }
    });
    return Array.from(unique).sort();
  }, [requests]);

  const counts = useMemo(() => {
    return requests.reduce(
      (acc, request) => {
        const status = (request.status || "pending").toLowerCase();
        if (status === "approved") acc.approved += 1;
        else if (status === "denied" || status === "rejected") acc.denied += 1;
        else acc.pending += 1;
        acc.total += 1;
        return acc;
      },
      { total: 0, pending: 0, approved: 0, denied: 0 }
    );
  }, [requests]);

  const filteredRequests = useMemo(() => {
    const timeframeDays = filters.timeframe === "all" ? null : Number(filters.timeframe);
    const now = Date.now();

    return requests.filter((request) => {
      const status = (request.status || "pending").toLowerCase();
      if (filters.status !== "all") {
        if (filters.status === "pending" && status !== "pending") return false;
        if (filters.status === "approved" && status !== "approved") return false;
        if (filters.status === "denied" && status !== "denied" && status !== "rejected") return false;
      }

      if (filters.manager !== "all" && request.manager_email?.toLowerCase() !== filters.manager) {
        return false;
      }

      if (timeframeDays != null) {
        const createdAt = request.created_at ? new Date(request.created_at).getTime() : 0;
        if (!createdAt || createdAt < now - timeframeDays * 24 * 60 * 60 * 1000) {
          return false;
        }
      }

      if (filters.query.trim()) {
        const needle = filters.query.trim().toLowerCase();
        const haystack = [request.full_name, request.email, request.company, request.manager_email, request.notes]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(needle)) {
          return false;
        }
      }

      return true;
    });
  }, [requests, filters]);

  const timelineEvents = useMemo(() => {
    return [...requests]
      .sort((a, b) => new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime())
      .slice(0, 8);
  }, [requests]);

  function resetFeedback() {
    setStatusMessage(null);
    setErrorMessage(null);
  }

  async function approveRequest(id: string) {
    resetFeedback();

    startTransition(async () => {
      try {
        const response = await fetch(`/portal/api/access-requests/${id}/approve`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ approvedBy: approverName }),
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          throw new Error(error.message || "Approval failed");
        }

        const result = await response.json();
        const updatedRequest: PortalAccessRequestRecord = result.request;

        setRequests((prev) => prev.map((item) => (item.id === updatedRequest.id ? updatedRequest : item)));
        setRejectingId(null);
        setRejectionNotes("");
        setStatusMessage(`Approved access for ${updatedRequest.full_name}.`);
      } catch (error) {
        setErrorMessage((error as Error).message || "Unable to approve request.");
      }
    });
  }

  async function rejectRequest(id: string) {
    resetFeedback();

    startTransition(async () => {
      try {
        const response = await fetch(`/portal/api/access-requests/${id}/reject`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rejectedBy: approverName, rejectionNotes }),
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          throw new Error(error.message || "Rejection failed");
        }

        const result = await response.json();
        const updatedRequest: PortalAccessRequestRecord = result.request;

        setRequests((prev) => prev.map((item) => (item.id === updatedRequest.id ? updatedRequest : item)));
        setRejectingId(null);
        setRejectionNotes("");
        setStatusMessage(`Declined access for ${updatedRequest.full_name}.`);
      } catch (error) {
        setErrorMessage((error as Error).message || "Unable to reject request.");
      }
    });
  }

  function updateFilters(partial: Partial<DashboardFilters>) {
    setFilters((prev) => ({ ...prev, ...partial }));
  }

  const segmentOptions: Array<{ value: StatusSegment; label: string; count: number }> = [
    { value: "all", label: "All", count: counts.total },
    { value: "pending", label: "Pending", count: counts.pending },
    { value: "approved", label: "Approved", count: counts.approved },
    { value: "denied", label: "Declined", count: counts.denied },
  ];

  return (
    <div className="space-y-8">
      {/* Summary metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <SummaryTile label="Pending" value={counts.pending} tone="from-cyan-400/50 via-sky-500/40 to-transparent" />
        <SummaryTile label="Approved" value={counts.approved} tone="from-emerald-500/50 via-lime-400/30 to-transparent" />
        <SummaryTile label="Declined" value={counts.denied} tone="from-rose-500/45 via-pink-500/30 to-transparent" />
        <SummaryTile label="Total requests" value={counts.total} tone="from-violet-500/45 via-fuchsia-500/30 to-transparent" />
      </div>

      {statusMessage ? (
        <div className="rounded-2xl border border-emerald-400/40 bg-emerald-500/15 px-4 py-3 text-sm text-emerald-100 shadow-[0_18px_60px_-40px_rgba(16,185,129,0.6)]">
          {statusMessage}
        </div>
      ) : null}
      {errorMessage ? (
        <div className="rounded-2xl border border-rose-400/40 bg-rose-500/15 px-4 py-3 text-sm text-rose-100">
          {errorMessage}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          {/* Filters */}
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-[0_40px_120px_-72px_rgba(14,165,233,0.65)]">
            <div className="flex flex-wrap items-center gap-3">
              {segmentOptions.map((segment) => (
                <button
                  key={segment.value}
                  type="button"
                  onClick={() => updateFilters({ status: segment.value })}
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] transition ${
                    filters.status === segment.value
                      ? "border-cyan-300/60 bg-cyan-400/20 text-white"
                      : "border-white/15 bg-white/5 text-white/70 hover:border-cyan-300/40 hover:text-white"
                  }`}
                >
                  {segment.label}
                  <span className="rounded-full bg-white/15 px-2 py-0.5 text-[0.65rem] text-white/80">{segment.count}</span>
                </button>
              ))}
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_160px]">
              <div className="relative">
                <input
                  type="search"
                  placeholder="Search name, email, company, or notes"
                  value={filters.query}
                  onChange={(event) => updateFilters({ query: event.target.value })}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-slate-300/70 focus:border-cyan-400/40 focus:outline-none focus:ring-2 focus:ring-cyan-400/30"
                />
              </div>
              <select
                value={filters.manager}
                onChange={(event) => updateFilters({ manager: event.target.value })}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:border-cyan-400/40 focus:outline-none focus:ring-2 focus:ring-cyan-400/30"
              >
                <option value="all">All account managers</option>
                {managers.map((manager) => (
                  <option key={manager} value={manager}>
                    {manager}
                  </option>
                ))}
              </select>
              <select
                value={filters.timeframe}
                onChange={(event) => updateFilters({ timeframe: event.target.value as DashboardFilters["timeframe"] })}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:border-cyan-400/40 focus:outline-none focus:ring-2 focus:ring-cyan-400/30"
              >
                <option value="all">Any time</option>
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div>
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.4em] text-slate-300/70">Review queue</p>
                <h2 className="text-lg font-semibold text-white">Access requests</h2>
                <p className="text-sm text-slate-300/70">
                  {filteredRequests.length} result{filteredRequests.length === 1 ? "" : "s"} · {counts.pending} pending overall
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  updateFilters({ status: "pending", manager: "all", timeframe: "all", query: "" });
                  setRejectingId(null);
                  setRejectionNotes("");
                  resetFeedback();
                }}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.3em] text-white/70 transition hover:border-cyan-300/40 hover:text-white"
              >
                Reset filters
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm text-white/80">
                <thead className="text-xs uppercase tracking-[0.28em] text-slate-400/70">
                  <tr className="border-b border-white/10">
                    <th className="px-4 py-3 text-left">Requester</th>
                    <th className="px-4 py-3 text-left">Company</th>
                    <th className="px-4 py-3 text-left">Account manager</th>
                    <th className="px-4 py-3 text-left">Submitted</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.map((request) => {
                    const status = (request.status || "pending").toLowerCase();
                    const isRejecting = rejectingId === request.id;
                    return (
                      <tr key={request.id} className="border-b border-white/5 last:border-b-0">
                        <td className="px-4 py-4">
                          <div className="flex flex-col">
                            <span className="font-medium text-white">{request.full_name}</span>
                            <span className="text-xs text-cyan-200/80">{request.email}</span>
                            {request.notes ? (
                              <span className="mt-1 line-clamp-2 text-xs text-slate-300/70">{request.notes}</span>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-200/70">{request.company || "—"}</td>
                        <td className="px-4 py-4 text-sm text-slate-200/70">{request.manager_email || "—"}</td>
                        <td className="px-4 py-4 text-sm text-slate-200/70">{formatDateTime(request.created_at)}</td>
                        <td className="px-4 py-4 text-sm">
                          <StatusBadge status={status} />
                        </td>
                        <td className="px-4 py-4 text-sm">
                          {status === "approved" || status === "denied" || status === "rejected" ? (
                            <div className="space-y-1 text-xs text-slate-300/70">
                              <p>Reviewed {formatRelative(request.approved_at || request.updated_at || request.created_at)}</p>
                              {request.approval_notes ? <p className="text-slate-300/60">“{request.approval_notes}”</p> : null}
                            </div>
                          ) : isRejecting ? (
                            <div className="flex flex-col gap-2">
                              <textarea
                                value={rejectionNotes}
                                onChange={(event) => setRejectionNotes(event.target.value)}
                                placeholder="Share context for the requester (optional)"
                                rows={3}
                                className="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs text-white placeholder:text-slate-300/70 focus:border-rose-300/50 focus:outline-none focus:ring-2 focus:ring-rose-300/30"
                                disabled={isPending}
                              />
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => rejectRequest(request.id)}
                                  disabled={isPending}
                                  className="inline-flex flex-1 items-center justify-center rounded-full border border-rose-400/40 bg-rose-500/20 px-3 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-rose-100 transition hover:border-rose-300/40 hover:bg-rose-500/30 disabled:opacity-60"
                                >
                                  {isPending ? "Submitting…" : "Confirm decline"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRejectingId(null);
                                    setRejectionNotes("");
                                  }}
                                  disabled={isPending}
                                  className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-white/70 transition hover:border-white/25 hover:text-white disabled:opacity-60"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => approveRequest(request.id)}
                                disabled={isPending}
                                className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-500/15 px-3 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-emerald-100 transition hover:border-emerald-300/40 hover:bg-emerald-500/25 disabled:opacity-60"
                              >
                                {isPending ? "Approving…" : "Approve"}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setRejectingId(request.id);
                                  setRejectionNotes("");
                                  resetFeedback();
                                }}
                                disabled={isPending}
                                className="inline-flex items-center gap-2 rounded-full border border-rose-400/40 bg-rose-500/15 px-3 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-rose-100 transition hover:border-rose-300/40 hover:bg-rose-500/25 disabled:opacity-60"
                              >
                                Decline
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredRequests.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-300/70">
                        Nothing to review under the current filters. Try widening the date range or clearing search filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Timeline & context */}
        <aside className="space-y-4">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.4em] text-slate-300/70">Workflow timeline</p>
            <ul className="mt-3 space-y-4 text-sm text-white/80">
              {timelineEvents.map((event) => {
                const status = (event.status || "pending").toLowerCase();
                return (
                  <li key={event.id} className="relative pl-4">
                    <span className="absolute left-0 top-1 h-full w-px bg-white/10" aria-hidden />
                    <div className="flex flex-col gap-1 rounded-2xl border border-white/10 bg-white/10 px-3 py-2">
                      <div className="flex items-center justify-between gap-2 text-xs uppercase tracking-[0.3em] text-slate-300/70">
                        <span>{statusLabel(status)}</span>
                        <span>{formatRelative(event.updated_at || event.created_at)}</span>
                      </div>
                      <p className="text-sm font-semibold text-white">{event.full_name}</p>
                      <p className="text-xs text-slate-300/70">{event.email}</p>
                      {event.approval_notes ? (
                        <p className="text-xs text-slate-300/60">“{event.approval_notes}”</p>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 text-sm text-slate-200/70">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.4em] text-slate-300/70">Playbook</p>
            <ul className="mt-3 space-y-2">
              <li>• Use filters to prioritize requests by manager or timeframe.</li>
              <li>• Capture context in the decline note—customers receive it instantly.</li>
              <li>• Approvals auto-notify QC + the selected manager. Declines cc the original manager.</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}

function SummaryTile({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-5 shadow-[0_28px_80px_-60px_rgba(14,165,233,0.5)]">
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${tone} opacity-70 blur-xl`} />
      <div className="relative">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-slate-200/70">{label}</p>
        <p className="mt-3 text-2xl font-semibold text-white">{formatNumber(value)}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const base = "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em]";
  if (status === "approved") {
    return <span className={`${base} border-emerald-400/40 bg-emerald-500/15 text-emerald-100`}>Approved</span>;
  }
  if (status === "denied" || status === "rejected") {
    return <span className={`${base} border-rose-400/40 bg-rose-500/15 text-rose-100`}>Declined</span>;
  }
  return <span className={`${base} border-cyan-400/40 bg-cyan-400/15 text-cyan-100`}>Pending</span>;
}

function formatNumber(value?: number | null) {
  if (value == null) return "0";
  return value.toLocaleString();
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return `${date.toLocaleDateString()} · ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

function formatRelative(value?: string | null) {
  if (!value) return "—";
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return "—";
  const diffMs = Date.now() - timestamp;
  const minutes = Math.max(1, Math.round(diffMs / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.round(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.round(days / 365);
  return `${years}y ago`;
}

function statusLabel(status: string) {
  if (status === "approved") return "Approved";
  if (status === "denied" || status === "rejected") return "Declined";
  return "Pending";
}
