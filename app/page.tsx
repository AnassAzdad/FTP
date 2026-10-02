import Link from "next/link";
import { FixtureStrip } from "@/components/FixtureList";
import { Crest, Form, Leaderboard, MatchList, Panel, SeasonPicker } from "@/components/Ui";
import { listFixtures } from "@/lib/fixtures";
import { formGuide, getSeasons, leaderboard, recentMatches, resolveSeason, siteTotals, standings } from "@/lib/stats";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: Promise<{ season?: string }> }) {
  const sp = await searchParams;
  const [seasons, season] = await Promise.all([getSeasons(), resolveSeason(sp.season)]);
  const sid = season?.id ?? null;
  const q = sid ? `?season=${sid}` : "";
  const [table, form, matches, totals, upcoming, scorers] = await Promise.all([
    standings(sid), formGuide(sid), recentMatches(sid, 5), siteTotals(sid),
    listFixtures(sid, { upcoming: true, limit: 4 }), leaderboard("goals", sid, 5),
  ]);
  const stripItems = upcoming.length
    ? upcoming.map((f: any) => ({ key: `f${f.id}`, when: f.kickoff, competition: f.competition, home: f.home, away: f.away, home_color: f.home_color, away_color: f.away_color, home_short: f.home_short, away_short: f.away_short }))
    : matches.slice(0, 4).map((m: any) => ({ key: `m${m.id}`, when: m.played_at, competition: m.competition, href: `/matches/${m.id}`, home: m.home, away: m.away, home_color: m.home_color, away_color: m.away_color, home_short: m.home_short, away_short: m.away_short, home_score: m.home_score, away_score: m.away_score }));

  return (
    <>
      <section className="hero">
        <div className="hero-inner">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" />
          <div>
            <h1>Federation of TPS</h1>
            <p>New Era{season ? ` · ${season.name}` : ""}</p>
          </div>
          {totals && totals.matches > 0 && (
            <dl className="hero-stats">
              <div><dt>Matches</dt><dd>{totals.matches}</dd></div>
              <div><dt>Goals</dt><dd>{totals.goals}</dd></div>
              <div><dt>Per match</dt><dd>{(totals.goals / totals.matches).toFixed(1)}</dd></div>
              <div><dt>Players</dt><dd>{totals.players}</dd></div>
            </dl>
          )}
        </div>
      </section>

      <div className="content">
        <SeasonPicker seasons={seasons} current={season} base="/" />

        {stripItems.length > 0 && (
          <section className="section">
            <div className="section-head">
              <h2>{upcoming.length ? "Upcoming fixtures" : "Latest results"}</h2>
              <Link href={upcoming.length ? `/fixtures${q}` : `/matches${q}`}>View all</Link>
            </div>
            <FixtureStrip items={stripItems} />
          </section>
        )}

        <div className="cols section">
          <Panel title="Table" more={`/standings${q}`}>
            <table>
              <thead>
                <tr><th>#</th><th>Team</th><th className="num">P</th><th className="num">GD</th><th className="num">Pts</th><th className="hide-sm">Form</th></tr>
              </thead>
              <tbody>
                {table.slice(0, 8).map((r: any, i: number) => (
                  <tr key={r.id} className={i === 0 ? "qual" : undefined}>
                    <td className="pos">{i + 1}</td>
                    <td className="who"><span className="who-cell"><Crest name={r.name} color={r.color} short={r.short_name} /><Link href={`/teams/${r.id}`} className="name">{r.name}</Link></span></td>
                    <td className="num">{r.played}</td>
                    <td className="num">{r.gd > 0 ? `+${r.gd}` : r.gd}</td>
                    <td className="num"><b>{r.points}</b></td>
                    <td className="hide-sm"><Form results={form[r.id]} /></td>
                  </tr>
                ))}
                {table.length === 0 && <tr><td colSpan={6} className="muted">No matches played yet</td></tr>}
              </tbody>
            </table>
          </Panel>
          <Leaderboard title="Top scorers" unit="Goals" rows={scorers} href={`/stats${q}`} />
        </div>

        <section className="section">
          <MatchList title="Latest results" more={`/matches${q}`} matches={matches} />
        </section>
      </div>
    </>
  );
}
