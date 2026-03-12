const fs = require('fs');
const path = require('path');
const db = require('./db');
const { sendEmail } = require('./email');

const LOG_DIR = process.env.LOG_DIR || path.join(__dirname, '..', 'logs');
const LOG_FILE = path.join(LOG_DIR, 'deliveries.log');

// Ensure logs directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

function logDelivery(message) {
  const line = `[${new Date().toISOString()}] Delivered message ${message.id} to ${message.recipient_email}\n`;
  fs.appendFile(LOG_FILE, line, (err) => {
    if (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to write delivery log:', err);
    }
  });
}

async function deliverDueMessagesOnce() {
  const nowIso = new Date().toISOString();

  const selectStmt = db.prepare(`
    SELECT id, user_id, recipient_email, message, deliver_at, status, created_at, delivered_at
    FROM messages
    WHERE status = 'pending' AND deliver_at <= ?
    ORDER BY deliver_at ASC
  `);

  const updateStmt = db.prepare(`
    UPDATE messages
    SET status = 'delivered',
        delivered_at = ?
    WHERE id = ? AND status = 'pending'
  `);

  const dueMessages = selectStmt.all(nowIso);

  for (const msg of dueMessages) {
    try {
      await sendEmail(msg.recipient_email, msg.message);
      updateStmt.run(nowIso, msg.id);
      logDelivery(msg);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to send email for message', msg.id, err);
      // Leave as pending so it can be retried on the next cycle.
    }
  }
}

function startDeliveryWorker(options = {}) {
  const intervalMs = options.intervalMs || 30000; // 30 seconds default

  // Run once on startup to catch any overdue messages
  deliverDueMessagesOnce().catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Initial delivery run failed:', err);
  });

  setInterval(() => {
    deliverDueMessagesOnce().catch((err) => {
      // eslint-disable-next-line no-console
      console.error('Periodic delivery run failed:', err);
    });
  }, intervalMs);
}

module.exports = {
  startDeliveryWorker
};

