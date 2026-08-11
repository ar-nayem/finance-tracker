import { SignJWT } from "jose";
import { prisma } from "./src/lib/prisma";
const secret = new TextEncoder().encode(process.env.SESSION_SECRET);
const user = await prisma.user.findFirstOrThrow();
const token = await new SignJWT({ userId: user.id, sessionVersion: user.sessionVersion })
  .setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("15m").sign(secret);
console.log(token);
process.exit(0);
