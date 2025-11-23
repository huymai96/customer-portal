# Cart Migration Instructions

## Production Database Migration

To apply the Cart and CartLine tables to your production database, run the following command:

### Prerequisites

1. **Environment Variable**: You must have `DATABASE_URL` set to your production PostgreSQL connection string.
   - This should be the same `DATABASE_URL` that Vercel production uses.
   - Format: `postgresql://user:password@host:port/database?schema=portal_catalog`

2. **Access**: You need direct database access (not through Vercel's UI, but via a local connection or SSH tunnel).

### Migration Command

**From your local machine** (with production `DATABASE_URL` in environment):

```bash
cd C:\customer-portal
npx prisma migrate deploy --schema=prisma/schema.prisma
```

**Or if using environment file:**

```bash
cd C:\customer-portal
# Set DATABASE_URL to production value
$env:DATABASE_URL="postgresql://user:password@host:port/database?schema=portal_catalog"
npx prisma migrate deploy --schema=prisma/schema.prisma
```

### What This Does

The migration file `prisma/migrations/20251115000000_add_cart_tables/migration.sql` will:

1. Create `CartStatus` enum (ACTIVE, SUBMITTED, ARCHIVED)
2. Create `Cart` table with:
   - `id` (TEXT, primary key)
   - `status` (CartStatus, default ACTIVE)
   - `userId`, `companyId` (optional TEXT)
   - `createdAt`, `updatedAt` (timestamps)
   - Index on `status`
3. Create `CartLine` table with:
   - `id` (TEXT, primary key)
   - `cartId` (TEXT, foreign key to Cart)
   - `canonicalStyleId`, `canonicalStyleNumber`, `displayName`, `brand`
   - `supplier` (SupplierSource enum)
   - `supplierPartId`, `colorCode`, `colorName`
   - `sizeQuantities` (JSONB)
   - `metadata` (JSONB, optional)
   - `createdAt`, `updatedAt` (timestamps)
   - Index on `cartId`
   - Unique constraint on `(cartId, supplierPartId, colorCode)`
   - Foreign key constraint to `Cart(id)` with CASCADE delete

### Verification

After running the migration, verify the tables exist:

```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'portal_catalog' 
AND table_name IN ('Cart', 'CartLine');
```

You should see both `Cart` and `CartLine` in the results.

### Important Notes

- The migration uses `IF NOT EXISTS` for tables and indexes, so it's safe to run multiple times.
- The foreign key constraint uses a `DO $$` block to check if it already exists before adding.
- This migration does NOT delete or modify any existing data.
- After migration, the cart API endpoints (`/api/cart`, `/api/cart/lines`) will work correctly.

### Alternative: Run via Vercel

If you cannot run migrations directly from your machine, you can:

1. Add a Vercel build command that runs migrations:
   ```json
   {
     "scripts": {
       "vercel-build": "prisma generate && prisma migrate deploy && next build"
     }
   }
   ```

2. Or use Vercel's database dashboard to run the SQL manually (copy the contents of `prisma/migrations/20251115000000_add_cart_tables/migration.sql`).



