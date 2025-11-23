## Architecture Overview

### Data Model
- **Supplier** (planned): logical record per vendor (`SANMAR`, `SSACTIVEWEAR`, future `STATON`). Holds type and credential/config JSON so adapters know which API/FTPs to call.
- **Product** (canonical): style-level record with normalized `canonicalSku`, brand, name, descriptions, canonical color/size metadata, media, and marketing attributes. Represents the PromoStandards “style” / “product” concept.
- **SupplierItem** (link table): joins a canonical `Product` to a specific supplier style/color/size. Stores `supplierStyle`, `supplierColor`, `supplierSize`, and any supplier-specific attributes (pricing tiers, fabric flags, packaging). Mirrors PromoStandards `ProductVariation`, letting us map S&S REST items, SanMar CSV rows, or other suppliers’ variants into a unified schema.
- **InventorySnapshot**: per `SupplierItem` & warehouse snapshot with on-hand, future qty, optional future date, and last-updated timestamp. This corresponds directly to PromoStandards Inventory 2.0.0 `WarehouseItem` rows (warehouse code/name + qty). For SanMar DIP, each CSV line becomes a snapshot row.

### Ingest Pipeline
1. **S&S Catalog**
   - `scripts/ingest-ssactivewear-catalog.ts` (currently sample) will be replaced by `scripts/ingest-ss-catalog.ts`.
   - Uses REST API v2 (`/v2/styles`, `/v2/products`) with Basic Auth (AccountNumber/API Key). Fetches style metadata, images, colors, sizes, and SKUs.
   - Mapper converts REST payload → canonical `Product` and `SupplierItem` rows (ensures color/size codes align with PromoStandards conventions).
   - Result persisted via Prisma upsert (Product + SupplierItem + canonical style mapping).
2. **S&S Inventory**
   - `scripts/ingest-ss-inventory.ts` will call S&S PromoStandards Inventory 2.0.0 endpoint (`inventoryservice.svc`).
   - Handles paging / throttling (60 req/min) by monitoring `X-Rate-Limit-Remaining` & `X-Rate-Limit-Reset`.
   - Each `WarehouseItem` is transformed into `InventorySnapshot` entries keyed to the existing `SupplierItem`.
3. **SanMar Catalog**
   - `scripts/ingest-sanmar-catalog.ts` (planned) will orchestrate BulkInfo/DeltaInfo SOAP requests, download CSVs via SFTP (`download-sanmar-ftp.ts`), and parse them (`importSanmarCatalog`).
   - CSV rows are normalized into canonical `Product` + `SupplierItem` (style/color/size). Metadata such as fiber content, case packs, and category tags are stored in JSON attributes, matching PromoStandards fields.
4. **SanMar Inventory**
   - `scripts/ingest-sanmar-inventory.ts` already loads the DIP file (warehouse-level quantities). The importer groups by color/size and writes `InventorySnapshot`.
   - Future enhancement: call SanMar SOAP Inventory service for near-real-time updates.
5. **Generic PromoStandards (Staton/future)**
   - `scripts/ingest-promostandards-catalog.ts` / `ingest-promostandards-inventory.ts` (planned). They will use `src/lib/suppliers/promostandards/client.ts` to call any supplier-provided PromoStandards endpoints, using per-supplier config stored in `Supplier.config`.
   - These scripts pass supplier-specific credentials/URLs, then reuse the same mapper used for S&S & SanMar so new suppliers land in identical tables.

All ingest scripts are idempotent: they upsert based on supplier part IDs and canonical style mapping. Each script can be run manually (`npm run ingest:...`) and will later be scheduled via Vercel Cron (e.g., nightly catalog, hourly inventory).

### Search & Product APIs
- **Search API (`src/app/api/products/search/route.ts`)**
  - Accepts `query`, `limit`, `offset`, optional filters (`supplier`, `inStockOnly`, `sort`).
  - Calls `searchCanonicalStyles` service which runs Postgres FTS over canonical product fields plus supplier metadata.
  - If the query resolves to an exact SKU/style, the response includes a single item and the UI can redirect; otherwise returns a paginated list with metadata (supplier coverage, availability summary).
  - Designed so additional suppliers automatically surface once their `SupplierItem` records exist.
- **Product Detail API (`src/app/api/products/[productId]/route.ts` & `/inventory`)**
  - Serves canonical product metadata (images, descriptions, attributes) plus supplier-specific sections.
  - `product-service.ts` (planned) will fetch a product, join `SupplierItem` records, and include aggregated warehouse inventory from `InventorySnapshot`.
  - Frontend product page displays top-level info and per-supplier tables (SanMar, S&S, Staton). Each table lists warehouses (Dallas, Phoenix, etc.) with on-hand/future qty.

### Frontend Flow
- Header search bar calls `/api/products/search`. Exact SKU queries redirect to `/product/[canonicalSku]`; fuzzy queries show grouped results (one card per canonical product with supplier badges).
- Category pages filter via query params (brand, category, color) hitting the same search API.
- Product detail page calls both `product` and `inventory` endpoints to render shared info + supplier breakdown, powering “Add to Cart” actions for each supplier line.

With this architecture, adding a new supplier is mostly configuration: supply PromoStandards or FTP/SOAP credentials, point the generic client at their endpoints, and run the ingest scripts to populate `Supplier`, `SupplierItem`, and `InventorySnapshot` rows. Search/product APIs automatically reflect the new data. 


