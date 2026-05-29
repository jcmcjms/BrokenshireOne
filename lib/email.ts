import { sendEmail } from '@/lib/goodsender';

const FROM_EMAIL = process.env.GOODSENDER_FROM_EMAIL || 'noreply@brokenshireone.edu';
const LOGIN_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://brokenshireone.vercel.app';

export async function sendCredentialsEmail(params: {
  to: string;
  name: string;
  employeeId: string;
  password: string;
}): Promise<{ sent: boolean; error?: string }> {
  const { to, name, employeeId, password } = params;

  const html = buildCredentialsEmailHtml({ name, employeeId, password });

  return sendEmail({
    to,
    toName: name,
    subject: 'Your BrokenshireOne Account',
    html,
    text: [
      `Hi ${name},`,
      '',
      'Your account has been created. Use the credentials below to sign in:',
      '',
      `Employee ID: ${employeeId}`,
      `Temporary Password: ${password}`,
      '',
      `Sign in here: ${LOGIN_URL}/login`,
      '',
      'For security, please change your password after your first login.',
      '',
      '— BrokenshireOne',
    ].join('\n'),
  });
}

function buildCredentialsEmailHtml(params: {
  name: string;
  employeeId: string;
  password: string;
}): string {
  const { name, employeeId, password } = params;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f5f5f5; }
        .container { max-width: 480px; margin: 40px auto; background: white; border-radius: 8px; overflow: hidden; }
        .header { background: #18181b; padding: 24px; text-align: center; }
        .header h1 { color: white; margin: 0; font-size: 18px; font-weight: 600; }
        .body { padding: 32px 24px; }
        .body p { color: #52525b; font-size: 14px; line-height: 1.6; margin: 0 0 16px; }
        .credential-box { background: #f4f4f5; border-radius: 6px; padding: 16px; margin: 16px 0; }
        .credential-box .label { font-size: 11px; text-transform: uppercase; color: #71717a; letter-spacing: 0.5px; margin-bottom: 4px; }
        .credential-box .value { font-size: 16px; font-weight: 600; color: #18181b; font-family: 'Courier New', monospace; margin-bottom: 12px; }
        .credential-box .value:last-child { margin-bottom: 0; }
        .footer { padding: 24px; text-align: center; border-top: 1px solid #e4e4e7; }
        .footer p { color: #a1a1aa; font-size: 12px; margin: 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>BrokenshireOne</h1>
        </div>
        <div class="body">
          <p>Hi <strong>${name}</strong>,</p>
          <p>Your account has been created. Use the credentials below to sign in:</p>
          <div class="credential-box">
            <div class="label">Employee ID</div>
            <div class="value">${employeeId}</div>
            <div class="label">Temporary Password</div>
            <div class="value">${password}</div>
          </div>
          <p style="text-align:center; margin-top:24px;">
            <a href="${LOGIN_URL}/login"
               style="display:inline-block; background:#18181b; color:white; text-decoration:none; padding:10px 24px; border-radius:6px; font-size:14px; font-weight:500;">
              Sign In
            </a>
          </p>
          <p style="font-size:12px; color:#a1a1aa;">For security, please change your password after your first login.</p>
        </div>
        <div class="footer">
          <p>BrokenshireOne &bull; Brokenshire College Toril</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
