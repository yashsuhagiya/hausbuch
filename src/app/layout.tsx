import type { Metadata, Viewport } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import { StoreHydrator } from "@/components/store-hydrator";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  style: ["italic", "normal"],
});
const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  title: "Hausbuch",
  description: "Ein einfaches Hausbuch.",
  applicationName: "Hausbuch",
  manifest: "/manifest.webmanifest",
  // iOS treats this block specially: "Add to Home Screen" uses `title` for
  // the icon label, and `statusBarStyle` controls the status bar tint when
  // the PWA launches. Without it, the per-page <title> is used (which can
  // shift between routes) and the status bar defaults to plain white.
  appleWebApp: {
    capable: true,
    title: "Hausbuch",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#1B2A3B",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${geist.variable} ${geistMono.variable}`}>
      <body>
        <StoreHydrator />
        {children}
      </body>
    </html>
  );
}
