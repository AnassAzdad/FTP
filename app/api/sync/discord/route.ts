import { NextRequest, NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";
import { getSyncState, parseFixtures, setSyncState, upsertFixtures } from "@/lib/fixtures";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const digest = (s: string) => createHash("sha256").update(s).digest();
function bearerMatches(req: NextRequest, ...secrets: (string | undefined)[]) {
  const given = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  return secrets.some((s) => s && timingSafeEqual(digest(given), digest(s)));
}

const WINDOW = 50; // messages re-read each run so edits to recent posts are picked up

type DiscordMessage = { id: string; content: string; timestamp: string; embeds?: { title?: string; description?: string }[] };

/** Scheduled sync: reads the fixtures channel and upserts every fixture it can parse. */
export async function GET(req: NextRequest) {
  if (!bearerMatches(req, process.env.CRON_SECRET, process.env.INGEST_API_KEY)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const token = process.env.DISCORD_BOT_TOKEN, channel = process.env.DISCORD_FIXTURES_CHANNEL_ID;
  if (!token || !channel) return NextResponse.json({ error: "DISCORD_BOT_TOKEN / DISCORD_FIXTURES_CHANNEL_ID not set" }, { status: 500 });

  const res = await fetch(`https://discord.com/api/v10/channels/${channel}/messages?limit=${WINDOW}`, {
    headers: { Authorization: `Bot ${token}` },
    cache: "no-store",
  });
  if (!res.ok) {
    return NextResponse.json({ error: "discord error", status: res.status, body: await res.text() }, { status: 502 });
  }
  const messages: DiscordMessage[] = await res.json();
  const tz = process.env.LEAGUE_TZ || "UTC";
  const items = [];
  for (const m of messages) {
    const text = [m.content, ...(m.embeds ?? []).flatMap((e) => [e.title, e.description])].filter(Boolean).join("\n");
    for (const f of parseFixtures(text, { postedAt: new Date(m.timestamp), tz })) {
      items.push({ ...f, sourceId: `${m.id}:${f.line}` });
    }
  }
  const saved = await upsertFixtures(items);
  await setSyncState("discord:last_run", new Date().toISOString());
  if (messages[0]) await setSyncState("discord:last_message", messages[0].id);
  return NextResponse.json({ ok: true, messages: messages.length, fixtures: saved, lastRun: await getSyncState("discord:last_run") });
}

/** Dry run: POST { "text": "..." } to see how a message would be parsed. Nothing is saved. */
export async function POST(req: NextRequest) {
  if (!bearerMatches(req, process.env.CRON_SECRET, process.env.INGEST_API_KEY)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  if (!body || typeof body.text !== "string") return NextResponse.json({ error: "expected { text }" }, { status: 400 });
  const tz = process.env.LEAGUE_TZ || "UTC";
  const fixtures = parseFixtures(body.text, { postedAt: new Date(), tz });
  return NextResponse.json({ tz, fixtures: fixtures.map((f) => ({ ...f, kickoff: f.kickoff.toISOString() })) });
}
