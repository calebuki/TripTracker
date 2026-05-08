import type { Metadata, Viewport } from "next";
import { Manrope, Newsreader } from "next/font/google";
import "maplibre-gl/dist/maplibre-gl.css";

import { AppProviders } from "@/components/providers/app-providers";
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
      <body
        className="min-h-full flex flex-col bg-[var(--paper)] text-[var(--ink)]"
        suppressHydrationWarning
      >
        {children}
        <AppProviders />
      </body>
    </html>
  );
}
