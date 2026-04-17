import type { Metadata } from "next";
import "./globals.css";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.siteUrl),
  title: {
    default: "CCIsland - Dynamic Island for Claude Code",
    template: "%s - CCIsland",
  },
  description: siteConfig.description,
  openGraph: {
    title: "CCIsland - Dynamic Island for Claude Code",
    description: siteConfig.description,
    siteName: siteConfig.name,
    images: [
      {
        url: "/og/ccisland-og.png",
        width: 1200,
        height: 630,
        alt: "CCIsland website preview",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CCIsland - Dynamic Island for Claude Code",
    description: siteConfig.description,
    images: ["/og/ccisland-og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
