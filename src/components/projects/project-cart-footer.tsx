'use client';

import { useState } from 'react';
import clsx from 'clsx';

import { submitQuote } from '@/lib/api';
import { useProjectCart } from './project-cart-context';
import { AddressAutocomplete } from './address-autocomplete';
import type { QuoteResponse } from '@/lib/types';

const INITIAL_COUNTRY = 'US';

export function ProjectCartFooter() {
  const lines = useProjectCart((state) => state.lines);
  const clear = useProjectCart((state) => state.clear);

  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  const [company, setCompany] = useState('');
  const [address1, setAddress1] = useState('');
  const [address2, setAddress2] = useState('');
  const [city, setCity] = useState('');
  const [region, setRegion] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState(INITIAL_COUNTRY);
  const [needBy, setNeedBy] = useState('');
  const [notes, setNotes] = useState('');
  const [proofRequested, setProofRequested] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quoteSummary, setQuoteSummary] = useState<QuoteResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const allRequiredProvided =
    contactName.trim().length > 0 &&
    contactEmail.trim().length > 0 &&
    address1.trim().length > 0 &&
    city.trim().length > 0 &&
    region.trim().length > 0 &&
    postalCode.trim().length > 0 &&
    country.trim().length > 0;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const payload = {
        lines,
        customerInfo: {
          name: contactName.trim(),
          email: contactEmail.trim(),
          phone: contactPhone.trim() || undefined,
        },
        shipTo: {
          company: company.trim() || undefined,
          line1: address1.trim(),
          line2: address2.trim() || undefined,
          city: city.trim(),
          state: region.trim(),
          postalCode: postalCode.trim(),
          country: country.trim(),
        },
        needBy: needBy || undefined,
        notes: notes.trim() || undefined,
        proofRequested,
      };

      const response = await submitQuote(payload);
      setQuoteSummary(response);
      clear();
      setContactName('');
      setContactEmail('');
      setContactPhone('');
      setCompany('');
      setAddress1('');
      setAddress2('');
      setCity('');
      setRegion('');
      setPostalCode('');
      setCountry(INITIAL_COUNTRY);
      setNeedBy('');
      setNotes('');
      setProofRequested(false);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to submit quote';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mt-6 space-y-6 rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm">
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-slate-700">Contact & shipping</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="stack-xs">
            <span className="text-xs font-semibold uppercase text-slate-500">Contact name</span>
            <input
              value={contactName}
              onChange={(event) => setContactName(event.target.value)}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
              placeholder="Sam Runner"
              required
            />
          </label>
          <label className="stack-xs">
            <span className="text-xs font-semibold uppercase text-slate-500">Email</span>
            <input
              value={contactEmail}
              onChange={(event) => setContactEmail(event.target.value)}
              type="email"
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
              placeholder="sam@brand.com"
              required
            />
          </label>
          <label className="stack-xs">
            <span className="text-xs font-semibold uppercase text-slate-500">Phone</span>
            <input
              value={contactPhone}
              onChange={(event) => setContactPhone(event.target.value)}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
              placeholder="(555) 555-1234"
            />
          </label>
          <label className="stack-xs">
            <span className="text-xs font-semibold uppercase text-slate-500">Company</span>
            <input
              value={company}
              onChange={(event) => setCompany(event.target.value)}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
              placeholder="Acme Logistics"
            />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="stack-xs md:col-span-2">
            <span className="text-xs font-semibold uppercase text-slate-500">Address</span>
            <AddressAutocomplete
              value={address1}
              onChange={setAddress1}
              onAddressResolved={(parsed) => {
                setAddress1(parsed.line1 ?? '');
                setCity(parsed.city ?? '');
                setRegion(parsed.state ?? '');
                setPostalCode(parsed.postalCode ?? '');
                if (parsed.country) {
                  setCountry(parsed.country);
                }
              }}
              placeholder="Start typing for Google-verified matches"
            />
          </label>
          <label className="stack-xs">
            <span className="text-xs font-semibold uppercase text-slate-500">Line 2</span>
            <input
              value={address2}
              onChange={(event) => setAddress2(event.target.value)}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
              placeholder="Suite 200"
            />
          </label>
          <label className="stack-xs">
            <span className="text-xs font-semibold uppercase text-slate-500">City</span>
            <input
              value={city}
              onChange={(event) => setCity(event.target.value)}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
              placeholder="Dallas"
              required
            />
          </label>
          <label className="stack-xs">
            <span className="text-xs font-semibold uppercase text-slate-500">State / Province</span>
            <input
              value={region}
              onChange={(event) => setRegion(event.target.value)}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
              placeholder="TX"
              required
            />
          </label>
          <label className="stack-xs">
            <span className="text-xs font-semibold uppercase text-slate-500">Postal code</span>
            <input
              value={postalCode}
              onChange={(event) => setPostalCode(event.target.value)}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
              placeholder="75234"
              required
            />
          </label>
          <label className="stack-xs">
            <span className="text-xs font-semibold uppercase text-slate-500">Country</span>
            <input
              value={country}
              onChange={(event) => setCountry(event.target.value)}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
              placeholder="US"
              required
            />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="stack-xs">
            <span className="text-xs font-semibold uppercase text-slate-500">Need in-hand by</span>
            <input
              type="date"
              value={needBy}
              onChange={(event) => setNeedBy(event.target.value)}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            />
          </label>
          <label className="stack-xs md:col-span-2">
            <span className="text-xs font-semibold uppercase text-slate-500">Notes</span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
              placeholder="Artwork reference, rush flags, etc."
            />
          </label>
          <label className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-500">
            <input
              type="checkbox"
              checked={proofRequested}
              onChange={(event) => setProofRequested(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300"
            />
            Request proof before production
          </label>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1 text-xs text-slate-500">
          <p>Verify the address via Google before requesting a quote. Decoration specifications stay attached to each line.</p>
          {quoteSummary ? (
            <p className="font-semibold text-emerald-600">Quote {quoteSummary.quoteId} submitted. Decoration team notified.</p>
          ) : null}
          {error ? <p className="text-rose-500">{error}</p> : null}
        </div>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={lines.length === 0 || isSubmitting || !allRequiredProvided}
          className={clsx(
            'rounded-full px-5 py-2 text-sm font-semibold text-white shadow-sm transition',
            lines.length === 0 || isSubmitting || !allRequiredProvided
              ? 'cursor-not-allowed bg-slate-300 text-slate-400'
              : 'bg-brand-600 hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600'
          )}
        >
          {isSubmitting ? 'Submitting…' : 'Request Quote'}
        </button>
      </div>

      {quoteSummary ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <div className="flex items-center justify-between">
            <p className="font-semibold">Quote subtotal</p>
            <p className="text-lg font-bold">${quoteSummary.subtotal.toFixed(2)}</p>
          </div>
          <table className="mt-3 w-full text-xs">
            <thead className="text-emerald-700">
              <tr>
                <th className="px-2 py-1 text-left font-semibold">Line</th>
                <th className="px-2 py-1 text-right font-semibold">Unit</th>
                <th className="px-2 py-1 text-right font-semibold">Extended</th>
              </tr>
            </thead>
            <tbody>
              {quoteSummary.lines.map((line, index) => (
                <tr key={`${line.supplierPartId}-${index}`} className="border-t border-emerald-200">
                  <td className="px-2 py-1">
                    <div className="font-semibold">
                      {line.supplierPartId} • {line.colorCode} • {line.sizeCode}
                    </div>
                    <div className="text-emerald-700">
                      {line.pricing.unitBlankCost.toFixed(2)} blank + {line.pricing.unitDecorationCost.toFixed(2)} deco + {line.pricing.unitSetupCost.toFixed(2)} setup
                    </div>
                    {line.pricing.notes.length ? (
                      <ul className="mt-1 list-disc pl-5">
                        {line.pricing.notes.map((note) => (
                          <li key={note}>{note}</li>
                        ))}
                      </ul>
                    ) : null}
                  </td>
                  <td className="px-2 py-1 text-right">${line.pricing.unitPrice.toFixed(2)}</td>
                  <td className="px-2 py-1 text-right">${line.pricing.extendedPrice.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}


