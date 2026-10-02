import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { Panel, Rating, SeasonPicker } from "@/components/Ui";
import { getSeasons, playerProfile, resolveSeason } from "@/lib/stats";

export const dynamic = "force-dynamic";

const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "–");
const per90 = (v: number, mins: number) => (mins ? (v / (mins / 90)).toFixed(2) : "–");

export default async function PlayerPage({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ season?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  if (!/^\d+$/.test(id)) notFound();
  const [seasons, season] = await Promise.all([getSeasons(), resolveSeason(sp.season)]);
  const data = await playerProfile(Number(id), season?.id ?? null);
  if (!data) notFound();
  const { player: p, totals: t, log } = data;
  const gk = p.position === "GK";

  const sections: [string, [string, string | number][]][] = [
    ["Attacking", [
      ["Goals", t.goals], ["Assists", t.assists], ["Goals per 90", per90(t.goals, t.minutes)],
      ["Shots", t.shots], ["Shots on target", t.shots_on_target], ["Shot accuracy", pct(t.shots_on_target, t.shots)],
      ["Expected goals (xG)", t.xg.toFixed(2)], ["Dribbles completed", `${t.dribbles_completed} / ${t.dribbles}`], ["Offsides", t.offsides],
    ]],
    ["Passing", [
      ["Passes", t.passes], ["Pass accuracy", pct(t.passes_completed, t.passes)], ["Key passes", t.key_passes],
      ["Crosses", t.crosses], ["Through balls", t.through_balls],
    ]],
    ["Defending", [
      ["Tackles won", `${t.tackles_won} / ${t.tackles}`], ["Tackle success", pct(t.tackles_won, t.tackles)], ["Interceptions", t.interceptions],
      ["Clearances", t.clearances], ["Blocks", t.blocks], ["Duels won", pct(t.duels_won, t.duels)],
    ]],
    gk
      ? ["Goalkeeping", [["Saves", t.saves], ["Penalties saved", t.penalties_saved], ["Goals conceded", t.goals_conceded], ["Clean sheets", t.clean_sheets], ["Goals conceded per 90", per90(t.goals_conceded, t.minutes)]]]
      : ["Discipline", [["Fouls committed", t.fouls], ["Fouls suffered", t.fouls_suffered], ["Yellow cards", t.yellow_cards], ["Red cards", t.red_cards], ["Own goals", t.own_goals]]],
  ];
  if (gk) sections.push(["Discipline", [["Fouls committed", t.fouls], ["Yellow cards", t.yellow_cards], ["Red cards", t.red_cards]]]);

  return (
    <>
      <section className="panel profile">
        <Avatar robloxId={p.roblox_id} name={p.username} size={64} />
        <div className="meta">
          <h1 style={{ margin: 0 }}>{p.username}{p.verified_at && <span className="verified" title="Verified via Discord">✓</span>}</h1>
          <p>
            {p.team_name ? <Link href={`/teams/${p.team_id}`}>{p.team_name}</Link> : "Free agent"}
            {p.position && ` · ${p.position}`}
            {p.display_name && p.display_name !== p.username && ` · ${p.display_name}`}
            {p.discord_name && ` · Discord: ${p.discord_name}`}
          </p>
          <p><Link href={`/compare?a=${encodeURIComponent(p.username)}`}>Compare with another player</Link></p>
        </div>
        <div className="side">
          <div><Rating value={t.rating} lg /><span style={{ display: "block", marginTop: 4 }}>Avg rating</span></div>
          <div><b>{t.apps}</b><span>Apps</span></div>
          <div><b>{gk ? t.clean_sheets : t.goals}</b><span>{gk ? "Clean sheets" : "Goals"}</span></div>
          <div><b>{gk ? t.saves : t.assists}</b><span>{gk ? "Saves" : "Assists"}</span></div>
          <div><b>{t.motm}</b><span>MOTM</span></div>
        </div>
      </section>
      <div style={{ height: 16 }} />
      <SeasonPicker seasons={seasons} current={season} base={`/players/${id}`} />

      <div className="cols-3">
        {sections.map(([name, items]) => (
          <Panel key={name} title={name} pad>
            <div className="kv">
              {items.map(([l, v]) => <div key={l}><span>{l}</span><span>{v}</span></div>)}
            </div>
          </Panel>
        ))}
      </div>

      <div style={{ height: 16 }} />
      <Panel title="Match log">
        <table>
          <thead><tr><th>Date</th><th>Match</th><th>Pos</th><th className="num">Min</th><th className="num">G</th><th className="num">A</th><th className="num">Rating</th></tr></thead>
          <tbody>
            {log.map((m: any) => (
              <tr key={m.match_id}>
                <td className="muted">{new Date(m.played_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</td>
                <td><Link href={`/matches/${m.match_id}`}>{m.home} <b>{m.home_score}–{m.away_score}</b> {m.away}</Link>{m.motm && <span className="muted small"> · MOTM</span>}</td>
                <td className="muted">{m.position ?? "–"}</td><td className="num">{m.minutes}</td>
                <td className="num">{m.goals}</td><td className="num">{m.assists}</td>
                <td className="num"><Rating value={m.rating} /></td>
              </tr>
            ))}
            {log.length === 0 && <tr><td colSpan={7} className="muted">No matches this season</td></tr>}
          </tbody>
        </table>
      </Panel>
    </>
  );
}
