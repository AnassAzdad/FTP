import Link from "next/link";
import { notFound } from "next/navigation";
import { SeasonPicker } from "@/components/Ui";
import { getSeasons, playerProfile, resolveSeason } from "@/lib/stats";

export const dynamic = "force-dynamic";

const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "—");

export default async function PlayerPage({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ season?: string; all?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  if (!/^\d+$/.test(id)) notFound();
  const [seasons, season] = await Promise.all([getSeasons(), resolveSeason(sp.season)]);
  const data = await playerProfile(Number(id), sp.all ? null : season?.id ?? null);
  if (!data) notFound();
  const { player: p, totals: t, log } = data;

  const groups: [string, [string, string | number][]][] = [
    ["Attacking", [["Goals", t.goals], ["Assists", t.assists], ["Shots", t.shots], ["On target", t.shots_on_target], ["xG", t.xg.toFixed(1)], ["Dribbles", `${t.dribbles_completed}/${t.dribbles}`]]],
    ["Passing", [["Passes", t.passes], ["Accuracy", pct(t.passes_completed, t.passes)], ["Key passes", t.key_passes], ["Crosses", t.crosses], ["Through balls", t.through_balls]]],
    ["Defending", [["Tackles won", `${t.tackles_won}/${t.tackles}`], ["Interceptions", t.interceptions], ["Clearances", t.clearances], ["Blocks", t.blocks], ["Duels won", pct(t.duels_won, t.duels)]]],
    ["Goalkeeping", [["Saves", t.saves], ["Pens saved", t.penalties_saved], ["Conceded", t.goals_conceded], ["Clean sheets", t.clean_sheets]]],
    ["Discipline", [["Fouls", t.fouls], ["Fouled", t.fouls_suffered], ["Offsides", t.offsides], ["Yellows", t.yellow_cards], ["Reds", t.red_cards], ["Own goals", t.own_goals]]],
  ];

  return (
    <>
      <h1>{p.username}{p.verified_at && <span className="badge">✓ verified</span>}</h1>
      <p className="muted">
        {p.display_name && <>{p.display_name} · </>}
        {p.team_name ? <Link href={`/teams/${p.team_id}`}>{p.team_name}</Link> : "Free agent"}
        {p.position && <> · {p.position}</>}
        {p.discord_name && <> · Discord: {p.discord_name}</>}
      </p>
      <SeasonPicker seasons={seasons} current={season} base={`/players/${id}`} />
      <div className="stats" style={{ marginBottom: 16 }}>
        <div className="stat"><b>{t.apps}</b><span>Appearances</span></div>
        <div className="stat"><b>{t.rating ?? "—"}</b><span>Avg rating</span></div>
        <div className="stat"><b>{t.motm}</b><span>MOTM</span></div>
        <div className="stat"><b>{t.minutes}</b><span>Minutes</span></div>
      </div>
      <div className="grid">
        {groups.map(([name, items]) => (
          <div className="card" key={name}>
            <h2>{name}</h2>
            <div className="stats">{items.map(([l, v]) => <div className="stat" key={l}><b>{v}</b><span>{l}</span></div>)}</div>
          </div>
        ))}
      </div>
      <h2>Match log</h2>
      <div className="card">
        <table>
          <thead><tr><th>Date</th><th>Match</th><th>Pos</th><th className="num">Min</th><th className="num">G</th><th className="num">A</th><th className="num">Rating</th></tr></thead>
          <tbody>
            {log.map((m: any) => (
              <tr key={m.match_id}>
                <td className="muted">{new Date(m.played_at).toLocaleDateString("en-GB")}</td>
                <td><Link href={`/matches/${m.match_id}`}>{m.home} {m.home_score}–{m.away_score} {m.away}</Link></td>
                <td className="muted">{m.position ?? "—"}</td><td className="num">{m.minutes}</td>
                <td className="num">{m.goals}</td><td className="num">{m.assists}</td>
                <td className="num">{Number(m.rating).toFixed(1)}{m.motm && " ⭐"}</td>
              </tr>
            ))}
            {log.length === 0 && <tr><td colSpan={7} className="muted">No matches</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
