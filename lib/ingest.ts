import { z } from "zod";
import type { PoolClient } from "pg";
import { pool } from "./db";
import { computeRating } from "./rating";
import { linkResultToFixture } from "./fixtures";

const n = z.number().int().nonnegative().default(0);

const statsSchema = z
  .object({
    goals: n, assists: n, own_goals: n,
    shots: n, shots_on_target: n, xg: z.number().nonnegative().default(0),
    passes: n, passes_completed: n, key_passes: n, crosses: n, through_balls: n,
    dribbles: n, dribbles_completed: n,
    tackles: n, tackles_won: n, interceptions: n, clearances: n, blocks: n,
    duels: n, duels_won: n,
    saves: n, penalties_saved: n,
    fouls: n, fouls_suffered: n, offsides: n,
    yellow_cards: n, red_cards: n,
    rating: z.number().min(1).max(10).optional(),
  })
  .partial();

const playerSchema = z.object({
  robloxId: z.union([z.number(), z.string()]).transform((v) => BigInt(v).toString()),
  username: z.string().min(1).max(50),
  displayName: z.string().max(50).optional(),
  position: z.string().max(10).optional(),
  minutes: n,
  stats: statsSchema.default({}),
});

const teamSchema = z.object({
  name: z.string().min(1).max(60),
  shortName: z.string().max(6).optional(),
  color: z.string().max(20).optional(),
  score: n,
  players: z.array(playerSchema).max(30),
});

export const matchPayload = z.object({
  matchId: z.string().min(1).max(100), // your game's unique id; re-sending replaces the match
  season: z.string().min(1).max(60),
  competition: z.string().max(60).default("League"),
  playedAt: z.string().datetime().optional(),
  home: teamSchema,
  away: teamSchema,
  events: z
    .array(
      z.object({
        minute: z.number().int().min(0).max(200),
        type: z.string().min(1).max(30),
        team: z.enum(["home", "away"]).optional(),
        robloxId: z.union([z.number(), z.string()]).optional(),
        relatedRobloxId: z.union([z.number(), z.string()]).optional(),
      }),
    )
    .default([]),
});
export type MatchPayload = z.infer<typeof matchPayload>;

async function upsertTeam(c: PoolClient, t: MatchPayload["home"]) {
  const { rows } = await c.query(
    `insert into teams (name, short_name, color) values ($1,$2,$3)
     on conflict (name) do update set
       short_name = coalesce(excluded.short_name, teams.short_name),
       color = coalesce(excluded.color, teams.color)
     returning id`,
    [t.name, t.shortName ?? null, t.color ?? null],
  );
  return rows[0].id as number;
}

async function upsertPlayer(
  c: PoolClient,
  p: MatchPayload["home"]["players"][number],
  teamId: number,
) {
  const { rows } = await c.query(
    `insert into players (roblox_id, username, display_name, team_id, position)
     values ($1,$2,$3,$4,$5)
     on conflict (roblox_id) do update set
       username = excluded.username,
       display_name = coalesce(excluded.display_name, players.display_name),
       team_id = excluded.team_id,
       position = coalesce(excluded.position, players.position)
     returning id`,
    [p.robloxId, p.username, p.displayName ?? null, teamId, p.position ?? null],
  );
  return rows[0].id as number;
}

