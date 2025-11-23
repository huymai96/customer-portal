# SanMar FTP Integration Review

## Current Implementation Status

### ✅ What's Already Implemented

1. **SFTP Client** (`src/services/sanmar/sftp.ts`)
   - SFTP connection using `ssh2-sftp-client`
   - File download functionality
   - Configurable remote directory
   - Concurrent file downloads

2. **FTP Download Script** (`scripts/download-sanmar-ftp.ts`)
   - Downloads multiple files from SanMar FTP
   - Default files: `SanMar_SDL_N.csv`, `SanMar_EPDD.csv`, `sanmar_dip.txt`
   - Configurable via `SANMAR_FTP_FILES` environment variable

3. **File Processing**
   - **SDL (Catalog)**: `scripts/ingest-sanmar-local.ts` - Imports product catalog
   - **DIP (Inventory)**: `src/services/sanmar/dip-importer.ts` - Imports inventory with warehouses
   - **EPDD**: Currently downloaded but not processed

4. **Current Configuration**
   ```
   SANMAR_FTP_HOST=ftp.sanmar.com
   SANMAR_FTP_PORT=2200
   SANMAR_FTP_USERNAME=<your-username>
   SANMAR_FTP_PASSWORD=<your-password>
   SANMAR_FTP_REMOTE_DIR=SanmarPDD
   ```

### 📋 Files Currently Being Downloaded

1. **SanMar_SDL_N.csv** - Product catalog (SDL = SanMar Data Library)
   - ✅ Processed via `importSanmarCatalog()`
   - Contains: Products, colors, sizes, media, SKUs

2. **SanMar_EPDD.csv** - Extended Product Data (EPDD)
   - ⚠️ Downloaded but NOT processed
   - May contain additional product details

3. **sanmar_dip.txt** - Daily Inventory Position (DIP)
   - ✅ Processed via `importSanmarDipInventory()`
   - Contains: Inventory by warehouse, color, size

### ❓ What We Need from the PDF Guide

To ensure complete FTP integration, please share:

1. **Available Files on FTP**
   - Complete list of files available in `SanmarPDD` directory
   - File naming conventions
   - Update frequency (daily, weekly, etc.)

2. **File Formats**
   - SDL file structure (columns, delimiters)
   - EPDD file structure and purpose
   - DIP file structure (currently pipe-delimited)
   - Any other file types (pricing, images, etc.)

3. **File Processing Requirements**
   - Should EPDD be processed? What data does it contain?
   - Are there other files we should download?
   - File update schedules

4. **Best Practices**
   - When to download files (time of day)
   - How to handle file updates
   - File versioning/naming

5. **Order Submission via FTP**
   - Can orders be submitted via FTP?
   - File format for order submission
   - Response/confirmation file format

## Current Workflow

### Catalog Sync (SDL)
```powershell
# Download SDL file
npx tsx scripts/download-sanmar-ftp.ts

# Import catalog
npx tsx scripts/ingest-sanmar-local.ts
```

### Inventory Sync (DIP)
```powershell
# Download DIP file (included in download script)
npx tsx scripts/download-sanmar-ftp.ts

# Import inventory
npx tsx scripts/ingest-sanmar-inventory.ts
```

### Full Catalog Sync (All Products)
```powershell
# Download and import in one step
npx tsx scripts/sync-sanmar-full-catalog-ftp.ts
```

## Potential Improvements

Based on typical FTP integration patterns:

1. **EPDD Processing**
   - Currently downloaded but not used
   - May contain extended product details (pricing, attributes, etc.)

2. **Incremental Updates**
   - Check file modification dates
   - Only download/process changed files

3. **File Validation**
   - Verify file integrity
   - Handle partial downloads
   - Retry logic for failed downloads

4. **Order Submission**
   - Upload order files to FTP
   - Monitor for confirmation files

## Next Steps

Please share from the PDF:

1. **Complete file list** available on FTP
2. **EPDD file purpose** and structure
3. **File update schedule** (when files are updated)
4. **Order submission** via FTP (if supported)
5. **Any missing files** we should be downloading

Once we have these details, I can:
- Implement EPDD processing (if needed)
- Add order submission via FTP
- Optimize file download/processing workflow
- Add file validation and error handling

