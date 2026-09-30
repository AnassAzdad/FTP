import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { SeasonPicker } from "@/components/Ui";
import { METRICS, bestByGroup, getSeasons, leaderboard, resolveSeason, type MetricKey } from "@/lib/stats";

export const dynamic = "force-dynamic";

const AWARDS: [string, MetricKey][] = [
  ["🥇 Golden Boot", "goals"], ["🎯 Playmaker", "assists"], ["🧤 Golden Glove", "clean_sheets"],
  ["⭐ Player of the Season", "rating"], ["🏅 Most MOTMs", "motm"], ["🛡️ Iron Wall", "tackles_won"],
];

export default async function Awards({ searchParams }: { searchParams: Promise<{ season?: string }> }) {
  const sp = await searchParams;
  const [seasons, season] = await Promise.all([getSeasons(), resolveSeason(sp.season)]);
  const sid = season?.id ?? null;
  const winners = await Promise.all(AWARDS.map(([, k]) => leaderboard(k, sid, 1)));
  const [gk, def, mid, att] = await Promise.all([
    bestByGroup(sid, "GK", 1), bestByGroup(sid, "DEF", 4), bestByGroup(sid, "MID", 3), bestByGroup(sid, "ATT", 3),
  ]);
  const lines = [att, mid, def, gk].filter((l) => l.length);

  return (
    <>
      <h1>Awards</h1>
      <p className="muted">{season?.name}</p>
      <SeasonPicker seasons={seasons} current={season} base="/awards" />
      <div className="grid">
        {AWARDS.map(([title, k], i) => {
          const w = winners[i][0];
          return (
            <div className="card" key={k}>
              <h2>{title}</h2>
              {w ? (
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <Avatar robloxId={w.roblox_id} name={w.username} size={56} />
                  <div>
                    <Link href={`/players/${w.id}`}><b style={{ fontSize: 18 }}>{w.username}</b></Link>
                    <div className="muted">{w.team ?? "Free agent"}</div>
                    <div>{w.value} {METRICS[k].unit.toLowerCase()}</div>
                  </div>
                </div>
              ) : <span className="muted">Not awarded yet</span>}
            </div>
          );
        })}
      </div>
      <h2>Team of the Season <span className="muted">(4-3-3, best average rating, min 3 apps)</span></h2>
      <div className="card" style={{ display: "grid", gap: 18, padding: 24, background: "linear-gradient(#14351f,#0f2a19)" }}>
        {lines.map((line, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-evenly", flexWrap: "wrap", gap: 12 }}>
            {line.map((p) => (
              <Link key={p.id} href={`/players/${p.id}`} style={{ textAlign: "center", minWidth: 100 }}>
                <Avatar robloxId={p.roblox_id} name={p.username} size={52} />
                <div><b>{p.username}</b></div>
                <div className="muted" style={{ fontSize: 12 }}>{p.rating} · {p.position}</div>
              </Link>
            ))}
          </div>
        ))}
        {lines.length === 0 && <span className="muted">Not enough matches yet.</span>}
      </div>
    </>
  );
}
