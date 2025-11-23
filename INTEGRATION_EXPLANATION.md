Subject: Customer Portal Integration - Order Submission Workflow

Hi Promos Ink API Team,

I'm reaching out regarding our customer portal integration with your API-Docs platform (promosinkwall-e.com). We've completed the development and are ready to connect - I wanted to explain exactly how our system sends orders to your platform.

---

## Order Submission Workflow

### Step 1: Customer Places Order
When a customer completes checkout on our portal (customer-portal-promos-ink.vercel.app), they provide:
- Product selections (from our SanMar catalog)
- Decoration options (screen print, embroidery, or DTG)
- Shipping address
- Contact information

### Step 2: We Build the Order Payload
Our system constructs a comprehensive order object with all details:

```json
{
  "partnerCode": "PORTAL",
  "externalOrderId": "PORTAL-1732377600000-ABC123",
  "customerInfo": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "555-1234",
    "company": "ACME Corp"
  },
  "shippingAddress": {
    "name": "John Doe",
    "company": "ACME Corp",
    "street1": "123 Main St",
    "street2": "Suite 100",
    "city": "Los Angeles",
    "state": "CA",
    "postalCode": "90210",
    "country": "US",
    "phone": "555-1234"
  },
  "items": [
    {
      "styleNumber": "PC54",
      "productName": "Port & Company PC54 Core Cotton Tee",
      "supplierPartId": "PC54",
      "canonicalStyleId": "clx123...",
      "color": "001",
      "colorName": "White",
      "size": "M",
      "quantity": 24,
      "unitPrice": 3.50,
      "decorations": [
        {
          "method": "screen_print",
          "location": "front_chest",
          "description": "2-color company logo, 12x12 inches",
          "artworkUrl": "https://storage.example.com/logo.pdf",
          "colors": 2,
          "width": 12,
          "height": 12,
          "setupFee": 0.00,
          "unitCost": 5.80
        }
      ]
    }
  ],
  "shipping": {
    "method": "ground",
    "cost": 25.00,
    "carrier": "UPS"
  },
  "pricing": {
    "subtotal": 84.00,
    "decorationTotal": 139.20,
    "setupFees": 0.00,
    "shipping": 25.00,
    "tax": 24.82,
    "total": 273.02
  },
  "notes": "Please ship by Friday",
  "inHandsDate": "2024-12-15",
  "poNumber": "PO-12345"
}
```

### Step 3: We Generate HMAC-SHA256 Signature
For security, every request is signed using HMAC-SHA256:

```typescript
const timestamp = Date.now(); // e.g., 1732377600000
const method = "POST";
const path = "/api/orders";
const body = JSON.stringify(orderData);

// Create signature payload
const signaturePayload = timestamp + method + path + body;

// Generate HMAC signature
const signature = HMAC-SHA256(signaturePayload, API_SECRET);
// Result: "a1b2c3d4e5f6789..."
```

This ensures:
- Request authenticity (only we can generate valid signatures)
- Data integrity (any tampering invalidates the signature)
- Replay attack prevention (timestamp validation)

### Step 4: We Send the Authenticated Request
We POST the order to your API with authentication headers:

```http
POST https://promosinkwall-e.com/api/orders
Content-Type: application/json
X-API-Key: pk_live_xxx
X-Timestamp: 1732377600000
X-Signature: a1b2c3d4e5f6789...
X-Customer-ID: your-partner-uuid
X-Partner-Code: PORTAL

{order payload from Step 2}
```

### Step 5: Your API Validates & Processes
Your platform:
1. Validates the HMAC signature
2. Checks the timestamp (prevents replay attacks)
3. Verifies the API key and customer ID
4. Validates the order data
5. Creates the order in your system
6. Returns confirmation to us

### Step 6: You Return Confirmation
We expect a response like:

```json
{
  "success": true,
  "order": {
    "id": "clx123abc",
    "orderNumber": "ORD-2024-001234",
    "status": "RECEIVED",
    "externalOrderId": "PORTAL-1732377600000-ABC123",
    "createdAt": "2024-11-23T18:00:00Z",
    "total": 273.02,
    "trackingNumber": null
  }
}
```

### Step 7: We Display Confirmation to Customer
Our portal:
- Shows order confirmation page
- Displays order number and details
- Provides tracking information (when available)
- Clears the shopping cart

---

## Decoration Data We Send

### Screen Printing
```json
{
  "method": "screen_print",
  "location": "front_chest",
  "description": "2-color company logo",
  "colors": 2,
  "width": 12,
  "height": 12,
  "setupFee": 0.00,
  "unitCost": 5.80
}
```

**Pricing Logic:**
- Based on quantity tiers (12-29, 30-48, 49-71, etc.)
- Number of colors (1-12)
- Calculated using your pricing tables

### Embroidery
```json
{
  "method": "embroidery",
  "location": "left_chest",
  "description": "Company logo embroidery",
  "stitches": 7500,
  "width": 4,
  "height": 4,
  "setupFee": 0.00,
  "unitCost": 6.44
}
```

**Pricing Logic:**
- Based on stitch count ranges
- Quantity tiers
- Calculated using embroidery pricing tables

