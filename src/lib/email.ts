const RESEND_ENDPOINT = 'https://api.resend.com/emails';

export interface EmailPayload {
  to: string[];
  subject: string;
  html: string;
  from?: string;
}

export async function sendEmail({ to, subject, html, from }: EmailPayload) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured');
  }

  if (!to.length) {
    throw new Error('No recipients provided');
  }

  const sender = from ?? process.env.QUOTE_NOTIFICATION_FROM_EMAIL ?? 'Promos Ink Portal <portal@promosink.com>';

  const response = await fetch(RESEND_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: sender,
      to,
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Email send failed: ${response.status} ${text}`);
  }

  return response.json();
}
