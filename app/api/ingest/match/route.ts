import { NextRequest, NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";
import { ingestMatch, matchPayload } from "@/lib/ingest";

export const dynamic = "force-dynamic";

const digest = (s: string) => createHash("sha256").update(s).digest();

function authorized(req: NextRequest) {
  const key = process.env.INGEST_API_KEY;
  if (!key) return false;
  const given = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  return timingSafeEqual(digest(given), digest(key));
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const parsed = matchPayload.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid payload", issues: parsed.error.issues }, { status: 400 });
  }

  try {
    const result = await ingestMatch(parsed.data);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("ingest failed", err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
