# Decoration Workflow & Order Integration - Setup Guide

## Overview

This guide covers the complete end-to-end decoration workflow and order integration with the Promos Ink API-Docs platform.

## Environment Variables

Add these to your `.env.local` file:

```env
# API-Docs Platform Connection
NEXT_PUBLIC_API_BASE_URL=https://promosinkwall-e.com
PORTAL_API_KEY=pk_live_xxx
PORTAL_API_SECRET=sk_live_xxx
PORTAL_CUSTOMER_ID=<uuid-from-api-docs-partner-table>
PORTAL_PARTNER_CODE=PORTAL

# Auth0 (existing)
AUTH0_DOMAIN=your-tenant.us.auth0.com
AUTH0_CLIENT_ID=<client-id>
AUTH0_CLIENT_SECRET=<client-secret>
AUTH0_SECRET=<32-byte-hex-secret>
APP_BASE_URL=https://customer-portal-promos-ink.vercel.app

# Database (existing)
DATABASE_URL=postgresql://...

# SanMar FTP (existing)
SANMAR_FTP_HOST=ftp.sanmar.com
SANMAR_FTP_USER=your_username
SANMAR_FTP_PASSWORD=your_password
```

### Getting API Credentials

1. **API Keys**: Generated in API-Docs at `/dashboard` or via partner onboarding
2. **Customer ID**: UUID from the `Partner` table in API-Docs database
3. **Partner Code**: Unique identifier (e.g., "PORTAL", "ACME_CORP")

For testing, use sandbox credentials:
```env
NEXT_PUBLIC_API_BASE_URL=https://api-docs-staging.vercel.app
PORTAL_API_KEY=pk_test_xxx
PORTAL_API_SECRET=sk_test_xxx
```

## Architecture

```
Customer Portal (Next.js 16)
  ↓
1. Browse products (GET /api/v1/products from API-Docs)
  ↓
2. Add items to cart with decoration specs
  ↓
3. Submit order
  ↓
4. Generate HMAC signature
  ↓
5. POST /api/orders to API-Docs
  ↓
6. API-Docs validates, stores, processes
  ↓
7. Return confirmation
  ↓
8. Display confirmation to customer
```

## Features Implemented

### 1. **Decoration Pricing Calculator** (`src/lib/decoration/pricing.ts`)
- Screen Printing pricing (1-12 colors, quantity-based)
- Embroidery pricing (stitch count-based)
- Direct-To-Garment (DTG) pricing (garment color & size-based)
- Extra location charges (sleeve, pocket, etc.)
- Fabric charges (water-resistant, poly blend, nylon)
- Service charges (fold, bag, sticker)
- Setup fees

### 2. **HMAC Authentication** (`src/lib/api/hmac.ts`, `src/lib/api/client.ts`)
- HMAC-SHA256 signature generation
- Timestamp-based request signing
- Automatic header management
- Error handling and retry logic

### 3. **Order Service** (`src/lib/orders/service.ts`)
- Order submission
- Order status tracking
- Order validation
- External order ID generation

### 4. **Cart Management** (`src/contexts/CartContext.tsx`)
- Add/remove/update items
- Decoration options per item
- Automatic price calculations
- Persistent storage (localStorage)

### 5. **UI Components**
- **Decoration Form** (`src/app/components/DecorationForm.tsx`)
  - Method selection (screen print, embroidery, DTG)
  - Location selection
  - Live pricing preview
  - Artwork URL input

- **Cart Page** (`src/app/components/CartPage.tsx`)
  - Item list with quantities
  - Decoration management
  - Order summary
  - Checkout button

- **Checkout Page** (`src/app/checkout/page.tsx`)
  - Customer information
  - Shipping address
  - Order details (PO, in-hands date, notes)
  - Order submission

- **Order Confirmation** (`src/app/orders/[orderId]/page.tsx`)
  - Order details display
  - Status tracking
  - Tracking information

### 6. **API Routes**
- `POST /api/orders/submit` - Submit order to API-Docs
- `GET /api/orders/[orderId]` - Get order status
- `GET /api/orders` - List all orders

## Setup Instructions

### 1. Install Dependencies

No new dependencies needed! All features use existing packages:
- `next` - Already installed
- `react` - Already installed
- `@auth0/nextjs-auth0` - Already installed

### 2. Add Cart Provider to Layout

Update `src/app/layout.tsx`:

```typescript
import { CartProvider } from '@/contexts/CartContext';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <CartProvider>
          {children}
        </CartProvider>
      </body>
    </html>
  );
}
```

### 3. Add Environment Variables

Create `.env.local` with the variables listed above.

### 4. Create Cart Route

Create `src/app/cart/page.tsx`:

```typescript
import CartPage from '../components/CartPage';

export default function Cart() {
  return <CartPage />;
}
```

### 5. Test the Integration

```bash
# Start development server
npm run dev

# Visit cart page
http://localhost:3000/cart

# Visit checkout page
http://localhost:3000/checkout
```

## Usage Flow

### 1. **Add Product to Cart**

From any product page, add this button:

