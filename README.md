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


### Fix for "Unexpected token '<' ... is not valid JSON"

This error means your frontend requested an API endpoint but got an HTML page back (not JSON). This usually happens when the frontend is on GitHub Pages but backend API is not set.

- Open **API server settings** in the UI.
- Set your deployed backend URL (example: `https://your-backend.onrender.com`).
- Save and retry login/tool actions.


## Render setup (exact values)

When creating your **Web Service** on Render, use:

- **Root Directory:** *(leave empty)*
- **Build Command:** `npm install`
- **Start Command:** `npm start`

Then add environment variables:

- `NODE_ENV=production`
- `PAYCHANGU_SECRET_KEY=your_real_key`
- `PAYCHANGU_CHECKOUT_URL=https://api.paychangu.com/checkout`

After deploy, your API base URL will look like:

`https://your-service-name.onrender.com`

If your frontend is hosted on GitHub Pages, open **API server settings** in the app and paste that Render URL.


### Render "Environment Variable" fields (Name / Value)

In Render, each variable has 2 inputs:

- **Name** = variable key
- **Value** = actual secret/content

Use these pairs:

- Name: `NODE_ENV` → Value: `production`
- Name: `PAYCHANGU_SECRET_KEY` → Value: `your_real_paychangu_secret_key`
- Name: `PAYCHANGU_CHECKOUT_URL` → Value: `https://api.paychangu.com/checkout`

Optional:

- Name: `PORT` → Value: *(leave empty on Render unless required; Render injects `PORT` automatically)*


## Render deploy failed? (Fix for `mix phx.digest` / `mix phx.server` errors)

Your app is **Node.js**, not Elixir/Phoenix. If Render shows logs like:

- `The task "phx.digest" could not be found`
- `No mix.exs was found in the current directory`

then Render is using wrong commands.

Use these exact settings in **Settings → Build & Deploy**:

- **Build Command:** `npm install`
- **Start Command:** `npm start`
- **Root Directory:** empty

Also make sure Runtime/Environment is **Node**.

Tip: this repo now includes `render.yaml` with correct Node defaults.
