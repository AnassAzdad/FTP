import "dotenv/config";
import { ingestMatch, matchPayload } from "../lib/ingest";
import { pool } from "../lib/db";

// Deterministic PRNG so the sample data is reproducible.
let seed = 42;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
const int = (max: number) => Math.floor(rnd() * (max + 1));

const TEAMS = ["Red Lions", "Blue Hawks", "Green Wolves", "Gold Eagles", "Black Panthers", "White Sharks"];
const COLORS = ["#e53935", "#1e88e5", "#43a047", "#fdd835", "#212121", "#eceff1"];
const POSITIONS = ["GK", "CB", "CB", "LB", "RB", "CM", "CM", "CAM", "LW", "RW", "ST", "ST"];

const squads = TEAMS.map((name, t) => ({
  name, color: COLORS[t],
  players: POSITIONS.map((position, i) => ({
    robloxId: 1_000_000 + t * 100 + i,
    username: `${name.split(" ")[0]}${position}${i}`,
    position,
  })),
}));

function side(squad: (typeof squads)[number], goalsFor: number, goalsAgainst: number) {
  const scorers = Array.from({ length: goalsFor }, () => squad.players[6 + int(5)]);
  const players = squad.players.map((p) => {
    const gk = p.position === "GK";
    const att = ["ST", "LW", "RW", "CAM"].includes(p.position);
    const def = ["CB", "LB", "RB"].includes(p.position);
    const goals = scorers.filter((s) => s === p).length;
    const passes = 20 + int(40);
    return {
      robloxId: p.robloxId, username: p.username, position: p.position, minutes: 90,
      stats: {
        goals, assists: rnd() < 0.15 ? 1 : 0,
        shots: att ? goals + int(4) : int(2), shots_on_target: att ? goals + int(2) : 0,
        xg: att ? Number((rnd() * 0.9).toFixed(2)) : 0,
        passes, passes_completed: Math.floor(passes * (0.6 + rnd() * 0.35)),
        key_passes: att || p.position === "CAM" ? int(3) : int(1),
        crosses: ["LB", "RB", "LW", "RW"].includes(p.position) ? int(4) : 0,
        dribbles: att ? int(6) : int(2), dribbles_completed: att ? int(4) : int(1),
        tackles: def ? 2 + int(5) : int(3), tackles_won: def ? 1 + int(4) : int(2),
        interceptions: def ? int(4) : int(2), clearances: def ? int(6) : 0, blocks: def ? int(3) : 0,
        duels: 3 + int(8), duels_won: int(6),
        saves: gk ? int(6) + goalsAgainst : 0, fouls: int(3), fouls_suffered: int(3),
        offsides: att ? int(2) : 0, yellow_cards: rnd() < 0.08 ? 1 : 0, red_cards: rnd() < 0.01 ? 1 : 0,
      },
    };
  });
  const events = scorers.map((s) => ({ minute: 1 + int(89), type: "goal", robloxId: s.robloxId }));
  return { players, events };
}

async function main() {
  await pool.query("truncate match_events, player_match_stats, matches, players, teams, seasons restart identity cascade");
  let n = 0;
  const start = Date.now() - 60 * 24 * 3600 * 1000;
  for (let round = 0; round < 2; round++) {
    for (let a = 0; a < squads.length; a++) {
      for (let b = a + 1; b < squads.length; b++) {
        const [home, away] = round === 0 ? [a, b] : [b, a];
        const hg = int(4), ag = int(3);
        const h = side(squads[home], hg, ag), w = side(squads[away], ag, hg);
        const payload = matchPayload.parse({
          matchId: `seed-${n}`, season: "Season 1", competition: "League",
          playedAt: new Date(start + n * 2 * 24 * 3600 * 1000).toISOString(),
          home: { name: squads[home].name, color: squads[home].color, score: hg, players: h.players },
          away: { name: squads[away].name, color: squads[away].color, score: ag, players: w.players },
          events: [
            ...h.events.map((e) => ({ ...e, team: "home" })),
            ...w.events.map((e) => ({ ...e, team: "away" })),
          ].sort((x, y) => x.minute - y.minute),
        });
        await ingestMatch(payload);
        n++;
      }
    }
  }
  console.log(`Seeded ${n} matches.`);
  await pool.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
