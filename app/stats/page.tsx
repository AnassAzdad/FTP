import { Leaderboard, SeasonPicker } from "@/components/Ui";
import { METRICS, getSeasons, leaderboard, resolveSeason, type MetricKey } from "@/lib/stats";

export const dynamic = "force-dynamic";

export default async function Stats({ searchParams }: { searchParams: Promise<{ season?: string }> }) {
  const sp = await searchParams;
  const [seasons, season] = await Promise.all([getSeasons(), resolveSeason(sp.season)]);
  const sid = season?.id ?? null;
  const keys = Object.keys(METRICS) as MetricKey[];
  const boards = await Promise.all(keys.map((k) => leaderboard(k, sid, 5)));
  return (
    <>
      <h1>Player stats</h1>
      <p className="muted" style={{ margin: "0 0 12px" }}>{season?.name} · top five in each category</p>
      <SeasonPicker seasons={seasons} current={season} base="/stats" />
      <div className="cols-3">
        {keys.map((k, i) => (
          <Leaderboard key={k} title={METRICS[k].title} unit={METRICS[k].unit} rows={boards[i]} href={`/leaderboards/${k}${sid ? `?season=${sid}` : ""}`} />
        ))}
      </div>
    </>
  );
}
