import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "./Sidebar";
import { ErrorBoundary } from "./ErrorBoundary";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains" });

export const metadata: Metadata = {
  title: "Omnispect-X — Agent Trust & Lineage on X Layer",
  description:
    "Multi-dimensional trust scores and on-chain decision lineage for every AI agent. Built on X Layer with OnchainOS.",
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "Omnispect-X — Agent Trust & Lineage",
    description: "Trust Scores + Decision Lineage for Every AI Agent on X Layer",
    type: "website",
    images: [{ url: "/og-image.png", width: 1408, height: 768 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Omnispect-X — Agent Trust & Lineage",
    description: "Trust Scores + Decision Lineage for Every AI Agent on X Layer",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrains.variable}`}>
      <body className="font-sans min-h-[100dvh] bg-ox-bg text-ox-text-primary">
        {/* Background orbs */}
        <div className="ox-orb ox-orb-amber" aria-hidden="true" />
        <div className="ox-orb ox-orb-rose" aria-hidden="true" />
        <div className="ox-orb ox-orb-warm" aria-hidden="true" />

        <Sidebar />
        <main className="ox-main-content relative z-[1] md:ml-[220px]">
          <div className="max-w-[1280px] mx-auto px-6 py-6">
            <ErrorBoundary>{children}</ErrorBoundary>
          </div>
        </main>
      </body>
    </html>
  );
}
