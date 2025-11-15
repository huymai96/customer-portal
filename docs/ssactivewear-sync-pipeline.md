# SSActivewear Sync Pipeline

Automated wholesale catalog integration for SSActivewear.

## Overview

The SSActivewear integration behaves like a real wholesale catalog sync, automatically pulling all 6,214+ styles and keeping inventory current without manual SKU-by-SKU ingests.

## Sync Scripts

### 1. Full Catalog Sync
**Script:** `npm run sync:ssa:full`  
**Purpose:** Initial bulk import of entire SSActivewear catalog  
**Frequency:** Run once initially, then monthly for full refresh  
**Duration:** ~2-3 hours for full catalog (6,214 styles)

```bash
# Sync entire catalog
npm run sync:ssa:full

# Sync specific brands only
npm run sync:ssa:full -- --brands "Gildan,Adidas,Nike"

# Test with first 100 styles
npm run sync:ssa:full -- --limit 100

# Dry run (no database changes)
npm run sync:ssa:full -- --dry-run
```

### 2. Incremental Sync
**Script:** `npm run sync:ssa:incremental`  
**Purpose:** Sync only NEW styles added since last sync  
**Frequency:** Every 6 hours (automated via Vercel cron)  
**Duration:** 5-15 minutes (typically 10-50 new styles)

```bash
# Sync new styles
npm run sync:ssa:incremental

# Sync styles from last 7 days
npm run sync:ssa:incremental -- --days 7
```

**Automated:** Runs every 6 hours via `/api/cron/sync-ssactivewear-incremental`

### 3. Inventory Sync
**Script:** `npm run sync:ssa:inventory`  
**Purpose:** Update current stock levels for all SSActivewear products  
**Frequency:** Every 4 hours (automated via Vercel cron)  
**Duration:** ~2 hours for full inventory (100 products per run)

```bash
# Sync inventory for all products
npm run sync:ssa:inventory

# Sync specific brands
npm run sync:ssa:inventory -- --brands "Gildan"

# Test with first 100 products
npm run sync:ssa:inventory -- --limit 100
```

**Automated:** Runs every 4 hours via `/api/cron/sync-ssactivewear-inventory`

## Automation

### Vercel Cron Jobs

Configured in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/sync-ssactivewear-incremental",
      "schedule": "0 */6 * * *"
    },
    {
      "path": "/api/cron/sync-ssactivewear-inventory",
      "schedule": "0 */4 * * *"
    }
  ]
}
```

**Required Environment Variable:**
```
CRON_SECRET=<random-secret-string>
```

Set this in Vercel dashboard → Project Settings → Environment Variables.

### Manual Triggers

You can manually trigger cron jobs for testing:

```bash
curl -X GET https://portal.promosinkwall-e.com/api/cron/sync-ssactivewear-incremental \
  -H "Authorization: Bearer $CRON_SECRET"
```

## Rate Limiting

SSActivewear API limits: **60 requests per minute**

All sync scripts automatically enforce rate limiting:
- 1.1 second delay between requests
- Reads `X-Rate-Limit-Remaining` header
- Backs off when limit approached

## Data Flow

```
SSActivewear API
    ↓
1. Fetch all styles (/v2/styles/)
    ↓
2. For each style, fetch products (/v2/products/?partnumber=...)
    ↓
3. Upsert to Product table (colors, sizes, SKUs, media)
    ↓
4. Link to CanonicalStyle table
    ↓
5. Portal search indexes canonical styles
```

## Monitoring

Check sync status in logs:

```bash
# Vercel logs
vercel logs --follow

# Local test
node scripts/sync-ssa-full-with-env.mjs --limit 10
```

## Initial Setup

1. **Set credentials** in `.env.local`:
```
SSACTIVEWEAR_ACCOUNT_NUMBER=72555
SSACTIVEWEAR_API_KEY=2205ef54-d443-48d2-aeee-58c81f73faed
```

2. **Run full sync** (one time):
```bash
node scripts/sync-ssa-full-with-env.mjs --brands "Gildan,Adidas,Nike,Port Authority,Bella+Canvas"
```

3. **Deploy to Vercel** with cron secret:
```bash
vercel env add CRON_SECRET production
# Enter a random secret string
vercel --prod
```

4. **Automated syncs** will run every 4-6 hours

## Troubleshooting

### "Missing required environment variable: SSACTIVEWEAR_ACCOUNT_NUMBER"
Set credentials in `.env.local` or Vercel environment variables.

### "401 Unauthorized"
Check that account number and API key are correct.

### "Rate limit exceeded"
Scripts automatically handle rate limiting. If you see this, wait 1 minute and retry.

### Sync taking too long
Use `--limit` flag for testing:
```bash
npm run sync:ssa:full -- --limit 50
```

### Cron job not running
1. Check `CRON_SECRET` is set in Vercel
2. Verify cron schedule in `vercel.json`
3. Check Vercel deployment logs

## Performance

- **Full catalog sync:** ~2-3 hours (6,214 styles)
- **Incremental sync:** 5-15 minutes (10-50 new styles)
- **Inventory sync:** ~2 hours (100 products per run)
- **Rate:** ~1 style per second (60/min API limit)

## Database Impact

- **Products:** One record per style (partNumber)
- **Colors:** Multiple records per product
- **Sizes:** Multiple records per product
- **SKUs:** One record per color-size combination
- **Media:** Multiple images per color
- **CanonicalStyles:** One record per unique style across suppliers
- **ProductInventory:** Real-time stock levels per SKU

## Next Steps

- [ ] Add webhook support for real-time inventory updates
- [ ] Implement delta sync (only update changed products)
- [ ] Add brand/category filters to automated syncs
- [ ] Create admin dashboard for sync status/logs
- [ ] Add Slack/email notifications for sync failures

