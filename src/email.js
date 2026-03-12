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

  // NOTE: The Resend SDK does NOT throw on API errors — it returns { data, error }.
  // We must check the error field and throw manually so the delivery worker
  // leaves the message as 'pending' instead of wrongly marking it 'delivered'.
  const from = (process.env.RESEND_FROM || 'Time Capsule <onboarding@resend.dev>').trim();

  const { error } = await resend.emails.send({
    from,
    to,
    subject: 'Your time capsule message',
    text
  });

  if (error) {
    throw new Error(`Resend API error: ${error.message || JSON.stringify(error)}`);
  }
}

module.exports = {
  sendEmail
};

