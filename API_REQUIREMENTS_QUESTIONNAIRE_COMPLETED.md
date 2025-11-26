# Customer Portal Integration - Requirements Questionnaire

**From:** Customer Portal Development Team  
**To:** API-Docs Platform Team  
**Date:** November 24, 2024  
**Completed by:** Customer Portal Team  

---

## 📦 Section 1: Product Catalog

### Q1.1: Product Data Requirements

**What product information do you need to display?**

- [x] Product SKU/Style Number
- [x] Product Name
- [x] Product Description
- [x] Category (t-shirts, hoodies, etc.)
- [x] Brand (Port & Company, Gildan, etc.)
- [x] Available Colors
- [x] Available Sizes
- [x] Unit Price
- [x] Product Images (URLs)
- [x] Inventory Quantity (in stock / out of stock)
- [ ] Product Weight (for shipping calculations) - Nice to have
- [x] Material/Fabric Type
- [x] Other: **Color swatch URLs, Supplier (SanMar), Canonical style grouping**

### Q1.2: Filtering & Search

**What filtering capabilities do you need?**

- [x] Filter by category
- [x] Filter by color
- [x] Filter by size
- [x] Filter by price range
- [x] Filter by brand
- [x] Filter by availability (in stock only)
- [x] Search by product name
- [x] Search by SKU
- [x] Other: **Search by supplier, filter by decoration compatibility**

### Q1.3: Data Format

**Your preference:** **Option B (Nested with variants) + Additional metadata**

We're currently using SanMar catalog data with this structure:

```json
{
  "products": [
    {
      "canonicalStyleId": "clx123...",
      "styleNumber": "PC54",
      "name": "Port & Company Core Cotton Tee",
      "brand": "Port & Company",
      "category": "T-Shirts",
      "description": "100% cotton tee...",
      "supplier": "SANMAR",
      "basePrice": 3.50,
      "colors": [
        {
          "colorCode": "001",
          "colorName": "White",
          "swatchUrl": "https://www.sanmar.com/swatches/color/PC54_WHITE.gif",
          "sizes": [
            {
              "sizeCode": "M",
              "inventory": [
                { "warehouse": "RENO", "quantity": 1500 }
              ]
            }
          ]
        }
      ],
      "images": [
        "https://www.sanmar.com/medias/PC54-White-Front-2000px.jpg"
      ]
    }
  ]
}
```

---

## 💰 Section 2: Pricing & Quotes

### Q2.1: Quote Calculation

**What pricing components do you need us to calculate?**

- [x] Product cost (quantity × unit price)
- [x] Decoration cost (based on method and colors)
- [x] Setup fees (per decoration location)
- [x] Shipping cost estimate
- [x] Tax calculation
- [ ] Rush order fees - Future enhancement
- [x] Bulk discounts
- [x] Other: **Extra location charges, fabric charges (water-resistant, poly blend), service charges (fold, bag, sticker)**

### Q2.2: Decoration Methods

**Which decoration methods will you support in your portal?**

- [x] Screen Print (1-12 colors) ⭐
- [x] Embroidery ⭐
- [x] DTG (Direct-to-Garment) ⭐
- [ ] DTF (Direct-to-Film) - Future
- [ ] Heat Transfer - Future
- [ ] Sublimation - Future

**Note:** We've already implemented complete pricing tables for Screen Print, Embroidery, and DTG.

### Q2.3: Real-Time Pricing

**Do you need real-time pricing as users build their quote?**

- [x] Yes - calculate pricing on every change (user selects quantity, decoration, etc.)

**Expected response time:**
- [x] < 1 second (fast)

**Note:** We currently calculate pricing client-side using comprehensive pricing tables. If you provide an API endpoint, we can switch to server-side calculation.

---

## 🛒 Section 3: Order Submission

### Q3.1: Order Data

