# SanMar Credentials Setup

## Credentials Provided

### FTP/SFTP Access
- **Account**: 75590
- **Host**: ftp.sanmar.com
- **Port**: 2200
- **Protocol**: SFTP
- **Username**: 75590
- **Password**: LBFrCBqHt3qU8E

### SanMar.com Web Access
- **Username**: carladooley
- **Password**: NewYear2024

## Environment Variables

Add these to your `.env.local` file:

```bash
# SanMar FTP/SFTP
SANMAR_FTP_HOST=ftp.sanmar.com
SANMAR_FTP_PORT=2200
SANMAR_FTP_USERNAME=75590
SANMAR_FTP_PASSWORD=LBFrCBqHt3qU8E
SANMAR_FTP_REMOTE_DIR=SanMarPDD

# SanMar.com Web (for PromoStandards API)
SANMAR_PROMOSTANDARDS_USERNAME=carladooley
SANMAR_PROMOSTANDARDS_PASSWORD=NewYear2024
SANMAR_ACCOUNT_NUMBER=75590
```

## File Locations

All product data files are located in the `SanmarPDD` folder on FTP:

1. **SanMar_SDL_N.csv** - Main product catalog
   - Product descriptions
   - Pricing
   - Item weight (lbs)
   - Colors, sizes, media, SKUs

2. **SanMar_EPDD.csv** - Extended Product Data
   - Bulk inventory
   - Main category
   - Subcategory
   - Additional product attributes

3. **sanmar_dip.txt** - Daily Inventory Position
   - Updated hourly
   - Best resource for up-to-date inventory
   - Warehouse-level quantities

## Integration Workflow

### Full Catalog Sync (Recommended)
```powershell
# Downloads SDL + EPDD, imports both
npx tsx scripts/sync-sanmar-full-catalog-ftp.ts
```

### Individual File Processing
```powershell
# Download files
npx tsx scripts/download-sanmar-ftp.ts

# Import catalog (SDL)
npx tsx scripts/ingest-sanmar-local.ts

# Import extended data (EPDD)
npx tsx scripts/ingest-sanmar-epdd.ts

# Import inventory (DIP)
npx tsx scripts/ingest-sanmar-inventory.ts
```

## Best Practices

1. **Inventory Updates**: Use `sanmar_dip.txt` (updated hourly) for real-time inventory
2. **Catalog Updates**: SDL and EPDD files are updated less frequently
3. **Processing Order**: 
   - First: SDL (creates products)
   - Second: EPDD (adds extended data to existing products)
   - Third: DIP (adds inventory data)

## Additional Resources

- **WebServices Integration Guide**: Pages 14-17 cover best practices
- **FTP Integration Guide**: Complete file format documentation

