'use client';

import { useState } from 'react';
import clsx from 'clsx';
import type { DecorationSpec, DecorationMethod } from '@/lib/types';
import { useProjectCart } from './project-cart-context';
import { ProjectCartFooter } from './project-cart-footer';

const METHOD_LABELS: Record<DecorationMethod, string> = {
  screen: 'Screen Print',
  emb: 'Embroidery',
  dtf: 'DTF Transfer',
  heat: 'Heat Transfer',
  dtg: 'DTG Print',
  sublimation: 'Sublimation',
  patch: 'Patch / Applique',
};

function DecorationEditor({
  index,
  decoration,
  onClose,
}: {
  index: number;
  decoration: DecorationSpec | null;
  onClose: () => void;
}) {
  const updateDecoration = useProjectCart((state) => state.updateDecoration);
  const [draft, setDraft] = useState<DecorationSpec>(
    decoration || { method: 'screen', locations: [{ name: 'Front' }] }
  );

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    updateDecoration(index, draft);
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-xs font-semibold uppercase text-slate-500">Method</label>
        <div className="mt-2 grid grid-cols-2 gap-3">
          {(Object.keys(METHOD_LABELS) as DecorationMethod[]).map((method) => (
            <button
              key={method}
              type="button"
              onClick={() => setDraft((prev) => ({ ...prev, method }))}
              className={clsx(
                'rounded-xl border px-3 py-2 text-sm font-medium',
                draft.method === method
                  ? 'border-brand-600 bg-brand-50 text-brand-700'
                  : 'border-slate-200 text-slate-600'
              )}
            >
              {METHOD_LABELS[method]}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="text-xs font-semibold uppercase text-slate-500" htmlFor="notes">
          Notes
        </label>
        <textarea
          id="notes"
          className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
          rows={3}
          placeholder="Left chest 3.5” wide, center front 10” wide..."
          value={draft.notes ?? ''}
          onChange={(event) => setDraft((prev) => ({ ...prev, notes: event.target.value }))}
        />
      </div>
      {draft.method === 'screen' ? (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold uppercase text-slate-500" htmlFor="colors">
              Ink Colors
            </label>
            <input
              id="colors"
              type="number"
              min={1}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
              value={draft.colors ?? 1}
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  colors: Number(event.target.value) || 1,
                }))
              }
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-slate-500">
              Underbase required?
            </label>
            <div className="mt-1 flex items-center gap-3 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={draft.underbase === true}
                  onChange={() => setDraft((prev) => ({ ...prev, underbase: true }))}
                />
                Yes
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={draft.underbase === false}
                  onChange={() => setDraft((prev) => ({ ...prev, underbase: false }))}
                />
                No
              </label>
            </div>
          </div>
        </div>
      ) : null}
      {draft.method === 'emb' ? (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold uppercase text-slate-500" htmlFor="stitchCount">
              Stitch Count
            </label>
            <input
              id="stitchCount"
              type="number"
              min={1000}
              step={500}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
              value={draft.stitchCount ?? 7500}
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  stitchCount: Number(event.target.value) || 7500,
                }))
              }
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-slate-500" htmlFor="thread">
              Thread Palette (comma separated)
            </label>
            <input
              id="thread"
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
              placeholder="Polyneon-1724, Polyneon-1805"
              value={draft.threadPalette?.join(', ') ?? ''}
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  threadPalette: event.target.value
                    .split(',')
                    .map((token) => token.trim())
                    .filter(Boolean),
                }))
              }
            />
          </div>
        </div>
      ) : null}
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-600 hover:border-slate-300"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="rounded-full bg-brand-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
        >
          Save Decoration
        </button>
      </div>
    </form>
  );
}

export function ProjectCartPanel() {
  const lines = useProjectCart((state) => state.lines);
  const removeLine = useProjectCart((state) => state.removeLine);
  const clear = useProjectCart((state) => state.clear);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  if (lines.length === 0) {
    return (
      <aside className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500 shadow-sm">
        Add sizes to your project cart to begin the decoration workflow.
      </aside>
    );
  }

  return (
    <aside
      id="project-cart-panel"
      className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Project Cart</h2>
        <button
          type="button"
          onClick={clear}
          className="text-xs font-semibold uppercase text-rose-500 hover:text-rose-600"
        >
          Clear all
        </button>
      </div>
      <ul className="space-y-4">
        {lines.map((line, index) => (
          <li key={`${line.supplierPartId}-${index}`} className="rounded-xl border border-slate-200 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {line.supplierPartId} • {line.colorCode} • {line.sizeCode}
                </p>
                <p className="text-xs text-slate-500">
                  Qty {line.qty}
                  {line.supplierSku ? ` • Supplier SKU ${line.supplierSku}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingIndex(index)}
                  className="rounded-full border border-slate-200 px-4 py-1.5 text-xs font-semibold text-slate-600 hover:border-slate-300"
                >
                  {line.decoration ? 'Edit Decoration' : 'Add Decoration'}
                </button>
                <button
                  type="button"
                  onClick={() => removeLine(index)}
                  className="rounded-full border border-rose-200 px-4 py-1.5 text-xs font-semibold text-rose-500 hover:border-rose-300"
                >
                  Remove
                </button>
              </div>
            </div>
            {line.decoration ? (
              <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                <p className="font-semibold text-slate-700">
                  {METHOD_LABELS[line.decoration.method]} •{' '}
                  {line.decoration.locations.map((loc) => loc.name).join(', ')}
                </p>
                {line.decoration.notes ? <p className="mt-1">{line.decoration.notes}</p> : null}
              </div>
            ) : null}
          </li>
        ))}
      </ul>
      {editingIndex !== null ? (
        <div className="rounded-2xl border border-brand-200 bg-brand-50/60 p-6">
          <DecorationEditor
            index={editingIndex}
            decoration={lines[editingIndex]?.decoration ?? null}
            onClose={() => setEditingIndex(null)}
          />
        </div>
      ) : (
        <p className="text-xs text-slate-500">
          Configure decoration per line. These specs will accompany quote and production orders.
        </p>
      )}
      <ProjectCartFooter />
    </aside>
  );
}


