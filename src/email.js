const { Resend } = require('resend');

// Support both RESEND_API_KEY and RESEND_API (Resend SDK expects RESEND_API_KEY)
const RESEND_API_KEY = process.env.RESEND_API_KEY || process.env.RESEND_API;
const RESEND_FROM = process.env.RESEND_FROM || 'Time Capsule <onboarding@resend.dev>';

let resend = null;

if (!RESEND_API_KEY) {
  // eslint-disable-next-line no-console
  console.warn('RESEND_API_KEY or RESEND_API not set. Email delivery is disabled. Messages will stay pending.');
} else {
  resend = new Resend(RESEND_API_KEY);
  // eslint-disable-next-line no-console
  console.log('Email delivery: Resend configured. From:', RESEND_FROM);
}

async function sendEmail(to, text) {
  if (!resend) {
    throw new Error(
      'Email delivery disabled: set RESEND_API_KEY (or RESEND_API) and optionally RESEND_FROM. Get your key at resend.com.'
    );
  }

  const { error } = await resend.emails.send({
    from: RESEND_FROM,
    to,
    subject: 'Your time capsule message has arrived! 📬',
    text,
    html: `
      <div style="font-family: sans-serif; max-width: 520px; margin: auto; background: #0f172a; color: #e5e7eb; border-radius: 12px; padding: 32px;">
        <h2 style="color: #38bdf8; margin-top: 0;">📬 A message from the past</h2>
        <p style="font-size: 1rem; line-height: 1.6; white-space: pre-wrap;">${escapeHtml(text)}</p>
        <hr style="border-color: #334155; margin: 24px 0;" />
        <p style="font-size: 0.75rem; color: #64748b;">Delivered by Time Capsule Messaging System</p>
      </div>
    `
  });

  if (error) {
    throw new Error(error.message || 'Resend send failed');
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

module.exports = {
  sendEmail
};
