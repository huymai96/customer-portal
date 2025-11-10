"use client";

import { useMemo, useState } from "react";
import type { PortalQuoteRecord, QuoteResponseBody } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

interface QuoteFormProps {
  initialSku?: string;
  initialQuantity?: number;
}

const defaultArtworkUrl = "https://storage.googleapis.com/promos-ink-artwork/demo-placeholder.png";
const MARKUP_PERCENTAGE = 0.2;

const SUPPLIERS = [
  { value: "sanmar", label: "SanMar" },
  { value: "ss_activewear", label: "S&S Activewear" },
];

function parseNumber(value: number | string | null | undefined, fallback = 0): number {
  if (value === null || value === undefined) {
    return fallback;
  }
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return parsed;
}

function filenameFromUrl(url?: string): string | undefined {
  if (!url) return undefined;
  try {
    const withoutQuery = url.split(/[?#]/)[0];
    const segments = withoutQuery.split("/").filter(Boolean);
    const name = segments[segments.length - 1];
    return name || undefined;
  } catch {
    return undefined;
  }
}

export function QuoteForm({ initialSku = "", initialQuantity = 24 }: QuoteFormProps) {
  const [quoteTitle, setQuoteTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [sku, setSku] = useState(initialSku);
  const [productName, setProductName] = useState("");
  const [supplier, setSupplier] = useState<string>(SUPPLIERS[0]!.value);
  const [quantity, setQuantity] = useState(initialQuantity);
  const [baseCost, setBaseCost] = useState<number | undefined>();
  const [color, setColor] = useState("Black");
  const [size, setSize] = useState("L");
  const [method, setMethod] = useState("auto");
  const [decorationNotes, setDecorationNotes] = useState("");
  const [decorationUnitPrice, setDecorationUnitPrice] = useState<number | undefined>();
  const [placement, setPlacement] = useState("front_center");
  const [colors, setColors] = useState(2);
  const [warehouse, setWarehouse] = useState("us-tx-dallas");
  const [artworkUrl, setArtworkUrl] = useState(defaultArtworkUrl);
  const [artworkNotes, setArtworkNotes] = useState("");
  const [shippingMethod, setShippingMethod] = useState("standard");
  const [inHandDate, setInHandDate] = useState("");
  const [customerPo, setCustomerPo] = useState("");
  const [shipToName, setShipToName] = useState("");
  const [shipToCompany, setShipToCompany] = useState("");
  const [shipToAddress1, setShipToAddress1] = useState("");
  const [shipToAddress2, setShipToAddress2] = useState("");
  const [shipToCity, setShipToCity] = useState("");
  const [shipToState, setShipToState] = useState("");
  const [shipToPostal, setShipToPostal] = useState("");
  const [shipToCountry, setShipToCountry] = useState("US");
  const [shipToPhone, setShipToPhone] = useState("");
  const [shipToEmail, setShipToEmail] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [rushHours, setRushHours] = useState<number | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<QuoteResponseBody | null>(null);
  const [savedQuote, setSavedQuote] = useState<PortalQuoteRecord | null>(null);

  const markupPercentage = supplier ? MARKUP_PERCENTAGE : 0;
  const computedUnitPrice = useMemo(() => {
    const base = parseNumber(baseCost, NaN);
    if (!Number.isFinite(base) || base <= 0) {
      return null;
    }
    return base * (1 + markupPercentage);
  }, [baseCost, markupPercentage]);

  const computedLineTotal = useMemo(() => {
    if (!computedUnitPrice) return null;
    return computedUnitPrice * quantity;
  }, [computedUnitPrice, quantity]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!sku || !productName) {
      setError("SKU and product name are required.");
      return;
    }

    const baseCostValue = parseNumber(baseCost, NaN);
    if (!Number.isFinite(baseCostValue) || baseCostValue <= 0) {
      setError("Enter the supplier blank cost before submitting.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setSavedQuote(null);

    const warehouseAllocations = warehouse
      ? [
          {
            warehouse,
            quantity,
          },
        ]
      : [];

    const artworkAssets = artworkUrl
      ? [
          {
            url: artworkUrl,
            filename: filenameFromUrl(artworkUrl),
            notes: artworkNotes || undefined,
          },
        ]
      : [];

    const payload = {
      status: "submitted",
      title: quoteTitle || undefined,
      notes: notes || undefined,
      items: [
        {
          supplier,
          supplier_label: SUPPLIERS.find((option) => option.value === supplier)?.label ?? supplier,
          sku,
          product_name: productName,
          quantity,
          size: size || undefined,
          color: color || undefined,
          base_cost: baseCostValue,
          decoration_method: method === "auto" ? undefined : method,
          decoration_notes: decorationNotes || undefined,
          decoration_unit_price: parseNumber(decorationUnitPrice, 0),
          additional_fees: [],
          warehouse_allocations: warehouseAllocations,
          artwork_assets: artworkAssets,
          metadata: {
            placement,
            colors,
          },
          decoration: {
            method: method === "auto" ? undefined : method,
            locations: [
              {
                placement,
                artwork_url: artworkUrl || defaultArtworkUrl,
                colors,
              },
            ],
          },
        },
      ],
      logistics: {
        shipping_method: shippingMethod,
        in_hand_date: inHandDate || undefined,
        customer_po: customerPo || undefined,
        ship_to: {
          name: shipToName || undefined,
          company: shipToCompany || undefined,
          address1: shipToAddress1 || undefined,
          address2: shipToAddress2 || undefined,
          city: shipToCity || undefined,
          state: shipToState || undefined,
          postal_code: shipToPostal || undefined,
          country: shipToCountry || undefined,
          phone: shipToPhone || undefined,
          email: shipToEmail || undefined,
        },
      },
      customer_context: {
        contact_name: contactName || undefined,
        contact_email: contactEmail || undefined,
        contact_phone: contactPhone || undefined,
      },
      artwork: {
        files: artworkAssets,
        notes: artworkNotes || undefined,
      },
      workflow: {
        proof: {
          status: "pending",
        },
      },
      shipping_method: shippingMethod,
      rush_hours: rushHours,
    };

    try {
      const response = await fetch("/api/quote-proxy", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as QuoteResponseBody;

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to submit quote");
      }

      setResult(data);
      setSavedQuote(data.savedQuote ?? null);
    } catch (err) {
      setError((err as Error).message || "Unexpected error generating quote");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
      <form onSubmit={handleSubmit} className="card space-y-6 p-6">
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-medium uppercase tracking-wide text-slate-600">Quote title</label>
            <input
              value={quoteTitle}
              onChange={(event) => setQuoteTitle(event.target.value)}
              placeholder="Spring retailer kickoff"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium uppercase tracking-wide text-slate-600">Internal notes</label>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Any context for this quote…"
              rows={3}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
          <p className="font-semibold text-slate-700">Built-in markup</p>
          <p className="mt-1">
            Blanks from SanMar and S&amp;S are automatically quoted with a <strong>20% markup</strong>. Enter the supplier cost below and we’ll display the customer price.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-slate-600">Supplier *</label>
            <select
              value={supplier}
              onChange={(event) => setSupplier(event.target.value)}
              className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              {SUPPLIERS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-slate-600">Supplier blank cost *</label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={baseCost ?? ""}
              onChange={(event) => setBaseCost(event.target.value ? Number(event.target.value) : undefined)}
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="5.25"
              required
            />
          </div>
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-slate-600">SKU *</label>
            <input
              value={sku}
              onChange={(event) => setSku(event.target.value)}
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="PC54-AQUATICBL-L"
              required
            />
          </div>
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-slate-600">Product name *</label>
            <input
              value={productName}
              onChange={(event) => setProductName(event.target.value)}
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="Port & Company Core Cotton Tee"
              required
            />
          </div>
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-slate-600">Quantity *</label>
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(event) => setQuantity(Number(event.target.value) || 1)}
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-slate-600">Warehouse preference</label>
            <input
              value={warehouse}
              onChange={(event) => setWarehouse(event.target.value)}
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="us-tx-dallas"
            />
            <p className="mt-1 text-xs text-slate-400">Use SanMar/S&amp;S slugs (e.g. us-nj-robbinsville).</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-slate-600">Color</label>
              <input
                value={color}
                onChange={(event) => setColor(event.target.value)}
                className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-slate-600">Size</label>
              <input
                value={size}
                onChange={(event) => setSize(event.target.value)}
                className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-slate-600">Preferred decoration</label>
            <select
              value={method}
              onChange={(event) => setMethod(event.target.value)}
              className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value="auto">Let Promos Ink route automatically</option>
              <option value="dtg">Direct-To-Garment</option>
              <option value="dtf">Direct-To-Film</option>
              <option value="screen_print">Screen Print</option>
              <option value="embroidery">Embroidery</option>
              <option value="heat_transfer">Heat Transfer</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-slate-600">Decoration upcharge (optional)</label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={decorationUnitPrice ?? ""}
              onChange={(event) => setDecorationUnitPrice(event.target.value ? Number(event.target.value) : undefined)}
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="2.00"
            />
          </div>
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-slate-600">Decoration notes</label>
            <textarea
              value={decorationNotes}
              onChange={(event) => setDecorationNotes(event.target.value)}
              rows={2}
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="Left chest 3.5” wide"
            />
          </div>
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-slate-600">Placement</label>
            <input
              value={placement}
              onChange={(event) => setPlacement(event.target.value)}
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="front_center"
            />
          </div>
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-slate-600">Ink / thread colors</label>
            <input
              type="number"
              min={1}
              value={colors}
              onChange={(event) => setColors(Number(event.target.value) || 1)}
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-medium uppercase tracking-wide text-slate-600">Artwork URL</label>
            <input
              value={artworkUrl}
              onChange={(event) => setArtworkUrl(event.target.value)}
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder={defaultArtworkUrl}
            />
            <p className="mt-1 text-xs text-slate-400">Store artwork in an external bucket and provide the signed or public link.</p>
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-medium uppercase tracking-wide text-slate-600">Artwork notes</label>
            <textarea
              value={artworkNotes}
              onChange={(event) => setArtworkNotes(event.target.value)}
              rows={2}
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="Upload vector art if available; match Pantone 300C"
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-slate-600">Shipping method</label>
            <select
              value={shippingMethod}
              onChange={(event) => setShippingMethod(event.target.value)}
              className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value="standard">Standard</option>
              <option value="expedited">Expedited</option>
              <option value="rush">Rush</option>
              <option value="pickup">Customer Pickup</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-slate-600">In-hand date</label>
            <input
              type="date"
              value={inHandDate}
              onChange={(event) => setInHandDate(event.target.value)}
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-slate-600">Customer PO</label>
            <input
              value={customerPo}
              onChange={(event) => setCustomerPo(event.target.value)}
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="PO-12345"
            />
          </div>
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-slate-600">Rush hours (optional)</label>
            <input
              type="number"
              min={0}
              value={rushHours ?? ""}
              onChange={(event) => setRushHours(event.target.value ? Number(event.target.value) : undefined)}
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="48"
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-slate-600">Ship-to name</label>
            <input
              value={shipToName}
              onChange={(event) => setShipToName(event.target.value)}
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-slate-600">Company</label>
            <input
              value={shipToCompany}
              onChange={(event) => setShipToCompany(event.target.value)}
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-slate-600">Email</label>
            <input
              value={shipToEmail}
              onChange={(event) => setShipToEmail(event.target.value)}
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="logistics@example.com"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-medium uppercase tracking-wide text-slate-600">Address line 1</label>
            <input
              value={shipToAddress1}
              onChange={(event) => setShipToAddress1(event.target.value)}
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-medium uppercase tracking-wide text-slate-600">Address line 2</label>
            <input
              value={shipToAddress2}
              onChange={(event) => setShipToAddress2(event.target.value)}
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-slate-600">City</label>
            <input
              value={shipToCity}
              onChange={(event) => setShipToCity(event.target.value)}
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-slate-600">State</label>
            <input
              value={shipToState}
              onChange={(event) => setShipToState(event.target.value)}
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-slate-600">Postal code</label>
            <input
              value={shipToPostal}
              onChange={(event) => setShipToPostal(event.target.value)}
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-slate-600">Country</label>
            <input
              value={shipToCountry}
              onChange={(event) => setShipToCountry(event.target.value)}
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-slate-600">Phone</label>
            <input
              value={shipToPhone}
              onChange={(event) => setShipToPhone(event.target.value)}
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Customer contact</h3>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-slate-600">Primary contact</label>
              <input
                value={contactName}
                onChange={(event) => setContactName(event.target.value)}
                className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="Ava Merchandiser"
              />
            </div>
            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-slate-600">Email</label>
              <input
                value={contactEmail}
                onChange={(event) => setContactEmail(event.target.value)}
                className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="ava@example.com"
              />
            </div>
            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-slate-600">Phone</label>
              <input
                value={contactPhone}
                onChange={(event) => setContactPhone(event.target.value)}
                className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="555-123-4567"
              />
            </div>
          </div>
        </div>

        {computedUnitPrice && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            <p className="font-semibold">Customer pricing preview</p>
            <p className="mt-1">
              Unit price after 20% markup: <strong>{formatCurrency(computedUnitPrice)}</strong>
            </p>
            <p className="mt-1 text-xs text-emerald-800/80">
              Line total estimate: {formatCurrency(computedLineTotal ?? 0)} (excludes shipping, taxes, and decoration add-ons).
            </p>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Submitting quote…" : "Submit quote for review"}
        </button>
      </form>

      <aside className="space-y-4">
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-900">Results</h3>
          {!result && !error && (
            <p className="mt-2 text-sm text-slate-500">
              Share artwork and shipping details, then submit to see routing, pricing, and a saved quote number.
            </p>
          )}
          {result && result.success && result.pricing && (
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <div>
                <span className="text-xs uppercase tracking-wide text-slate-500">Primary method</span>
                <p className="text-base font-semibold text-slate-900">
                  {result.routing?.summary.primary_method.toUpperCase()}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Subtotal</p>
                  <p className="font-medium text-slate-900">
                    {formatCurrency(result.pricing.summary.subtotal)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Total</p>
                  <p className="font-semibold text-slate-900">
                    {formatCurrency(result.pricing.summary.total)}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Destinations</p>
                <p>{result.routing?.summary.destinations.join(", ")}</p>
              </div>
              {result.pricing.warnings.length > 0 && (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
                  <p className="font-semibold">Warnings</p>
                  <ul className="mt-1 list-disc space-y-1 pl-5">
                    {result.pricing.warnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {savedQuote && (
            <div className="mt-5 space-y-3 rounded-lg border border-blue-200 bg-blue-50 p-4 text-xs text-blue-800">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-blue-900">Saved quote</p>
                <span className="rounded-full bg-blue-100 px-3 py-1 font-mono text-[11px] text-blue-700">
                  {savedQuote.quote_number}
                </span>
              </div>
              <div className="overflow-hidden rounded-md border border-blue-100">
                <table className="w-full text-left">
                  <thead className="bg-blue-100/60 text-[11px] uppercase tracking-[0.2em] text-blue-700">
                    <tr>
                      <th className="px-3 py-2">Supplier</th>
                      <th className="px-3 py-2">SKU</th>
                      <th className="px-3 py-2 text-right">Qty</th>
                      <th className="px-3 py-2 text-right">Unit</th>
                      <th className="px-3 py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-blue-100 bg-white">
                    {savedQuote.items.map((item) => (
                      <tr key={`${item.sku}-${item.color}-${item.size}`}>
                        <td className="px-3 py-2 text-[12px] font-medium text-blue-800">
                          {item.supplier_label ?? item.supplier ?? "—"}
                        </td>
                        <td className="px-3 py-2 text-[12px] text-blue-800">
                          {item.sku || "—"}
                          <div className="text-[11px] text-blue-500/80">
                            {item.product_name || ""}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right text-[12px] text-blue-900">{item.quantity}</td>
                        <td className="px-3 py-2 text-right text-[12px] text-blue-900">
                          {formatCurrency(item.unit_price)}
                        </td>
                        <td className="px-3 py-2 text-right text-[12px] text-blue-900">
                          {formatCurrency(item.pricing.line_total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between text-[12px] text-blue-800">
                <span>Total quoted</span>
                <strong className="text-blue-900">
                  {formatCurrency(savedQuote.total ?? savedQuote.pricing?.summary.grand_total ?? 0, savedQuote.currency ?? undefined)}
                </strong>
              </div>
            </div>
          )}
        </div>

        <div className="card border-slate-200 bg-slate-50 p-5 text-xs text-slate-500">
          <p className="font-semibold text-slate-700">Artwork storage</p>
          <p className="mt-2">
            Replace placeholder artwork URLs with uploaded files in S3 or Supabase Storage. The portal will soon support direct uploads with automatic expiring links.
          </p>
        </div>
      </aside>
    </div>
  );
}


