# Humanizer AI Website Starter

This project provides a starter implementation for your Humanizer AI platform requirements:

- Email-based user accounts (register/login).
- Tools for text humanization and AI detection (text + media label input).
- Free plan with exactly **1 free trial per day**.
- Premium subscription at **$12 for 3 months**.
- Billing form accepts **Visa** or **PayPal**.
- Server-side checkout endpoint designed for **PayChangu** integration.
- Modern, responsive UI for better user experience.

## Quick Start

```bash
npm install
npm run dev
```

Open: `http://localhost:3000`

## PayChangu Setup

Add environment variables before running in production:

- `PAYCHANGU_SECRET_KEY=...`
- `PAYCHANGU_CHECKOUT_URL=...` (defaults to `https://api.paychangu.com/checkout`)

> Important: The current starter marks subscriptions active when checkout is requested.
> For production, switch to webhook-based verification before activating premium access.

## API Endpoints

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/me`
- `POST /api/tools/humanize`
- `POST /api/tools/detect`
- `POST /api/subscription/checkout`


## Make it live for people

If you want public users to access your site, follow `DEPLOYMENT.md` for a production checklist and hosting steps.

Quick path:

1. Push this repo to GitHub.
2. Deploy on Render/Railway/Fly.io with `npm install` and `npm start`.
3. Add environment variables from `.env.example`.
4. Attach your domain + HTTPS.
5. Enable PayChangu webhook verification before real billing.


## GitHub Pages note

If you open this repo on GitHub Pages, use the root `index.html` (it redirects to `public/index.html`).
For full functionality (login, tools, payments), deploy the Node backend as described in `DEPLOYMENT.md` because static GitHub Pages alone cannot run `/api/*` endpoints.
