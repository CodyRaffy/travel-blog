"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Map" },
  { href: "/stops", label: "Stops" },
  { href: "/posts", label: "Journal" },
];

export default function SiteHeader({ overlay = false }: { overlay?: boolean }) {
  const pathname = usePathname();
  const current = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  return (
    <header className={`site-header${overlay ? " site-header--overlay" : ""}`}>
      <Link href="/" className="site-brand">
        <small>Raffy&apos;s on the</small>
        Road
      </Link>
      <nav className="site-nav" aria-label="Main">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} aria-current={current(n.href) ? "page" : undefined}>
            {n.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
