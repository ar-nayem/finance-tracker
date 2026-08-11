import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { cache } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

const SESSION_COOKIE = "session";
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function getSecretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set");
  return new TextEncoder().encode(secret);
}

type SessionPayload = {
  userId: string;
  sessionVersion: number;
};

async function encrypt(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getSecretKey());
}

async function decrypt(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), { algorithms: ["HS256"] });
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function createSession(userId: string, sessionVersion: number) {
  const session = await encrypt({ userId, sessionVersion });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: new Date(Date.now() + SESSION_DURATION_MS),
    path: "/",
  });
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

// Defense in depth: call this inside every mutating Server Action, not just
// pages, since Server Actions are reachable via direct POST requests.
//
// Re-fetches the User row on every call (deduped by cache() within a
// request, sub-ms on better-sqlite3) rather than trusting role/disabled
// state baked into the JWT — so disabling a user or resetting their
// password (which bumps sessionVersion) takes effect immediately, not after
// their token happens to expire.
export const verifySession = cache(async (): Promise<{ userId: string; role: string }> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const payload = await decrypt(token);
  if (!payload) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user || user.disabled || user.sessionVersion !== payload.sessionVersion) {
    await deleteSession();
    redirect("/login");
  }

  return { userId: user.id, role: user.role };
});

export async function requireAdmin(): Promise<{ userId: string }> {
  const { userId, role } = await verifySession();
  if (role !== "admin") {
    redirect("/");
  }
  return { userId };
}

// Same checks as verifySession(), but returns null instead of redirecting —
// for use in the root layout, which wraps the login page itself and can't
// force a redirect there without breaking that page's own render.
export const getOptionalUser = cache(async (): Promise<{ userId: string; role: string } | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const payload = await decrypt(token);
  if (!payload) return null;

  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user || user.disabled || user.sessionVersion !== payload.sessionVersion) return null;

  return { userId: user.id, role: user.role };
});
