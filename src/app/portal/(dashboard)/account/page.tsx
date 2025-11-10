import Link from "next/link";
import { redirect } from "next/navigation";

import { auth0 } from "@/lib/auth0";
import { PageHeader } from "@/components/portal/page-header";
import { buttonVariants } from "@/components/ui/button";

function getInitials(name: string | undefined | null, fallback: string) {
  if (!name) return fallback;
  const initials = name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  return initials || fallback;
}

export default async function AccountPage() {
  const session = await auth0.getSession();
  if (!session?.user) {
    redirect("/portal/login");
  }

  const user = session.user;
  const name = user.name || user.nickname || user.email || "Authenticated user";
  const email = user.email;
  const authProvider = user.sub?.split("|")?.[0] || "auth0";
  const passwordResetUrl = process.env.AUTH0_DOMAIN
    ? `https://${process.env.AUTH0_DOMAIN}/u/reset-password/request?email=${encodeURIComponent(email || "")}`
    : undefined;
  const initials = getInitials(user.name, (email || "U").charAt(0).toUpperCase());

  return (
    <section className="space-y-8">
      <PageHeader
        title="Account settings"
        description="Manage your profile, review connected logins, and request password updates."
      />

      <div className="card space-y-6 p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-900/10 text-lg font-semibold text-slate-900">
            {initials}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">{name}</p>
            {email ? <p className="text-xs text-slate-500">{email}</p> : null}
          </div>
        </div>

        <dl className="grid gap-4 md:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Auth provider</dt>
            <dd className="mt-1 text-sm text-slate-700">{authProvider}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">User ID</dt>
            <dd className="mt-1 text-sm text-slate-700 break-all">{user.sub}</dd>
          </div>
          {user.updated_at ? (
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Last updated</dt>
              <dd className="mt-1 text-sm text-slate-700">{new Date(user.updated_at).toLocaleString()}</dd>
            </div>
          ) : null}
          {user["https://promosink.com/account-manager"] ? (
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Account manager</dt>
              <dd className="mt-1 text-sm text-slate-700">{String(user["https://promosink.com/account-manager"])}</dd>
            </div>
          ) : null}
        </dl>

        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          {passwordResetUrl ? (
            <Link
              href={passwordResetUrl}
              target="_blank"
              className={buttonVariants("primary") + " w-full md:w-auto"}
            >
              Request password reset
            </Link>
          ) : null}
          <Link
            href="mailto:support@promosink.com?subject=Promos%20Ink%20portal%20profile%20update"
            className={buttonVariants("secondary") + " w-full md:w-auto"}
          >
            Update profile details
          </Link>
        </div>

        <p className="text-xs leading-relaxed text-slate-500">
          Password resets are handled by Auth0. Social logins (Google, Microsoft, GitHub) should update passwords through
their identity provider. Contact your Promos Ink account manager if anything looks incorrect or if you need additional permissions.
        </p>
      </div>
    </section>
  );
}
