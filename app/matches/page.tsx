import { MatchList, SeasonPicker } from "@/components/Ui";
import { getSeasons, recentMatches, resolveSeason } from "@/lib/stats";

export const dynamic = "force-dynamic";

export default async function Matches({ searchParams }: { searchParams: Promise<{ season?: string }> }) {
  const sp = await searchParams;
  const [seasons, season] = await Promise.all([getSeasons(), resolveSeason(sp.season)]);
  const matches = await recentMatches(season?.id ?? null, 200);
  return (
    <>
      <h1>Results</h1>
      <p className="muted" style={{ margin: "0 0 12px" }}>{matches.length} matches · {season?.name}</p>
      <SeasonPicker seasons={seasons} current={season} base="/matches" />
      <MatchList matches={matches} />
    </>
  );
}
