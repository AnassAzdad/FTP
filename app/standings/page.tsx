import Link from "next/link";
import { Crest, Form, Panel, SeasonPicker } from "@/components/Ui";
import { formGuide, getSeasons, resolveSeason, standings } from "@/lib/stats";

export const dynamic = "force-dynamic";

export default async function Standings({ searchParams }: { searchParams: Promise<{ season?: string }> }) {
  const sp = await searchParams;
  const [seasons, season] = await Promise.all([getSeasons(), resolveSeason(sp.season)]);
  const [rows, form] = await Promise.all([standings(season?.id ?? null), formGuide(season?.id ?? null)]);
  return (
    <>
      <h1>Table</h1>
      <p className="muted" style={{ margin: "0 0 12px" }}>{season?.name} · 3 points for a win, ranked by points, goal difference, goals scored</p>
      <SeasonPicker seasons={seasons} current={season} base="/standings" />
      <Panel>
        <table>
          <thead>
            <tr><th>#</th><th>Team</th>{["P", "W", "D", "L", "GF", "GA", "GD", "Pts"].map((h) => <th key={h} className="num">{h}</th>)}<th className="hide-sm">Last 5</th></tr>
          </thead>
          <tbody>
            {rows.map((r: any, i: number) => (
              <tr key={r.id} className={i === 0 ? "qual" : undefined}>
                <td className="pos">{i + 1}</td>
                <td className="who"><span className="who-cell"><Crest name={r.name} color={r.color} short={r.short_name} /><Link href={`/teams/${r.id}`} className="name">{r.name}</Link></span></td>
                {[r.played, r.won, r.drawn, r.lost, r.gf, r.ga].map((v: number, j: number) => <td key={j} className="num">{v}</td>)}
                <td className="num">{r.gd > 0 ? `+${r.gd}` : r.gd}</td>
                <td className="num"><b>{r.points}</b></td>
                <td className="hide-sm"><Form results={form[r.id]} /></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={11} className="muted">No matches played yet</td></tr>}
          </tbody>
        </table>
      </Panel>
    </>
  );
}
