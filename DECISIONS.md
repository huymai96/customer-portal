# Architectural Decisions Record

> This document records key architectural decisions made during the development of the Customer Portal. Each decision includes context, options considered, and rationale.

---

## Table of Contents

1. [Authentication: Clerk over Auth0](#1-authentication-clerk-over-auth0)
2. [Database: PostgreSQL with Prisma](#2-database-postgresql-with-prisma)
3. [Canonical Style Pattern](#3-canonical-style-pattern)
4. [Quote Approval Workflow](#4-quote-approval-workflow)
5. [Client-Side Cart with localStorage](#5-client-side-cart-with-localstorage)
6. [HMAC Authentication for API](#6-hmac-authentication-for-api)
7. [Decoration Pricing as Code](#7-decoration-pricing-as-code)
8. [SanMar SFTP vs SOAP](#8-sanmar-sftp-vs-soap)
9. [Next.js App Router](#9-nextjs-app-router)
10. [Tailwind CSS for Styling](#10-tailwind-css-for-styling)

---

## 1. Authentication: Clerk over Auth0

### Date
November 2024

### Status
**Accepted** - Implemented

### Context
The project initially used Auth0 for authentication. However, we needed to:
- Unify authentication across customer portal and API docs
- Simplify the authentication setup
- Provide better developer experience
- Support invite-only customer access

### Options Considered

| Option | Pros | Cons |
|--------|------|------|
| **Auth0** | Enterprise features, extensive docs | Complex setup, separate user pools |
| **Clerk** | Modern DX, built-in components, unified users | Newer, less enterprise features |
| **NextAuth.js** | Open source, flexible | More setup required, no hosted UI |

### Decision
Migrate to **Clerk** for both portals.

### Rationale
1. **Unified User Management**: Single user database across portal and API docs
2. **Better DX**: Pre-built components (`<SignIn />`, `<UserButton />`)
3. **Invite-Only Mode**: Built-in "Restricted" sign-up mode perfect for B2B
4. **Middleware Integration**: Clean Next.js middleware pattern
5. **Role-Based Access**: Easy metadata-based roles (`staff`, `admin`, `customer`)

### Consequences
- All Auth0 code removed
- Existing users need to re-register (acceptable for new platform)
- Two Clerk apps needed (one per portal) for separate branding

---

## 2. Database: PostgreSQL with Prisma

### Date
Initial architecture

### Status
**Accepted** - Implemented

### Context
Need a relational database to store:
- Product catalog (50,000+ products)
- Inventory data (millions of rows)
- Orders and quotes
- User-related data

### Options Considered

| Option | Pros | Cons |
|--------|------|------|
| **PostgreSQL + Prisma** | Type-safe, migrations, great DX | ORM overhead |
| **PostgreSQL + raw SQL** | Maximum performance | No type safety, more code |
| **MongoDB** | Flexible schema | Poor for relational data |
| **PlanetScale (MySQL)** | Serverless, branching | MySQL quirks, no FK constraints |

### Decision
**PostgreSQL** with **Prisma ORM**, hosted on Neon or Supabase.

### Rationale
1. **Type Safety**: Prisma generates TypeScript types from schema
2. **Migrations**: Built-in migration system with `prisma migrate`
3. **Relations**: Strong relational model for products → colors → sizes → inventory
4. **Serverless Compatible**: Works with Neon's serverless PostgreSQL
5. **Ecosystem**: Wide hosting options (Neon, Supabase, Railway, etc.)

### Consequences
- Need to run `prisma generate` on deploy (handled in `postinstall`)
- Schema changes require migrations
- Some complex queries may need raw SQL

---

## 3. Canonical Style Pattern

### Date
Initial architecture

### Status
**Accepted** - Implemented

### Context
Products exist in multiple supplier catalogs (SanMar, S&S Activewear) with different part IDs but represent the same physical product. Example:
- SanMar: `PC54` (Port & Company Core Cotton Tee)
- S&S: `B00060` (Same product)

### Options Considered

| Option | Pros | Cons |
|--------|------|------|
| **Canonical Style Table** | Clean separation, flexible | Extra table, more joins |
| **Product Aliases Field** | Simple, one table | Messy, hard to query |
| **Separate Product Tables** | Supplier isolation | Duplicate data, no comparison |

### Decision
Create a **CanonicalStyle** table with **SupplierProductLink** for mapping.

### Schema
```prisma
model CanonicalStyle {
  id            String                 @id
  styleNumber   String                 @unique  // "PC54"
  displayName   String
  supplierLinks SupplierProductLink[]
}

model SupplierProductLink {
  canonicalStyleId String
  supplier         SupplierSource  // SANMAR | SSACTIVEWEAR
  supplierPartId   String
}
```

### Rationale
1. **Single Source of Truth**: One canonical style = one product page
2. **Supplier Comparison**: Easy to show all suppliers for a style
3. **Price Comparison**: Query all linked products for pricing
4. **Flexible Mapping**: Can map multiple supplier SKUs to one canonical

### Consequences
- Product pages use `canonicalStyleId` in URL
- Sync scripts must create/update canonical mappings
- Search returns canonical styles, not raw products

---

## 4. Quote Approval Workflow

### Date
November 2024

### Status
**Accepted** - Implemented

### Context
Originally planned to submit orders directly to Promos Ink API. However:
- API integration encountered 401 errors (credentials issue)
- Business requirement for account manager approval before order
- Need audit trail of quote approvals

### Options Considered

| Option | Pros | Cons |
|--------|------|------|
| **Direct Checkout** | Faster, simpler | No approval, no oversight |
| **Email-Based Approval** | Simple, no UI needed | No audit trail, manual |
| **In-App Approval Workflow** | Full control, audit trail | More development |

### Decision
Implement **full in-app quote approval workflow** with email notifications.

### Flow
```
Customer → Submit Quote → Database (PENDING)
                              ↓
                    Email to Account Manager
                              ↓
                    AM Reviews in Admin Portal
                              ↓
                    Approve/Reject → Email to Customer
                              ↓
                    If Approved → Convert to Order → Send to API
```

### Rationale
1. **Business Control**: Account managers can review pricing, quantities
2. **Audit Trail**: All quotes stored with status history
3. **Flexibility**: Can reject with reason, customer can resubmit
4. **API Decoupling**: Quote approval doesn't depend on API availability
5. **Email Fallback**: Approval links work even if portal is down

### Consequences
- Added `Quote`, `QuoteItem`, `QuoteApprovalToken` models
- Admin pages for quote management
- Email service integration (Resend)
- More complex flow than direct checkout

---

## 5. Client-Side Cart with localStorage

### Date
Initial architecture

### Status
**Accepted** - With planned improvements

### Context
Need shopping cart functionality for customers to:
- Add products with size/color/quantity
- Configure decorations
- Persist across page navigations
- Submit as quote

### Options Considered

| Option | Pros | Cons |
|--------|------|------|
| **localStorage + React Context** | Simple, fast, no server calls | Lost on browser clear |
| **Server-Side Cart (DB)** | Persistent, cross-device | More complexity, latency |
| **Hybrid (localStorage + sync)** | Best of both | Most complex |

### Decision
**Client-side cart** using React Context with localStorage persistence.

### Implementation
```typescript
// CartContext.tsx
useEffect(() => {
  const stored = localStorage.getItem('promos-ink-cart');
  if (stored) setItems(JSON.parse(stored));
}, []);

useEffect(() => {
  localStorage.setItem('promos-ink-cart', JSON.stringify(items));
}, [items]);
```

### Rationale
1. **Simplicity**: No server calls for cart operations
2. **Speed**: Instant updates, no network latency
3. **Offline Support**: Cart works without internet
4. **MVP Appropriate**: Good enough for initial launch

### Consequences
- Cart lost if user clears browser data
- No cross-device cart sync
- **Planned Improvement**: Add server-side sync for logged-in users

---

## 6. HMAC Authentication for API

### Date
November 2024

### Status
**Accepted** - Implemented (pending API team verification)

### Context
Need secure authentication between Customer Portal and Promos Ink API for order submission.

### Options Considered

| Option | Pros | Cons |
|--------|------|------|
| **API Key Only** | Simple | Less secure, replay attacks |
| **OAuth 2.0** | Standard, flexible | Complex for server-to-server |
| **HMAC-SHA256** | Secure, prevents replay | More implementation |
| **mTLS** | Very secure | Complex certificate management |

### Decision
**HMAC-SHA256** signature authentication.

### Implementation
```typescript
// Signature = HMAC-SHA256(timestamp + method + path + body, secret)
const payload = `${timestamp}${method}${path}${body}`;
const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

// Headers
{
  'X-API-Key': apiKey,
  'X-Timestamp': timestamp,
  'X-Signature': signature,
  'X-Customer-ID': customerId,
}
```

### Rationale
1. **Replay Protection**: Timestamp in signature prevents replay attacks
2. **Request Integrity**: Body included in signature prevents tampering
3. **No Token Management**: Unlike OAuth, no token refresh needed
4. **Industry Standard**: Used by AWS, Stripe, etc.

### Consequences
- Both parties must have shared secret
- Clock sync important (allow ±5 minute tolerance)
- Need to regenerate credentials if compromised

---

## 7. Decoration Pricing as Code

### Date
November 2024

### Status
**Accepted** - Implemented

### Context
Need to calculate decoration pricing for:
- Screen printing (by colors and quantity)
- Embroidery (by stitch count and quantity)
- DTG (by print size, garment color, quantity)

### Options Considered

| Option | Pros | Cons |
|--------|------|------|
| **Hardcoded in TypeScript** | Fast, type-safe, testable | Requires deploy to change |
| **Database Tables** | Admin can update | More complex, slower |
| **External Pricing API** | Centralized | Network dependency, latency |
| **JSON Config Files** | Easy to update | No type safety |

### Decision
**Hardcoded pricing tables in TypeScript** with structured types.

### Implementation
```typescript
// src/lib/decoration/pricing.ts
const SCREEN_PRINT_PRICING: Record<string, Record<number, number>> = {
  '12-29': { 1: 5.23, 2: 5.80, 3: 6.67, ... },
  '30-48': { 1: 4.35, 2: 5.07, 3: 5.79, ... },
  // ...
};

export function calculateDecorationPricing(input: DecorationPricingInput): DecorationPricingResult {
  // Type-safe calculation
}
```

### Rationale
1. **Type Safety**: Full TypeScript types for inputs/outputs
2. **Testability**: Easy to unit test pricing logic
3. **Performance**: No database/API calls, instant calculation
4. **Version Control**: Pricing changes tracked in git
5. **Complexity**: Pricing logic has many edge cases, code handles better than data

### Consequences
- Price changes require code deployment
- **Mitigation**: Pricing changes are infrequent, deploy is fast
- Future: Could add admin override capability

---

## 8. SanMar SFTP vs SOAP

### Date
Initial architecture

### Status
**Accepted** - Hybrid approach

### Context
SanMar provides multiple data access methods:
- SFTP: Daily catalog files (PDD, EPDD)
- SOAP API: Real-time product and inventory queries

### Options Considered

| Option | Pros | Cons |
|--------|------|------|
| **SFTP Only** | Complete data, bulk import | Daily updates only |
| **SOAP Only** | Real-time data | Rate limits, slower for bulk |
| **Hybrid** | Best of both | More complexity |

### Decision
**Hybrid approach**:
- SFTP for daily catalog sync (products, EPDD)
- SOAP for real-time inventory queries

### Implementation
```typescript
// SFTP for catalog
await downloadSanmarFiles({
  files: ['SanMarPDD.txt', 'SanMarEPDD.txt'],
  targetDir: './data/sanmar',
});

// SOAP for inventory
const inventory = await invokeSoapOperation(client, 'GetInventory', { ProductId: 'PC54' });
```

### Rationale
1. **Data Completeness**: SFTP files have full catalog data
2. **Freshness**: SOAP provides real-time inventory
3. **Rate Limits**: Avoid hitting SOAP limits with bulk queries
4. **Reliability**: SFTP works even if SOAP is down

### Consequences
- Two integration points to maintain
- Need scheduled jobs for SFTP sync
- Inventory may be slightly stale (minutes, not hours)

---

## 9. Next.js App Router

### Date
Initial architecture

### Status
**Accepted** - Implemented

### Context
Building a modern React application with:
- Server-side rendering for SEO
- API routes for backend logic
- Dynamic routes for products

### Options Considered

| Option | Pros | Cons |
|--------|------|------|
| **Next.js App Router** | Latest features, RSC | Newer, some rough edges |
| **Next.js Pages Router** | Stable, well-documented | Legacy, no RSC |
| **Remix** | Great DX, nested routes | Smaller ecosystem |
| **SPA (Vite + React)** | Simple, fast dev | No SSR, poor SEO |

### Decision
**Next.js 15 with App Router**.

### Rationale
1. **React Server Components**: Better performance, less client JS
2. **Streaming**: Progressive page loading
3. **Layouts**: Nested layouts for consistent UI
4. **API Routes**: Backend logic alongside frontend
5. **Vercel Integration**: Optimal deployment platform
6. **Future-Proof**: App Router is the future of Next.js

### Consequences
- Some patterns different from Pages Router
- Need to understand client vs server components
- Some libraries may not support RSC yet

---

## 10. Tailwind CSS for Styling

### Date
Initial architecture

### Status
**Accepted** - Implemented

### Context
Need a styling solution that:
- Enables rapid UI development
- Produces consistent designs
- Works well with component libraries
- Has good performance

### Options Considered

| Option | Pros | Cons |
|--------|------|------|
| **Tailwind CSS** | Utility-first, fast dev | Verbose class names |
| **CSS Modules** | Scoped styles, standard CSS | More files, slower dev |
| **Styled Components** | CSS-in-JS, dynamic | Runtime overhead, SSR issues |
| **Chakra UI** | Component library | Opinionated, heavy |

### Decision
**Tailwind CSS v3.4** with custom configuration.

### Configuration
```javascript
// tailwind.config.js
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: { /* custom colors */ }
      }
    }
  }
}
```

### Rationale
1. **Developer Velocity**: Rapid prototyping with utility classes
2. **Consistency**: Design tokens enforced via config
3. **Performance**: PurgeCSS removes unused styles
4. **No Context Switching**: Styles in same file as markup
5. **Responsive**: Built-in responsive modifiers (`md:`, `lg:`)

### Consequences
- HTML can be verbose with many classes
- Team needs to learn Tailwind conventions
- **Mitigation**: Extract common patterns to components

---

## Decision Template

For future decisions, use this template:

```markdown
## [Number]. [Decision Title]

### Date
[When the decision was made]

### Status
[Proposed | Accepted | Deprecated | Superseded]

### Context
[What is the issue that we're seeing that is motivating this decision?]

### Options Considered
[What options were considered?]

### Decision
[What is the change that we're proposing and/or doing?]

### Rationale
[Why was this decision made?]

### Consequences
[What becomes easier or more difficult because of this change?]
```

---

*Last updated: November 2024*

