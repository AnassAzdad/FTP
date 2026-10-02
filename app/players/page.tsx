import Link from "next/link";
import { Panel, PlayerCell, Rating, SeasonPicker } from "@/components/Ui";
import { getSeasons, playerList, resolveSeason } from "@/lib/stats";

export const dynamic = "force-dynamic";

export default async function Players({ searchParams }: { searchParams: Promise<{ season?: string; q?: string }> }) {
  const sp = await searchParams;
  const [seasons, season] = await Promise.all([getSeasons(), resolveSeason(sp.season)]);
  const players = await playerList(season?.id ?? null, sp.q);
  return (
    <>
      <div className="title-row">
        <div>
          <h1>Players</h1>
          <p className="muted" style={{ margin: "0 0 12px" }}>{players.length} players · {season?.name}</p>
        </div>
        <Link href="/compare" className="btn ghost-dark">Compare players</Link>
      </div>
      <SeasonPicker seasons={seasons} current={season} base="/players" />
      <form className="form" style={{ marginBottom: 12 }}>
        {season && <input type="hidden" name="season" value={season.id} />}
        <input id="q" name="q" placeholder="Search players" defaultValue={sp.q ?? ""} autoComplete="off" />
        <button className="btn">Search</button>
      </form>
      <Panel>
        <table>
          <thead><tr><th>Player</th><th>Team</th><th>Pos</th><th className="num">Apps</th><th className="num">Goals</th><th className="num">Assists</th><th className="num">Rating</th></tr></thead>
          <tbody>
            {players.map((p: any) => (
              <tr key={p.id}>
                <td className="who"><PlayerCell id={p.id} roblox_id={p.roblox_id} username={p.username} verified={!!p.verified_at} /></td>
                <td className="muted">{p.team ?? "Free agent"}</td>
                <td className="muted">{p.position ?? "–"}</td>
                <td className="num">{p.apps}</td><td className="num">{p.goals}</td><td className="num">{p.assists}</td>
                <td className="num"><Rating value={p.rating} /></td>
              </tr>
            ))}
            {players.length === 0 && <tr><td colSpan={7} className="muted">No players found</td></tr>}
          </tbody>
        </table>
      </Panel>
    </>
  );
}
