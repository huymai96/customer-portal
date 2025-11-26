import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { SignInButton } from "@clerk/nextjs";

interface LoginPageProps {
  searchParams?: Promise<{
    redirect?: string;
    error?: string;
    error_description?: string;
  }>;
}

export default async function PortalLoginPage({ searchParams }: LoginPageProps) {
  const resolvedParams = searchParams ? await searchParams : undefined;
  const redirectTo = resolvedParams?.redirect || "/portal";
  const error = resolvedParams?.error;
  const errorDescription = resolvedParams?.error_description;

  const { userId } = await auth();
  if (userId) {
    redirect(redirectTo);
  }

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
            Sign in to access live inventory, quotes, and order tracking.
          </p>
        </div>

        {errorMessage ? (
          <div className="rounded-lg border border-rose-300 bg-rose-100/80 p-3 text-sm text-rose-700">
            {errorMessage}
          </div>
        ) : null}

        <div className="space-y-4">
          <SignInButton 
            mode="modal"
            fallbackRedirectUrl={redirectTo}
          >
            <button className="flex w-full items-center justify-center gap-2 rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-600">
              Sign In
            </button>
          </SignInButton>
          
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
