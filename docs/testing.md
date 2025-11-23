# Testing Guide

## 1. Data Ingest Smoke Tests

These steps verify SanMar + S&S data pipes before deploying.

### S&S (REST) Catalog + Inventory
```bash
# ingest a single S&S style (e.g., 5000)
npm run ingest:ssa:catalog 5000

# ingest sample inventory for a couple of styles
npm run ingest:ssa:inventory:sample
```
Validate in Postgres (or Prisma Studio):
- `SELECT * FROM "Product" WHERE "supplierPartId" = '5000';`
- `SELECT * FROM "ProductInventory" WHERE "supplierPartId" = '5000';`
- `SELECT * FROM "SupplierProductLink" WHERE "supplierPartId" = '5000';`

### SanMar (CSV/SOAP) Catalog + Inventory
```bash
# ingest catalog (BulkInfo/DeltaInfo + CSV)
npm run ingest:sanmar:catalog

# ingest DIP inventory
npm run ingest:sanmar:inventory
```
Validate:
- `SELECT * FROM "Product" WHERE "supplierPartId" = 'G500';`
- `SELECT * FROM "ProductInventory" WHERE "supplierPartId" = 'G500';`
- `SELECT * FROM "SupplierProductLink" WHERE "supplierPartId" = 'G500';`
- `SELECT * FROM "CanonicalStyle" WHERE "styleNumber" = '5000';` (should have links for both suppliers).

## 2. API Smoke Tests

### Search (direct hit)
```
GET /api/products/search?query=5000
```
Expect:
- `meta.directHit === true`
- `items.length === 1`
- `items[0].canonicalStyleId` present (use it below).

### Canonical detail
```
GET /api/products/<canonicalStyleId>
```
Expect `suppliers` array to include both `"SANMAR"` and `"SSACTIVEWEAR"` entries, each with product + inventory data.

## 3. UI Smoke Tests

1. Navigate to `/product/<canonicalStyleId>` (use the ID from search).
2. Confirm:
   - Canonical header shows style number, brand, display name.
   - Tabs/accordion for each supplier.
   - Color × size inventory matrix per supplier.
   - Warehouse summary cards per supplier.


