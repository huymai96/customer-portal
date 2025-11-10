import Link from "next/link";
import { redirect } from "next/navigation";

import { auth0 } from "@/lib/auth0";

interface LoginPageProps {
  searchParams?: Promise<{
    redirect?: string;
    error?: string;
    error_description?: string;
    organization?: string;
  }>;
}

export default async function PortalLoginPage({ searchParams }: LoginPageProps) {
  const resolvedParams = searchParams ? await searchParams : undefined;
  const redirectTo = resolvedParams?.redirect || "/portal";
  const error = resolvedParams?.error;
  const errorDescription = resolvedParams?.error_description;

  const session = await auth0.getSession();
  if (session) {
    redirect(redirectTo);
  }

  const params = new URLSearchParams();
  params.set("returnTo", redirectTo);
  if (resolvedParams?.organization) {
    params.set("organization", resolvedParams.organization);
  }

  const loginHref = `/auth/login?${params.toString()}`;

  let errorMessage: string | null = null;
  if (error === "access_denied") {
    errorMessage = "Access denied. Contact your administrator if this persists.";
  } else if (error) {
    errorMessage = errorDescription || "Authentication failed. Please try again.";
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-16">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-8 shadow-lg backdrop-blur">
        <div>
          <h1 className="text-2xl font-semibold text-white">Customer Portal Access</h1>
          <p className="mt-2 text-sm text-slate-300">
            Sign in with your Promos Ink SSO credentials to access live inventory, quotes, and billing tools.
          </p>
        </div>

        {errorMessage ? (
          <div className="rounded-lg border border-rose-300 bg-rose-100/80 p-3 text-sm text-rose-700">
            {errorMessage}
          </div>
        ) : null}

        <div className="space-y-4">
          <a
            href={loginHref}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-600"
          >
            Continue with Auth0 SSO
          </a>
          <p className="text-xs text-slate-400">
            Need portal access? <Link href="/portal/request-access" className="text-blue-300 hover:text-blue-200">Request approval</Link> and our team will review your account.
          </p>
          <p className="text-xs text-slate-400">
            Having trouble signing in? Email
            {" "}
            <a href="mailto:support@promosink.com" className="text-blue-300 hover:text-blue-200">
              support@promosink.com
            </a>
            .
          </p>
        </div>

        <div className="text-center text-xs text-slate-500">
          <Link href="/" className="text-blue-300 hover:text-blue-200">
            Back to dashboard overview
          </Link>
        </div>
      </div>
    </main>
  );
}


