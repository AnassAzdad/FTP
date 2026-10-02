import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { Panel, Rating, SeasonPicker } from "@/components/Ui";
import { METRICS, bestByGroup, getSeasons, leaderboard, resolveSeason, type MetricKey } from "@/lib/stats";

export const dynamic = "force-dynamic";

const AWARDS: [string, MetricKey][] = [
  ["Golden Boot", "goals"], ["Most assists", "assists"], ["Golden Glove", "clean_sheets"],
  ["Player of the Season", "rating"], ["Most player-of-the-match awards", "motm"], ["Most tackles won", "tackles_won"],
];

export default async function Awards({ searchParams }: { searchParams: Promise<{ season?: string }> }) {
  const sp = await searchParams;
  const [seasons, season] = await Promise.all([getSeasons(), resolveSeason(sp.season)]);
  const sid = season?.id ?? null;
  const [winners, gk, def, mid, att] = await Promise.all([
    Promise.all(AWARDS.map(([, k]) => leaderboard(k, sid, 3))),
    bestByGroup(sid, "GK", 1), bestByGroup(sid, "DEF", 4), bestByGroup(sid, "MID", 3), bestByGroup(sid, "ATT", 3),
  ]);
  const lines = [att, mid, def, gk].filter((l) => l.length);

  return (
    <>
      <h1>Awards</h1>
      <p className="muted" style={{ margin: "0 0 12px" }}>{season?.name} · standings as of the latest match</p>
      <SeasonPicker seasons={seasons} current={season} base="/awards" />
      <div className="cols-3">
        {AWARDS.map(([title, k], i) => (
          <Panel key={k} title={title}>
            <table>
              <tbody>
                {winners[i].map((w, j) => (
                  <tr key={w.id}>
                    <td className="rank">{j + 1}</td>
                    <td className="who">
                      <div className="who-cell">
                        <Avatar robloxId={w.roblox_id} name={w.username} size={j === 0 ? 34 : 26} />
                        <div><Link href={`/players/${w.id}`} className="name">{w.username}</Link><div className="sub">{w.team ?? "Free agent"}</div></div>
                      </div>
                    </td>
                    <td className="num"><b>{k === "rating" ? <Rating value={w.value} /> : w.value}</b> <span className="muted small">{k === "rating" ? "" : METRICS[k].unit.toLowerCase()}</span></td>
                  </tr>
                ))}
                {winners[i].length === 0 && <tr><td className="muted">Not awarded yet</td></tr>}
              </tbody>
            </table>
          </Panel>
        ))}
      </div>
      <div style={{ height: 16 }} />
      <Panel title="Team of the Season" pad>
        <p className="muted small" style={{ margin: "0 0 12px" }}>4-3-3 · highest average rating in each position, minimum 3 appearances</p>
        {lines.length ? (
          <div className="pitch">
            {lines.map((line, i) => (
              <div key={i} className="line">
                {line.map((p) => (
                  <Link key={p.id} href={`/players/${p.id}`}>
                    <Avatar robloxId={p.roblox_id} name={p.username} size={44} />
                    {p.username}
                    <span className="sub">{p.position} · {p.rating.toFixed(2)}</span>
                  </Link>
                ))}
              </div>
            ))}
          </div>
        ) : <span className="muted">Not enough matches yet.</span>}
      </Panel>
    </>
  );
}
