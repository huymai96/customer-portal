import { getPortalConfig } from "@/lib/config";

function mask(value: string): string {
  if (!value) return "—";
  if (value.length <= 8) return "****";
  return `${value.slice(0, 6)}••••${value.slice(-4)}`;
}

export default function ApiKeysPage() {
  const config = getPortalConfig();

  return (
    <section className="space-y-6 p-8">
      <header className="space-y-2">
        <h2 className="text-lg font-semibold text-slate-900">API Credentials</h2>
        <p className="text-sm text-slate-500">
          Manage the API keys used by this portal. Regeneration and auditing will be enforced after SSO + MFA rollout.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Primary API Key</h3>
          <p className="mt-3 font-mono text-slate-900">{mask(config.apiKey)}</p>
          <p className="mt-2 text-xs text-slate-500">
            Stored in <code className="font-mono">PORTAL_API_KEY</code>. Provide this key in the <code className="font-mono">x-api-key</code> header for all requests.
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">API Secret</h3>
          <p className="mt-3 font-mono text-slate-900">{mask(config.apiSecret)}</p>
          <p className="mt-2 text-xs text-slate-500">
            Stored in <code className="font-mono">PORTAL_API_SECRET</code>. Used to generate HMAC signatures for POST/PUT requests.
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 shadow-inner text-sm text-slate-600 md:col-span-2">
          <p className="font-semibold text-slate-800">Coming soon</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>SSO with Auth0 + GitHub for credential management.</li>
            <li>Sandbox vs production keys with rate limit controls.</li>
            <li>Regeneration workflow with audit trails and notifications.</li>
          </ul>
        </div>
      </div>
    </section>
  );
}


