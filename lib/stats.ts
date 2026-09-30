import { query, queryOne } from "./db";

export type Season = { id: number; name: string };

export async function getSeasons(): Promise<Season[]> {
  return query<Season>("select id, name from seasons order by id desc");
}

/** Resolves ?season=<id>; defaults to the newest season. Null if none exist. */
export async function resolveSeason(param?: string | string[]): Promise<Season | null> {
  const raw = Array.isArray(param) ? param[0] : param;
  const id = raw && /^\d+$/.test(raw) ? Number(raw) : null;
  if (id) {
    const s = await queryOne<Season>("select id, name from seasons where id = $1", [id]);
    if (s) return s;
  }
  return queryOne<Season>("select id, name from seasons order by id desc limit 1");
}

// Whitelisted leaderboard metrics (never interpolate user input into SQL).
export const METRICS = {
  goals:         { title: "Top scorers",        unit: "Goals",         expr: "sum(s.goals)" },
  assists:       { title: "Top assists",        unit: "Assists",       expr: "sum(s.assists)" },
  ga:            { title: "Goals + assists",    unit: "G+A",           expr: "sum(s.goals + s.assists)" },
  rating:        { title: "Best average rating",unit: "Avg rating",    expr: "round(avg(s.rating), 2)", having: "count(*) filter (where s.minutes > 0) >= 3" },
  motm:          { title: "Man of the match",   unit: "MOTM",          expr: "count(*) filter (where m.mvp_player_id = p.id)" },
  clean_sheets:  { title: "Golden glove",       unit: "Clean sheets",  expr: "count(*) filter (where s.position = 'GK' and s.clean_sheet)" },
  saves:         { title: "Most saves",         unit: "Saves",         expr: "sum(s.saves)" },
  key_passes:    { title: "Key passes",         unit: "Key passes",    expr: "sum(s.key_passes)" },
  shots_on_target:{ title: "Shots on target",   unit: "SOT",           expr: "sum(s.shots_on_target)" },
  tackles_won:   { title: "Tackles won",        unit: "Tackles",       expr: "sum(s.tackles_won)" },
  interceptions: { title: "Interceptions",      unit: "Interceptions", expr: "sum(s.interceptions)" },
  yellow_cards:  { title: "Yellow cards",       unit: "Yellows",       expr: "sum(s.yellow_cards)" },
  red_cards:     { title: "Red cards",          unit: "Reds",          expr: "sum(s.red_cards)" },
} as const;
export type MetricKey = keyof typeof METRICS;

export type LeaderRow = {
  id: number; roblox_id: string; username: string; team: string | null; apps: number; value: number;
};

export async function leaderboard(
  metric: MetricKey,
  seasonId: number | null,
  limit = 10,
): Promise<LeaderRow[]> {
  const m = METRICS[metric];
  const having = "having" in m ? m.having : "true";
  return query<LeaderRow>(
    `select p.id, p.roblox_id::text as roblox_id, p.username, t.name as team,
            (count(*) filter (where s.minutes > 0))::int as apps,
            (${m.expr})::float as value
       from player_match_stats s
       join players p on p.id = s.player_id
       join matches m on m.id = s.match_id
       left join teams t on t.id = p.team_id
      where ($1::int is null or m.season_id = $1)
      group by p.id, t.name
     ${having === "true" ? "" : `having ${having}`}
     order by value desc nulls last, apps asc, p.username
      limit $2`,
    [seasonId, limit],
  ).then((rows) => rows.filter((r) => r.value > 0));
}

export async function siteTotals(seasonId: number | null) {
  return queryOne<{ matches: number; goals: number; players: number; teams: number }>(
    `select count(*)::int as matches,
            coalesce(sum(home_score + away_score),0)::int as goals,
            (select count(distinct s.player_id)::int from player_match_stats s join matches m2 on m2.id = s.match_id
              where $1::int is null or m2.season_id = $1) as players,
            (select count(*)::int from teams) as teams
       from matches where $1::int is null or season_id = $1`,
    [seasonId],
  );
}

/** Last 5 results per team, oldest -> newest, as 'W' | 'D' | 'L'. */
export async function formGuide(seasonId: number | null): Promise<Record<number, string[]>> {
  const rows = await query<{ team_id: number; res: string }>(
    `with r as (
       select home_team_id as team_id, played_at, case when home_score > away_score then 'W' when home_score = away_score then 'D' else 'L' end as res
         from matches where $1::int is null or season_id = $1
       union all
       select away_team_id, played_at, case when away_score > home_score then 'W' when home_score = away_score then 'D' else 'L' end
         from matches where $1::int is null or season_id = $1),
     ranked as (select *, row_number() over (partition by team_id order by played_at desc) as rn from r)
     select team_id, res from ranked where rn <= 5 order by team_id, rn desc`,
    [seasonId],
  );
  const out: Record<number, string[]> = {};
  for (const r of rows) (out[r.team_id] ??= []).push(r.res);
  return out;
}

