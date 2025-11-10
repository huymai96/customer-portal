const SLACK_WEBHOOK = process.env.NOTIFICATIONS_SLACK_WEBHOOK_URL || "";
const TEAMS_WEBHOOK = process.env.NOTIFICATIONS_TEAMS_WEBHOOK_URL || "";
const WATCHER_EMAILS = (process.env.NOTIFICATIONS_EMAIL_RECIPIENTS || "").split(",").map((email) => email.trim()).filter(Boolean);

export type NotificationEvent =
  | {
      type: "access_request.submitted";
      payload: {
        fullName: string;
        email: string;
        company?: string | null;
        managerEmail?: string | null;
      };
    }
  | {
      type: "access_request.approved";
      payload: {
        fullName: string;
        email: string;
        managerEmail?: string | null;
        approvedBy?: string | null;
      };
    }
  | {
      type: "access_request.declined";
      payload: {
        fullName: string;
        email: string;
        managerEmail?: string | null;
        rejectedBy?: string | null;
        notes?: string | null;
      };
    };

export async function notifyEvent(event: NotificationEvent) {
  await Promise.allSettled([
    SLACK_WEBHOOK ? postJson(SLACK_WEBHOOK, buildSlackPayload(event)) : Promise.resolve(),
    TEAMS_WEBHOOK ? postJson(TEAMS_WEBHOOK, buildTeamsPayload(event)) : Promise.resolve(),
  ]);

  return WATCHER_EMAILS;
}

async function postJson(url: string, body: Record<string, unknown>) {
  try {
    await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (error) {
    console.error("Failed to send webhook notification", error);
  }
}

function buildSlackPayload(event: NotificationEvent): Record<string, unknown> {
  const { headline, fallback, fields } = renderMessage(event);
  return {
    text: fallback,
    blocks: [
      {
        type: "section",
        text: { type: "mrkdwn", text: `*${headline}*` },
      },
      {
        type: "section",
        fields: fields.map((field) => ({ type: "mrkdwn", text: field })),
      },
    ],
  };
}

function buildTeamsPayload(event: NotificationEvent): Record<string, unknown> {
  const { headline, fallback, fields } = renderMessage(event);
  return {
    type: "message",
    attachments: [
      {
        contentType: "application/vnd.microsoft.card.adaptive",
        content: {
          type: "AdaptiveCard",
          $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
          version: "1.3",
          body: [
            { type: "TextBlock", text: headline, weight: "Bolder", size: "Medium" },
            { type: "TextBlock", text: fallback, isSubtle: true, wrap: true },
            {
              type: "FactSet",
              facts: fields.map((field) => {
                const [title, value] = field.split(": ");
                return { title, value };
              }),
            },
          ],
        },
      },
    ],
  };
}

function renderMessage(event: NotificationEvent) {
  switch (event.type) {
    case "access_request.submitted": {
      const { fullName, email, company, managerEmail } = event.payload;
      const headline = "New customer portal access request";
      const fallback = `${fullName} submitted a request for WALL-E portal access.`;
      const fields = [
        `Requester: ${fullName} (${email})`,
        `Company: ${company || "—"}`,
        `Account manager: ${managerEmail || "—"}`,
      ];
      return { headline, fallback, fields };
    }
    case "access_request.approved": {
      const { fullName, email, managerEmail, approvedBy } = event.payload;
      const headline = "Portal access approved";
      const fallback = `${fullName} has been approved for WALL-E portal access.`;
      const fields = [
        `Requester: ${fullName} (${email})`,
        `Approved by: ${approvedBy || "—"}`,
        `Account manager: ${managerEmail || "—"}`,
      ];
      return { headline, fallback, fields };
    }
    case "access_request.declined": {
      const { fullName, email, managerEmail, rejectedBy, notes } = event.payload;
      const headline = "Portal access declined";
      const fallback = `${fullName} was declined for WALL-E portal access.`;
      const fields = [
        `Requester: ${fullName} (${email})`,
        `Rejected by: ${rejectedBy || "—"}`,
        `Notes: ${notes || "—"}`,
        `Account manager: ${managerEmail || "—"}`,
      ];
      return { headline, fallback, fields };
    }
  }
}