**Sample JSON payload:**

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
      "canonicalStyleId": "clx123abc",
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
          "artworkUrl": "https://storage.example.com/artwork/logo.pdf",
          "colors": 2,
          "width": 12,
          "height": 12,
          "setupFee": 0.00,
          "unitCost": 5.80
        },
        {
          "method": "embroidery",
          "location": "left_sleeve",
          "description": "Company name, 7500 stitches",
          "stitches": 7500,
          "width": 4,
          "height": 2,
          "setupFee": 0.00,
          "unitCost": 6.44
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
    "decorationTotal": 293.76,
    "setupFees": 0.00,
    "shipping": 25.00,
    "tax": 40.28,
    "total": 443.04
  },
  "notes": "Please ship by Friday",
  "inHandsDate": "2024-12-15",
  "poNumber": "PO-12345"
}
```

### Q3.2: Order Validation

**What validations do you want us to perform?**

- [x] Minimum order quantity (per item)
- [x] Maximum order quantity (per item)
- [x] Valid decoration methods
- [x] Valid decoration locations
- [x] Required artwork URLs
- [x] Shipping address validation
- [x] Email format validation
- [x] Phone number format validation
- [x] Other: **Inventory availability check, valid style numbers, valid color/size combinations**

### Q3.3: Order Response

**What information do you need back after submitting an order?**

- [x] Order ID (our internal ID)
- [x] Order Number (your reference number)
- [x] Order Status
- [x] Estimated completion date
- [x] Estimated ship date
- [ ] Tracking URL - When available
- [ ] PDF URL (production sheet) - Nice to have
- [x] Other: **External order ID (for our reference), created timestamp**

**Expected response:**
```json
{
  "success": true,
  "order": {
    "id": "clx123abc",
    "orderNumber": "ORD-2024-001234",
    "status": "RECEIVED",
    "externalOrderId": "PORTAL-1732377600000-ABC123",
    "createdAt": "2024-11-23T18:00:00Z",
    "estimatedCompletionDate": "2024-12-05",
    "estimatedShipDate": "2024-12-06",
    "total": 443.04
  }
}
```

---

## 📊 Section 4: Order Tracking

### Q4.1: Order Status

**What order statuses do you need to display?**

- [x] RECEIVED - Order received, pending review
- [x] PENDING_APPROVAL - Awaiting artwork approval
- [x] APPROVED - Approved, ready for production
- [x] IN_PRODUCTION - Currently being produced
- [x] SHIPPED - Shipped to customer
- [x] DELIVERED - Delivered to customer
- [x] CANCELLED - Order cancelled
- [x] ON_HOLD - Order on hold (issue with artwork, payment, etc.)
- [x] Other: **PROCESSING - Initial processing/validation**

### Q4.2: Order History

**How will you query orders?**

- [x] Get all orders for a customer (paginated)
- [x] Get order by ID
- [x] Get order by order number
- [x] Filter by status
- [x] Filter by date range
- [x] Search by customer name/email
- [x] Other: **Filter by external order ID, sort by date**

### Q4.3: Order Updates

**Do you need real-time order status updates?**

- [x] Yes - via webhooks (we push updates to you)
- [x] No - we'll poll your API periodically
- [x] Both options

**Preferred:** Webhooks for real-time updates, with polling as fallback

**Webhook events we want:**
- [x] Order status changed
- [x] Order shipped (with tracking number)
- [x] Order delivered
- [x] Artwork approved/rejected
- [x] Other: **Order on hold (with reason), production started**

---

## 🔐 Section 5: Authentication & Security

### Q5.1: Authentication Method

**We're planning to use HMAC-SHA256 signatures. Is this acceptable?**

- [x] Yes, HMAC-SHA256 is fine ⭐

**Note:** We've already implemented HMAC-SHA256 authentication in our portal. See `src/lib/api/hmac.ts`

### Q5.2: API Keys

**How many environments do you need?**

- [x] Development/Local
- [x] Staging/Test
- [x] Production

### Q5.3: Rate Limiting

**What rate limits are acceptable for your use case?**

**Test Environment:**
- Requests per hour: **1,000**
- Burst limit (requests per minute): **100**

**Production Environment:**
- Requests per hour: **10,000**
- Burst limit (requests per minute): **500**

**Note:** We expect low to moderate traffic initially, scaling as we onboard more customers.

---

## 📁 Section 6: File Uploads (Artwork)

### Q6.1: Artwork Handling

**How will you handle artwork files?**

- [x] We'll upload to our own storage (S3, Vercel Blob) and send you URLs ⭐
- [ ] We want to upload directly to your API
- [ ] Hybrid - small files direct, large files via URL

**Note:** We prefer to host artwork on our own CDN and send you URLs for reliability and speed.

### Q6.2: File Types

**What file types will you support?**

- [x] PDF
- [x] PNG
- [x] JPG/JPEG
- [x] AI (Adobe Illustrator)
- [x] SVG
- [ ] EPS - If needed

### Q6.3: File Size Limits

**What's your maximum file size per upload?**
- Maximum file size: **50 MB**

---

## 🔔 Section 7: Notifications

### Q7.1: Email Notifications

**What emails should we send?**

- [x] Order confirmation (to customer)
- [x] Order confirmation (to your team) - CC us at orders@customer-portal.com
- [x] Artwork approval request
- [x] Order status updates
- [x] Shipping notification with tracking
- [x] Other: **Order on hold notifications, production complete**

### Q7.2: Email Customization

**Do you want to customize email templates?**

- [x] Partial - we'll provide logo and branding only

**We'll provide:**
- Company logo
- Brand colors
- Footer text
- Contact information

---

## 🌐 Section 8: Technical Details

### Q8.1: Technology Stack

**What's your portal built with?**

- Framework: **Next.js 15.5.6**
- Language: **TypeScript**
- Hosting: **Vercel**
- Database: **PostgreSQL (via Prisma)**

### Q8.2: Expected Traffic

**What's your expected usage?**

- Number of customers: **50-100 initially, scaling to 500+ in 6 months**
- Orders per day (estimate): **10-20 initially, scaling to 100+ per day**
- Peak traffic times: **Business hours (9 AM - 5 PM EST)**
- Concurrent users: **10-50**

### Q8.3: Response Time Requirements

**What response times do you need?**

- Product catalog: < **2000 ms**
- Quote calculation: < **1000 ms**
- Order submission: < **3000 ms**
- Order retrieval: < **1000 ms**

### Q8.4: Data Retention

**How long do you need order history?**

- [x] 7 years (for tax/compliance) ⭐

---

## 🧪 Section 9: Testing & Deployment

### Q9.1: Testing Environment

**When do you need test credentials?**

- Expected start date: **Immediately (portal is already built)**
- Expected completion date: **1-2 weeks after receiving credentials**

### Q9.2: Go-Live Date

**When do you plan to launch?**

- Target go-live date: **2 weeks after integration testing complete**
- Soft launch (limited users): **1 week before full launch**
- Full launch (all customers): **TBD based on testing results**

### Q9.3: Rollback Plan

**If there are issues, how should we handle it?**

- [x] Keep old API version running (we'll switch back)
- [x] We'll fix issues in real-time
- [ ] We'll delay launch until fixed

**Preferred:** Maintain API versioning (v1, v2) so we can rollback if needed.

---

## 📞 Section 10: Support & Communication

### Q10.1: Primary Contact

**Who should we contact for technical questions?**

- Name: **[Your Name]**
- Email: **[Your Email]**
- Slack/Teams: **[Your Handle]**
- Phone (for emergencies): **[Your Phone]**

### Q10.2: Communication Preferences

**How do you prefer to communicate?**

- [x] Email
- [x] Slack
- [ ] Microsoft Teams
- [x] Weekly sync calls (during integration phase)
- [x] Other: **GitHub issues for bug tracking**

### Q10.3: Documentation

**What documentation format works best?**

- [x] OpenAPI/Swagger spec ⭐
- [x] Postman collection
- [x] Written docs (like our current site)
- [x] Code examples (TypeScript, Python, etc.)
- [ ] Video tutorials
- [x] All of the above - We appreciate comprehensive documentation!

---

## 🎨 Section 11: Custom Requirements

### Q11.1: Special Features

**Are there any special features or requirements not covered above?**

1. **Decoration Pricing Tables:** We've already implemented comprehensive pricing tables for Screen Print (1-12 colors × 10 quantity tiers), Embroidery (11 stitch ranges × 6 quantity tiers), and DTG (light/dark × 5 sizes × 8 quantity tiers). We can either:
   - Continue using client-side calculation
   - Switch to your API for pricing (preferred for consistency)

2. **Inventory Sync:** We're currently syncing SanMar inventory via FTP (DIP files). We'd like to:
   - Query real-time inventory via your API
   - Get low-stock alerts
   - Reserve inventory during checkout

3. **Product Catalog Sync:** We're ingesting SanMar SDL/EPDD files. We'd like to:
   - Query your unified product catalog API
   - Get products from multiple suppliers (SanMar, S&S, alphabroder)
   - Receive product updates via webhook

### Q11.2: Integration Concerns

**Do you have any concerns about the integration?**

- Performance concerns: **Response time for real-time inventory checks during checkout**
- Security concerns: **None - HMAC-SHA256 is solid**
- Scalability concerns: **Rate limits during peak times (holiday season)**
- Other: **Data consistency between our catalog and yours**

### Q11.3: Nice-to-Have Features

**What features would be nice to have but aren't critical?**

1. **Bulk Order Import:** CSV/Excel upload for large orders
2. **Saved Quotes:** Save incomplete orders as quotes for later
3. **Reorder:** Quick reorder from order history
4. **Production Updates:** Real-time production status (e.g., "50% complete")
5. **Analytics API:** Order volume, popular products, revenue reports

---

## 📋 Section 12: Sample Data

### Q12.1: Test Data

**Sample Customer:**
```json
{
  "name": "John Doe",
  "email": "john.doe@example.com",
  "phone": "555-123-4567",
  "company": "ACME Corporation"
}
```

**Sample Order (full JSON):**
```json
{
  "partnerCode": "PORTAL",
  "externalOrderId": "PORTAL-1732377600000-ABC123",
  "customerInfo": {
    "name": "John Doe",
    "email": "john.doe@example.com",
    "phone": "555-123-4567",
    "company": "ACME Corporation"
  },
  "shippingAddress": {
    "name": "John Doe",
    "company": "ACME Corporation",
    "street1": "123 Main Street",
    "street2": "Suite 100",
    "city": "Los Angeles",
    "state": "CA",
    "postalCode": "90210",
    "country": "US",
    "phone": "555-123-4567"
  },
  "items": [
    {
      "styleNumber": "PC54",
      "productName": "Port & Company PC54 Core Cotton Tee",
      "supplierPartId": "PC54",
      "canonicalStyleId": "clx123abc",
      "color": "001",
      "colorName": "White",
      "size": "M",
      "quantity": 24,
      "unitPrice": 3.50,
      "decorations": [
        {
          "method": "screen_print",
          "location": "front_chest",
          "description": "2-color company logo",
          "artworkUrl": "https://storage.example.com/artwork/logo.pdf",
          "colors": 2,
          "width": 12,
          "height": 12,
          "setupFee": 0.00,
          "unitCost": 5.80
        }
      ]
    },
    {
      "styleNumber": "G180",
      "productName": "Gildan 18000 Heavy Blend Crewneck Sweatshirt",
      "supplierPartId": "G180",
      "canonicalStyleId": "clx456def",
      "color": "003",
      "colorName": "Navy",
      "size": "L",
      "quantity": 12,
      "unitPrice": 12.50,
      "decorations": [
        {
          "method": "embroidery",
          "location": "left_chest",
          "description": "Company logo, 7500 stitches",
          "stitches": 7500,
          "width": 4,
          "height": 4,
          "setupFee": 0.00,
          "unitCost": 6.44
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
    "subtotal": 234.00,
    "decorationTotal": 216.48,
    "setupFees": 0.00,
    "shipping": 25.00,
    "tax": 47.55,
    "total": 523.03
  },
  "notes": "Please ship by December 1st for holiday event",
  "inHandsDate": "2024-12-01",
  "poNumber": "PO-2024-12345"
}
```

**Sample Products (what you expect to receive):**
```json
{
  "products": [
    {
      "id": "clx123abc",
      "styleNumber": "PC54",
      "name": "Port & Company PC54 Core Cotton Tee",
      "brand": "Port & Company",
      "category": "T-Shirts",
      "description": "5.5-ounce, 50/50 cotton/poly blend. Double-needle stitching throughout.",
      "supplier": "SANMAR",
      "material": "50% Cotton / 50% Polyester",
      "weight": "5.5 oz",
      "basePrice": 3.50,
      "images": [
        "https://www.sanmar.com/medias/PC54-White-Front-2000px.jpg",
        "https://www.sanmar.com/medias/PC54-White-Back-2000px.jpg"
      ],
      "colors": [
        {
          "colorCode": "001",
          "colorName": "White",
          "swatchUrl": "https://www.sanmar.com/swatches/color/PC54_WHITE.gif",
          "hexCode": "#FFFFFF",
          "sizes": [
            {
              "sizeCode": "S",
              "sizeName": "Small",
              "inStock": true,
              "inventory": [
                { "warehouse": "RENO", "quantity": 1500 },
                { "warehouse": "DALLAS", "quantity": 2300 }
              ]
            },
            {
              "sizeCode": "M",
              "sizeName": "Medium",
              "inStock": true,
              "inventory": [
                { "warehouse": "RENO", "quantity": 2100 },
                { "warehouse": "DALLAS", "quantity": 3200 }
              ]
            }
          ]
        }
      ],
      "decorationCompatibility": {
        "screenPrint": true,
        "embroidery": true,
        "dtg": true,
        "dtf": false
      }
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalPages": 50,
    "totalCount": 1000
  }
}
```

---

## ✅ Summary

**What We've Built:**
- Complete customer portal with cart, checkout, and order tracking
- HMAC-SHA256 authentication already implemented
- Comprehensive decoration pricing calculator (800+ lines)
- SanMar catalog integration (99 colors for PC54!)
- Type-safe TypeScript codebase
- Deployed to Vercel (production-ready)

**What We Need:**
- API credentials (test + production)
- API endpoint URLs
- Webhook endpoint setup (if supported)
- Documentation (OpenAPI spec preferred)

**Timeline:**
- Ready to start integration: **Immediately**
- Integration testing: **1-2 weeks**
- Go-live: **2-4 weeks after testing**

**GitHub:** https://github.com/huymai96/customer-portal  
**Live Portal:** https://customer-portal-promos-ink.vercel.app  
**Documentation:** See `INTEGRATION_EXPLANATION.md` in repo

---

## 📝 Submission

**Completed by:** Customer Portal Development Team  
**Date:** November 24, 2024  
**Team:** Customer Portal Development Team  

**Returning to:** api-support@promosink.com  
**Subject:** Customer Portal Integration - Requirements Questionnaire COMPLETED

---

**Thank you for the comprehensive questionnaire! We're excited to integrate!** 🚀

**P.S.** Our portal is already built and deployed. We've included detailed technical documentation in our GitHub repo that explains our current implementation. This should help accelerate the integration process!





