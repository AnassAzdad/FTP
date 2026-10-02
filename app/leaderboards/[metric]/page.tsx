import { notFound } from "next/navigation";
import { Leaderboard, SeasonPicker } from "@/components/Ui";
import { METRICS, getSeasons, leaderboard, resolveSeason, type MetricKey } from "@/lib/stats";

export const dynamic = "force-dynamic";

export default async function Page({ params, searchParams }: {
  params: Promise<{ metric: string }>; searchParams: Promise<{ season?: string }>;
}) {
  const { metric } = await params;
  if (!(metric in METRICS)) notFound();
  const sp = await searchParams;
  const [seasons, season] = await Promise.all([getSeasons(), resolveSeason(sp.season)]);
  const m = METRICS[metric as MetricKey];
  const rows = await leaderboard(metric as MetricKey, season?.id ?? null, 50);
  return (
    <>
      <h1>{m.title}</h1>
      <p className="muted" style={{ margin: "0 0 12px" }}>{season?.name}{metric === "rating" && " · minimum 3 appearances"}</p>
      <SeasonPicker seasons={seasons} current={season} base={`/leaderboards/${metric}`} />
      <Leaderboard title={m.title} unit={m.unit} rows={rows} />
    </>
  );
}
