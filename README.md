# Render Alive ⚡

> An automated, open-source 24/7 keep-alive daemon specifically tuned for free Render web services. Stop waiting 50+ seconds for inactive instances to spin up.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/PTBYSR/render-alive)
[![License: MIT](https://img.shields.io/badge/License-MIT-black.svg)](https://opensource.org/licenses/MIT)
[![Next.js 16](https://img.shields.io/badge/Next.js-16%20(Turbopack)-black.svg)](https://nextjs.org/)
[![Upstash Redis](https://img.shields.io/badge/Upstash-Redis-00E599.svg)](https://upstash.com/)
[![Creator](https://img.shields.io/badge/Creator-%40ptbthefirst-1DA1F2.svg)](https://x.com/ptbthefirst)

---

## 🌐 Live Demo

👉 **Try it live:** [https://render-alive-4xb9.vercel.app](https://render-alive-4xb9.vercel.app)

---

## 💡 The Problem

Render's free tier is one of the best free hosting solutions for full-stack apps and APIs. However, free Web Services automatically **spin down after 15 minutes of inactivity**. 

When a user or client visits your app again, it takes **50 to 90 seconds** to perform a cold start. Furthermore, generic uptime monitors like UptimeRobot often fail on Render due to:
1. Strict bot / header detection
2. 5-second HTTP request timeouts that abort during a Render cold start
3. Inability to distinguish between waking states and real downtime

**Render Alive** was built specifically to solve this problem:
* Sends authenticated, realistic HTTP GET requests with custom User-Agents
* Employs adaptive 15-second timeouts to allow cold starts to finish
* Automatically schedules next pings in Upstash Redis with 1-minute precision

---

## ✨ Features

- **⚡ 24/7 Keep-Alive Daemon**: Keeps your `.onrender.com` applications active around the clock with zero spin-down.
- **🛡️ 3 Monitored Slots Per Account**: Add up to 3 web services or APIs per registered account.
- **⏱️ Flexible Ping Intervals**: Choose between 5 min, 10 min, 14 min, 20 min, or 30 min intervals.
- **🔍 Render Pre-flight Verification**: Automatically validates that target domains belong to Render (`.onrender.com` or `rndr-id` / `server: render` headers).
- **🖥️ Live Website Preview**: Built-in responsive iframe preview for verified HTML web apps.
- **📊 Real-Time Telemetry**: Live ping latency in milliseconds, HTTP response codes, and next-ping countdown timers.
- **🔐 Multi-Provider Authentication**: Auth.js (NextAuth v5) supporting **Google OAuth** and **Email / Password** credentials.
- **👑 Protected Admin Dashboard**: High-level telemetry inspector at `/admin` protected by `ADMIN_SECRET`.
- **🎨 Monochrome Japanese Aesthetic**: Clean, distraction-free typography with dark mode accents and full mobile responsiveness.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, Turbopack)
- **Database**: [Upstash Redis](https://upstash.com/) (Serverless REST Redis)
- **Authentication**: [Auth.js v5](https://authjs.dev/) (NextAuth with JWT session strategy)
- **Styling**: Vanilla CSS design system (Monochrome aesthetic, responsive grid, zero external CSS bloat)
- **Hosting**: [Vercel](https://vercel.com/)
- **Cron Trigger**: [cron-job.org](https://cron-job.org) (100% free external cron dispatch)

---

## 🚀 Quick Start (Local Development)

### 1. Clone the repository
```bash
git clone https://github.com/PTBYSR/render-alive.git
cd render-alive
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Fill in the required values:
```env
UPSTASH_REDIS_REST_URL="https://your-db.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your-token"
CRON_SECRET="your-cron-secret"
ADMIN_SECRET="your-admin-secret"
AUTH_SECRET="your-32-char-auth-secret"
NEXTAUTH_URL="http://localhost:3000"
```

### 4. Run the development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ☁️ 1-Click Deployment (Vercel)

1. Click the button below to deploy your own instance to Vercel:
   
   [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/PTBYSR/render-alive)

2. In the Vercel dashboard, populate the environment variables from your `.env.local`.

3. Configure your free 1-minute external cron trigger on [cron-job.org](https://cron-job.org):
   * **URL:** `https://<your-project>.vercel.app/api/cron?secret=<your-cron-secret>`
   * **Schedule:** Every 1 minute (or 2 minutes)

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/PTBYSR/render-alive/issues).

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the MIT License. See [`LICENSE`](./LICENSE) for more information.

---

## 👨‍💻 Author

Created by **[@ptbthefirst](https://x.com/ptbthefirst)** — feel free to reach out on X / Twitter!
