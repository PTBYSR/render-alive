# Render Alive

> A lightweight, serverless utility that keeps Render free-tier Web Services awake by periodically sending automated HTTP requests.

---

## Features

- **No Accounts Required**: Anonymous device ID saved in a secure HTTP-only cookie.
- **Render Verification**: Pre-flight checks verify that target URLs belong to Render (`.onrender.com` or `rndr-id` / `server: render` headers).
- **HTML & Embed Detection**: Automatically distinguishes web apps (`Web`) from backend endpoints (`API`), with an embedded iframe preview for compatible websites.
- **Customizable Intervals**: Set ping frequency (5m, 10m, 14m, etc.) to prevent Render's 15-minute idle spin-down.
- **Confirmation Modals**: Elegant confirmation dialogs for changing intervals or removing services.
- **Monochrome Aesthetic**: Minimalist, Japanese-inspired interface with strong typography and high clarity.

---

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router, Turbopack)
- **Database**: [Upstash Redis](https://upstash.com/) (Serverless REST Redis)
- **Hosting & Cron**: [Vercel](https://vercel.com/) & [cron-job.org](https://cron-job.org)

---

## Getting Started

### 1. Environment Variables

Create `.env.local` with your Upstash Redis credentials:

```ini
UPSTASH_REDIS_REST_URL=https://<your-db>.upstash.io
UPSTASH_REDIS_REST_TOKEN=<your-upstash-token>
CRON_SECRET=<your-random-secret>
```

### 2. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Deployment

1. Import this repository into [Vercel](https://vercel.com/new).
2. Configure the 3 environment variables in Vercel project settings:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
   - `CRON_SECRET`
3. Set up an external cron job on [cron-job.org](https://cron-job.org) (every 1–2 minutes) pointing to:
   ```
   https://<your-deployed-app>.vercel.app/api/cron?secret=<your-cron-secret>
   ```
