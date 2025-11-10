# WALL-E Portal Experience Refresh

## Vision
- Position WALL-E as a premium ecommerce-style command center for B2B buyers.
- Blend storefront energy (rich merchandising, curated launches) with operational trust (real-time production + logistics status).
- Deliver intuitive pathways for customer self-service while surfacing proactive insights for Promos Ink teams.

## Brand Pillars
- **Electric Commerce**: bold gradients, kinetic patterns, glassmorphism accents.
- **Operational Clarity**: data-viz forward, sparing animation, responsive typography.
- **Human Assist**: contextual concierge modules (“Need a creative partner?”) with multi-channel contact buttons.

## Layout Framework
1. **Shell**
   - Full-width canvas with layered background gradients evocative of neon/electric hues.
   - Sticky commerce-style header: brand mark (WALL-E wordmark), search, quick-add drawer, profile, notifications.
   - Left dock for primary nav (iconic + label), collapsible to micro state on md screens.
   - Right rail (optional) for timeline alerts, approvals, and concierge chat.
2. **Overview Canvas**
   - Hero band with customer loyalty stats, spend-to-goal, and curated promos.
   - KPI strip (AOV, reorder probability, open balance) with sparkline trends.
   - Workflow cards: “Reorder best-seller”, “Approve art proof”, “Track shipments”.
   - Merch carousel featuring new collections, integrated directly with quote builder.
3. **Detail Pages**
   - Inventory: product grid with filters, quick-view, color/size badges.
   - Quotes: pipeline board (Draft, Sent, Approved) with revenue tallies.
   - Orders: timeline tracker (production → fulfillment → delivery) + map view.
   - Billing: ledger-style table, invoice viewer, payment CTA.

## UI Systems
- **Typography**: Inter Tight (display), Inter (body). Use expressive weights for hero metrics.
- **Color**: Deep slate base (#0f172a), electric cyan (#06b6d4), neon violet (#A855F7), accent amber (#F59E0B).
- **Components**: glassmorphic panels, outlined pill buttons, iconography via Phosphor or Lucide heavy line.
- **Charts**: Area + bar combos (Nivo/Chart.js) with soft gradients, micro-interactions on hover.

## Admin UX Upgrades
- Multi-column layout for approvals (filters: status, manager, submitted last 7/30/etc.).
- Bulk actions (approve/reject), saved searches, export CSV.
- Activity timeline on right rail logging approvals, art uploads, notifications.
- Inline messaging to requester (templated responses) with preview of outgoing email.

## Reporting Roadmap
- Spend dashboard: YTD, category breakdown, favorite SKUs, reorder cadence.
- Production heatmap: queue status across print methods.
- Fulfillment SLA tracker: shipping performance, exceptions list.
- Engagement analytics: logins, quote conversions, open email triggers.

## Notification Enhancements
- Multi-channel: email, Slack/Teams webhook, SMS fallback.
- Personal notification settings panel (digest vs immediate, channel preferences).
- Event types: approvals, shipment events, low inventory thresholds, upcoming launches.

## Implementation Phasing
1. **Shell & Theme**: implement new layout, typography, color tokens, header/nav redesign.
2. **Overview Dashboard v1**: hero band, KPI strip, workflow cards, merch spotlight.
3. **Detail page modernizations**: inventory grid + product cards; quotes kanban; orders timeline.
4. **Admin Workspace**: advanced approvals table, filters, messaging drawer.
5. **Notifications & Settings**: backend triggers + UI, Slack/SMS integration.
6. **Analytics modules**: charts, reporting hub, export pipeline.

## Tech Considerations
- Promote layout to app router shared components; use CSS variables for theme.
- Adopt tailwind config customization + `@tailwindcss/typography` for marketing-style copy.
- Introduce charting and animation libs (recharts + framer-motion) with SSR lazy loading.
- Feature flag phases for easier rollout.
