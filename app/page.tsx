import Link from "next/link";
import { Crest, Form, Leaderboard, MatchList, Panel, SeasonPicker } from "@/components/Ui";
import { METRICS, formGuide, getSeasons, leaderboard, recentMatches, resolveSeason, siteTotals, standings, type MetricKey } from "@/lib/stats";

export const dynamic = "force-dynamic";

const TOP: MetricKey[] = ["goals", "assists", "rating"];

export default async function Home({ searchParams }: { searchParams: Promise<{ season?: string }> }) {
  const sp = await searchParams;
  const [seasons, season] = await Promise.all([getSeasons(), resolveSeason(sp.season)]);
  const sid = season?.id ?? null;
  const q = sid ? `?season=${sid}` : "";
  const [table, form, matches, totals, ...boards] = await Promise.all([
    standings(sid), formGuide(sid), recentMatches(sid, 6), siteTotals(sid),
    ...TOP.map((k) => leaderboard(k, sid, 5)),
  ]);

  return (
    <>
      <div className="page-head">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="" />
        <div>
          <h1>Federation of TPS</h1>
          <p>
            New Era{season ? ` · ${season.name}` : ""}
            {totals && totals.matches > 0 && ` · ${totals.matches} matches · ${totals.goals} goals · ${totals.players} players`}
          </p>
        </div>
      </div>
      <SeasonPicker seasons={seasons} current={season} base="/" />

      <div className="cols">
        <div className="stack">
          <Panel title="Table" more={`/standings${q}`}>
            <table>
              <thead>
                <tr><th>#</th><th>Team</th><th className="num">P</th><th className="num">W</th><th className="num">D</th><th className="num">L</th><th className="num">GD</th><th className="num">Pts</th><th className="hide-sm">Form</th></tr>
              </thead>
              <tbody>
                {table.map((r: any, i: number) => (
                  <tr key={r.id} className={i === 0 ? "qual" : undefined}>
                    <td className="pos">{i + 1}</td>
                    <td className="who"><span className="who-cell"><Crest name={r.name} color={r.color} short={r.short_name} /><Link href={`/teams/${r.id}`} className="name">{r.name}</Link></span></td>
                    <td className="num">{r.played}</td><td className="num">{r.won}</td><td className="num">{r.drawn}</td><td className="num">{r.lost}</td>
                    <td className="num">{r.gd > 0 ? `+${r.gd}` : r.gd}</td><td className="num"><b>{r.points}</b></td>
                    <td className="hide-sm"><Form results={form[r.id]} /></td>
                  </tr>
                ))}
                {table.length === 0 && <tr><td colSpan={9} className="muted">No matches played yet</td></tr>}
              </tbody>
            </table>
          </Panel>
          <MatchList title="Latest results" more={`/matches${q}`} matches={matches} />
        </div>
        <div className="stack">
          {TOP.map((k, i) => (
            <Leaderboard key={k} title={METRICS[k].title} unit={METRICS[k].unit} rows={boards[i]} href={`/leaderboards/${k}${q}`} />
          ))}
          <Panel title="More stats" pad>
            <div className="kv">
              {(Object.keys(METRICS) as MetricKey[]).filter((k) => !TOP.includes(k)).map((k) => (
                <div key={k}><span><Link href={`/leaderboards/${k}${q}`}>{METRICS[k].title}</Link></span><span className="muted">›</span></div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}
