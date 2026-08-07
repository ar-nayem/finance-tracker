import type { Metadata } from "next";
import { Lexend, Source_Sans_3 } from "next/font/google";
import { Nav } from "@/components/nav";
import { getOptionalUser } from "@/lib/session";
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

  return (
    <html lang="en" className={`${lexend.variable} ${sourceSans.variable} h-full antialiased dark`}>
      <body className="min-h-full flex flex-col">
        <Nav isAdmin={session?.role === "admin"} />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">{children}</main>
      </body>
    </html>
  );
}
