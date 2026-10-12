import "./globals.css";
import { Providers } from "./providers";
import { Analytics } from "@vercel/analytics/react";

export const metadata = {
  title: {
    default: "Render Alive — Keep Render Free Tier Running 24/7 (Fix Spin-Down)",
    template: "%s | Render Alive",
  },
  description:
    "Fix Render free-tier downtime and 50s cold starts. Automated keep-alive edge pings prevent Render web services from sleeping after 15 minutes of inactivity. Free & open-source.",
  keywords: [
    "render free tier",
    "render free tier sleep fix",
    "fix render spin down",
    "keep render web service alive",
    "render cold start delay fix",
    "prevent render service from sleeping",
    "render 15 minute inactivity timeout",
    "render free tier downtime fix",
    "render keep alive 24/7",
    "render uptime monitor",
    "render always awake",
    "how to stop render from sleeping",
    "how to keep render awake 24/7",
    "render spin down workaround",
    "render keep alive github gist alternative",
    "render cron job keep alive",
    "render 50 second cold start solution",
    "render free tier 750 instance hours",
    "free vps no downtime render",
    "uptimerobot render alternative",
  ],
  authors: [{ name: "ptbthefirst", url: "https://x.com/ptbthefirst" }],
  creator: "ptbthefirst",
  publisher: "Render Alive",
  metadataBase: new URL("https://render-alive-4xb9.vercel.app"),
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    title: "Render Alive — Keep Render Free Tier Running 24/7 (Fix Spin-Down)",
    description:
      "Fix Render free-tier downtime and 50s cold starts. Automated keep-alive edge pings prevent Render web services from sleeping after 15 minutes of inactivity. Free & open-source.",
    url: "https://render-alive-4xb9.vercel.app",
    siteName: "Render Alive",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Render Alive — Fix Render Free Tier Spin-Down 24/7",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Render Alive — Keep Render Free Tier Running 24/7 (Fix Spin-Down)",
    description:
      "Fix Render free-tier downtime and 50s cold starts. Automated keep-alive edge pings prevent Render web services from sleeping after 15 minutes of inactivity.",
    creator: "@ptbthefirst",
    images: ["/og-image.png"],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://render-alive-4xb9.vercel.app/#website",
      "url": "https://render-alive-4xb9.vercel.app",
      "name": "Render Alive",
      "description": "Keep Render free tier web services awake 24/7 and eliminate 50-second cold starts.",
      "publisher": {
        "@type": "Person",
        "name": "ptbthefirst",
        "url": "https://x.com/ptbthefirst"
      }
    },
    {
      "@type": "SoftwareApplication",
      "@id": "https://render-alive-4xb9.vercel.app/#webapp",
      "name": "Render Alive",
      "url": "https://render-alive-4xb9.vercel.app",
      "applicationCategory": "DeveloperApplication",
      "operatingSystem": "All",
      "description":
        "Automated keep-alive daemon to prevent Render free-tier web services from sleeping and eliminate 50-second cold starts.",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD",
      },
      "featureList": [
        "24/7 automated edge keep-alive pings",
        "14-minute interval tuned for Render 15-minute sleep timer",
        "Sub-second latency tracking and HTTP code telemetry",
        "3 free monitored web service slots",
        "Live iframe website preview"
      ],
      "author": {
        "@type": "Person",
        "name": "ptbthefirst",
        "url": "https://x.com/ptbthefirst",
      },
    },
    {
      "@type": "HowTo",
      "@id": "https://render-alive-4xb9.vercel.app/#howto",
      "name": "How to Prevent Render Free-Tier Web Services from Sleeping",
      "description": "Step-by-step guide to stop Render.com free instances from spinning down after 15 minutes of inactivity.",
      "step": [
        {
          "@type": "HowToStep",
          "name": "Deploy your web service on Render",
          "text": "Deploy your Node.js, Python, Docker, or Go web app on Render free tier (your-app.onrender.com)."
        },
        {
          "@type": "HowToStep",
          "name": "Add your Render URL to Render Alive",
          "text": "Sign in to Render Alive and submit your .onrender.com service endpoint to your 3 free monitor slots."
        },
        {
          "@type": "HowToStep",
          "name": "Select 14-minute keep-alive ping interval",
          "text": "Set the interval to 14 minutes to reset Render's 15-minute inactivity timer right before it triggers, ensuring zero cold starts 24/7."
        }
      ]
    },
    {
      "@type": "FAQPage",
      "@id": "https://render-alive-4xb9.vercel.app/#faq",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "How do I prevent Render free tier web services from sleeping?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text":
              "Render spins down free-tier web services after 15 minutes of inactivity. Render Alive prevents this by sending automated, lightweight HTTP keep-alive pings at 14-minute intervals, resetting the inactivity timer so your service remains awake 24/7.",
          },
        },
        {
          "@type": "Question",
          "name": "How to fix Render 50 second cold start delay?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text":
              "The 50+ second cold start occurs when incoming traffic wakes a suspended instance. Keeping the instance warm with periodic keep-alive pings from Render Alive eliminates cold starts entirely, ensuring immediate sub-second response times.",
          },
        },
        {
          "@type": "Question",
          "name": "Will keeping Render alive exceed the 750 free monthly hours?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text":
              "No. Render provides 750 free instance hours each month per workspace. A standard 31-day month has 744 hours (31 × 24 = 744). Running one free web service 24/7 consumes 744 hours, staying safely within the 750-hour limit with 6 spare hours.",
          },
        },
        {
          "@type": "Question",
          "name": "Why do internal timers (setInterval) in Node.js or Python fail on Render?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text":
              "When Render suspends an idle container after 15 minutes, the entire container process is frozen by the hypervisor. Internal timers stop executing completely. Only external inbound HTTP requests from an external edge monitor like Render Alive can wake or keep the service awake.",
          },
        },
        {
          "@type": "Question",
          "name": "Why use Render Alive instead of generic uptime monitors like UptimeRobot?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text":
              "Generic uptime monitors often face aggressive rate-limiting, require complex header setups, or have strict 5-second timeouts that fail during Render cold starts. Render Alive is purpose-built for Render developers with tailored 14-minute keep-alive intervals, adaptive 15-second cold-start tolerance, latency tracking, and zero setup.",
          },
        },
        {
          "@type": "Question",
          "name": "Is using a keep-alive monitor permitted on Render free tier?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text":
              "Lightweight HTTP health pings to your own public application are standard web traffic. As long as your total running time stays within your 750 monthly free instance hours, your service remains fully compliant with Render's platform usage.",
          },
        },
      ],
    },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>
        <Providers>
          {children}
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
