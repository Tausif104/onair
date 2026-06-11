import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const COOKIE = "session";
const SESSION_DAYS = 30;

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(s);
}

export function hashPassword(plain: string) {
  return bcrypt.hash(plain, 12);
}

export function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}

/**
 * Create a Session row, sign a JWT carrying { sub: userId, sid }, and set it
 * as an httpOnly cookie (the session). Call only inside a Server Action / Route Handler.
 */
export async function createSession(userId: string) {
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  const session = await prisma.session.create({
    data: { userId, expiresAt },
  });

  const token = await new SignJWT({ sub: userId, sid: session.id })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(secret());

  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

/**
 * Read + verify the cookie, confirm the Session row exists and isn't expired.
 * Returns userId or null. Safe to call during render (read-only).
 */
export async function getUserId(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secret());
    const sid = payload.sid as string | undefined;
    const sub = payload.sub as string | undefined;
    if (!sid || !sub) return null;

    const session = await prisma.session.findUnique({ where: { id: sid } });
    if (!session || session.userId !== sub) return null;
    if (session.expiresAt.getTime() < Date.now()) {
      await prisma.session.delete({ where: { id: sid } }).catch(() => {});
      return null;
    }
    return sub;
  } catch {
    return null;
  }
}

/** Delete the Session row (revoke) and clear the cookie. */
export async function destroySession() {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, secret());
      const sid = payload.sid as string | undefined;
      if (sid) await prisma.session.delete({ where: { id: sid } }).catch(() => {});
    } catch {
      // invalid token — nothing to revoke
    }
  }
  store.delete(COOKIE);
}
