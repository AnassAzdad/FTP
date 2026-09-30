import Link from "next/link";
import { notFound } from "next/navigation";
import { Crest, Panel, PlayerCell, Rating } from "@/components/Ui";
import { matchDetail } from "@/lib/stats";

export const dynamic = "force-dynamic";

const EVENT: Record<string, string> = {
  goal: "Goal", penalty_goal: "Goal (pen)", own_goal: "Own goal", yellow_card: "Yellow card", red_card: "Red card", sub: "Substitution",
};

function Lineup({ title, players }: { title: string; players: any[] }) {
  return (
    <Panel title={title}>
      <table>
        <thead><tr><th>Player</th><th>Pos</th><th className="num">Min</th><th className="num">G</th><th className="num">A</th><th className="num">Sh</th><th className="num">Tkl</th><th className="num">Sv</th><th className="num">Rating</th></tr></thead>
        <tbody>
          {players.map((p) => (
            <tr key={p.player_id}>
              <td className="who"><PlayerCell id={p.player_id} roblox_id={p.roblox_id} username={p.username} /></td>
              <td className="muted">{p.position ?? "–"}</td><td className="num">{p.minutes}</td>
              <td className="num">{p.goals}</td><td className="num">{p.assists}</td><td className="num">{p.shots}</td>
              <td className="num">{p.tackles_won}</td><td className="num">{p.saves}</td>
              <td className="num"><Rating value={p.rating} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}

export default async function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  const data = await matchDetail(Number(id));
  if (!data) notFound();
  const { match: m, players, events } = data;
  const home = players.filter((p: any) => p.team_id === m.home_team_id);
  const away = players.filter((p: any) => p.team_id === m.away_team_id);

  return (
    <>
      <p className="muted" style={{ margin: "0 0 10px" }}>
        {m.season} · {m.competition} · {new Date(m.played_at).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
      </p>
      <section className="panel">
        <div className="match-head">
          <Link href={`/teams/${m.home_team_id}`} className="side"><Crest name={m.home} color={m.home_color} short={m.home_short} lg />{m.home}</Link>
          <div className="big">{m.home_score} – {m.away_score}</div>
          <Link href={`/teams/${m.away_team_id}`} className="side"><Crest name={m.away} color={m.away_color} short={m.away_short} lg />{m.away}</Link>
        </div>
        {m.mvp && (
          <div style={{ borderTop: "1px solid var(--line)", padding: "10px 16px", textAlign: "center" }}>
            Player of the match: <Link href={`/players/${m.mvp_id}`}><b>{m.mvp}</b></Link>
          </div>
        )}
      </section>

      <div style={{ height: 16 }} />
      <div className="stack">
        {events.length > 0 && (
          <Panel title="Events">
            <table>
              <tbody>
                {events.map((e: any, i: number) => (
                  <tr key={i}>
                    <td className="muted" style={{ width: 50 }}>{e.minute}&rsquo;</td>
                    <td style={{ width: 120 }}>{EVENT[e.type] ?? e.type}</td>
                    <td>{e.player ?? "–"}{e.related && <span className="muted"> (assist: {e.related})</span>}</td>
                    <td className="muted">{e.team_id === m.home_team_id ? m.home : e.team_id === m.away_team_id ? m.away : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        )}
        <Lineup title={m.home} players={home} />
        <Lineup title={m.away} players={away} />
      </div>
    </>
  );
}
