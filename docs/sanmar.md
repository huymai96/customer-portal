## SanMar SOAP Integration Guide

### Required Environment Variables

| Variable | Description |
| --- | --- |
| `SANMAR_PRODUCT_WSDL` | Product data WSDL URL from SanMar PromoStandards docs |
| `SANMAR_INVENTORY_WSDL` | Inventory WSDL URL (for future inventory sync) |
| `SANMAR_PRODUCT_ENDPOINT` | Optional explicit SOAP endpoint override |
| `SANMAR_USER` / `SANMAR_PASSWORD` | Credentials provided by SanMar |
| `SANMAR_SOAP_NAMESPACE_PREFIX` / `SANMAR_SOAP_NAMESPACE_URI` | Namespace settings for the auth header (defaults: `tem`, `http://tempuri.org/`) |
| `SANMAR_PRODUCT_OPERATION` | SOAP operation name (defaults to `GetProducts`) |
| `SANMAR_PRODUCT_REQUEST_KEY` | Root key for the request payload (`request` by default, set to `__root__` if no wrapper is required) |
| `SANMAR_PRODUCT_PAGE_FIELD` / `SANMAR_PRODUCT_PAGE_SIZE_FIELD` | Paging field names (defaults: `Page`, `PageSize`) |
| `SANMAR_PRODUCT_INCLUDE_INACTIVE_FIELD` / `SANMAR_PRODUCT_INCLUDE_DISCONTINUED_FIELD` | Flags to control inclusion (defaults: `IncludeInactive`, `IncludeDiscontinued`) |
| `SANMAR_PRODUCT_MODIFIED_FIELD` | Field used when `--modifiedSince` is passed (default `ModifiedSince`) |

### SOAP Authentication Header

`src/lib/sanmar/soapClient.ts` builds the header once and injects it into every call:

```xml
<tem:Authentication xmlns:tem="http://tempuri.org/">
  <tem:UserName>USERNAME</tem:UserName>
  <tem:Password>PASSWORD</tem:Password>
</tem:Authentication>
```

Adjust the namespace via `SANMAR_SOAP_NAMESPACE_PREFIX` / `SANMAR_SOAP_NAMESPACE_URI` if SanMar’s WSDL specifies a different schema.

### Running the Catalog Sync

```bash
npm run sync:sanmar:catalog -- --pageSize=100 --maxPages=5
```

The script now:

1. Loads `.env.local` / `.env`.
2. Creates a SOAP client via `strong-soap`.
3. Calls the configured operation (`GetProducts` by default) with paginated requests.
4. Normalizes each product into `Product`, `ProductColor`, `ProductSize`, etc., and links it through `SupplierProductLink`.

Re-run `npx tsx scripts/audit-catalog.ts` afterwards to confirm SanMar coverage.

### SOAPUI Verification (SanMar requirement)

1. Import the Product Data WSDL into SOAPUI.
2. Send the same request (Page/PageSize + filters) and capture the raw XML request and response for records/support.
3. Mirror the successful envelope structure inside `scripts/sync-sanmar-catalog.ts` by updating the env-configurable field names above.

### Network Sanity Commands

```
nslookup ws.sanmar.com
curl -vkI https://ws.sanmar.com/
# openssl s_client -connect ws.sanmar.com:443 -servername ws.sanmar.com
```

> **Note:** On this machine `curl` currently returns `Failed to connect ... Connection refused`, so the SOAP sync cannot establish a TLS session until access to `ws.sanmar.com:443` is allowed (VPN / firewall / allowlist). Re-run the commands above after networking is resolved before testing in SOAPUI or Node.

### Expected Outcome

- SOAPUI: at least one successful Product Data call (XML archived).
- Node script: first several hundred products saved to the database with canonical links.
- `scripts/audit-catalog.ts`: hundreds or thousands of SanMar `SupplierProductLink` rows (previously only 6).
- Clear logging of SOAP faults and network issues (connection refusal is currently surfaced when attempting to sync).

