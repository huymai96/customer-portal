# Supplier Integration Notes

## Environment Variables

### S&S Activewear (REST + PromoStandards Inventory)
- `SSACTIVEWEAR_ACCOUNT_NUMBER`
- `SSACTIVEWEAR_API_KEY`
- Optional overrides: `SSACTIVEWEAR_REST_BASE_URL`, `SSACTIVEWEAR_PROMOSTANDARDS_BASE_URL` (defaults are bundled in `integrations/ssactivewear/config.ts`).

### SanMar (BulkInfo/DeltaInfo + DIP Inventory)
- `SANMAR_FTP_HOST`, `SANMAR_FTP_PORT`, `SANMAR_FTP_USERNAME`, `SANMAR_FTP_PASSWORD`, `SANMAR_FTP_REMOTE_DIR`
- `SANMAR_LOCAL_DIR` (where CSV/DIP files are downloaded; defaults to `tmp/sanmar`)
- `SANMAR_PRODUCT_WSDL`, `SANMAR_PRODUCT_ENDPOINT`
- `SANMAR_USER`, `SANMAR_PASSWORD` (SOAP auth)
- `SANMAR_PROMOSTANDARDS_USERNAME`, `SANMAR_PROMOSTANDARDS_PASSWORD`, `SANMAR_ACCOUNT_NUMBER`
- `SANMAR_DIP_PATH` (if the DIP file lives outside `SANMAR_LOCAL_DIR`)

## Deploy Checklist

1. **Database**
   - Run `prisma migrate deploy`.
2. **Initial Catalog Load**
   - `npm run ingest:sanmar:catalog`
   - `npm run ingest:ssa:catalog:all`
3. **Initial Inventory Load**
   - `npm run ingest:sanmar:inventory`
   - `npm run ingest:ssa:inventory:sample` (or a bigger loop via cron)
4. **Verify Canonical Links**
   - `SELECT * FROM "CanonicalStyle" WHERE "styleNumber" = '5000';`
   - Confirm links exist for both suppliers before exposing search/product detail.
5. **Cron Scheduling (Vercel)**
   - Nightly catalog: trigger `npm run ingest:sanmar:catalog` and `npm run ingest:ssa:catalog:all`.
   - Hourly inventory: trigger SanMar DIP + S&S inventory sample/full jobs.


