import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Omnispect-X — Agent Trust & Lineage",
  description: "Trust Scores + Decision Lineage for Every AI Agent on X Layer",
};

const NAV_ITEMS = [
  { href: "/trust", label: "Trust Score" },
  { href: "/lineage", label: "Lineage Explorer" },
  { href: "/monitor", label: "Agent Monitor" },
  { href: "/compare", label: "Compare" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-200 min-h-screen">
        <nav className="border-b border-slate-800 px-6 py-3">
          <div className="max-w-7xl mx-auto flex items-center gap-6">
            <Link href="/" className="text-lg font-bold text-indigo-400">Omnispect-X</Link>
            {NAV_ITEMS.map((item) => (
              <Link key={item.href} href={item.href} className="text-sm text-slate-400 hover:text-slate-200 transition-colors">
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
