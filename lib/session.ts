import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { queryOne } from "./db";

const COOKIE = "ftp_session";
const secret = () => {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) throw new Error("SESSION_SECRET must be set (16+ chars)");
  return new TextEncoder().encode(s);
};

export async function createSession(playerId: number) {
  const token = await new SignJWT({ pid: playerId })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("30d")
    .sign(secret());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

export type Me = { id: number; username: string; discord_name: string | null };

export async function getMe(): Promise<Me | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token || !process.env.SESSION_SECRET) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return await queryOne<Me>(
      "select id, username, discord_name from players where id = $1",
      [payload.pid as number],
    );
  } catch {
    return null;
  }
}
