import { notFound } from "next/navigation";
import { Crest, MatchList, Panel, PlayerCell, Rating, SeasonPicker } from "@/components/Ui";
import { formGuide, getSeasons, recentMatches, resolveSeason, standings, teamRoster } from "@/lib/stats";

export const dynamic = "force-dynamic";

export default async function TeamPage({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ season?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  if (!/^\d+$/.test(id)) notFound();
  const [seasons, season] = await Promise.all([getSeasons(), resolveSeason(sp.season)]);
  const sid = season?.id ?? null;
  const data = await teamRoster(Number(id), sid);
  if (!data) notFound();
  const [matches, table, form] = await Promise.all([recentMatches(sid, 10, Number(id)), standings(sid), formGuide(sid)]);
  const idx = table.findIndex((r: any) => r.id === Number(id));
  const row = table[idx];

  return (
    <>
      <section className="panel profile">
        <Crest name={data.team.name} color={data.team.color} short={data.team.short_name} lg />
        <div className="meta">
          <h1 style={{ margin: 0 }}>{data.team.name}</h1>
          <p>{season?.name}{row && ` · ${idx + 1}${["st", "nd", "rd"][idx] ?? "th"} in the table`}</p>
        </div>
        {row && (
          <div className="side">
            <div><b>{row.played}</b><span>Played</span></div>
            <div><b>{row.won}-{row.drawn}-{row.lost}</b><span>W-D-L</span></div>
            <div><b>{row.gf}:{row.ga}</b><span>Goals</span></div>
            <div><b>{row.points}</b><span>Points</span></div>
          </div>
        )}
      </section>
      <div style={{ height: 16 }} />
      <SeasonPicker seasons={seasons} current={season} base={`/teams/${id}`} />
      <div className="cols">
        <Panel title="Squad">
          <table>
            <thead><tr><th>Player</th><th>Pos</th><th className="num">Apps</th><th className="num">G</th><th className="num">A</th><th className="num">Rating</th></tr></thead>
            <tbody>
              {data.roster.map((p: any) => (
                <tr key={p.id}>
                  <td className="who"><PlayerCell id={p.id} roblox_id={p.roblox_id} username={p.username} verified={!!p.verified_at} /></td>
                  <td className="muted">{p.position ?? "–"}</td><td className="num">{p.apps}</td>
                  <td className="num">{p.goals}</td><td className="num">{p.assists}</td><td className="num"><Rating value={p.rating} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
        <div className="stack">
          {form[Number(id)] && (
            <Panel title="Form" pad>
              <div className="kv"><div><span>Last 5</span><span>{form[Number(id)].join(" ")}</span></div></div>
            </Panel>
          )}
          <MatchList title="Recent results" matches={matches} />
        </div>
      </div>
    </>
  );
}
