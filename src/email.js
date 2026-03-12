const { Resend } = require('resend');

let resend = null;

if (!process.env.RESEND_API_KEY) {
  // eslint-disable-next-line no-console
  console.warn('RESEND_API_KEY not set. Email delivery is disabled.');
} else {
  resend = new Resend(process.env.RESEND_API_KEY);
}

async function sendEmail(to, text) {
  if (!resend) {
    // eslint-disable-next-line no-console
    console.log(`[Email disabled] Would send to ${to}: ${text}`);
    return;
  }

  const from = process.env.RESEND_FROM || 'Time Capsule <onboarding@resend.dev>';

  await resend.emails.send({
    from,
    to,
    subject: 'Your time capsule message',
    text
  });
}

module.exports = {
  sendEmail
};

