const fs = require('fs');
const path = require('path');
const db = require('./db');

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

function deliverDueMessagesOnce() {
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

  const deliverTransaction = db.transaction((nowIsoInner) => {
    const dueMessages = selectStmt.all(nowIsoInner);

    for (const msg of dueMessages) {
      // Here you would integrate with a real email service.
      // For this project, we simulate delivery by updating status and logging.
      updateStmt.run(nowIsoInner, msg.id);
      logDelivery(msg);
    }
  });

  try {
    deliverTransaction(nowIso);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error delivering messages:', err);
  }
}

function startDeliveryWorker(options = {}) {
  const intervalMs = options.intervalMs || 30000; // 30 seconds default

  // Run once on startup to catch any overdue messages
  deliverDueMessagesOnce();

  setInterval(() => {
    deliverDueMessagesOnce();
  }, intervalMs);
}

module.exports = {
  startDeliveryWorker
};

