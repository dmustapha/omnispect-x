"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  {
    href: "/trust",
    label: "Trust Score",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
      </svg>
    ),
  },
  {
    href: "/lineage",
    label: "Lineage",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    ),
  },
  {
    href: "/monitor",
    label: "Monitor",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8" /><path d="M12 17v4" />
      </svg>
    ),
  },
  {
    href: "/compare",
    label: "Compare",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M16 3h5v5" /><path d="M8 3H3v5" /><path d="M21 3l-7 7" /><path d="M3 3l7 7" />
        <path d="M16 21h5v-5" /><path d="M8 21H3v-5" />
      </svg>
    ),
  },
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <nav className="ox-sidebar ox-glass-edge" aria-label="Main navigation">
      {/* Logo */}
      <div className="ox-sidebar-logo mb-8 px-2">
        <Link href="/" className="flex items-center gap-2.5 group">
          <Image src="/icon-192.png" alt="Omnispect-X" width={32} height={32} className="rounded-lg" />
          <span className="font-display font-semibold text-lg tracking-tight text-ox-text-primary group-hover:text-ox-cyan transition-colors">
            Omnispect-X
          </span>
        </Link>
      </div>

      {/* Nav items */}
      <div className="ox-sidebar-nav flex flex-col gap-1 flex-1">
        {NAV_ITEMS.map(({ href, label, icon }) => {
          const isActive = pathname === href || pathname.startsWith(href);
          return (
            <Link key={href} href={href} className="ox-sidebar-item" data-active={isActive}>
              {icon}
              <span className="ox-nav-label">{label}</span>
            </Link>
          );
        })}
      </div>

      {/* Footer */}
      <div className="ox-sidebar-footer px-2">
        <div className="flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full animate-pulse-dot" style={{ background: "var(--ox-safe)" }} />
          <span className="text-ox-text-secondary">X Layer</span>
        </div>
      </div>
    </nav>
  );
}
