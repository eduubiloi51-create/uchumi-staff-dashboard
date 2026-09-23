# Uchumi Staff Dashboard

Plain HTML/CSS/JS — no build step, no framework. This is the sign-in +
dashboard branch managers and the CEO use to see and act on feedback.

**Deploy the `backend/` folder first** — you need its URL for step 1 below.
Deploy this as a **separate Vercel project** from `customer-site/` (they're
two different sites, even though they share the same backend).

## 1. Point this site at your backend

Edit `js/config.js`:
```js
window.UCHUMI_API_BASE = 'https://uchumi-feedback-api.onrender.com';
```
Use your actual backend URL from Render, no trailing slash.

## 2. Deploy to Vercel

1. Push this folder to its own GitHub repo (separate from `customer-site/`).
2. On [vercel.com](https://vercel.com), **New Project** → import that repo.
   Plain static files, no build command needed — `vercel.json` should be
   picked up automatically; set **Framework Preset** to "Other" if not.
3. Deploy. Note the URL Vercel gives you (e.g.
   `https://uchumi-dashboard.vercel.app`).
4. Go back to the **backend's** environment variables on Render and add
   this URL to `ALLOWED_ORIGINS` (comma-separated with the customer-site's
   URL).

## 3. Create your first CEO account

This is done on the **backend**, not here — see `backend/README.md`
("Create your first CEO account" via Render's Shell tab). Once you have one
CEO login, you can add branch managers straight from this dashboard's
**Staff accounts** tab — no server access needed after that.

## What's in here

- `index.html` — staff sign-in (this is the entry point / home page of this
  site — signing in redirects to `dashboard.html`)
- `dashboard.html` — the dashboard itself: KPIs, charts, filterable feedback
  table with status updates, QR code downloads per branch, and (CEO only)
  staff account management
- `css/style.css` — Uchumi's red/white/black design system
- `js/login.js`, `js/dashboard.js` — page logic
- `js/config.js` — the one file you edit per deployment (the API URL)
- `img/logo.png` — the Uchumi logo

## Access control

Consider putting this specific site behind an extra layer (e.g. Vercel's
password protection or IP allowlisting on paid plans, or a company VPN) if
you want defense-in-depth beyond the login screen itself — since it's a
separate deployment from the public customer form, you can lock it down
independently.

## Testing locally

Since there's no build step, just open `index.html` directly in a browser,
or serve the folder with any static server, e.g.:
```bash
npx serve .
```
Point `js/config.js` at your local backend (`http://localhost:4000`) while
testing.
