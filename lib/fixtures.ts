import type { PoolClient } from "pg";
import { pool, query, queryOne } from "./db";

/* ---------- Parsing ---------- */

export type ParsedFixture = {
  home: string;
  away: string;
  kickoff: Date;
  competition: string;
  line: number;
  text: string;
};

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
const DISCORD_TS = /<t:(\d{9,11})(?::[tTdDfFR])?>/;
const CLOCK = /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b|\b(\d{1,2}):(\d{2})\b/i;

/** Converts a wall-clock time in an IANA zone to a UTC Date (no library needed). */
export function zonedToUtc(y: number, m: number, d: number, h: number, mi: number, tz: string): Date {
  const guess = Date.UTC(y, m - 1, d, h, mi);
  const fmt = new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric" });
  const p = Object.fromEntries(fmt.formatToParts(new Date(guess)).map((x) => [x.type, x.value]));
  const asIf = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute);
  return new Date(guess - (asIf - guess));
}

function cleanLine(s: string) {
  return s
    .replace(/<a?:\w+:\d+>/g, " ")       // custom emoji
    .replace(/<@!?&?\d+>|<#\d+>/g, " ")  // mentions, channel links
    .replace(/@(everyone|here)\b/g, " ")
    .replace(/[*_~`>|]+/g, " ")          // markdown
    .replace(/^\s*(?:[-•*]|\d+[.)])\s*/, "")
    .replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Finds a date in text such as 30/09, 30/09/2026, 30-09-26, "30 September", "Sept 30". Year defaults to `ref`'s. */
function findDate(text: string, ref: Date): { y: number; m: number; d: number } | null {
  const t = text.toLowerCase();
  let m = t.match(/\b(\d{1,2})[\/.-](\d{1,2})(?:[\/.-](\d{2,4}))?\b/);
  if (m) {
    const y = m[3] ? (m[3].length === 2 ? 2000 + +m[3] : +m[3]) : ref.getUTCFullYear();
    return { y, m: +m[2], d: +m[1] };
  }
  m = t.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?(?:\s+(\d{4}))?/);
  if (m) return { y: m[3] ? +m[3] : ref.getUTCFullYear(), m: monthIndex(m[2]), d: +m[1] };
  m = t.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?\b/);
  if (m) return { y: m[3] ? +m[3] : ref.getUTCFullYear(), m: monthIndex(m[1]), d: +m[2] };
  return null;
}
const monthIndex = (s: string) => MONTHS.findIndex((x) => x.startsWith(s.slice(0, 3))) + 1;

function findClock(text: string): { h: number; mi: number; span: string } | null {
  const m = text.match(CLOCK);
  if (!m) return null;
  if (m[3]) {
    let h = +m[1] % 12;
    if (m[3].toLowerCase() === "pm") h += 12;
    return { h, mi: +(m[2] ?? 0), span: m[0] };
  }
  return { h: +m[4], mi: +m[5], span: m[0] };
}

function competitionOf(text: string): string {
  const t = text.toLowerCase();
  if (/\bcup\b/.test(t)) return "Cup";
  if (/\bfriendl/.test(t)) return "Friendly";
  if (/\bplay-?off/.test(t)) return "Playoff";
  return "League";
}

/**
 * Parses one Discord message into fixtures. Supported per line:
 *   "Red Lions vs Blue Hawks <t:1790800000:F>"
 *   "Red Lions vs Blue Hawks 20:00"  (date from a header line like "Fixtures 30/09" or the post date)
 *   "Red Lions v Blue Hawks @ 8pm"
 * Uses `tz` for clock times without a Discord timestamp.
 */
export function parseFixtures(content: string, opts: { postedAt: Date; tz: string }): ParsedFixture[] {
  const rawLines = content.split(/\r?\n/);
  const messageComp = competitionOf(content);
  let base: { y: number; m: number; d: number } | null = null;
  // Message-level date: a Discord timestamp or date on a line without a fixture, else the post date.
  for (const raw of rawLines) {
    if (/\b(?:vs?\.?|x)\b/i.test(raw)) continue;
    const ts = raw.match(DISCORD_TS);
    if (ts) { base = partsIn(new Date(+ts[1] * 1000), opts.tz); break; }
    const fd = findDate(cleanLine(raw), opts.postedAt);
    if (fd) { base = fd; break; }
  }
  if (!base) base = partsIn(opts.postedAt, opts.tz);

  const out: ParsedFixture[] = [];
  rawLines.forEach((rawLine, i) => {
    const ts = rawLine.match(DISCORD_TS);              // read before cleanLine, which strips ">"
    const raw = cleanLine(rawLine.replace(DISCORD_TS, " "));
    let l = raw;
    if (!l) return;
    const kickoff0 = ts ? new Date(+ts[1] * 1000) : null;
    let kickoff: Date | null = kickoff0;
    const lineDate = findDate(l, opts.postedAt);
    const hasMonthName = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/i.test(l);
    if (lineDate) l = l.replace(/\b\d{1,2}[\/.-]\d{1,2}(?:[\/.-]\d{2,4})?\b/, " ");
    const clock = findClock(l);
    if (clock) l = l.replace(clock.span, " ");
    l = l.replace(/\s*[@|(),]+\s*$/g, " ").replace(/\s+[@|(),-]\s*$/g, " ").replace(/\s+/g, " ").trim();
    // "A vs B" always counts; "A - B" only when the line also carries a time, so headers are skipped.
    const vs = l.match(/^(.+?)\s+(?:vs\.?|v\.?|x)\s+(.+?)$/i)
      ?? ((clock || ts) && !hasMonthName ? l.match(/^([^-–—]+?)\s+[-–—]\s+([^-–—]+?)$/) : null);
    if (!vs) return;
    const home = vs[1].replace(/[@|(),-]+$/, "").trim(), away = vs[2].replace(/^[@|(),-]+/, "").trim();
    if (home.length < 2 || away.length < 2 || home.length > 40 || away.length > 40) return;
    if (!kickoff) {
      const d = lineDate ?? base!;
      const c = clock ?? { h: 0, mi: 0 };
      kickoff = zonedToUtc(d.y, d.m, d.d, c.h, c.mi, opts.tz);
    }
    out.push({ home, away, kickoff, competition: competitionOf(raw) === "League" ? messageComp : competitionOf(raw), line: i, text: raw });
  });
  return out;
}

function partsIn(d: Date, tz: string) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: tz, year: "numeric", month: "numeric", day: "numeric" }).formatToParts(d).map((x) => [x.type, x.value]));
  return { y: +p.year, m: +p.month, d: +p.day };
}

/* ---------- Storage ---------- */

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Finds a team by name or short name, tolerant of case/punctuation; creates it if unknown. */
async function resolveTeam(c: PoolClient, name: string): Promise<number> {
  const teams = (await c.query("select id, name, short_name from teams")).rows as { id: number; name: string; short_name: string | null }[];
  const n = norm(name);
  const exact = teams.find((t) => norm(t.name) === n || (t.short_name && norm(t.short_name) === n));
  if (exact) return exact.id;
  const partial = teams.filter((t) => norm(t.name).includes(n) || n.includes(norm(t.name)));
  if (partial.length === 1) return partial[0].id;
  const { rows } = await c.query("insert into teams (name) values ($1) returning id", [name]);
  return rows[0].id;
}

async function currentSeasonId(c: PoolClient): Promise<number> {
  const s = await c.query("select id from seasons order by is_current desc, id desc limit 1");
  if (s.rows[0]) return s.rows[0].id;
  return (await c.query("insert into seasons (name) values ('Season 1') returning id")).rows[0].id;
}

export async function upsertFixtures(items: (ParsedFixture & { sourceId: string })[]) {
  if (!items.length) return 0;
  const c = await pool.connect();
  let n = 0;
  try {
    await c.query("begin");
    const seasonId = await currentSeasonId(c);
    for (const f of items) {
      const [home, away] = [await resolveTeam(c, f.home), await resolveTeam(c, f.away)];
      if (home === away) continue;
      await c.query(
        `insert into fixtures (season_id, competition, home_team_id, away_team_id, kickoff, source, source_id, source_text)
         values ($1,$2,$3,$4,$5,'discord',$6,$7)
         on conflict (source_id) do update set
           competition = excluded.competition, home_team_id = excluded.home_team_id,
           away_team_id = excluded.away_team_id, kickoff = excluded.kickoff,
           source_text = excluded.source_text, updated_at = now()`,
        [seasonId, f.competition, home, away, f.kickoff, f.sourceId, f.text],
      );
      n++;
    }
    await c.query("commit");
  } catch (e) {
    await c.query("rollback");
    throw e;
  } finally {
    c.release();
  }
  return n;
}

/** Links a reported result to the fixture it fulfils (same teams, kickoff within 36 h). */
export async function linkResultToFixture(c: PoolClient, matchId: number, homeId: number, awayId: number, playedAt: Date | null) {
  await c.query(
    `update fixtures set match_id = $1, updated_at = now()
      where id = (select id from fixtures
                   where match_id is null and home_team_id = $2 and away_team_id = $3
                     and kickoff between coalesce($4, now()) - interval '36 hours' and coalesce($4, now()) + interval '36 hours'
                   order by abs(extract(epoch from kickoff - coalesce($4, now()))) limit 1)`,
    [matchId, homeId, awayId, playedAt],
  );
}

export async function listFixtures(seasonId: number | null, opts: { upcoming?: boolean; limit?: number; teamId?: number } = {}) {
  return query(
    `select f.id, f.kickoff, f.competition, f.match_id, f.source,
            ht.id as home_id, ht.name as home, ht.color as home_color, ht.short_name as home_short,
            at.id as away_id, at.name as away, at.color as away_color, at.short_name as away_short,
            m.home_score, m.away_score
       from fixtures f
       join teams ht on ht.id = f.home_team_id
       join teams at on at.id = f.away_team_id
       left join matches m on m.id = f.match_id
      where ($1::int is null or f.season_id = $1)
        and ($2::boolean is false or (f.match_id is null and f.kickoff > now() - interval '3 hours'))
        and ($4::int is null or f.home_team_id = $4 or f.away_team_id = $4)
      order by f.kickoff ${opts.upcoming ? "asc" : "desc"} limit $3`,
    [seasonId, !!opts.upcoming, opts.limit ?? 200, opts.teamId ?? null],
  );
}

export const getSyncState = (key: string) => queryOne<{ value: string }>("select value from sync_state where key = $1", [key]).then((r) => r?.value ?? null);
export const setSyncState = (key: string, value: string) =>
  query("insert into sync_state (key, value) values ($1,$2) on conflict (key) do update set value = excluded.value", [key, value]);
