## Supplier-Aware Catalog Roadmap

### Objectives
- Make the entire SanMar + S&S Activewear catalog searchable via one canonical index.
- Keep supplier data discrete (inventory, pricing, media) while enabling cross-supplier comparison per style.
- Feed supplier-aware cart and decoration flows without losing procurement details.

### Current State (2025-11-15 Audit)
- `Product` table: 4,128 SSA styles imported; SanMar catalog missing (only 4 products linked).
- `ProductInventory`: 161,696 rows in DB but not surfaced in the new canonical product UI.
- `CanonicalStyle`: 201 entries total. Only **2** styles have both suppliers; **198** are S&S-only, **1** SanMar-only.
- Supplier links: 206 total (SANMAR: 6, SSA: 200). Four links point to missing `Product` rows → ingestion drift.
- New `/portal/catalog/[canonicalSku]` + `/search` still read from `data/canonical-mapping.json` + mock suppliers, so the real catalog is unused.

### Workstream 1 – Canonical Data Model
1. **Define source of truth**  
   - Canonical style lives in Prisma (`CanonicalStyle`, `SupplierProductLink`).  
   - Add optional fields: `aliases[]`, `primaryCategory`, `tags`, `priorityBrand`.  
   - Introduce `CanonicalStyleAlias` table for search synonyms.
2. **Link hygiene**  
   - Enforce foreign key from `SupplierProductLink` → `Product` (nullable now).  
   - Add constraint ensuring each canonical style has at least one link.
3. **Automation**  
   - Extend ingest scripts to call `ensureCanonicalStyleLink` and assign deterministic style numbers (prefer supplier part if numeric, else brand-prefixed slug).  
   - Write `scripts/rebuild-canonical.ts` to reconcile existing products + links (detect duplicates, merge brands).

### Workstream 2 – Supplier Ingest
1. **SanMar full sync (blocking)**  
   - Run `scripts/sync-sanmar-catalog.ts` end-to-end; fix authentication + pagination issues.  
   - Map SanMar attributes to Prisma schema (colors/sizes/media).  
   - Ingest SanMar inventory snapshots (`ingest-sanmar-inventory.ts`) and ensure warehouses persist.
2. **S&S parity**  
   - Finish `sync-ssactivewear-full-catalog.ts` run (only 4k of ~7k styles imported).  
   - Add delta strategies: nightly incremental (by modified date) + hourly inventory.
3. **Observability**  
   - Write `scripts/audit-catalog.ts` output to JSON and push metrics (counts, failures) to monitoring.  
   - Store supplier API responses in `tmp/` with TTL for reproducibility.

### Workstream 3 – Search & Product Experience
1. **Server-backed search**  
   - Replace `src/lib/search.ts` logic with Prisma queries (`canonicalStyle` + `supplierLinks` + `Product`).  
   - Support filters by supplier, category, in-stock.  
   - Add alias lookup table for exact-SKU routing.
2. **Canonical product page**  
   - Fetch supplier data via Prisma -> `Product` + `ProductInventory` grouped by warehouse.  
   - Render warehouse tables (Dallas, Cincinnati, etc.) with collapse/expand per site.  
   - Pull live images + description from actual product records (no mocks).
3. **Caching strategy**  
   - Use Redis/Vercel KV for short-lived supplier API calls (15 min).  
   - Cache canonical search results (query hash) for 60s to keep response <500ms.

### Workstream 4 – Cart & Decoration Readiness
1. **Cart line schema** (already updated client type)  
   - Persist canonicalSku + supplierStyle per line in storage/DB.  
   - Validate add-to-cart forms only present sizes/colors available per supplier.
2. **Decoration workflow**  
   - Ensure downstream order payload includes supplier info + canonical mapping for procurement.  
   - Auto-suggest decoration placements based on supplier garment type (requires attributes from ingest).

### Suggested Sequencing
1. Finish canonical schema adjustments + migration (aliases, FK).  
2. Bring SanMar ingest to parity; rerun S&S full sync → verify via `audit-catalog`.  
3. Rebuild canonical table and remove JSON fallback.  
4. Point search/product routes at Prisma + add caching.  
5. Enhance cart/decor flows once catalog data is reliable.

### Risks & Mitigations
- **API rate limits**: Respect 60 req/min for S&S, 30 req/min for SanMar; batch fetch where possible.  
- **Data drift**: Schedule nightly audit report; fail CI if supplier links exist without `Product`.  
- **Vercel function timeouts**: Keep search queries DB-only; offload heavy ETL to cron jobs or background workers.

