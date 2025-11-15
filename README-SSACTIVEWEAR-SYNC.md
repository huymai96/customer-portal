# SSActivewear Wholesale Catalog Integration

## Quick Start

### Initial Setup (One Time)

1. **Set credentials** in Vercel environment variables:
   ```
   SSACTIVEWEAR_ACCOUNT_NUMBER=72555
   SSACTIVEWEAR_API_KEY=2205ef54-d443-48d2-aeee-58c81f73faed
   CRON_SECRET=<generate-random-secret>
   ```

2. **Run initial full sync** (locally or via Vercel):
   ```bash
   # Option A: Sync popular brands (recommended for testing)
   node scripts/sync-ssa-full-with-env.mjs --brands "Gildan,Adidas,Nike,Port Authority,Bella+Canvas"
   
   # Option B: Sync entire catalog (6,214+ styles, ~2-3 hours)
   node scripts/sync-ssa-full-with-env.mjs
   ```

3. **Deploy to Vercel** - automated syncs will start running every 4-6 hours

## Sync Types

### 1. Full Catalog Sync
- **Purpose:** Initial bulk import or monthly refresh
- **Command:** `npm run sync:ssa:full`
- **Duration:** ~2-3 hours for 6,214 styles
- **Frequency:** Run once, then monthly

```bash
# Test with 10 styles
npm run sync:ssa:full -- --limit 10 --dry-run

# Sync specific brands
npm run sync:ssa:full -- --brands "Gildan,Adidas"

# Full catalog
npm run sync:ssa:full
```

### 2. Incremental Sync (Automated)
- **Purpose:** Sync only NEW styles
- **Schedule:** Every 6 hours via Vercel cron
- **Duration:** 5-15 minutes (10-50 new styles)
- **Endpoint:** `/api/cron/sync-ssactivewear-incremental`

```bash
# Manual test
npm run sync:ssa:incremental

# Trigger cron job
curl -X GET https://portal.promosinkwall-e.com/api/cron/sync-ssactivewear-incremental \
  -H "Authorization: Bearer $CRON_SECRET"
```

### 3. Inventory Sync (Automated)
- **Purpose:** Update stock levels
- **Schedule:** Every 4 hours via Vercel cron
- **Duration:** ~2 hours (100 products per run)
- **Endpoint:** `/api/cron/sync-ssactivewear-inventory`

```bash
# Manual test
npm run sync:ssa:inventory -- --limit 10

# Trigger cron job
curl -X GET https://portal.promosinkwall-e.com/api/cron/sync-ssactivewear-inventory \
  -H "Authorization: Bearer $CRON_SECRET"
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    SSActivewear API                         │
│                  (6,214+ styles available)                  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ Rate Limited: 60 req/min
                     │
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
┌──────────────┐          ┌──────────────┐
│ Full Sync    │          │ Incremental  │
│ (Monthly)    │          │ (Every 6h)   │
└──────┬───────┘          └──────┬───────┘
       │                         │
       └────────┬────────────────┘
                │
                ▼
┌────────────────────────────────────────┐
│          Customer Portal DB            │
│                                        │
│  • Product (styles, colors, sizes)    │
│  • CanonicalStyle (unified search)    │
│  • ProductInventory (stock levels)    │
└────────────────────────────────────────┘
                │
                ▼
┌────────────────────────────────────────┐
│         Portal Search/Catalog          │
│   (A230, PC43, 5000, etc. searchable)  │
└────────────────────────────────────────┘
```

## What Gets Synced

### Product Data
- ✅ Style metadata (brand, name, description)
- ✅ Colors (with swatch images)
- ✅ Sizes (with sort order)
- ✅ SKUs (color-size combinations)
- ✅ Product images (front, back, side)
- ✅ Canonical style linking

### Inventory Data
- ✅ Per-SKU quantities
- ✅ Warehouse-level stock
- ✅ Last updated timestamps

## Monitoring

### Check Sync Status

```bash
# Vercel logs
vercel logs --follow

# Check database
npm run verify-a230  # Custom verification script
```

### Verify Specific Style

```bash
# Test A230 lookup
node scripts/test-ssa-a230.mjs

# Verify in database
node scripts/verify-a230.mjs
```

## Rate Limiting

SSActivewear enforces **60 requests per minute**. All scripts automatically:
- Wait 1.1 seconds between requests
- Read `X-Rate-Limit-Remaining` header
- Back off when limit approached

## Troubleshooting

### "No products found for A230"
The style exists but SSActivewear uses `partNumber` (not styleName) for product lookups:
- ✅ Search `/v2/styles/?search=A230` → get `partNumber: 81053`
- ✅ Fetch `/v2/products/?partnumber=81053` → get 88 SKUs

### "Missing DATABASE_URL"
Scripts need `.env.local` loaded. Use wrapper scripts:
```bash
node scripts/sync-ssa-full-with-env.mjs
node scripts/ingest-ssa-with-env.mjs A230
```

### Cron jobs not running
1. Set `CRON_SECRET` in Vercel environment variables
2. Check `vercel.json` cron schedule
3. Verify deployment logs in Vercel dashboard

## Performance

| Operation | Duration | Frequency |
|-----------|----------|-----------|
| Full sync (6,214 styles) | ~2-3 hours | Monthly |
| Incremental sync | 5-15 min | Every 6h |
| Inventory sync (100 products) | ~2 hours | Every 4h |
| Single style ingest | ~1-2 sec | On demand |

## Files

### Scripts
- `scripts/sync-ssactivewear-full-catalog.ts` - Full catalog sync
- `scripts/sync-ssactivewear-incremental.ts` - New styles only
- `scripts/sync-ssactivewear-inventory.ts` - Stock level updates
- `scripts/sync-ssa-full-with-env.mjs` - Wrapper with env loading

### API Routes (Cron Jobs)
- `src/app/api/cron/sync-ssactivewear-incremental/route.ts`
- `src/app/api/cron/sync-ssactivewear-inventory/route.ts`

### Integration
- `src/integrations/ssactivewear/config.ts` - Credentials & normalization
- `src/integrations/ssactivewear/rest-client.ts` - API client with rate limiting
- `src/integrations/ssactivewear/rest-parser.ts` - Response parsing

### Configuration
- `vercel.json` - Cron job schedules
- `package.json` - npm scripts

## Next Steps

After initial sync completes:

1. **Verify search works:**
   ```bash
   # Should return Adidas A230
   curl https://portal.promosinkwall-e.com/api/products/search?query=A230
   ```

2. **Check portal UI:**
   - Navigate to https://portal.promosinkwall-e.com/portal/catalog
   - Search for "A230" or "Gildan 5000"
   - Verify results appear

3. **Monitor automated syncs:**
   - Check Vercel logs every 4-6 hours
   - Verify new styles appear in portal

## Support

For issues or questions:
- Check `docs/ssactivewear-sync-pipeline.md` for detailed documentation
- Review Vercel deployment logs
- Test individual styles with `node scripts/test-ssa-a230.mjs`