export const POSITION_GROUPS = {
  GK: ["GK"],
  DEF: ["CB", "LB", "RB", "LWB", "RWB"],
  MID: ["CM", "CDM", "CAM"],
  ATT: ["LW", "RW", "ST"],
} as const;

/** Best average-rated players per position group (min 3 appearances). */
export async function bestByGroup(seasonId: number | null, group: keyof typeof POSITION_GROUPS, limit: number) {
  return query<{ id: number; roblox_id: string; username: string; team: string | null; position: string | null; apps: number; rating: number }>(
    `select p.id, p.roblox_id::text as roblox_id, p.username, t.name as team, p.position,
            count(*)::int as apps, round(avg(s.rating), 2)::float as rating
       from player_match_stats s
       join players p on p.id = s.player_id
       join matches m on m.id = s.match_id
       left join teams t on t.id = p.team_id
      where s.minutes > 0 and p.position = any($3::text[]) and ($1::int is null or m.season_id = $1)
      group by p.id, t.name
     having count(*) >= 3
      order by rating desc, apps desc limit $2`,
    [seasonId, limit, [...POSITION_GROUPS[group]]],
  );
}

export async function findPlayerByName(name: string) {
  const n = name.trim();
  if (!n) return null;
  return queryOne<{ id: number }>(
    `select id from players where lower(username) = lower($1) order by id limit 1`,
    [n],
  );
}

export async function allUsernames(): Promise<string[]> {
  return (await query<{ username: string }>("select username from players order by username")).map((r) => r.username);
}

export async function playerList(seasonId: number | null, search?: string) {
  return query(
    `select p.id, p.username, p.display_name, p.position, p.verified_at, t.name as team,
            count(s.*) filter (where s.minutes > 0)::int as apps,
            coalesce(sum(s.goals),0)::int as goals,
            coalesce(sum(s.assists),0)::int as assists,
            round(avg(s.rating) filter (where s.minutes > 0), 2)::float as rating
       from players p
       left join teams t on t.id = p.team_id
       left join player_match_stats s on s.player_id = p.id
       left join matches m on m.id = s.match_id and ($1::int is null or m.season_id = $1)
      where ($2::text is null or p.username ilike '%' || $2 || '%' or p.display_name ilike '%' || $2 || '%')
        and (s.match_id is null or m.id is not null)
      group by p.id, t.name
      order by goals desc, apps desc, p.username
      limit 500`,
    [seasonId, search || null],
  );
}

export async function playerProfile(id: number, seasonId: number | null) {
  const player = await queryOne(
    `select p.*, t.name as team_name, t.id as team_id_ref
       from players p left join teams t on t.id = p.team_id where p.id = $1`,
    [id],
  );
  if (!player) return null;

  const totals = await queryOne(
    `select count(*) filter (where s.minutes > 0)::int as apps,
            coalesce(sum(s.minutes),0)::int as minutes,
            coalesce(sum(s.goals),0)::int as goals,
            coalesce(sum(s.assists),0)::int as assists,
            coalesce(sum(s.shots),0)::int as shots,
            coalesce(sum(s.shots_on_target),0)::int as shots_on_target,
            coalesce(sum(s.xg),0)::float as xg,
            coalesce(sum(s.passes),0)::int as passes,
            coalesce(sum(s.passes_completed),0)::int as passes_completed,
            coalesce(sum(s.key_passes),0)::int as key_passes,
            coalesce(sum(s.crosses),0)::int as crosses,
            coalesce(sum(s.through_balls),0)::int as through_balls,
            coalesce(sum(s.dribbles),0)::int as dribbles,
            coalesce(sum(s.dribbles_completed),0)::int as dribbles_completed,
            coalesce(sum(s.tackles),0)::int as tackles,
            coalesce(sum(s.tackles_won),0)::int as tackles_won,
            coalesce(sum(s.interceptions),0)::int as interceptions,
            coalesce(sum(s.clearances),0)::int as clearances,
            coalesce(sum(s.blocks),0)::int as blocks,
            coalesce(sum(s.duels),0)::int as duels,
            coalesce(sum(s.duels_won),0)::int as duels_won,
            coalesce(sum(s.saves),0)::int as saves,
            coalesce(sum(s.penalties_saved),0)::int as penalties_saved,
            coalesce(sum(s.goals_conceded),0)::int as goals_conceded,
            count(*) filter (where s.position = 'GK' and s.clean_sheet)::int as clean_sheets,
            coalesce(sum(s.fouls),0)::int as fouls,
            coalesce(sum(s.fouls_suffered),0)::int as fouls_suffered,
            coalesce(sum(s.offsides),0)::int as offsides,
            coalesce(sum(s.yellow_cards),0)::int as yellow_cards,
            coalesce(sum(s.red_cards),0)::int as red_cards,
            coalesce(sum(s.own_goals),0)::int as own_goals,
            round(avg(s.rating) filter (where s.minutes > 0), 2)::float as rating,
            count(*) filter (where m.mvp_player_id = $1)::int as motm
       from player_match_stats s join matches m on m.id = s.match_id
      where s.player_id = $1 and ($2::int is null or m.season_id = $2)`,
    [id, seasonId],
  );

  const log = await query(
    `select m.id as match_id, m.played_at, m.home_score, m.away_score, m.competition,
            ht.name as home, at.name as away, s.team_id, s.position, s.minutes,
            s.goals, s.assists, s.rating, (m.mvp_player_id = s.player_id) as motm
       from player_match_stats s
       join matches m on m.id = s.match_id
       join teams ht on ht.id = m.home_team_id
       join teams at on at.id = m.away_team_id
      where s.player_id = $1 and ($2::int is null or m.season_id = $2)
      order by m.played_at desc limit 50`,
    [id, seasonId],
  );

  return { player, totals, log };
}

