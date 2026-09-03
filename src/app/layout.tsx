import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  title: {
    default: "ZemenServe — Hotel & Restaurant F&B Management System",
    template: "%s | ZemenServe",
  },
  description: "Offline-first Point of Sale (POS), Kitchen Display System (KDS), Recipe-Level Inventory Management, and Daily Financial Reporting for hotels and restaurants in Ethiopia.",
  keywords: ["ZemenServe", "POS", "Hotel Management", "Restaurant POS", "Kitchen Display System", "Ethiopia F&B", "Next.js POS"],
  authors: [{ name: "Zemen Tech" }],
  openGraph: {
    title: "ZemenServe — Hotel & Restaurant Management System",
    description: "Enterprise POS, KDS, Recipe Inventory, & Financial Analytics for Hotels & Restaurants",
    siteName: "ZemenServe",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[#070a12] text-slate-100">{children}</body>
    </html>
  );
}
