import Link from "next/link";
import { notFound } from "next/navigation";
import { MatchList, SeasonPicker } from "@/components/Ui";
import { getSeasons, recentMatches, resolveSeason, teamRoster } from "@/lib/stats";

export const dynamic = "force-dynamic";

export default async function TeamPage({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ season?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  if (!/^\d+$/.test(id)) notFound();
  const [seasons, season] = await Promise.all([getSeasons(), resolveSeason(sp.season)]);
  const data = await teamRoster(Number(id), season?.id ?? null);
  if (!data) notFound();
  const matches = await recentMatches(season?.id ?? null, 10, Number(id));
  return (
    <>
      <h1>{data.team.name}</h1>
      <SeasonPicker seasons={seasons} current={season} base={`/teams/${id}`} />
      <h2>Squad</h2>
      <div className="card">
        <table>
          <thead><tr><th>Player</th><th>Pos</th><th className="num">Apps</th><th className="num">G</th><th className="num">A</th><th className="num">Rating</th></tr></thead>
          <tbody>
            {data.roster.map((p: any) => (
              <tr key={p.id}>
                <td><Link href={`/players/${p.id}`}>{p.username}</Link>{p.verified_at && <span className="badge">✓</span>}</td>
                <td className="muted">{p.position ?? "—"}</td><td className="num">{p.apps}</td>
                <td className="num">{p.goals}</td><td className="num">{p.assists}</td><td className="num">{p.rating ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h2 style={{ marginTop: 24 }}>Recent matches</h2>
      <MatchList matches={matches} />
    </>
  );
}
