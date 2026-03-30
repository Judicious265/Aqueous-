# Deploying Humanizer AI for Real Users

This guide shows a practical path to make your website available to people on the internet.

## 1) Prepare production requirements

Before going live, update the starter:

- Replace local JSON file storage (`data/users.json`) with a managed database (PostgreSQL, MySQL, MongoDB).
- Replace in-memory sessions (`Map`) with persistent auth (JWT + refresh tokens, Redis session store, etc.).
- Verify PayChangu payments by webhook **before** activating subscriptions.
- Add HTTPS and a real domain.

## 2) Pick a hosting option

### Option A: Render (easy)

1. Push this repo to GitHub.
2. In Render, create a **Web Service** from the repo.
3. Build command: `npm install`
4. Start command: `npm start`
5. Set environment variables:
   - `NODE_ENV=production`
   - `PAYCHANGU_SECRET_KEY=your_key`
   - `PAYCHANGU_CHECKOUT_URL=https://api.paychangu.com/checkout` (or official endpoint you use)
6. Deploy and use the Render URL.

### Option B: Railway / Fly.io / VPS

- Any Node.js host works if it supports:
  - Node 20+
  - Environment variables
  - Public HTTPS endpoint

## 3) Domain + SSL

- Buy a domain (Cloudflare, Namecheap, GoDaddy, etc.).
- Point DNS to your hosting provider.
- Enable SSL/TLS certificate (usually automatic on modern hosts).

## 4) Configure PayChangu correctly

- Use your production API key in `PAYCHANGU_SECRET_KEY`.
- Configure webhook URL to:
  - `https://your-domain.com/api/paychangu/webhook` (you should add this endpoint)
- Subscription should only become `active` after successful webhook confirmation.

## 5) Basic reliability setup

- Add logging (Pino/Winston + provider logs).
- Add rate limiting on auth/payment routes.
- Add monitoring (UptimeRobot / Better Stack / provider health checks).
- Back up your DB.

## 6) Go-live checklist

- [ ] Registration/login works from external network.
- [ ] Free trial limit is enforced per day.
- [ ] Premium checkout works with Visa + PayPal flow via PayChangu.
- [ ] Webhook verification updates subscription state.
- [ ] Domain + HTTPS enabled.
- [ ] Privacy policy + terms available.

