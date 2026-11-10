import type { OutboundMail } from './restock.js';

/** Resend send. The payload is only from, to, subject and text — no reply_to. */
export async function sendResend(apiKey: string, mail: OutboundMail, fetchImpl: typeof fetch): Promise<{ id: string }> {
  const res = await fetchImpl('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: mail.from, to: mail.to, subject: mail.subject, text: mail.text }),
  });
  if (!res.ok) throw new Error('resend');
  const body = await res.json() as { id?: string };
  return { id: body.id || 'sent' };
}
