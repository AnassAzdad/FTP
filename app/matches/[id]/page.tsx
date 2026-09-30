import Link from "next/link";
import { notFound } from "next/navigation";
import { matchDetail } from "@/lib/stats";

export const dynamic = "force-dynamic";

const ICON: Record<string, string> = {
  goal: "⚽", penalty_goal: "⚽ (pen)", own_goal: "⚽ (og)", yellow_card: "🟨", red_card: "🟥", sub: "🔁",
};

export default async function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  const data = await matchDetail(Number(id));
  if (!data) notFound();
  const { match: m, players, events } = data;
  return (
    <>
      <p className="muted">{m.season} · {m.competition} · {new Date(m.played_at).toLocaleString("en-GB")}</p>
      <div className="card score">{m.home} {m.home_score} – {m.away_score} {m.away}</div>
      {m.mvp && <p style={{ textAlign: "center" }}>⭐ Man of the match: <b>{m.mvp}</b></p>}
      {events.length > 0 && (
        <>
          <h2>Timeline</h2>
          <div className="card">
            <table><tbody>
              {events.map((e: any, i: number) => (
                <tr key={i}>
                  <td className="muted" style={{ width: 50 }}>{e.minute}'</td>
                  <td style={{ width: 90 }}>{ICON[e.type] ?? e.type}</td>
                  <td>{e.player ?? "—"}{e.related && <span className="muted"> ({e.related})</span>}</td>
                </tr>
              ))}
            </tbody></table>
          </div>
        </>
      )}
      <h2 style={{ marginTop: 24 }}>Player ratings</h2>
      <div className="card">
        <table>
          <thead><tr><th>Player</th><th>Pos</th><th className="num">Min</th><th className="num">G</th><th className="num">A</th><th className="num">Sh</th><th className="num">Tkl</th><th className="num">Sv</th><th className="num">Rating</th></tr></thead>
          <tbody>
            {players.map((p: any) => (
              <tr key={p.player_id}>
                <td><Link href={`/players/${p.player_id}`}>{p.username}</Link></td>
                <td className="muted">{p.position ?? "—"}</td><td className="num">{p.minutes}</td>
                <td className="num">{p.goals}</td><td className="num">{p.assists}</td><td className="num">{p.shots}</td>
                <td className="num">{p.tackles_won}</td><td className="num">{p.saves}</td>
                <td className="num"><b>{Number(p.rating).toFixed(1)}</b></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
