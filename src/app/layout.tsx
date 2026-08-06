import type { Metadata, Viewport } from "next";
import { Manrope, Newsreader } from "next/font/google";
import "maplibre-gl/dist/maplibre-gl.css";

import { AppProviders } from "@/components/providers/app-providers";
import { publicEnv } from "@/lib/env";
import { getConfiguredSiteOrigin } from "@/lib/site-url";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

const siteOrigin = getConfiguredSiteOrigin();
const siteDescription = "Follow a private trail of crumbs from the moments that made the trip.";
const preconnectOrigins = Array.from(
  new Set(
    [publicEnv.mapStyleUrl, publicEnv.supabaseUrl]
      .map((value) => {
        try {
          return value ? new URL(value).origin : null;
        } catch {
          return null;
        }
      })
      .filter((value): value is string => Boolean(value)),
  ),
);

export const metadata: Metadata = {
  metadataBase: siteOrigin ?? undefined,
  title: {
    default: "Crumbs",
    template: "%s | Crumbs",
  },
  description: siteDescription,
  applicationName: "Crumbs",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Crumbs",
    description: siteDescription,
    siteName: "Crumbs",
    type: "website",
    url: siteOrigin?.toString(),
  },
  twitter: {
    card: "summary",
    title: "Crumbs",
    description: siteDescription,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Crumbs",
  },
  formatDetection: {
    telephone: false,
  },
  category: "travel",
};

export const viewport: Viewport = {
  themeColor: "#f6f1e8",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} ${newsreader.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {preconnectOrigins.map((origin) => (
          <link
            crossOrigin="anonymous"
            href={origin}
            key={origin}
            rel="preconnect"
          />
        ))}
      </head>
      <body
        className="min-h-full flex flex-col bg-[var(--paper)] text-[var(--ink)]"
        suppressHydrationWarning
      >
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
