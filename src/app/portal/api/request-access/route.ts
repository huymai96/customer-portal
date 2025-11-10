import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

import { dashboardFetch } from "@/lib/api-client";
import { notifyEvent } from "@/lib/notifications";

type ResendEmailPayload = Parameters<Resend["emails"]["send"]>[0] & { reply_to?: string };

const DEFAULT_APPROVERS = (process.env.ACCESS_REQUEST_APPROVER_EMAILS || "qc@promosink.com,carla@promosink.com")
  .split(",")
  .map((email) => email.trim())
  .filter(Boolean);

const FROM_EMAIL = process.env.ACCESS_REQUEST_FROM_EMAIL || "Promos Ink Portal <onboarding@resend.dev>";
const REPLY_TO_EMAIL = process.env.ACCESS_REQUEST_REPLY_TO_EMAIL || "support@promosink.com";

const resendClient = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

function isPromosInkEmail(email: string) {
  return /@promosink\.com$/i.test(email);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fullName, company, email, managerEmail, notes } = body as {
      fullName?: string;
      company?: string;
      email?: string;
      managerEmail?: string;
      notes?: string;
    };

    if (!fullName || !email || !managerEmail) {
      return NextResponse.json({ message: "Name, email, and account manager are required." }, { status: 400 });
    }

    if (!isPromosInkEmail(managerEmail)) {
      return NextResponse.json({ message: "Account manager email must be a promosink.com address." }, { status: 400 });
    }

    const recipients = Array.from(new Set([...DEFAULT_APPROVERS, managerEmail])).filter(Boolean);
    const subjectCompany = company ? ` – ${company}` : "";

    const textBody = `A new customer portal access request was submitted.\n\nName: ${fullName}\nCompany: ${company || "—"}\nEmail: ${email}\nPreferred account manager: ${managerEmail}\n\nNotes:\n${notes || "(none provided)"}\n`;

    const watcherEmails = await notifyEvent({
      type: "access_request.submitted",
      payload: { fullName, email, company, managerEmail },
    });

    if (resendClient) {
      const emailPayload: ResendEmailPayload = {
        from: FROM_EMAIL,
        to: Array.from(new Set([...recipients, ...watcherEmails])),
        subject: `Portal access request${subjectCompany}`,
        text: textBody,
        reply_to: REPLY_TO_EMAIL,
      };

      await resendClient.emails.send(emailPayload);
    } else {
      console.warn("RESEND_API_KEY not configured. Logging request instead:", textBody);
    }

    try {
      await dashboardFetch("/api/portal/access-requests", {
        method: "POST",
        body: {
          fullName,
          company,
          email,
          managerEmail,
          notes,
        },
      });
    } catch (error) {
      console.error("Failed to persist portal access request", error);
    }

    return NextResponse.json({ ok: true, notified: Boolean(resendClient) }, { status: 200 });
  } catch (error) {
    console.error("Failed to submit access request", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
