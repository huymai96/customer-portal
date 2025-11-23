# SanMar Web Services Integration Review

## Current Implementation Status

Based on the codebase review, here's what's already implemented:

### ✅ What's Already Built

1. **SOAP Client Infrastructure** (`src/lib/sanmar/soapClient.ts`)
   - Generic SOAP client using `strong-soap`
   - Authentication header builder
   - Operation invocation helper

2. **Catalog Sync Function** (`src/services/sanmar/catalog.ts`)
   - Paginated product fetching
   - Product normalization
   - Database upsert logic
   - Automatic canonical style linking

3. **Expected SOAP Operations**
   - `GetProducts` (default)
   - `GetProductData` (alternative)
   - Supports pagination via `Page` and `PageSize` fields

4. **Expected Response Structure**
   - `GetProductsResult.Products.Product`
   - `GetProductDataResult.Products.Product`
   - `Products.Product`
   - `ProductData.Products.Product`

### ❓ What We Need from the PDF Guide

To complete the SOAP integration, we need:

1. **WSDL URL**
   - Product catalog WSDL endpoint
   - Format: `https://ws.sanmar.com/.../ProductService.wsdl` (example)

2. **SOAP Operation Names**
   - Exact operation name for fetching products
   - Any additional operations available

3. **Request Structure**
   - Required fields for product requests
   - Pagination field names (currently defaults to `Page`, `PageSize`)
   - Filter options (brand, category, etc.)

4. **Response Structure**
   - Exact XML path to products array
   - How pagination info is returned
   - Field mappings (supplierPartId, colors, sizes, media, etc.)

5. **Authentication**
   - SOAP header format (currently using `tem:Authentication`)
   - Namespace URIs
   - Any additional auth requirements

6. **Endpoint URLs**
   - Base endpoint URL
   - Any version-specific endpoints

## Next Steps

Please share from the PDF:

1. **WSDL URL** for product catalog service
2. **Operation name** (e.g., `GetProducts`, `GetProductData`)
3. **Sample request XML** structure
4. **Sample response XML** structure
5. **Authentication requirements** (if different from current implementation)

Or, if you prefer, you can use the **FTP/CSV method** which you already have credentials for:
```powershell
npx tsx scripts/sync-sanmar-full-catalog-ftp.ts
```

This will get ALL products without needing SOAP credentials.

