# API Integration Status Report

**Date:** November 24, 2024  
**Team:** Customer Portal Development  
**Status:** ⚠️ **Testing in Progress - Auth Issue**

---

## ✅ Completed

### 1. Credentials Received & Configured
- ✅ Test credentials received from API team
- ✅ Added to `.env.local` (not committed to git)
- ✅ All required variables present:
  - `NEXT_PUBLIC_API_BASE_URL=https://api.promosinkwall-e.com`
  - `PORTAL_API_KEY=pk_test_860f...` (masked)
  - `PORTAL_API_SECRET=sk_test_9e82...` (masked)
  - `PORTAL_CUSTOMER_ID=10e642bb-8c6e-4a08-86c6-dbd45af05c3e`
  - `PORTAL_PARTNER_CODE=PORTAL-TEST`

### 2. Test Scripts Created
- ✅ `scripts/test-promos-ink-api.ts` - Full integration test
- ✅ `scripts/test-api-simple.js` - Simplified test (no module caching)
- ✅ `scripts/check-api-health.js` - API endpoint health check

### 3. HMAC Signature Generation
- ✅ HMAC-SHA256 implementation working
- ✅ Signature format: `HMAC-SHA256(timestamp + method + path + body, secret)`
- ✅ Example signature generated successfully

### 4. API Endpoint Verification
- ✅ Base URL responding: `https://api.promosinkwall-e.com`
- ✅ `/api/orders` endpoint exists (returns 401 Unauthorized)
- ✅ `/api-reference` documentation available
- ❌ `/api/v1/products` returns 404 (expected - coming soon)

---

## ⚠️ Current Issue

### 401 Unauthorized Response

**Problem:**
```
POST https://api.promosinkwall-e.com/api/orders
Status: 401 Unauthorized
Response: "Unauthorized"
```

**What We're Sending:**
```javascript
Headers: {
  'Content-Type': 'application/json',
  'X-API-Key': 'pk_test_860f...',  // masked
  'X-Timestamp': '1763957893972',
  'X-Signature': 'b41a2dfa73adc6019bd8...',
  'X-Customer-ID': '10e642bb-8c6e-4a08-86c6-dbd45af05c3e',
  'X-Partner-Code': 'PORTAL-TEST'
}

Body: {
  "partnerCode": "PORTAL-TEST",
  "externalOrderId": "TEST-1763957893975-R6CP29",
  "customerInfo": { ... },
  "shippingAddress": { ... },
  "items": [ ... ],
  "pricing": { ... }
}
```

**HMAC Signature Calculation:**
```javascript
const payload = timestamp + method + path + body;
// Example: "1763957893972POST/api/orders{...json...}"

const signature = HMAC-SHA256(payload, API_SECRET);
```

---

## 🔍 Possible Causes

1. **Header Names:** Are the header names correct?
   - We're using: `X-API-Key`, `X-Timestamp`, `X-Signature`, `X-Customer-ID`, `X-Partner-Code`
   - Should they be different? (e.g., `Authorization`, `X-Api-Key`, etc.)

2. **Signature Format:** Is the HMAC payload format correct?
   - Current: `timestamp + method + path + body`
   - Should it be different? (e.g., different order, different separators)

3. **Endpoint Path:** Is `/api/orders` the correct path?
   - Or should it be `/api/v1/orders`?

4. **API Key Format:** Should the API key be in a different header?
   - Current: `X-API-Key: pk_test_...`
   - Alternative: `Authorization: Bearer pk_test_...`?

5. **Timestamp Format:** Is the timestamp format correct?
   - Current: Unix milliseconds (e.g., `1763957893972`)
   - Should it be Unix seconds? ISO 8601?

---

## 📋 Questions for API Team

### 1. Authentication Headers
**Q:** What are the exact header names we should use?

**Current:**
```
X-API-Key: pk_test_...  // masked
X-Timestamp: 1763957893972
X-Signature: b41a2dfa...
X-Customer-ID: 10e642bb-...
X-Partner-Code: PORTAL-TEST
```

**Is this correct, or should we use different names?**

### 2. HMAC Signature Payload
**Q:** What is the exact format for the HMAC signature payload?

**Current:**
```javascript
const payload = timestamp + method + path + body;
// Example: "1763957893972POST/api/orders{...json...}"
const signature = HMAC-SHA256(payload, API_SECRET);
```

**Is this correct?** Should there be:
- Separators between components? (e.g., newlines, colons)
- Different order of components?
- Additional components?

### 3. Endpoint Path
**Q:** Is `/api/orders` the correct endpoint path?

