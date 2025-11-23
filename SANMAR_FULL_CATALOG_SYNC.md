# SanMar Full Catalog Sync

## Current Status

**Current Products in Database**: 203 canonical styles  
**SanMar's Full Catalog**: Thousands of products available via FTP CSV or SOAP API

## The Issue

The system currently only has 203 styles because:
1. Only specific styles were manually ingested
2. The full catalog sync hasn't been run yet

## Solution: Sync ALL SanMar Products

You have **TWO options** to get ALL SanMar products:

### Option 1: FTP/CSV Import (RECOMMENDED) ✅

**You already have the required credentials!**

**Command**:
```powershell
cd C:\customer-portal
npx tsx scripts/sync-sanmar-full-catalog-ftp.ts
```

**Dry Run (Test First)**:
```powershell
npx tsx scripts/sync-sanmar-full-catalog-ftp.ts --dryRun
```

**What it does**:
1. Downloads `SanMar_SDL_N.csv` from SanMar FTP (using your existing FTP credentials)
2. Imports ALL products from the CSV file
3. Creates/updates Product records
4. Auto-links to CanonicalStyles

**Required Environment Variables** (You already have these):
```
SANMAR_FTP_HOST=ftp.sanmar.com
SANMAR_FTP_PORT=2200
SANMAR_FTP_USERNAME=<your-username>
SANMAR_FTP_PASSWORD=<your-password>
SANMAR_FTP_REMOTE_DIR=SanmarPDD
```

### Option 2: SOAP API

**Requires additional credentials from SanMar**

**Command**:
```powershell
cd C:\customer-portal
npx tsx scripts/sync-sanmar-full-catalog.ts
```

**Dry Run (Test First)**:
```powershell
npx tsx scripts/sync-sanmar-full-catalog.ts --dryRun
```

### Step 2: Required Environment Variables

**For Option 1 (FTP/CSV)** - You already have these:
```
SANMAR_FTP_HOST=ftp.sanmar.com
SANMAR_FTP_PORT=2200
SANMAR_FTP_USERNAME=<your-username>
SANMAR_FTP_PASSWORD=<your-password>
SANMAR_FTP_REMOTE_DIR=SanmarPDD
```

**For Option 2 (SOAP API)** - Contact SanMar to get these:
```
SANMAR_PRODUCT_WSDL=<your-wsdl-url>
SANMAR_USER=<your-username>
SANMAR_PASSWORD=<your-password>
SANMAR_PRODUCT_ENDPOINT=<optional-endpoint>
SANMAR_SOAP_NAMESPACE_PREFIX=tem
SANMAR_SOAP_NAMESPACE_URI=http://tempuri.org/
SANMAR_CATALOG_PAGE_SIZE=100
```

**To get SOAP credentials, contact SanMar Integration Support:**
- **Toll-Free**: (800) 426-6399, ext 6458
- **Direct**: 206-727-6458
- **Email**: samarintegrations@sanmar.com

### Step 3: What the Sync Does

1. **Fetches ALL products** from SanMar's SOAP API (paginated)
2. **Creates/Updates** Product records in database
3. **Links to CanonicalStyles** automatically (using `guessCanonicalStyleNumber`)
4. **Includes**:
   - Product details (name, brand, description)
   - Colors, sizes, media, SKUs
   - Keywords for search

### Step 4: Expected Results

After running the full sync, you should see:
- **Thousands of products** (SanMar has 10,000+ SKUs)
- **All brands** (Gildan, Port & Company, Bella+Canvas, etc.)
- **All product categories** (T-shirts, polos, sweatshirts, etc.)

### Step 5: Verification

After sync completes, verify:
```powershell
# Count total products
npx tsx -e "import { prisma } from './src/lib/prisma'; (async () => { const count = await prisma.product.count({ where: { supplierPartId: { not: { startsWith: 'SM' } } } }); console.log('SanMar Products:', count); await prisma.\$disconnect(); })()"

# Count canonical styles
npx tsx -e "import { prisma } from './src/lib/prisma'; (async () => { const count = await prisma.canonicalStyle.count(); console.log('Canonical Styles:', count); await prisma.\$disconnect(); })()"

# Run full catalog verification
npx tsx scripts/verify-full-catalog.ts https://customer-portal-8c0ukofmv-promos-ink.vercel.app
```

## Important Notes

1. **Time**: Full catalog sync may take 30-60 minutes depending on API response times
2. **Rate Limiting**: The sync respects API rate limits automatically
3. **Incremental Updates**: After initial sync, you can use `--modifiedSince=<date>` to sync only changes
4. **Canonical Mapping**: Products are automatically linked to canonical styles using `guessCanonicalStyleNumber`

## Troubleshooting

### If sync fails:
1. Check API credentials in `.env.local`
2. Verify SOAP endpoint is accessible
3. Check network connectivity
4. Review error messages for specific issues

### If products don't appear:
1. Check `Product` table: `SELECT COUNT(*) FROM "Product" WHERE "supplierPartId" NOT LIKE 'SM%'`
2. Check `CanonicalStyle` table: `SELECT COUNT(*) FROM "CanonicalStyle"`
3. Verify canonical style linking worked

## Next Steps After Full Sync

1. **Run inventory sync**: `npx tsx scripts/ingest-sanmar-inventory.ts`
2. **Verify all products**: `npx tsx scripts/verify-full-catalog.ts <prod-url>`
3. **Test search**: Search for various SKUs to confirm they're findable

