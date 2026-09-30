import Link from "next/link";
import { Leaderboard, MatchList, SeasonPicker } from "@/components/Ui";
import { METRICS, getSeasons, leaderboard, recentMatches, resolveSeason, siteTotals, type MetricKey } from "@/lib/stats";

export const dynamic = "force-dynamic";

const HOME: MetricKey[] = ["goals", "assists", "rating", "clean_sheets", "motm", "tackles_won"];

export default async function Home({ searchParams }: { searchParams: Promise<{ season?: string }> }) {
  const sp = await searchParams;
  const [seasons, season] = await Promise.all([getSeasons(), resolveSeason(sp.season)]);
  const sid = season?.id ?? null;
  const boards = await Promise.all(HOME.map((k) => leaderboard(k, sid, 5)));
  const matches = await recentMatches(sid, 8);
  const totals = await siteTotals(sid);

  return (
    <>
      <h1>{season?.name ?? "FTP"} <span className="muted">leaders</span></h1>
      <SeasonPicker seasons={seasons} current={season} base="/" />
      {totals && (
        <div className="stats" style={{ margin: "16px 0" }}>
          <div className="stat"><b>{totals.matches}</b><span>Matches played</span></div>
          <div className="stat"><b>{totals.goals}</b><span>Goals scored</span></div>
          <div className="stat"><b>{totals.matches ? (totals.goals / totals.matches).toFixed(2) : "0"}</b><span>Goals per match</span></div>
          <div className="stat"><b>{totals.players}</b><span>Players</span></div>
        </div>
      )}
      <div className="grid">
        {HOME.map((k, i) => (
          <Leaderboard key={k} title={METRICS[k].title} unit={METRICS[k].unit} rows={boards[i]}
            href={`/leaderboards/${k}${sid ? `?season=${sid}` : ""}`} />
        ))}
      </div>
      <h2>Recent matches · <Link href="/matches">all</Link></h2>
      <MatchList matches={matches} />
    </>
  );
}
