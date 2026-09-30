import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { createSession } from "@/lib/session";

export const dynamic = "force-dynamic";

const fail = (req: NextRequest, reason: string) =>
  NextResponse.redirect(new URL(`/login?error=${reason}`, req.url));

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const saved = req.cookies.get("oauth_state")?.value;
  if (!code || !state || !saved || state !== saved) return fail(req, "state");

  const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.DISCORD_CLIENT_ID!,
      client_secret: process.env.DISCORD_CLIENT_SECRET!,
      grant_type: "authorization_code",
      code,
      redirect_uri: process.env.DISCORD_REDIRECT_URI!,
    }),
  });
  if (!tokenRes.ok) return fail(req, "token");
  const { access_token } = await tokenRes.json();

  const headers = { Authorization: `Bearer ${access_token}` };
  const [meRes, connRes] = await Promise.all([
    fetch("https://discord.com/api/users/@me", { headers }),
    fetch("https://discord.com/api/users/@me/connections", { headers }),
  ]);
  if (!meRes.ok || !connRes.ok) return fail(req, "discord");
  const me = await meRes.json();
  const connections: { type: string; id: string; name: string }[] = await connRes.json();

  // Discord's Roblox connection: `id` is the Roblox user ID, `name` the username.
  const roblox = connections.find((c) => c.type === "roblox");
  if (!roblox) return fail(req, "no_roblox");

  const discordName: string = me.global_name ?? me.username;

  const owner = await pool.query(
    "select id, roblox_id::text as roblox_id from players where discord_id = $1",
    [me.id],
  );
  if (owner.rows[0] && owner.rows[0].roblox_id !== String(roblox.id)) {
    return fail(req, "discord_already_linked");
  }

  const claimed = await pool.query(
    "select discord_id from players where roblox_id = $1",
    [roblox.id],
  );
  if (claimed.rows[0]?.discord_id && claimed.rows[0].discord_id !== me.id) {
    return fail(req, "roblox_already_claimed");
  }

  const { rows } = await pool.query(
    `insert into players (roblox_id, username, discord_id, discord_name, verified_at)
     values ($1, $2, $3, $4, now())
     on conflict (roblox_id) do update set
       discord_id = excluded.discord_id,
       discord_name = excluded.discord_name,
       verified_at = coalesce(players.verified_at, now())
     returning id`,
    [roblox.id, roblox.name, me.id, discordName],
  );

  await createSession(rows[0].id);
  const res = NextResponse.redirect(new URL(`/players/${rows[0].id}`, req.url));
  res.cookies.delete("oauth_state");
  return res;
}