export async function standings(seasonId: number | null) {
  return query(
    `with results as (
       select home_team_id as team_id, home_score as gf, away_score as ga from matches
        where $1::int is null or season_id = $1
       union all
       select away_team_id, away_score, home_score from matches
        where $1::int is null or season_id = $1)
     select t.id, t.name, t.color,
            count(*)::int as played,
            count(*) filter (where gf > ga)::int as won,
            count(*) filter (where gf = ga)::int as drawn,
            count(*) filter (where gf < ga)::int as lost,
            sum(gf)::int as gf, sum(ga)::int as ga, (sum(gf) - sum(ga))::int as gd,
            (3 * count(*) filter (where gf > ga) + count(*) filter (where gf = ga))::int as points
       from results r join teams t on t.id = r.team_id
      group by t.id order by points desc, gd desc, gf desc, t.name`,
    [seasonId],
  );
}

export async function recentMatches(seasonId: number | null, limit = 30, teamId?: number) {
  return query(
    `select m.id, m.played_at, m.competition, m.home_score, m.away_score,
            ht.name as home, at.name as away, mp.username as mvp
       from matches m
       join teams ht on ht.id = m.home_team_id
       join teams at on at.id = m.away_team_id
       left join players mp on mp.id = m.mvp_player_id
      where ($1::int is null or m.season_id = $1)
        and ($3::int is null or m.home_team_id = $3 or m.away_team_id = $3)
      order by m.played_at desc limit $2`,
    [seasonId, limit, teamId ?? null],
  );
}

export async function matchDetail(id: number) {
  const match = await queryOne(
    `select m.*, ht.name as home, at.name as away, mp.username as mvp, s.name as season
       from matches m
       join teams ht on ht.id = m.home_team_id
       join teams at on at.id = m.away_team_id
       join seasons s on s.id = m.season_id
       left join players mp on mp.id = m.mvp_player_id
      where m.id = $1`,
    [id],
  );
  if (!match) return null;
  const players = await query(
    `select s.*, p.username from player_match_stats s
       join players p on p.id = s.player_id where s.match_id = $1
      order by s.rating desc`,
    [id],
  );
  const events = await query(
    `select e.minute, e.type, e.team_id, p.username as player, r.username as related
       from match_events e
       left join players p on p.id = e.player_id
       left join players r on r.id = e.related_player_id
      where e.match_id = $1 order by e.minute, e.id`,
    [id],
  );
  return { match, players, events };
}

export async function teamList() {
  return query(`select id, name, color, short_name from teams order by name`);
}

export async function teamRoster(teamId: number, seasonId: number | null) {
  const team = await queryOne("select * from teams where id = $1", [teamId]);
  if (!team) return null;
  const roster = await query(
    `select p.id, p.username, p.position, p.verified_at,
            count(s.*) filter (where s.minutes > 0 and m.id is not null)::int as apps,
            coalesce(sum(s.goals) filter (where m.id is not null),0)::int as goals,
            coalesce(sum(s.assists) filter (where m.id is not null),0)::int as assists,
            round(avg(s.rating) filter (where s.minutes > 0 and m.id is not null), 2)::float as rating
       from players p
       left join player_match_stats s on s.player_id = p.id
       left join matches m on m.id = s.match_id and ($2::int is null or m.season_id = $2)
      where p.team_id = $1 group by p.id order by goals desc, p.username`,
    [teamId, seasonId],
  );
  return { team, roster };
}
