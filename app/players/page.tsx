import Link from "next/link";
import { SeasonPicker } from "@/components/Ui";
import { getSeasons, playerList, resolveSeason } from "@/lib/stats";

export const dynamic = "force-dynamic";

export default async function Players({ searchParams }: { searchParams: Promise<{ season?: string; q?: string }> }) {
  const sp = await searchParams;
  const [seasons, season] = await Promise.all([getSeasons(), resolveSeason(sp.season)]);
  const players = await playerList(season?.id ?? null, sp.q);
  return (
    <>
      <h1>Players</h1>
      <SeasonPicker seasons={seasons} current={season} base="/players" />
      <form className="form" style={{ margin: "12px 0" }}>
        {season && <input type="hidden" name="season" value={season.id} />}
        <input name="q" placeholder="Search players…" defaultValue={sp.q ?? ""} />
      </form>
      <div className="card">
        <table>
          <thead><tr><th>Player</th><th>Team</th><th>Pos</th><th className="num">Apps</th><th className="num">G</th><th className="num">A</th><th className="num">Rating</th></tr></thead>
          <tbody>
            {players.map((p: any) => (
              <tr key={p.id}>
                <td><Link href={`/players/${p.id}`}>{p.username}</Link>{p.verified_at && <span className="badge">✓</span>}</td>
                <td className="muted">{p.team ?? "—"}</td><td className="muted">{p.position ?? "—"}</td>
                <td className="num">{p.apps}</td><td className="num">{p.goals}</td><td className="num">{p.assists}</td>
                <td className="num">{p.rating ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
