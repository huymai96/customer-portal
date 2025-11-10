import Link from "next/link";

import { RequestAccessForm } from "@/components/portal/request-access-form";

export default function RequestAccessPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-16 text-white">
      <div className="w-full max-w-2xl space-y-6 rounded-2xl border border-white/15 bg-white/5 p-8 shadow-lg backdrop-blur">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Request portal access</h1>
          <p className="text-sm text-slate-200/80">
            Submit your details and choose the Promos Ink account manager who should approve your login. We’ll email you once access is granted.
          </p>
        </div>
        <RequestAccessForm />
        <div className="text-center text-xs text-slate-300">
          <Link href="/portal/login" className="text-blue-300 hover:text-blue-200">
            Back to sign-in
          </Link>
        </div>
      </div>
    </main>
  );
}
