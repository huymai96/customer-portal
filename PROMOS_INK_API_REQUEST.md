# API Integration Request - Customer Portal → Promos Ink API

**To:** Promos Ink API Team  
**From:** Customer Portal Development Team  
**Date:** November 23, 2024  
**Subject:** API Credentials & Integration Documentation Request

---

## Executive Summary

We've built a customer-facing portal (https://customer-portal-promos-ink.vercel.app) that integrates with your Promos Ink API-Docs platform for automated order submission. The integration is **complete and tested locally** – we just need production API credentials to go live.

---

## Integration Overview: How We Send Orders

### 🔐 Authentication: HMAC-SHA256 Signature

Every API request is signed using HMAC-SHA256 for security:

```typescript
Signature = HMAC-SHA256(timestamp + method + path + body, API_SECRET)
```

### 📤 Request Format

**Endpoint:** `POST https://promosinkwall-e.com/api/orders`

**Headers:**
```
X-API-Key: pk_live_xxx
X-Timestamp: 1732377600000
X-Signature: a1b2c3d4e5f6...
X-Customer-ID: your-partner-uuid
X-Partner-Code: PORTAL
Content-Type: application/json
```

**Payload Example:**
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
    "street1": "123 Main St",
    "city": "Los Angeles",
    "state": "CA",
    "postalCode": "90210",
    "country": "US",
    "phone": "555-1234"
  },
  "items": [
    {
      "styleNumber": "PC54",
      "productName": "Port & Company Core Cotton Tee",
      "color": "White",
      "size": "M",
      "quantity": 24,
      "unitPrice": 3.50,
      "decorations": [
        {
          "method": "screen_print",
          "location": "front_chest",
          "description": "2-color company logo",
          "colors": 2,
          "setupFee": 0.00,
          "unitCost": 5.80
        }
      ]
    }
  ],
  "shipping": { "method": "ground", "cost": 25.00 },
  "pricing": {
    "subtotal": 84.00,
    "decorationTotal": 139.20,
    "shipping": 25.00,
    "tax": 24.82,
    "total": 273.02
  }
}
```

**Expected Response:**
```json
{
  "success": true,
  "order": {
    "id": "clx123abc",
    "orderNumber": "ORD-2024-001234",
    "status": "RECEIVED",
    "total": 273.02
  }
}
```

---

## What We Need from You

### 🔑 1. API Credentials (REQUIRED)

- [ ] **Production API Key** (pk_live_xxx)
- [ ] **Production API Secret** (sk_live_xxx)
- [ ] **Partner UUID** (from your Partner table)
- [ ] **Partner Code** (e.g., "PORTAL")

Optional (for testing):
- [ ] **Sandbox API Key** (pk_test_xxx)
- [ ] **Sandbox API Secret** (sk_test_xxx)
- [ ] **Sandbox URL** (if different from production)

### 📋 2. API Confirmation Questions

#### Endpoints
- Is `https://promosinkwall-e.com/api/orders` correct for production?
- Are there other endpoints we should integrate?
  - Order status: `GET /api/orders/{orderId}`?
  - Order list: `GET /api/orders`?
  - Inventory check: `GET /api/inventory`?
  - Product catalog: `GET /api/products`?

#### Order Status Values
What status values should we expect?
- [ ] RECEIVED
- [ ] PROCESSING
- [ ] PRODUCTION
- [ ] SHIPPED
- [ ] DELIVERED
- [ ] CANCELLED
- [ ] Others?

#### Error Codes
Which error codes should we handle?
- [ ] UNAUTHORIZED
- [ ] INVALID_SIGNATURE
- [ ] PRODUCT_NOT_FOUND
- [ ] INSUFFICIENT_INVENTORY
- [ ] DUPLICATE_ORDER
- [ ] INVALID_ADDRESS
- [ ] Others?

#### Decoration Methods
Do our method values match your system?
- `screen_print`
- `embroidery`
- `dtg` (direct-to-garment)

#### Location Codes
Do our location codes match?
- `front_chest`, `full_front`, `back`, `full_back`
- `left_sleeve`, `right_sleeve`
- `pocket`, `heavy_bulky_bags`

### 🧪 3. Testing Information

- [ ] Can we use test credentials without creating real orders?
- [ ] Are there test style numbers we should use?
- [ ] Is there a rate limit we should be aware of?
- [ ] Do you provide a sandbox environment?

### 🔔 4. Webhooks (Optional)

- [ ] Do you support webhooks for order status updates?
- [ ] What's the webhook payload format?
- [ ] Which events trigger webhooks?

---

## What We've Built

### ✅ Complete Features

**Backend:**
- ✅ HMAC-SHA256 authentication
- ✅ Order payload builder
- ✅ Error handling
- ✅ Retry logic
- ✅ Timeout protection

**Decoration Pricing:**
- ✅ Screen Printing (1-12 colors)
- ✅ Embroidery (stitch count-based)
- ✅ DTG (light/dark garments)
- ✅ Extra location charges
- ✅ Fabric & service charges
- ✅ Setup fees

**Frontend:**
- ✅ Shopping cart
- ✅ Decoration form
- ✅ Checkout flow
- ✅ Order confirmation
- ✅ Status tracking

---

## Timeline

**Ready to integrate immediately:**
- **Day 1:** Configure credentials
- **Day 2:** Test order submission
- **Day 3:** Complete integration testing
- **Day 4:** Production deployment

---

## Additional Questions

1. **Order Emails:** Do you send confirmation emails, or should we?

2. **Order Cancellation:** Can orders be cancelled via API?

3. **Artwork Upload:** Do you have a file upload endpoint, or should we host files?

4. **Real-time Pricing:** Should we fetch pricing from your API or use local tables?

5. **Production Notes:** Are there specific fields needed for production (print files, thread colors)?

6. **Reorder:** Should we fetch order history from your API or maintain our own?

---

## Documentation We've Created

📄 **DECORATION_WORKFLOW_GUIDE.md** - Complete integration guide with:
- API request/response examples
- Error handling strategies
- Environment setup
- Testing procedures

GitHub: https://github.com/huymai96/customer-portal

---

## Contact Information

**Developer:** [Your Name/Contact]  
**Live Portal:** https://customer-portal-promos-ink.vercel.app  
**GitHub:** https://github.com/huymai96/customer-portal  

---

## Next Steps

Please provide the API credentials and answer the questions above. We're excited to complete this integration and start sending orders!

**Thank you!** 🚀

