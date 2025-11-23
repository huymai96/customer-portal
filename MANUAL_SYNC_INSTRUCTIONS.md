# Manual S&S Activewear Inventory Sync Instructions

## Quick Sync for A230

To manually re-sync A230's inventory (including warehouses) right now:

```powershell
cd C:\customer-portal
npx tsx scripts/sync-ssa-inventory-manual.ts A230
```

**Required Environment Variables:**
- `SSACTIVEWEAR_ACCOUNT_NUMBER` - Your S&S Activewear account number
- `SSACTIVEWEAR_API_KEY` - Your S&S Activewear API key

These should already be in your `.env.local` file.

## Sync All S&S Products

To sync all S&S Activewear products (limit 100 per run):

```powershell
cd C:\customer-portal
npx tsx scripts/sync-ssa-inventory-manual.ts
```

## Safety & Idempotency

✅ **Safe to run multiple times** - The script uses `upsert` operations, so:
- Existing inventory rows are updated (not duplicated)
- Warehouse data is merged correctly
- No data loss or corruption
- Can be run repeatedly without issues

## What the Script Does

1. Fetches inventory data from S&S Activewear API for the specified product(s)
2. Extracts warehouse information from the API response
3. Stores/updates inventory rows in the database with:
   - `totalQty` - Total quantity across all warehouses
   - `warehouses` - Array of warehouse-specific quantities
4. Uses the same logic as the cron job (now fixed to store warehouses)

## Verification After Sync

After running the sync, verify A230 has warehouses:

```powershell
# Check A230 inventory in database
npx tsx scripts/check-a230-warehouses.ts

# Or check via health endpoint
curl https://customer-portal-[your-url].vercel.app/api/internal/catalog/health | jq '.issues[] | select(.styleNumber == "ADI-A230")'
```

## Expected Results

After syncing A230, you should see:
- All 152 inventory rows have `warehouses` array populated (not null)
- Health check shows A230 with warehouses > 0
- Full catalog verification passes for A230

