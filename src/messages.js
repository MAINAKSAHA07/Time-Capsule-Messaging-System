const express = require('express');
const db = require('./db');

const router = express.Router();

// Helper to validate ISO datetime and ensure it's in the future
function parseAndValidateFutureDate(isoString) {
  if (!isoString || typeof isoString !== 'string') return { ok: false, error: 'deliver_at is required' };

  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return { ok: false, error: 'deliver_at must be a valid ISO datetime string' };
  }

  const now = new Date();
  if (date.getTime() <= now.getTime()) {
    return { ok: false, error: 'deliver_at must be in the future' };
  }

  return { ok: true, value: date.toISOString() };
}

router.post('/', (req, res) => {
  const { recipient_email, message, deliver_at } = req.body || {};

  if (!recipient_email || typeof recipient_email !== 'string') {
    return res.status(400).json({ error: 'recipient_email is required' });
  }

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'message is required' });
  }

  if (message.length > 500) {
    return res.status(400).json({ error: 'message must be at most 500 characters' });
  }

  const parsed = parseAndValidateFutureDate(deliver_at);
  if (!parsed.ok) {
    return res.status(400).json({ error: parsed.error });
  }

  const normalizedRecipient = recipient_email.trim();

  const stmt = db.prepare(`
    INSERT INTO messages (user_id, recipient_email, message, deliver_at, status)
    VALUES (?, ?, ?, ?, 'pending')
  `);

  const info = stmt.run(req.user.id, normalizedRecipient, message, parsed.value);

  const created = db
    .prepare(
      `SELECT id, recipient_email, message, deliver_at, status, created_at, delivered_at
       FROM messages
       WHERE id = ? AND user_id = ?`
    )
    .get(info.lastInsertRowid, req.user.id);

  return res.status(201).json(created);
});

router.get('/', (req, res) => {
  const rows = db
    .prepare(
      `SELECT id, recipient_email, message, deliver_at, status, created_at, delivered_at
       FROM messages
       WHERE user_id = ?
       ORDER BY deliver_at ASC`
    )
    .all(req.user.id);

  return res.json(rows);
});

module.exports = router;

