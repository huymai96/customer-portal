# Customer Portal Architecture

> **Version**: 1.0  
> **Last Updated**: November 2024  
> **Tech Stack**: Next.js 15, TypeScript, Prisma, PostgreSQL, Clerk Auth, Tailwind CSS

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Authentication & Authorization](#2-authentication--authorization)
3. [Data Models](#3-data-models)
4. [API Integration](#4-api-integration)
5. [Catalog Sync](#5-catalog-sync)
6. [Quote System](#6-quote-system)
7. [UI Components](#7-ui-components)
8. [Environment Variables](#8-environment-variables)
9. [Known Issues & Tech Debt](#9-known-issues--tech-debt)
10. [Deployment](#10-deployment)

---

## 1. System Overview

### Purpose

The Customer Portal (`portal.promosinkwall-e.com`) is a B2B e-commerce platform for promotional products. It enables:

- **Customers**: Browse catalog, build quotes, submit for approval
- **Account Managers**: Review and approve customer quotes
- **Admins**: Manage catalog, users, and system settings

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Customer Portal                                 │
│                        (portal.promosinkwall-e.com)                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │   Next.js   │    │   Clerk     │    │   Prisma    │    │   Vercel    │  │
│  │   App       │◄──►│   Auth      │    │   ORM       │    │   KV Cache  │  │
│  └──────┬──────┘    └─────────────┘    └──────┬──────┘    └─────────────┘  │
│         │                                      │                            │
│         │         ┌────────────────────────────┼────────────────────────┐   │
│         │         │                            ▼                        │   │
│         │         │                   ┌─────────────────┐               │   │
│         │         │                   │   PostgreSQL    │               │   │
│         │         │                   │   (Neon/Supabase)│              │   │
│         │         │                   └─────────────────┘               │   │
│         │         └─────────────────────────────────────────────────────┘   │
│         │                                                                   │
│         ▼                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        External Integrations                         │   │
│  ├─────────────────┬─────────────────┬─────────────────────────────────┤   │
│  │   SanMar        │  S&S Activewear │    Promos Ink API              │   │
│  │   (SFTP/SOAP)   │  (REST API)     │    (HMAC Auth)                 │   │
│  └─────────────────┴─────────────────┴─────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### User Journeys

#### Customer Journey

```
1. Login (Clerk) → 2. Browse Catalog → 3. Add to Cart → 4. Configure Decoration
       ↓                                                          ↓
5. Submit Quote → 6. Wait for Approval → 7. Receive Order Acknowledgment
```

#### Account Manager Journey

```
1. Login (Clerk) → 2. View Pending Quotes → 3. Review Quote Details
       ↓                                              ↓
4. Approve/Reject → 5. Customer Notified → 6. Order Sent to Promos Ink API
```

### Directory Structure

```
customer-portal/
├── prisma/
│   └── schema.prisma          # Database schema
├── scripts/                   # Utility scripts for sync, migration
├── src/
│   ├── app/                   # Next.js App Router pages
│   │   ├── admin/             # Account manager pages
│   │   ├── api/               # API routes
│   │   ├── cart/              # Shopping cart
│   │   ├── checkout/          # Checkout flow
│   │   ├── portal/            # Customer portal pages
│   │   ├── product/           # Product detail pages
│   │   ├── quote/             # Quote submission/status
│   │   └── search/            # Search results
│   ├── components/            # Shared UI components
│   ├── contexts/              # React contexts (Cart)
│   ├── lib/                   # Core libraries
│   │   ├── api/               # API client & HMAC
│   │   ├── decoration/        # Pricing calculator
│   │   ├── email/             # Email templates
│   │   └── quotes/            # Quote service
│   └── services/              # Business logic
│       ├── sanmar/            # SanMar integration
│       └── orders/            # Order management
└── middleware.ts              # Clerk auth middleware
```

---

## 2. Authentication & Authorization

### Clerk Integration

We use **Clerk** for authentication, replacing the original Auth0 setup for unified auth across projects.

#### Configuration

```typescript
// middleware.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher([
  '/',
  '/search(.*)',
  '/product(.*)',
  '/category(.*)',
  '/api/products(.*)',
  '/api/health(.*)',
  '/sign-in(.*)',
  '/sign-up(.*)',
]);

const isStaffRoute = createRouteMatcher([
  '/admin(.*)',
  '/api/quotes/pending(.*)',
]);
```

### User Roles

| Role | Access | Description |
|------|--------|-------------|
| `customer` | Portal, Cart, Quotes | Regular B2B customer |
| `staff` | Admin pages, Quote approval | Account managers |
| `admin` | Full access | System administrators |

Roles are stored in Clerk user metadata:
```typescript
const userRole = (sessionClaims?.metadata as { role?: string })?.role;
```

### Session Management

- **Session Duration**: Managed by Clerk (configurable in dashboard)
- **Token Refresh**: Automatic via Clerk SDK
- **Logout**: Redirects to `/sign-in`

### Protected Routes

| Route Pattern | Protection Level |
|---------------|------------------|
| `/` | Public |
| `/search/*` | Public |
| `/product/*` | Public |
| `/cart` | Authenticated |
| `/quote/*` | Authenticated |
| `/portal/*` | Authenticated |
| `/admin/*` | Staff/Admin only |
| `/api/quotes/pending` | Staff/Admin only |

---

## 3. Data Models

### Entity Relationship Diagram

```
┌──────────────────┐       ┌──────────────────┐
│  CanonicalStyle  │       │      Product     │
│──────────────────│       │──────────────────│
│ id               │       │ id               │
│ styleNumber (UK) │◄──┐   │ supplierPartId   │
│ displayName      │   │   │ name             │
│ brand            │   │   │ brand            │
└────────┬─────────┘   │   │ description      │
         │             │   │ attributes       │
         │             │   └────────┬─────────┘
         ▼             │            │
┌──────────────────┐   │   ┌────────┴─────────┐
│SupplierProductLink│──┘   │   ProductColor   │
│──────────────────│       │   ProductSize    │
│ canonicalStyleId │       │   ProductMedia   │
│ supplier (ENUM)  │       │   ProductSku     │
│ supplierPartId   │       │   ProductKeyword │
│ metadata         │       │   ProductInventory│
└──────────────────┘       └──────────────────┘

┌──────────────────┐       ┌──────────────────┐
│      Quote       │       │    QuoteItem     │
│──────────────────│       │──────────────────│
│ id               │◄──────│ quoteId          │
│ quoteNumber (UK) │       │ canonicalStyleId │
│ customerName     │       │ styleNumber      │
│ customerEmail    │       │ productName      │
│ status (ENUM)    │       │ quantity         │
│ subtotal         │       │ unitPrice        │
│ total            │       │ decorations (JSON)│
└────────┬─────────┘       └──────────────────┘
         │
         ▼
┌──────────────────┐
│QuoteApprovalToken│
│──────────────────│
│ quoteId (UK)     │
│ token (UK)       │
│ expiresAt        │
│ usedAt           │
└──────────────────┘
```

### Core Models

#### Product Catalog

```prisma
model Product {
  id             String             @id @default(uuid())
  supplierPartId String             @unique  // e.g., "PC54" for SanMar
  name           String
  brand          String?
  defaultColor   String?
  description    Json?              // Array of description strings
  attributes     Json?              // Key-value attributes
  colors         ProductColor[]
  sizes          ProductSize[]
  media          ProductMedia[]
  skus           ProductSku[]
  keywords       ProductKeyword[]
  inventory      ProductInventory[]
}
```

#### Canonical Style (Cross-Supplier Mapping)

```prisma
model CanonicalStyle {
  id            String                 @id @default(uuid())
  styleNumber   String                 @unique  // e.g., "PC54"
  displayName   String
  brand         String?
  supplierLinks SupplierProductLink[]
}

model SupplierProductLink {
  id               String          @id @default(uuid())
  canonicalStyleId String
  supplier         SupplierSource  // SANMAR | SSACTIVEWEAR
  supplierPartId   String
  metadata         Json?
}
```

#### Quote System

```prisma
enum QuoteStatus {
  PENDING_APPROVAL
  APPROVED
  REJECTED
  EXPIRED
  CONVERTED
}

model Quote {
  id                String       @id @default(uuid())
  quoteNumber       String       @unique  // QT-2024-XXXXXXXX
  customerName      String
  customerEmail     String
  accountManagerEmail String?
  status            QuoteStatus  @default(PENDING_APPROVAL)
  subtotal          Decimal
  total             Decimal
  items             QuoteItem[]
  approvalToken     QuoteApprovalToken?
}
```

### Inventory Model

```prisma
model ProductInventory {
  id             String   @id @default(uuid())
  productId      String?
  supplierPartId String
  colorCode      String
  sizeCode       String
  totalQty       Int
  warehouses     Json?    // { "DC1": 100, "DC2": 50 }
  fetchedAt      DateTime
  
  @@unique([supplierPartId, colorCode, sizeCode])
}
```

---

## 4. API Integration

### Promos Ink API Client

The portal communicates with the Promos Ink API (`api.promosinkwall-e.com`) for order submission.

#### HMAC-SHA256 Authentication

```typescript
// src/lib/api/hmac.ts
export function generateHmacSignature(
  timestamp: number,
  method: string,
  path: string,
  body: string,
  secret: string
): string {
  // Signature = HMAC-SHA256(timestamp + method + path + body, secret)
  const payload = `${timestamp}${method.toUpperCase()}${path}${body}`;
  
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
}
```

#### Request Flow

```
1. Build request body (JSON)
2. Generate timestamp (Unix ms)
3. Create signature: HMAC-SHA256(timestamp + method + path + body, secret)
4. Add headers:
   - X-API-Key: API key
   - X-Timestamp: Unix timestamp
   - X-Signature: HMAC signature
   - X-Customer-ID: Customer identifier
   - X-Partner-Code: "PORTAL"
5. Send request
6. Handle response/errors
```

#### API Client Usage

```typescript
// src/lib/api/client.ts
const response = await apiRequest<OrderResponse>({
  method: 'POST',
  path: '/api/orders',
  body: orderData,
  timeout: 30000,
});
```

### Error Handling

| Error Code | Description | User Message |
|------------|-------------|--------------|
| `UNAUTHORIZED` | Invalid signature | "Authentication failed. Please contact support." |
| `INVALID_SIGNATURE` | Signature mismatch | "Authentication failed. Please contact support." |
| `PRODUCT_NOT_FOUND` | Product unavailable | "One or more products are no longer available." |
| `INSUFFICIENT_INVENTORY` | Out of stock | "Some items are out of stock." |
| `TIMEOUT` | Request timeout | "Request timed out. Please try again." |

---

## 5. Catalog Sync

### Supplier Integrations

#### SanMar

| Method | Purpose | Frequency |
|--------|---------|-----------|
| SFTP | Product catalog (PDD files) | Daily |
| SFTP | EPDD (Extended Product Data) | Daily |
| SOAP | Real-time inventory | On-demand |

**SFTP Configuration:**
```typescript
// src/services/sanmar/sftp.ts
{
  host: process.env.SANMAR_FTP_HOST,
  port: 2200,  // Non-standard SFTP port
  username: process.env.SANMAR_FTP_USERNAME,
  password: process.env.SANMAR_FTP_PASSWORD,
  remoteDir: 'SanMarPDD'
}
```

**Sync Scripts:**
```bash
# Full catalog sync from FTP
npm run sync:sanmar:full

# EPDD import (extended product data)
npm run ingest:sanmar:epdd

# Inventory sync
npm run ingest:sanmar:inventory
```

#### S&S Activewear

| Method | Purpose | Frequency |
|--------|---------|-----------|
| REST API | Product catalog | Daily/Incremental |
| REST API | Inventory | Hourly (via cron) |

**Sync Scripts:**
```bash
# Full catalog sync
npm run sync:ssa:full

# Incremental sync
npm run sync:ssa:incremental

# Inventory sync
npm run sync:ssa:inventory
```

### Canonical Style Mapping

Products from different suppliers are linked via `CanonicalStyle`:

```
CanonicalStyle: PC54 (Port & Company Core Cotton Tee)
├── SanMar: supplierPartId = "PC54"
└── S&S: supplierPartId = "B00060"
```

This enables:
- Unified product pages showing all supplier options
- Price comparison across suppliers
- Inventory aggregation

### Data Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   SanMar    │     │    S&S      │     │   Portal    │
│   SFTP/SOAP │     │   REST API  │     │   Database  │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       │ PDD/EPDD files    │ JSON response     │
       ▼                   ▼                   │
┌──────────────────────────────────────┐       │
│         Sync Scripts (tsx)           │       │
│  - Normalize product data            │       │
│  - Map to canonical styles           │       │
│  - Upsert to database                │───────┘
└──────────────────────────────────────┘
```

---

## 6. Quote System

### Quote Lifecycle

```
┌─────────────┐     ┌─────────────────┐     ┌─────────────┐
│   Customer  │     │ Account Manager │     │  Promos Ink │
│   Portal    │     │     Portal      │     │     API     │
└──────┬──────┘     └────────┬────────┘     └──────┬──────┘
       │                     │                     │
       │ 1. Submit Quote     │                     │
       │────────────────────►│                     │
       │                     │                     │
       │ 2. Email: Quote     │                     │
       │    Submitted        │                     │
       │◄────────────────────│                     │
       │                     │                     │
       │                     │ 3. Review Quote     │
       │                     │◄───────────────────►│
       │                     │                     │
       │                     │ 4. Approve/Reject   │
       │                     │────────────────────►│
       │                     │                     │
       │ 5. Email: Approved/ │                     │
       │    Rejected         │                     │
       │◄────────────────────│                     │
       │                     │                     │
       │                     │ 6. Convert to Order │
       │                     │────────────────────►│
       │                     │                     │
       │ 7. Order            │                     │
       │    Acknowledgment   │                     │
       │◄────────────────────┼─────────────────────│
```

### Quote Service

```typescript
// src/lib/quotes/service.ts

// Create quote from cart
const quote = await createQuote({
  customerInfo: { name, email, phone, company },
  shippingAddress: { ... },
  items: cartItems,
  pricing: { subtotal, decorationTotal, setupFees, shipping, tax, total },
  accountManagerEmail: 'am@company.com',
});

// Approve quote
await approveQuote(quoteId, accountManagerId, accountManagerName, notes);

// Reject quote
await rejectQuote(quoteId, rejectionReason, accountManagerId, accountManagerName);

// Convert to order (returns data for Promos Ink API)
const orderData = await convertQuoteToOrder(quoteId);
```

### Decoration Pricing

The portal includes a comprehensive pricing calculator for decorations:

```typescript
// src/lib/decoration/pricing.ts

type DecorationMethod = 'screen_print' | 'embroidery' | 'dtg';

const result = calculateDecorationPricing({
  method: 'screen_print',
  quantity: 144,
  colors: 3,
  locations: ['front_chest', 'back'],
  isPolyBlend: true,
  needsFolding: true,
});

// Returns:
// {
//   unitCost: 2.95,
//   setupFee: 0,
//   totalDecorationCost: 424.80,
//   extraLocationCharges: 0,
//   fabricCharges: 0.35,
//   serviceCharges: 0.20,
// }
```

**Pricing Tables:**
- Screen Print: 10 quantity tiers × 12 color options
- Embroidery: 6 quantity tiers × 11 stitch count ranges
- DTG: 8 quantity tiers × 5 print sizes × 2 garment colors

### Email Notifications

| Event | Recipient | Template |
|-------|-----------|----------|
| Quote Submitted | Customer | Confirmation with quote number |
| Approval Request | Account Manager | Review link |
| Quote Approved | Customer | Confirmation + next steps |
| Quote Rejected | Customer | Reason + contact info |
| Order Acknowledgment | Customer + AM | Full order details |

---

## 7. UI Components

### Key Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `Header` | `src/app/components/Header.tsx` | Navigation, search, cart |
| `SearchBar` | `src/app/components/SearchBar.tsx` | Product search |
| `ProductCard` | `src/app/components/ProductCard.tsx` | Product grid item |
| `CartPage` | `src/app/components/CartPage.tsx` | Shopping cart |
| `DecorationForm` | `src/app/components/DecorationForm.tsx` | Decoration configuration |
| `ColorSwatches` | `src/app/product/[...]/ColorSwatches.tsx` | Color selection |
| `InventoryMatrix` | `src/app/product/[...]/InventoryMatrix.tsx` | Size/color inventory |
| `SizeQuantitySelector` | `src/app/product/[...]/SizeQuantitySelector.tsx` | Quantity input |

### Cart Context

```typescript
// src/contexts/CartContext.tsx

const { items, summary, addItem, removeItem, updateQuantity, clearCart } = useCart();

// Add item
addItem({
  styleNumber: 'PC54',
  productName: 'Core Cotton Tee',
  supplierPartId: 'PC54',
  canonicalStyleId: 'xxx-xxx',
  color: 'RED',
  colorName: 'Red',
  size: 'L',
  quantity: 24,
  unitPrice: 5.99,
  imageUrl: '...',
  decorations: [...],
});
```

### Design System

**Framework:** Tailwind CSS v3.4

**Color Palette:**
```css
/* Primary */
--blue-600: #2563eb;  /* Links, buttons */
--blue-700: #1d4ed8;  /* Hover states */

/* Status */
--green-500: #22c55e; /* Success, approved */
--yellow-500: #eab308; /* Warning, pending */
--red-500: #ef4444;   /* Error, rejected */

/* Neutral */
--slate-50: #f8fafc;  /* Backgrounds */
--slate-700: #334155; /* Text */
--slate-900: #0f172a; /* Headings */
```

**Typography:**
- Font: System font stack (`-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto`)
- Headings: `font-semibold` or `font-bold`
- Body: `text-slate-700`

---

## 8. Environment Variables

### Required Variables

```bash
# Database
DATABASE_URL="postgresql://user:pass@host:5432/db"

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_live_..."
CLERK_SECRET_KEY="sk_live_..."
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"

# Promos Ink API
NEXT_PUBLIC_API_BASE_URL="https://api.promosinkwall-e.com"
PORTAL_API_KEY="your_api_key"
PORTAL_API_SECRET="your_api_secret"
PORTAL_CUSTOMER_ID="your_customer_id"
PORTAL_PARTNER_CODE="PORTAL"

# SanMar Integration
SANMAR_FTP_HOST="ftp.sanmar.com"
SANMAR_FTP_PORT="2200"
SANMAR_FTP_USERNAME="your_username"
SANMAR_FTP_PASSWORD="your_password"
SANMAR_FTP_REMOTE_DIR="SanMarPDD"

# S&S Activewear Integration
SSA_API_URL="https://api.ssactivewear.com/v2"
SSA_API_KEY="your_api_key"

# Email (Resend)
RESEND_API_KEY="re_..."
EMAIL_FROM="orders@promosink.com"

# Application
NEXT_PUBLIC_BASE_URL="https://portal.promosinkwall-e.com"
```

### Optional Variables

```bash
# Vercel KV (caching)
KV_REST_API_URL="..."
KV_REST_API_TOKEN="..."

# Feature Flags
ENABLE_QUOTE_WORKFLOW="true"
ENABLE_DIRECT_CHECKOUT="false"
```

---

## 9. Known Issues & Tech Debt

### Current Limitations

| Issue | Impact | Priority |
|-------|--------|----------|
| Promos Ink API returning 401 | Order submission blocked | High |
| Color swatches missing for some products | UI gaps | Medium |
| No real-time inventory updates | Potential overselling | Medium |
| Cart stored in localStorage only | Lost on browser clear | Low |

### Technical Debt

1. **Mixed Auth Patterns**
   - Some API routes still reference Auth0 types
   - Need full migration to Clerk types

2. **Unused Variables/Imports**
   - ESLint warnings for unused variables
   - Should clean up during next refactor

3. **Any Types**
   - Some `any` types remain in decoration/cart code
   - Need stricter typing

4. **Image Optimization**
   - Using `<img>` instead of `next/image` in some places
   - Should migrate for better performance

### Planned Improvements

- [ ] Real-time inventory WebSocket updates
- [ ] Server-side cart persistence
- [ ] Multi-currency support
- [ ] Bulk order upload (CSV)
- [ ] Customer-specific pricing tiers
- [ ] Order tracking integration

---

## 10. Deployment

### Vercel Configuration

**Project Settings:**
- Framework: Next.js
- Build Command: `npm run build`
- Output Directory: `.next`
- Install Command: `npm install`

**Environment Variables:**
All variables from Section 8 must be configured in Vercel Dashboard → Settings → Environment Variables.

### Database Migrations

```bash
# Generate migration
npx prisma migrate dev --name description

# Apply to production
npx prisma migrate deploy

# Force sync (development only)
npx prisma db push
```

### Deployment Flow

```
1. Push to main branch
2. Vercel detects changes
3. Runs npm install (triggers prisma generate)
4. Runs npm run build
5. Deploys to production
```

### Domain Configuration

| Domain | Project | Purpose |
|--------|---------|---------|
| `portal.promosinkwall-e.com` | customer-portal | Production |
| `api.promosinkwall-e.com` | api-docs | API Documentation |

### Monitoring

- **Vercel Analytics**: Page views, performance
- **Vercel Logs**: Function logs, errors
- **Prisma Accelerate**: Database query metrics (optional)

---

## Appendix: NPM Scripts

```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint src/**/*.{ts,tsx}",
  
  // SanMar Sync
  "sync:sanmar:full": "tsx scripts/sync-sanmar-full-catalog-ftp.ts",
  "ingest:sanmar:epdd": "tsx scripts/ingest-sanmar-epdd.ts",
  "ingest:sanmar:inventory": "tsx scripts/ingest-sanmar-inventory.ts",
  
  // S&S Activewear Sync
  "sync:ssa:full": "tsx scripts/sync-ssactivewear-full-catalog.ts",
  "sync:ssa:incremental": "tsx scripts/sync-ssactivewear-incremental.ts",
  "sync:ssa:inventory": "tsx scripts/sync-ssactivewear-inventory.ts",
  
  // Utilities
  "seed:canonical": "tsx scripts/seed-canonical-styles.ts --apply",
  "link:style": "tsx scripts/link-style.ts"
}
```

---

*Document maintained by the Engineering Team. For questions, contact the platform team.*