We're sending to: `https://api.promosinkwall-e.com/api/orders`

Should it be:
- `/api/v1/orders`?
- `/orders`?
- Something else?

### 4. Request Body Format
**Q:** Is our request body format correct?

See sample payload in "Current Issue" section above. Are we:
- Missing required fields?
- Using wrong field names?
- Using wrong data types?

### 5. Timestamp Format
**Q:** What timestamp format should we use?

Current: Unix milliseconds (`1763957893972`)

Should it be:
- Unix seconds (`1763957893`)?
- ISO 8601 (`2024-11-24T21:44:53.972Z`)?
- Something else?

---

## 🧪 Test Results

### Test Script Output
```bash
$ node scripts/test-api-simple.js

============================================================
🧪 PROMOS INK API INTEGRATION TEST
============================================================

🔐 Verifying API Credentials...

✅ NEXT_PUBLIC_API_BASE_URL: https://api.promosinkwall-e.com
✅ PORTAL_API_KEY: pk_test_860f...  // masked
✅ PORTAL_API_SECRET: sk_test_9e...  // masked
✅ PORTAL_CUSTOMER_ID: 10e642bb-8c6e-4a08-86c6-dbd45af05c3e
✅ PORTAL_PARTNER_CODE: PORTAL-TEST

✅ All credentials loaded!

🔒 Testing HMAC Signature...

Timestamp: 1763957893972
Signature: b41a2dfa73adc6019bd8...

✅ HMAC generated!

📦 Testing Order Submission...

URL: https://api.promosinkwall-e.com/api/orders
External Order ID: TEST-1763957893975-R6CP29
Total: $273.02

Submitting...

Status: 401 Unauthorized
Response: "Unauthorized"

❌ Order submission failed!
```

### API Health Check
```bash
$ node scripts/check-api-health.js

/api/orders
  Status: 401 Unauthorized
  Content-Type: text/plain;charset=UTF-8
  Body: Unauthorized

/api-reference
  Status: 200 OK
  Content-Type: text/html; charset=utf-8
```

---

## 📚 Documentation Review Needed

**Q:** Can we access the API documentation?

We see `/api-reference` returns 200 OK. Can you provide:
1. Direct link to API documentation
2. Example request/response for POST /api/orders
3. Authentication specification
4. HMAC signature calculation example

Mentioned in your email:
- API Reference: https://api.promosinkwall-e.com/api-reference
- Authentication: https://api.promosinkwall-e.com/docs/authentication
- Customer Portal Guide: https://api.promosinkwall-e.com/docs/customer-portal

Are these URLs correct? We can access `/api-reference` but need login?

---

## 🎯 Next Steps

### Immediate (Waiting on API Team)
1. ⏳ Clarify authentication header names
2. ⏳ Confirm HMAC signature format
3. ⏳ Verify endpoint path
4. ⏳ Access API documentation

### Once Auth is Fixed
1. ✅ Submit test order successfully
2. ✅ Verify order appears in dashboard
3. ✅ Test order retrieval (GET /api/orders/{id})
4. ✅ Test error scenarios
5. ✅ Update portal UI to use live API
6. ✅ Deploy to Vercel with test credentials

---

## 📊 Integration Readiness

| Component | Status | Notes |
|-----------|--------|-------|
| Credentials | ✅ Complete | All test credentials configured |
| HMAC Implementation | ✅ Complete | Signature generation working |
| API Client | ✅ Complete | Ready to use once auth is fixed |
| Test Scripts | ✅ Complete | 3 test scripts created |
| Request Payload | ✅ Complete | Sample order payload ready |
| Portal UI | ✅ Complete | Cart, checkout, confirmation ready |
| Documentation | ⏳ Pending | Need access to API docs |
| **Authentication** | ❌ **Blocked** | **401 Unauthorized - need clarification** |

---

## 💬 Response Requested

**To:** API-Docs Team  
**Priority:** High  
**Blocking:** Yes - cannot proceed with testing until auth is resolved

**Please provide:**
1. Exact header names for authentication
2. HMAC signature payload format (with example)
3. Confirm endpoint path
4. Access to API documentation
5. Example curl command that works with our test credentials

**Our test scripts are ready to run as soon as we have the correct format!**

---

## 📧 Contact

**Team:** Customer Portal Development  
**GitHub:** https://github.com/huymai96/customer-portal  
**Test Scripts:** `scripts/test-api-simple.js`, `scripts/check-api-health.js`  

**Ready to test immediately once authentication format is confirmed!**

