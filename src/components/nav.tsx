"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout, setTheme } from "@/lib/actions";
import type { Theme } from "@/lib/theme";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/transactions", label: "Transactions" },
  { href: "/investments", label: "Investments" },
  { href: "/streams", label: "Manage" },
];

export function Nav({
  isAdmin,
  displayName,
  logoDataUrl,
  theme,
}: {
  isAdmin: boolean;
  displayName: string | null;
  logoDataUrl: string | null;
  theme: Theme;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  if (pathname === "/login") return null;

  const allLinks = isAdmin
    ? [...links, { href: "/admin/users", label: "Admin" }, { href: "/admin/analytics", label: "Analytics" }]
    : links;

  const themeToggle = (
    <form action={setTheme}>
      <input type="hidden" name="theme" value={theme === "dark" ? "light" : "dark"} />
      <button
        type="submit"
        aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
        title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
        className="cursor-pointer rounded-md border border-border bg-background px-2.5 py-2 text-sm outline-none transition-colors duration-150 hover:bg-muted-hover focus:ring-2 focus:ring-ring"
      >
        {theme === "dark" ? "☀️" : "🌙"}
      </button>
    </form>
  );

  const logoutButton = (
    <form action={logout}>
      <button type="submit" className="btn-ghost-sm hover:text-destructive">
        Logout
      </button>
    </form>
  );

  return (
    <header className="border-b border-border bg-muted">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <span className="flex min-w-0 items-center gap-2 font-heading text-lg font-semibold tracking-tight">
          {logoDataUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoDataUrl} alt="" className="h-7 w-7 shrink-0 rounded object-cover" />
          )}
          <span className="truncate">{displayName || "Finance Tracker"}</span>
        </span>

        <nav className="hidden items-center gap-1 md:flex">
          {allLinks.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`pill ${active ? "pill-active" : "pill-inactive"}`}
              >
                {link.label}
              </Link>
            );
          })}
          {themeToggle}
          {logoutButton}
        </nav>

        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          className="cursor-pointer rounded-md border border-border bg-background px-2.5 py-2 text-sm outline-none transition-colors duration-150 hover:bg-muted-hover focus:ring-2 focus:ring-ring md:hidden"
        >
          {open ? "✕" : "☰"}
        </button>
      </div>

      {open && (
        <nav className="flex flex-col gap-1 border-t border-border px-4 py-3 md:hidden">
          {allLinks.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={`pill ${active ? "pill-active" : "pill-inactive"}`}
              >
                {link.label}
              </Link>
            );
          })}
          <div className="mt-2 flex items-center gap-2 border-t border-border pt-2">
            {themeToggle}
            {logoutButton}
          </div>
        </nav>
      )}
    </header>
  );
}
