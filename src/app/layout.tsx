import type { Metadata } from "next";
import { Lexend, Source_Sans_3 } from "next/font/google";
import { Nav } from "@/components/nav";
import { RegisterServiceWorker } from "@/components/register-sw";
import { getOptionalUser } from "@/lib/session";
import { getUserBranding } from "@/lib/data";
import { getTheme } from "@/lib/theme";
import "./globals.css";

const lexend = Lexend({
  variable: "--font-heading",
  subsets: ["latin"],
});

const sourceSans = Source_Sans_3({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Finance Tracker",
  description: "Track income, expenses, and investments across every currency and stream.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getOptionalUser();
  const branding = session ? await getUserBranding(session.userId) : null;
  const theme = await getTheme();

  return (
    <html
      lang="en"
      className={`${lexend.variable} ${sourceSans.variable} h-full antialiased ${theme === "light" ? "light" : "dark"}`}
    >
      <body className="min-h-full flex flex-col">
        <RegisterServiceWorker />
        <Nav
          isAdmin={session?.role === "admin"}
          displayName={branding?.displayName ?? null}
          logoDataUrl={branding?.logoDataUrl ?? null}
          theme={theme}
        />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">{children}</main>
      </body>
    </html>
  );
}