### Direct-To-Garment (DTG)
```json
{
  "method": "dtg",
  "location": "full_front",
  "description": "Full-color photo print",
  "width": 12,
  "height": 16,
  "setupFee": 0.00,
  "unitCost": 6.00
}
```

**Pricing Logic:**
- Based on garment color (light vs dark)
- Print size in square inches
- Quantity tiers

---

## Error Handling

### What We Handle
If your API returns an error, we display user-friendly messages:

| Your Error Code | Our Message to Customer |
|----------------|------------------------|
| `UNAUTHORIZED` | "Authentication failed. Please contact support." |
| `INVALID_SIGNATURE` | "Authentication failed. Please contact support." |
| `PRODUCT_NOT_FOUND` | "One or more products are no longer available." |
| `INSUFFICIENT_INVENTORY` | "Some items are out of stock. Please adjust quantities." |
| `DUPLICATE_ORDER` | "This order has already been submitted." |
| `INVALID_ADDRESS` | "Shipping address is invalid. Please check and try again." |

### Timeout Protection
- We wait up to 30 seconds for your response
- If timeout occurs, we show: "Request timed out. Please try again."

### Retry Logic
- We can implement automatic retries if needed
- Currently showing error to user for manual retry

---

## Security Features

### 1. HMAC Signature Validation
Every request must have a valid signature that matches:
```
HMAC-SHA256(timestamp + method + path + body, API_SECRET)
```

### 2. Timestamp Validation
The `X-Timestamp` header prevents replay attacks:
- Requests older than X minutes should be rejected
- We recommend 5-minute window

### 3. API Key Authentication
- Public key (`pk_live_xxx`) identifies our application
- Secret key (`sk_live_xxx`) signs requests (never exposed to browser)

### 4. Customer ID Validation
- `X-Customer-ID` header contains our partner UUID
- Links orders to our account in your system

---

## Order Tracking

After submission, we track orders by polling:

```http
GET https://promosinkwall-e.com/api/orders/{orderId}
X-API-Key: pk_live_xxx
X-Timestamp: {current_timestamp}
X-Signature: {hmac_signature}
X-Customer-ID: {partner_uuid}
```

We display status updates to customers:
- **RECEIVED** → "Order Received"
- **PROCESSING** → "Processing"
- **PRODUCTION** → "In Production"
- **SHIPPED** → "Shipped" (with tracking number)
- **DELIVERED** → "Delivered"

---

## What We Need to Go Live

To complete the integration, we need:

1. **Production API Credentials:**
   - API Key (`pk_live_xxx`)
   - API Secret (`sk_live_xxx`)
   - Partner/Customer UUID
   - Partner Code (e.g., "PORTAL")

2. **Confirmation:**
   - Is the endpoint `https://promosinkwall-e.com/api/orders` correct?
   - Do our decoration method values match your system?
   - Do our location codes match?
   - What status values should we expect?

3. **Optional (for testing):**
   - Sandbox credentials (`pk_test_xxx`, `sk_test_xxx`)
   - Test environment URL
   - Test product SKUs

---

## Testing Plan

Once we receive credentials:

**Day 1:**
- Configure environment variables
- Submit test order
- Verify signature validation works
- Check order appears in your dashboard

**Day 2:**
- Test error scenarios (invalid signature, missing fields, etc.)
- Test different decoration methods
- Test multiple items in one order

**Day 3:**
- Test order status tracking
- Verify tracking number display
- Test edge cases

**Day 4:**
- Go live with production traffic

---

## Technical Implementation

Our integration is built with:
- **Language:** TypeScript/Node.js
- **Framework:** Next.js 15
- **Deployment:** Vercel (auto-deploys from GitHub)
- **Authentication:** HMAC-SHA256 with Node.js crypto module
- **Error Handling:** Try-catch with user-friendly messaging
- **Timeout:** 30 seconds per request

**Code is production-ready:**
- ✅ Type-safe (TypeScript)
- ✅ Error handling complete
- ✅ HMAC implementation tested
- ✅ Build passing
- ✅ Deployed to production

---

## Summary

**How we send orders:**
1. Customer completes checkout
2. We build comprehensive order JSON
3. We sign request with HMAC-SHA256
4. We POST to your API with auth headers
5. You validate and process
6. You return confirmation
7. We show customer their order details

**Security:** Every request is authenticated with HMAC signature, API key, and customer UUID.

**Ready to integrate:** Just need production credentials to start sending orders!

Please let me know if you need any clarification or have questions about our implementation. We're excited to complete this integration!

Best regards,
Customer Portal Development Team

---

**Quick Start Checklist for Your Team:**
- [ ] Generate API credentials (pk_live_xxx, sk_live_xxx)
- [ ] Create partner UUID in your system
- [ ] Assign partner code (e.g., "PORTAL")
- [ ] Confirm endpoint URL
- [ ] Provide error code documentation
- [ ] Share order status values
- [ ] Optional: Provide sandbox credentials

**Our Documentation:**
- GitHub: https://github.com/huymai96/customer-portal
- Integration Guide: `DECORATION_WORKFLOW_GUIDE.md`
- Live Portal: https://customer-portal-promos-ink.vercel.app

