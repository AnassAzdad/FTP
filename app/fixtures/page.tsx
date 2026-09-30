import { FixtureList } from "@/components/FixtureList";
import { SeasonPicker } from "@/components/Ui";
import { getSyncState, listFixtures } from "@/lib/fixtures";
import { getSeasons, resolveSeason } from "@/lib/stats";

export const dynamic = "force-dynamic";

export default async function Fixtures({ searchParams }: { searchParams: Promise<{ season?: string; all?: string }> }) {
  const sp = await searchParams;
  const [seasons, season] = await Promise.all([getSeasons(), resolveSeason(sp.season)]);
  const [fixtures, lastRun] = await Promise.all([
    listFixtures(season?.id ?? null, { upcoming: !sp.all }),
    getSyncState("discord:last_run"),
  ]);
  const tz = process.env.LEAGUE_TZ || "UTC";
  return (
    <>
      <h1>Fixtures</h1>
      <p className="muted" style={{ margin: "0 0 12px" }}>
        {season?.name} · times in {tz.replace("_", " ")}
        {lastRun && ` · synced from Discord ${new Date(lastRun).toLocaleString("en-GB", { timeZone: tz })}`}
      </p>
      <SeasonPicker seasons={seasons} current={season} base="/fixtures" />
      <FixtureList fixtures={fixtures} />
    </>
  );
}
