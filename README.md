## Time Capsule Messaging System

Backend service that lets users schedule messages to be "delivered" at a future time. Messages are stored in SQLite, authenticated with JWT, and delivered by a background worker that survives restarts.

### Tech Stack

- **Runtime**: Node.js
- **Framework**: Express
- **Database**: SQLite (via `better-sqlite3`)
- **Auth**: JWT

### Getting Started Locally

- **Prerequisites**: Node.js 18+ and npm installed.

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Create environment file**

   Copy `.env.example` to `.env` and fill in real values:

   ```bash
   cp .env.example .env
   ```

   - **JWT_SECRET**: Use a strong random string (e.g. `openssl rand -hex 32`). Do not use a JWT token or a guessable value.
   - **RESEND_API_KEY** (or **RESEND_API**): For email delivery via [Resend](https://resend.com). Get your API key from the Resend dashboard. Optional **RESEND_FROM** (e.g. `Time Capsule <onboarding@resend.dev>`).
   - Never commit `.env` or real secrets to git. If `.env` was ever committed, rotate all secrets and consider purging history (e.g. `git filter-repo`).

3. **Run the server**

   ```bash
   npm run dev
   # or
   npm start
   ```

   The API will be available at `http://localhost:3000`.

### API Overview

#### Auth

- **Register**

  - **POST** `/auth/register`
  - Body:

    ```json
    {
      "email": "user@example.com",
      "password": "your-password"
    }
    ```

  - Response:

    ```json
    { "token": "JWT_TOKEN_HERE" }
    ```

- **Login**

  - **POST** `/auth/login`
  - Body: same as register.
  - Response: `{ "token": "JWT_TOKEN_HERE" }`

Use this token in the `Authorization` header for all protected endpoints:

```http
Authorization: Bearer JWT_TOKEN_HERE
```

#### Create Message

- **POST** `/messages`
- **Auth**: required (Bearer token)
- Body:

  ```json
  {
    "recipient_email": "recipient@example.com",
    "message": "Hello from the past!",
    "deliver_at": "2026-02-20T15:30:00Z"
  }
  ```

- Constraints:
  - `recipient_email` must be a valid email address (format validated).
  - `deliver_at` must be a valid ISO datetime **in the future**.
  - `message` max length: **500 characters**.
  - Messages cannot be edited after creation (no update endpoint).

#### View Messages

- **GET** `/messages`
- **Auth**: required
- Response example:

  ```json
  [
    {
      "id": 1,
      "recipient_email": "recipient@example.com",
      "message": "Hello from the past!",
      "deliver_at": "2026-02-20T15:30:00Z",
      "status": "pending",
      "created_at": "2026-02-18T12:00:00.000Z",
      "delivered_at": null
    }
  ]
  ```

### Delivery Mechanism

- A background worker runs in the API process and:
  - Every `DELIVERY_INTERVAL_MS` (default **30s**), selects all messages where:
    - `status = 'pending'` and `deliver_at <= now`.
  - For each such message:
    - Updates the row:
      - `status = 'delivered'`
      - `delivered_at = now`
    - Appends a log line to `logs/deliveries.log`:

      ```text
      [2026-02-20T15:30:00Z] Delivered message 123 to recipient@example.com
      ```

- Because the worker uses only the database state (no in-memory schedule), it continues to work correctly across server restarts and does not rely on `setTimeout` for long delays. Delivery is driven by a **polling heartbeat** (re-query DB every interval), not per-message timers.

### Health Check

- **GET** `/health`
- Returns:

  ```json
  { "status": "ok" }
  ```

### Deploying to Render

1. **Push code to GitHub**

   The repository URL you provided is:

   `https://github.com/MAINAKSAHA07/Time-Capsule-Messaging-System.git`

2. **Create a new Web Service on Render**

   - Go to Render dashboard.
   - Click **New → Web Service**.
   - Connect your GitHub repo and select this project.

3. **Configure the service**

   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment Variables**:
     - `NODE_ENV=production`
     - `PORT=10000` (or leave to Render’s default; the app uses `PORT` if provided)
     - `JWT_SECRET=` (use a strong random string, e.g. `openssl rand -hex 32` — not a JWT token)
     - `RESEND_API_KEY=` (or `RESEND_API=`) and optionally `RESEND_FROM=` (Resend.com)
     - Optionally:
       - `DELIVERY_INTERVAL_MS=30000`
       - `LOG_DIR=/var/log/timecapsule` (or another writable path)
       - `DB_PATH=/var/data/timecapsule.db` (if you attach a persistent disk)

4. **Persistent Database Storage (recommended)**

   - In Render, attach a **disk** to the service and mount it (for example at `/var/data`).
   - Set `DB_PATH` to a file inside that mount, e.g. `/var/data/timecapsule.db`.
   - This ensures your scheduled messages survive redeploys and restarts.

5. **Render free tier note**

   Free tier services **sleep after ~15 minutes of inactivity**. When the service wakes up, the delivery worker runs on startup and catches up on any due messages, so deliveries may be a few minutes late after idle periods.

6. **Accessing the deployed API**

   - Once Render finishes deploying, it will provide a public URL like:
     - `https://your-service-name.onrender.com`
   - Your endpoints will be available at:
     - `https://your-service-name.onrender.com/health`
     - `https://your-service-name.onrender.com/auth/register`
     - `https://your-service-name.onrender.com/auth/login`
     - `https://your-service-name.onrender.com/messages`

