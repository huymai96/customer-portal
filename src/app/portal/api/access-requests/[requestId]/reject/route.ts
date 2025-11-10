import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

import { auth0 } from "@/lib/auth0";
import { dashboardFetch } from "@/lib/api-client";
import { PortalAccessRequestRecord } from "@/lib/types";
import { notifyEvent } from "@/lib/notifications";

const resendClient = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const fromEmail = process.env.ACCESS_REQUEST_FROM_EMAIL || "Promos Ink Portal <onboarding@resend.dev>";
const replyToEmail = process.env.ACCESS_REQUEST_REPLY_TO_EMAIL || "support@promosink.com";
const defaultApprovers = (process.env.ACCESS_REQUEST_APPROVER_EMAILS || "qc@promosink.com,carla@promosink.com")
  .split(",")
  .map((email) => email.trim())
  .filter(Boolean);

type ResendEmailPayload = Parameters<Resend["emails"]["send"]>[0] & { reply_to?: string };

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
    const rejectedBy = payload?.rejectedBy || user.name || user.email;
    const rejectionNotes: string | null = payload?.rejectionNotes || null;

    const result = await dashboardFetch<{ request: PortalAccessRequestRecord }>(
      `/api/portal/access-requests/${requestId}/reject`,
      {
        method: "POST",
        body: {
          rejectedBy,
          rejectionNotes,
        },
      }
    );

    const updatedRequest = result.request;

    const watcherEmails = await notifyEvent({
      type: "access_request.declined",
      payload: {
        fullName: updatedRequest.full_name,
        email: updatedRequest.email,
        managerEmail: updatedRequest.manager_email || undefined,
        rejectedBy,
        notes: rejectionNotes,
      },
    });

    if (resendClient) {
      try {
        const ccRecipients = Array.from(
          new Set([
            ...(updatedRequest.manager_email ? [updatedRequest.manager_email] : []),
            ...defaultApprovers,
          ])
        ).filter((recipient) => recipient && recipient !== updatedRequest.email);

        const emailPayload: ResendEmailPayload = {
          from: fromEmail,
          to: updatedRequest.email,
          cc: Array.from(new Set([...ccRecipients, ...watcherEmails.filter((email) => email !== updatedRequest.email)])),
          reply_to: replyToEmail,
          subject: "Promos Ink portal access update",
          text: `Hi ${updatedRequest.full_name},\n\nWe reviewed your request for access to the Promos Ink customer portal. At this time we are unable to grant access.\n\n${
            rejectionNotes ? `Notes from our team:\n${rejectionNotes}\n\n` : ""
          }If you believe this was a mistake or have additional context to share, reply to this email or contact your account manager at ${
            updatedRequest.manager_email
          }.\n\n— Promos Ink Portal Support`,
        };

        await resendClient.emails.send(emailPayload);
      } catch (emailError) {
        console.error("Failed to send rejection email", emailError);
      }
    }

    return NextResponse.json({ request: updatedRequest }, { status: 200 });
  } catch (error) {
    console.error("Failed to reject access request", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
