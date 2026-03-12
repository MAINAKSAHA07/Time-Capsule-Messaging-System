const nodemailer = require('nodemailer');

const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;

let transporter = null;

if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
  // eslint-disable-next-line no-console
  console.warn('GMAIL_USER or GMAIL_APP_PASSWORD not set. Email delivery is disabled.');
} else {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_APP_PASSWORD  // Gmail App Password (not your regular password)
    }
  });
}

async function sendEmail(to, text) {
  if (!transporter) {
    // eslint-disable-next-line no-console
    console.log(`[Email disabled] Would send to ${to}: ${text}`);
    return;
  }

  await transporter.sendMail({
    from: `"Time Capsule" <${GMAIL_USER}>`,
    to,
    subject: 'Your time capsule message has arrived! 📬',
    text,
    html: `
      <div style="font-family: sans-serif; max-width: 520px; margin: auto; background: #0f172a; color: #e5e7eb; border-radius: 12px; padding: 32px;">
        <h2 style="color: #38bdf8; margin-top: 0;">📬 A message from the past</h2>
        <p style="font-size: 1rem; line-height: 1.6; white-space: pre-wrap;">${text}</p>
        <hr style="border-color: #334155; margin: 24px 0;" />
        <p style="font-size: 0.75rem; color: #64748b;">Delivered by Time Capsule Messaging System</p>
      </div>
    `
  });
}

module.exports = {
  sendEmail
};
