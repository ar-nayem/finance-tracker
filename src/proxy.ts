import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

const PUBLIC_ROUTES = new Set(["/login"]);

function getSecretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export default async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isPublicRoute = PUBLIC_ROUTES.has(path);

  const token = request.cookies.get("session")?.value;
  let authenticated = false;
  let userId: string | undefined;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, getSecretKey(), { algorithms: ["HS256"] });
      if (typeof payload.userId === "string" && typeof payload.sessionVersion === "number") {
        authenticated = true;
        userId = payload.userId;
      }
    } catch {
      authenticated = false;
    }
  }

  if (!isPublicRoute && !authenticated) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isPublicRoute && authenticated) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Best-effort visitor analytics (admin-only /admin/analytics). This proxy
  // (Next 16's renamed, now-Node-runtime middleware) is the one place every
  // request already passes through, so it's the natural spot to log page
  // views without instrumenting every page individually. Deliberately not
  // awaited — logging must never add latency to, or ever be able to affect,
  // the auth decision above; any failure here is silently swallowed. This
  // only reflects the cheap JWT-signature check above, not the deeper
  // disabled/sessionVersion check verifySession() does per-page, so it can
  // very rarely log a view for a request the page itself then bounces to
  // /login (e.g. right after an admin disables that user) — acceptable
  // slop for an informational feature, not worth duplicating that check here.
  if (authenticated && userId && !isPublicRoute && request.method === "GET") {
    prisma.pageView.create({ data: { userId, path } }).catch(() => {});
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.svg$).*)"],
};
