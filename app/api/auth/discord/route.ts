import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";

export const dynamic = "force-dynamic";

export async function GET() {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const redirectUri = process.env.DISCORD_REDIRECT_URI;
  if (!clientId || !redirectUri) {
    return NextResponse.json({ error: "Discord login is not configured" }, { status: 500 });
  }
  const state = randomBytes(16).toString("hex");
  const url = new URL("https://discord.com/oauth2/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", "identify connections");
  url.searchParams.set("state", state);
  url.searchParams.set("prompt", "none");

  const res = NextResponse.redirect(url);
  res.cookies.set("oauth_state", state, {
    httpOnly: true, sameSite: "lax", path: "/", maxAge: 600,
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}
