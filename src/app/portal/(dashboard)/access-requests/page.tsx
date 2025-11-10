import { notFound } from "next/navigation";

import { AccessRequestsTable } from "@/components/portal/access-requests-table";
import { auth0 } from "@/lib/auth0";
import { dashboardFetch } from "@/lib/api-client";
import { PortalAccessRequestRecord } from "@/lib/types";

export default async function AccessRequestsPage() {
  const session = await auth0.getSession();
  const user = session?.user;

  if (!user?.email || !user.email.endsWith("@promosink.com")) {
    notFound();
  }

  let requests: PortalAccessRequestRecord[] = [];
  try {
    const response = await dashboardFetch<{ requests: PortalAccessRequestRecord[] }>("/api/portal/access-requests");
    requests = response.requests;
  } catch (error) {
    console.error("Failed to load access requests", error);
  }

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">Portal access approvals</h1>
        <p className="text-sm text-slate-600">
          Review pending access requests. Approvals notify the requester and their selected account manager.
        </p>
      </div>

      <AccessRequestsTable requests={requests} approverName={user.name || user.email} />
    </section>
  );
}
