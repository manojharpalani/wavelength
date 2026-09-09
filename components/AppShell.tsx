"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LogoMark } from "@/components/LogoMark";
import { useAuth } from "@/lib/auth/AuthProvider";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/manual", label: "My Manual" },
  { href: "/teams", label: "Teams" },
];

// Persistent nav shell for every signed-in route (dashboard, manual view,
// teams, agreement) — replaces the copy-pasted .home-nav block that used
// to appear at the top of every render* function in the old app/page.tsx.
// Mounted once by app/(app)/layout.tsx.
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { authUser, signOut } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <div className="app-shell">
      <div className="app-shell-topbar">
        <Link href="/dashboard" className="app-shell-brand">
          <LogoMark />
          <span>Wavelength</span>
        </Link>
        <button
          type="button"
          className="app-shell-menu-btn"
          onClick={() => setDrawerOpen((v) => !v)}
          aria-label="Toggle navigation"
          aria-expanded={drawerOpen}
        >
          <span />
          <span />
          <span />
        </button>
      </div>
      {drawerOpen && <div className="app-shell-scrim" onClick={() => setDrawerOpen(false)} />}
      <aside className={"app-shell-nav" + (drawerOpen ? " open" : "")}>
        <Link href="/dashboard" className="app-shell-brand app-shell-brand-desktop">
          <LogoMark />
          <span>Wavelength</span>
        </Link>
        <nav className="app-shell-links">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={"app-shell-link" + (isActive(item.href) ? " active" : "")}
              onClick={() => setDrawerOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="app-shell-footer">
          {authUser?.email && <span className="app-shell-email">{authUser.email}</span>}
          <button type="button" className="app-shell-signout" onClick={signOut}>Sign out</button>
        </div>
      </aside>
      <main className="app-shell-main">{children}</main>
    </div>
  );
}
