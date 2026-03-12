require('dotenv').config();

const express = require('express');
const morgan = require('morgan');

// Ensure DB is initialized
require('./db');

const { router: authRouter, authMiddleware } = require('./auth');
const messagesRouter = require('./messages');
const { startDeliveryWorker } = require('./deliveryWorker');

const app = express();

app.use(express.json());
app.use(morgan('dev'));

// Serve minimal frontend for manual testing
app.use(express.static(require('path').join(__dirname, '..', 'public')));

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/auth', authRouter);
app.use('/messages', authMiddleware, messagesRouter);

const port = process.env.PORT || 3000;

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on port ${port}`);

  // Start background delivery worker
  startDeliveryWorker({
    intervalMs: Number(process.env.DELIVERY_INTERVAL_MS) || 30000
  });
});

