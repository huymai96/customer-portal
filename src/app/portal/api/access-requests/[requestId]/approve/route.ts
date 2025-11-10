import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

import { auth0 } from "@/lib/auth0";
import { dashboardFetch } from "@/lib/api-client";
import { PortalAccessRequestRecord } from "@/lib/types";
import { notifyEvent } from "@/lib/notifications";

type ResendEmailPayload = Parameters<Resend["emails"]["send"]>[0] & { reply_to?: string };

const resendClient = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const fromEmail = process.env.ACCESS_REQUEST_FROM_EMAIL || "Promos Ink Portal <onboarding@resend.dev>";
const replyToEmail = process.env.ACCESS_REQUEST_REPLY_TO_EMAIL || "support@promosink.com";
const defaultApprovers = (process.env.ACCESS_REQUEST_APPROVER_EMAILS || "qc@promosink.com,carla@promosink.com")
  .split(",")
  .map((email) => email.trim())
  .filter(Boolean);

function isInternalUser(email: string | undefined | null) {
  return Boolean(email && email.endsWith("@promosink.com"));
}

export async function POST(request: NextRequest, context: { params: Promise<{ requestId: string }> }) {
  const session = await auth0.getSession();
  const user = session?.user;

  if (!user?.email || !isInternalUser(user.email)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { requestId } = await context.params;

  try {
    const payload = await request.json().catch(() => ({}));
    const approvedBy = payload?.approvedBy || user.name || user.email;

    const result = await dashboardFetch<{ request: PortalAccessRequestRecord }>(
      `/api/portal/access-requests/${requestId}/approve`,
      {
        method: "POST",
        body: {
          approvedBy,
          approvalNotes: payload?.approvalNotes || null,
        },
      }
    );

    const approvedRequest = result.request;

    const watcherEmails = await notifyEvent({
      type: "access_request.approved",
      payload: {
        fullName: approvedRequest.full_name,
        email: approvedRequest.email,
        managerEmail: approvedRequest.manager_email || undefined,
        approvedBy,
      },
    });

    if (resendClient) {
      try {
        const ccRecipients = Array.from(
          new Set([
            ...(approvedRequest.manager_email ? [approvedRequest.manager_email] : []),
            ...defaultApprovers,
          ])
        ).filter((recipient) => recipient && recipient !== approvedRequest.email);

        const emailPayload: ResendEmailPayload = {
          from: fromEmail,
          to: approvedRequest.email,
          cc: Array.from(new Set([...ccRecipients, ...watcherEmails.filter((email) => email !== approvedRequest.email)])),
          reply_to: replyToEmail,
          subject: "Promos Ink portal access approved",
          text: `Hi ${approvedRequest.full_name},\n\nYour request for access to the Promos Ink customer portal has been approved. You can now sign in at https://portal.promosinkwall-e.com/portal/login using the email ${approvedRequest.email}.\n\nIf you have any questions, reach out to ${approvedRequest.manager_email}.\n\n— Promos Ink Portal`,
        };

        await resendClient.emails.send(emailPayload);
      } catch (emailError) {
        console.error("Failed to send approval email", emailError);
      }
    }

    return NextResponse.json({ request: approvedRequest }, { status: 200 });
  } catch (error) {
    console.error("Failed to approve access request", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
