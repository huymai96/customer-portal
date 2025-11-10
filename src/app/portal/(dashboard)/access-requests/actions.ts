'use server';

import { revalidatePath } from "next/cache";

import { dashboardFetch } from "@/lib/api-client";

export async function approveAccessRequestAction(requestId: string, approvalNotes?: string) {
  await dashboardFetch(`/api/portal/access-requests/${requestId}/approve`, {
    method: "POST",
    body: {
      approvalNotes: approvalNotes || null,
    },
  });

  revalidatePath("/portal/access-requests");
}
