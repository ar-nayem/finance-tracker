"use client";

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

  if (pathname === "/login") return null;

  const allLinks = isAdmin
    ? [...links, { href: "/admin/users", label: "Admin" }, { href: "/admin/analytics", label: "Analytics" }]
    : links;

  return (
    <header className="border-b border-border bg-muted">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <span className="flex items-center gap-2 font-heading text-lg font-semibold tracking-tight">
          {logoDataUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoDataUrl} alt="" className="h-7 w-7 rounded object-cover" />
          )}
          {displayName || "Finance Tracker"}
        </span>
        <nav className="flex items-center gap-1">
          {allLinks.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150 ${
                  active
                    ? "bg-primary text-on-primary"
                    : "text-foreground/70 hover:bg-foreground/5 hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            );
          })}

          <form action={setTheme}>
            <select
              name="theme"
              defaultValue={theme}
              onChange={(e) => e.currentTarget.form?.requestSubmit()}
              aria-label="Theme"
              className="cursor-pointer rounded-md border border-border bg-background px-2 py-2 text-sm font-medium text-foreground/70 outline-none transition-colors duration-150 hover:text-foreground focus:ring-2 focus:ring-ring"
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </form>

          <form action={logout}>
            <button
              type="submit"
              className="cursor-pointer rounded-md px-3 py-2 text-sm font-medium text-foreground/70 transition-colors duration-150 hover:bg-foreground/5 hover:text-destructive"
            >
              Logout
            </button>
          </form>
        </nav>
      </div>
    </header>
  );
}
