# Render Alive ⚡

> Keep free cloud services awake 24/7 for free. The UptimeRobot alternative that actually works.

[![Live App](https://img.shields.io/badge/Live%20App-render--alive--three.vercel.app-blue)](https://render-alive-three.vercel.app)
[![License: MIT](https://img.shields.io/badge/License-MIT-black.svg)](https://opensource.org/licenses/MIT)
[![Next.js 16](https://img.shields.io/badge/Next.js-16-black.svg)](https://nextjs.org/)
[![Creator](https://img.shields.io/badge/Creator-%40ptbthefirst-1DA1F2.svg)](https://x.com/ptbthefirst)

An automated keep-alive daemon specifically tuned for **Render, Koyeb, Glitch, and custom domain APIs**. It eliminates 15-minute idle spin-downs and 50+ second cold starts with precision 14-minute pings, without exhausting your monthly free-tier hours.

---

## 📽️ Demo

<p align="center">
  <img src="public/demo.gif" alt="Render Alive Demo Preview" width="100%" style="border-radius: 8px;" />
</p>

---

## 🚀 Getting Started

👉 **Use the hosted service (Recommended):**  
### 🌐 **[https://render-alive-three.vercel.app](https://render-alive-three.vercel.app)**

1. Enter your `.onrender.com`, `koyeb.app`, `glitch.me`, or custom API URL.
2. Select your ping interval (default: 14 minutes).
3. Your service stays warm 24/7 with zero cold starts.

> **Note on self-hosting:** Render Alive’s keep-alive engine relies on an offloaded background daemon running 24/7 on a dedicated Oracle Cloud VPS synced with Upstash Redis. We strongly recommend using the free hosted web application above rather than configuring and managing the VPS infrastructure manually.

---

## 📄 License

Distributed under the [MIT License](LICENSE).
