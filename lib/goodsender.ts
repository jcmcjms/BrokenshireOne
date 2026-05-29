/**
 * GoodSender email client
 *
 * Docs: https://goodsender.com/docs/api-reference
 * Free tier: 100,000 emails/month ($0)
 *
 * Note on consent:
 * GoodSender requires recipients to consent before receiving marketing emails.
 * For new user credential emails, we call the consent API to register them,
 * then attempt to send. If consent isn't granted yet, we fall back to
 * displaying credentials in the admin UI.
 */

const API_BASE = 'https://api.goodsender.com/v1';

function getApiKey(): string {
  const key = process.env.GOODSENDER_API_KEY;
  if (!key) {
    throw new Error('Missing GOODSENDER_API_KEY environment variable');
  }
  return key;
}

function getFromEmail(): string {
  return process.env.GOODSENDER_FROM_EMAIL || 'noreply@brokenshireone.edu';
}

function getFromName(): string {
  return process.env.GOODSENDER_FROM_NAME || 'BrokenshireOne';
}

function getLoginUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'https://brokenshireone.vercel.app';
}

function getSendingDomain(): string {
  const from = getFromEmail();
  return from.split('@')[1] || 'brokenshireone.edu';
}

async function requestConsent(recipientEmail: string): Promise<void> {
  const apiKey = getApiKey();
  const domain = getSendingDomain();

  try {
    const res = await fetch(`${API_BASE}/emails/consent`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        domain,
        emails: [recipientEmail],
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.warn('[goodsender] Consent request failed:', res.status, body);
      // Non-blocking — consent failure is not fatal
    }
  } catch (err) {
    console.warn('[goodsender] Consent request error:', err);
    // Non-blocking
  }
}

export async function sendEmail(params: {
  to: string;
  toName?: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<{ sent: boolean; error?: string }> {
  const apiKey = getApiKey();

  if (!apiKey) {
    return { sent: false, error: 'GOODSENDER_API_KEY not configured' };
  }

  const { to, toName, subject, html, text } = params;

  try {
    // Step 1: Register the recipient via consent API (fire-and-forget)
    // This ensures the recipient is known to GoodSender for future sends.
    await requestConsent(to);

    // Step 2: Attempt to send the email
    const res = await fetch(`${API_BASE}/emails/send`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        emails: [
          {
            from: {
              email: getFromEmail(),
              name: getFromName(),
            },
            to: [{ email: to, ...(toName ? { name: toName } : {}) }],
            subject,
            html_content: html,
            text_content: text || '',
          },
        ],
      }),
    });

    const body = await res.json();

    if (!res.ok) {
      const errorMsg = body?.error || `GoodSender API error (${res.status})`;
      console.error('[goodsender] Send failed:', errorMsg);
      return { sent: false, error: errorMsg };
    }

    // Check if the email was actually sent or declined due to consent
    const sentCount = body?.sent ?? 0;
    const declinedCount = body?.declined ?? 0;

    if (sentCount > 0) {
      console.log('[goodsender] Email sent to', to, '- id:', body?.emailId);
      return { sent: true };
    }

    if (declinedCount > 0) {
      console.log('[goodsender] Email declined for', to, '- consent not granted yet');
      return { sent: false, error: 'Recipient has not granted consent. Ask them to click the approval link in the consent email.' };
    }

    // Fallback: unknown response
    console.log('[goodsender] Unexpected response:', body);
    return { sent: false, error: 'Email could not be delivered' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[goodsender] Failed to send email:', message);
    return { sent: false, error: message };
  }
}
