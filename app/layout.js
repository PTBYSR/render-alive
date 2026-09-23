import "./globals.css";
import { Providers } from "./providers";

export const metadata = {
  title: "Render Alive — Keep Your Free Services Running 24/7",
  description:
    "Automated, zero-latency edge pings to keep your Render free-tier web services awake 24/7. No cold starts, zero installation required.",
  metadataBase: new URL("https://render-alive-4xb9.vercel.app"),
  openGraph: {
    title: "Render Alive — Keep Your Free Services Running 24/7",
    description:
      "Automated, zero-latency edge pings to keep your Render free-tier web services awake 24/7. No cold starts, zero installation required.",
    url: "https://render-alive-4xb9.vercel.app",
    siteName: "Render Alive",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Render Alive — 24/7 Keep-Alive Daemon",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Render Alive — Keep Your Free Services Running 24/7",
    description:
      "Automated, zero-latency edge pings to keep your Render free-tier web services awake 24/7. Never wait 50s for cold starts again.",
    creator: "@ptbthefirst",
    images: ["/og-image.png"],
  },
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
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
