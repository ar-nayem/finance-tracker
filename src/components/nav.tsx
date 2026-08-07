"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/lib/actions";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/transactions", label: "Transactions" },
  { href: "/investments", label: "Investments" },
  { href: "/streams", label: "Manage" },
];

export function Nav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();

  if (pathname === "/login") return null;

  const allLinks = isAdmin ? [...links, { href: "/admin/users", label: "Admin" }] : links;

  return (
    <header className="border-b border-border bg-muted">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <span className="font-heading text-lg font-semibold tracking-tight">
          Finance Tracker
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
                    : "text-foreground/70 hover:bg-white/5 hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          <form action={logout}>
            <button
              type="submit"
              className="cursor-pointer rounded-md px-3 py-2 text-sm font-medium text-foreground/70 transition-colors duration-150 hover:bg-white/5 hover:text-destructive"
            >
              Logout
            </button>
          </form>
        </nav>
      </div>
    </header>
  );
}
