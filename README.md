# Render Alive ⚡

> Keep free cloud services awake 24/7 for free. The UptimeRobot alternative that actually works. Automated keep-alive pings prevent idle spin-down and 50s cold starts across **Render, Koyeb, Glitch, Hugging Face Spaces, and custom domain APIs**.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/PTBYSR/render-alive)
[![License: MIT](https://img.shields.io/badge/License-MIT-black.svg)](https://opensource.org/licenses/MIT)
[![Next.js 16](https://img.shields.io/badge/Next.js-16%20(Turbopack)-black.svg)](https://nextjs.org/)
[![Upstash Redis](https://img.shields.io/badge/Upstash-Redis-00E599.svg)](https://upstash.com/)
[![Creator](https://img.shields.io/badge/Creator-%40ptbthefirst-1DA1F2.svg)](https://x.com/ptbthefirst)

---

## 🌐 Live Application

👉 **Try it live:** [https://render-alive-three.vercel.app](https://render-alive-three.vercel.app)

---

## 💡 The Problem

Modern free cloud hosting platforms (**Render**, **Koyeb**, **Glitch**, **Hugging Face Spaces**) provide generous compute tiers for full-stack apps and background APIs. However, they enforce aggressive **inactivity timeouts** (e.g., spinning down after 15 minutes of zero traffic).

When users or API clients visit a sleeping app, it triggers a painful **50 to 90-second cold start delay**. Generic uptime monitors (like UptimeRobot) frequently fail because:
1. Strict bot and user-agent filters block generic health probes
2. Rigid 5-second request timeouts abort prematurely while a sleeping container is booting
3. They fail to handle custom ping cadences aligned with provider spin-down windows

**Render Alive** solves this permanently:
* **Multi-Platform Support**: Tuned for `.onrender.com`, `.koyeb.app`, `.glitch.me`, `.hf.space`, and custom domains.
* **Cold-Start Resilient**: Employs adaptive 15-second probe timeouts allowing waking instances ample time to initialize.
* **Realistic Edge User-Agents**: Transparent browser-like HTTP GET/HEAD requests that prevent bot blocking.
* **Precision Queue Scheduling**: Upstash Redis sorted sets dispatch pings with 10-second precision.

---

## ✨ Features

- **⚡ 24/7 Keep-Alive Daemon**: Keeps your web applications and API workers awake 24/7 with zero spin-down.
- **🌐 Multi-Cloud & Custom Domains**: Supports Render, Koyeb, Glitch, Hugging Face Spaces, Fly.io, and custom domain backends.
- **🛡️ 3 Monitored Slots Per Account**: Add up to 3 separate web services or APIs per registered user.
- **⏱️ Flexible Ping Intervals**: Choose between 5 min, 10 min, 14 min (recommended for Render), 20 min, or 30 min intervals.
- **🔒 SSRF Protection & Pre-Flight Validation**: Validates public reachability while rejecting internal/private IP ranges.
- **🖥️ Live Website Preview**: Built-in responsive iframe preview for verified HTML web applications.
- **📊 Real-Time Telemetry**: Live ping latency in milliseconds, HTTP response codes, and next-ping countdown timers.
- **🔐 Multi-Provider Authentication**: Auth.js (NextAuth v5) supporting **Google OAuth** and **Email / Password** auto-registration.
- **👑 Protected Admin Dashboard**: High-level telemetry inspector at `/admin` protected by `ADMIN_SECRET`.
- **🎨 Monochrome Japanese Aesthetic**: Clean, distraction-free typography with dark mode accents and full mobile responsiveness.

---

## 🛠️ Architecture

```
+------------------------------------+
|    Render Alive Web Frontend       |
|    (Next.js 16 on Vercel)          |  <--- User Dashboard, Auth, URLs
+-----------------+------------------+
                  |
                  v
+------------------------------------+
|      Shared Database Layer         |
|      (Upstash Redis REST)          |  <--- Stores users, URLs & due_pings queue
+-----------------+------------------+
                  ^
                  |
+-----------------+------------------+
|    High-Performance Pinger Engine   |
|    (Dedicated VPS Daemon)          |  <--- 24/7 background worker, 15s timeout
+-----------------+------------------+
                  |
                  v  (HTTP GET keep-alive requests)
+-------------------------------------------------------+
|  Target Services (Render, Koyeb, Glitch, Custom APIs) |
|  Eliminates 15-min idle spin-down & cold starts       |
+-------------------------------------------------------+
```

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

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/PTBYSR/render-alive/issues).

---

## 📄 License

Distributed under the MIT License. See [`LICENSE`](./LICENSE) for more information.

---

## 👨‍💻 Author

Created by **[@ptbthefirst](https://x.com/ptbthefirst)** — feel free to reach out on X / Twitter!
