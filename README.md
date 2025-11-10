## Promos Ink Customer Portal

Standalone Next.js 16 portal that sits in front of the Promos Ink production-capacity dashboard. Customers can:

- Browse synchronized SanMar & S&S inventory (`GET /api/v1/products`)
- Build quotes via the routing/pricing engine (`POST /api/v1/quote`)
- Review submitted orders (`GET /api/v1/orders`)
- Download invoice exports (`/api/admin/invoices/export`)
- Manage API keys (SSO + MFA pending)

### 1. Configure Environment

Create a `.env.local` file and set the values issued by the dashboard project and Auth0 tenant:

```bash
NEXT_PUBLIC_API_BASE_URL=https://<dashboard-vercel-domain>
PORTAL_API_KEY=pk_live_xxx
PORTAL_API_SECRET=sk_live_xxx
PORTAL_CUSTOMER_ID=<uuid from api_customers>
PORTAL_CUSTOMER_NAME=Demo Customer

AUTH0_SECRET=<32-byte hex secret>
AUTH0_DOMAIN=<tenant>.us.auth0.com
AUTH0_CLIENT_ID=<auth0 application client id>
AUTH0_CLIENT_SECRET=<auth0 application client secret>
APP_BASE_URL=http://localhost:3000
AUTH0_SCOPE="openid profile email"
# Optional: only if you have an API configured in Auth0
# AUTH0_AUDIENCE=https://api.promosink.com
# AUTH0_ORGANIZATION=org_xxxxxxxx

# Optional: email + notifications for access requests
# RESEND_API_KEY=your_resend_api_key
# ACCESS_REQUEST_FROM_EMAIL="Promos Ink Portal <portal@promosink.com>"
# ACCESS_REQUEST_APPROVER_EMAILS=qc@promosink.com,carla@promosink.com
# ACCESS_REQUEST_REPLY_TO_EMAIL=support@promosink.com
# NOTIFICATIONS_EMAIL_RECIPIENTS=ops@promosink.com
# NOTIFICATIONS_SLACK_WEBHOOK_URL=https://hooks.slack.com/services/.../...
# NOTIFICATIONS_TEAMS_WEBHOOK_URL=https://promosink.webhook.office.com/...
```

- Always point `NEXT_PUBLIC_API_BASE_URL` to the stable dashboard alias (e.g. `https://dashboard.promosinkwall-e.com`).

- All requests are HMAC signed: `signature = HMAC_SHA256(timestamp + method + path + body, PORTAL_API_SECRET)`.
- `AUTH0_SECRET` must be a 32-byte hex string (run `