/** Stores one match atomically. Re-sending the same matchId replaces it. */
export async function ingestMatch(payload: MatchPayload) {
  const c = await pool.connect();
  try {
    await c.query("begin");

    const season = await c.query(
      `insert into seasons (name) values ($1)
       on conflict (name) do update set name = excluded.name returning id`,
      [payload.season],
    );
    const seasonId = season.rows[0].id as number;

    await c.query("delete from matches where external_id = $1", [payload.matchId]);

    const homeId = await upsertTeam(c, payload.home);
    const awayId = await upsertTeam(c, payload.away);

    const match = await c.query(
      `insert into matches (external_id, season_id, competition, home_team_id,
         away_team_id, home_score, away_score, played_at)
       values ($1,$2,$3,$4,$5,$6,$7,coalesce($8, now())) returning id`,
      [payload.matchId, seasonId, payload.competition, homeId, awayId,
       payload.home.score, payload.away.score, payload.playedAt ?? null],
    );
    const matchId = match.rows[0].id as number;
    await linkResultToFixture(c, matchId, homeId, awayId, payload.playedAt ? new Date(payload.playedAt) : null);

    const idByRoblox = new Map<string, number>();
    let best: { id: number; rating: number } | null = null;

    for (const side of ["home", "away"] as const) {
      const team = payload[side];
      const other = payload[side === "home" ? "away" : "home"];
      const teamId = side === "home" ? homeId : awayId;

      for (const p of team.players) {
        const playerId = await upsertPlayer(c, p, teamId);
        idByRoblox.set(p.robloxId, playerId);

        const s = p.stats;
        const d = (k: keyof typeof s) => (s[k] as number | undefined) ?? 0;
        const cleanSheet = p.minutes > 0 && other.score === 0;
        const conceded = p.minutes > 0 ? other.score : 0;
        const rating =
          s.rating ??
          computeRating({
            position: p.position, minutes: p.minutes,
            goals: d("goals"), assists: d("assists"), own_goals: d("own_goals"),
            shots_on_target: d("shots_on_target"), key_passes: d("key_passes"),
            passes: d("passes"), passes_completed: d("passes_completed"),
            tackles_won: d("tackles_won"), interceptions: d("interceptions"),
            clearances: d("clearances"), blocks: d("blocks"),
            dribbles_completed: d("dribbles_completed"),
            saves: d("saves"), penalties_saved: d("penalties_saved"),
            goals_conceded: conceded, clean_sheet: cleanSheet,
            fouls: d("fouls"), yellow_cards: d("yellow_cards"), red_cards: d("red_cards"),
            team_won: team.score > other.score, team_lost: team.score < other.score,
          });
        if (p.minutes > 0 && (!best || rating > best.rating)) best = { id: playerId, rating };

        await c.query(
          `insert into player_match_stats (
             match_id, player_id, team_id, position, minutes, goals, assists, own_goals,
             shots, shots_on_target, xg, passes, passes_completed, key_passes, crosses,
             through_balls, dribbles, dribbles_completed, tackles, tackles_won,
             interceptions, clearances, blocks, duels, duels_won, saves, penalties_saved,
             goals_conceded, clean_sheet, fouls, fouls_suffered, offsides, yellow_cards,
             red_cards, rating)
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
                   $21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35)`,
          [matchId, playerId, teamId, p.position ?? null, p.minutes,
           d("goals"), d("assists"), d("own_goals"), d("shots"), d("shots_on_target"),
           d("xg"), d("passes"), d("passes_completed"), d("key_passes"), d("crosses"),
           d("through_balls"), d("dribbles"), d("dribbles_completed"), d("tackles"),
           d("tackles_won"), d("interceptions"), d("clearances"), d("blocks"),
           d("duels"), d("duels_won"), d("saves"), d("penalties_saved"),
           conceded, cleanSheet, d("fouls"), d("fouls_suffered"), d("offsides"),
           d("yellow_cards"), d("red_cards"), rating],
        );
      }
    }

    for (const e of payload.events) {
      const key = e.robloxId !== undefined ? BigInt(e.robloxId).toString() : null;
      const rel = e.relatedRobloxId !== undefined ? BigInt(e.relatedRobloxId).toString() : null;
      await c.query(
        `insert into match_events (match_id, minute, type, team_id, player_id, related_player_id)
         values ($1,$2,$3,$4,$5,$6)`,
        [matchId, e.minute, e.type,
         e.team ? (e.team === "home" ? homeId : awayId) : null,
         key ? idByRoblox.get(key) ?? null : null,
         rel ? idByRoblox.get(rel) ?? null : null],
      );
    }

    if (best) await c.query("update matches set mvp_player_id = $1 where id = $2", [best.id, matchId]);

    await c.query("commit");
    return { matchId, players: idByRoblox.size };
  } catch (err) {
    await c.query("rollback");
    throw err;
  } finally {
    c.release();
  }
}