```typescript
'use client';

import { useCart } from '@/contexts/CartContext';

export function AddToCartButton({ product, color, size }) {
  const { addItem } = useCart();

  const handleAddToCart = () => {
    addItem({
      styleNumber: product.styleNumber,
      productName: product.name,
      supplierPartId: product.supplierPartId,
      canonicalStyleId: product.canonicalStyleId,
      color: color.code,
      colorName: color.name,
      size: size,
      quantity: 1,
      unitPrice: product.price,
      imageUrl: product.imageUrl,
    });
  };

  return (
    <button onClick={handleAddToCart}>
      Add to Cart
    </button>
  );
}
```

### 2. **View Cart**

Navigate to `/cart` to see cart items and add decoration options.

### 3. **Add Decoration**

Click "Add Decoration" on any cart item to:
- Choose decoration method
- Select location
- Configure options (colors, stitches, print size)
- See live pricing

### 4. **Checkout**

Click "Proceed to Checkout" to:
- Enter shipping address
- Add order notes
- Review order summary
- Submit order

### 5. **Order Confirmation**

After successful submission:
- Order is sent to API-Docs platform
- Cart is cleared
- User is redirected to confirmation page
- Confirmation email is sent (handled by API-Docs)

## API Endpoint Reference

### POST `/api/orders` (API-Docs Platform)

**Authentication:**
- Header: `X-API-Key: pk_live_xxx`
- Header: `X-Timestamp: <unix_milliseconds>`
- Header: `X-Signature: <hmac_sha256>`
- Header: `X-Customer-ID: <partner_uuid>`

**Request Body:**
```json
{
  "partnerCode": "PORTAL",
  "externalOrderId": "PORTAL-1732377600000",
  "customerInfo": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "555-1234"
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
      "styleNumber": "5000",
      "productName": "Gildan 5000 T-Shirt",
      "color": "White",
      "size": "M",
      "quantity": 20,
      "unitPrice": 3.50,
      "decorations": [
        {
          "method": "screen_print",
          "location": "front_chest",
          "description": "2-color company logo",
          "colors": 2,
          "setupFee": 25.00,
          "unitCost": 2.50
        }
      ]
    }
  ],
  "pricing": {
    "subtotal": 70.00,
    "decorationTotal": 50.00,
    "setupFees": 25.00,
    "shipping": 25.00,
    "tax": 17.00,
    "total": 187.00
  }
}
```

**Success Response (200):**
```json
{
  "success": true,
  "order": {
    "id": "clx123abc...",
    "orderNumber": "ORD-2024-001234",
    "status": "RECEIVED",
    "createdAt": "2024-11-23T18:00:00Z",
    "total": 187.00
  }
}
```

## Error Handling

The system handles these error codes:

| Error Code | Meaning | User Message |
|------------|---------|--------------|
| `UNAUTHORIZED` | Invalid API key or signature | "Authentication failed. Please contact support." |
| `INVALID_SIGNATURE` | HMAC signature mismatch | "Authentication failed. Please contact support." |
| `PRODUCT_NOT_FOUND` | Invalid styleNumber | "One or more products are no longer available." |
| `INSUFFICIENT_INVENTORY` | Not enough stock | "Some items are out of stock. Please adjust quantities." |
| `DUPLICATE_ORDER` | externalOrderId already exists | "This order has already been submitted." |
| `INVALID_ADDRESS` | Shipping address validation failed | "Shipping address is invalid. Please check and try again." |

## Production Checklist

- [ ] API credentials configured in Vercel environment variables
- [ ] Auth0 configured for production domain
- [ ] CartProvider added to root layout
- [ ] Cart and checkout routes created
- [ ] Error handling tested
- [ ] Order confirmation emails tested (via API-Docs)
- [ ] Decoration pricing verified against actual costs
- [ ] Tax rate configured correctly
- [ ] Shipping cost calculation implemented
- [ ] Order tracking implemented
- [ ] Payment integration added (if needed)

## Testing

### Test Order Submission

1. Add items to cart
2. Add decoration options
3. Proceed to checkout
4. Fill in test shipping address
5. Submit order
6. Verify order appears in API-Docs dashboard

### Test HMAC Signature

```typescript
import { generateHmacSignature } from '@/lib/api/hmac';

const timestamp = Date.now();
const signature = generateHmacSignature(
  timestamp,
  'POST',
  '/api/orders',
  JSON.stringify({ test: 'data' }),
  process.env.PORTAL_API_SECRET!
);

console.log('Signature:', signature);
```

## Support

For issues or questions:
1. Check API-Docs platform logs
2. Verify environment variables
3. Check browser console for errors
4. Review server logs for API errors

## Next Steps

1. **Payment Integration**: Add Stripe/PayPal for payment processing
2. **Inventory Check**: Verify inventory before checkout
3. **Quote System**: Allow users to request quotes
4. **Artwork Upload**: Implement file upload for decoration artwork
5. **Saved Addresses**: Save customer addresses for reuse
6. **Order History**: Display all past orders
7. **Reorder**: Quick reorder from past orders

