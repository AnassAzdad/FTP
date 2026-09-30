import Link from "next/link";
import { Form, SeasonPicker } from "@/components/Ui";
import { formGuide, getSeasons, resolveSeason, standings } from "@/lib/stats";

export const dynamic = "force-dynamic";

export default async function Standings({ searchParams }: { searchParams: Promise<{ season?: string }> }) {
  const sp = await searchParams;
  const [seasons, season] = await Promise.all([getSeasons(), resolveSeason(sp.season)]);
  const rows = await standings(season?.id ?? null);
  const form = await formGuide(season?.id ?? null);
  return (
    <>
      <h1>Standings</h1>
      <SeasonPicker seasons={seasons} current={season} base="/standings" />
      <div className="card">
        <table>
          <thead><tr><th>#</th><th>Team</th>{["P","W","D","L","GF","GA","GD","Pts"].map((h) => <th key={h} className="num">{h}</th>)}<th>Form</th></tr></thead>
          <tbody>
            {rows.map((r: any, i: number) => (
              <tr key={r.id}>
                <td>{i + 1}</td><td><Link href={`/teams/${r.id}`}>{r.name}</Link></td>
                {[r.played, r.won, r.drawn, r.lost, r.gf, r.ga, r.gd].map((v: number, j: number) => <td key={j} className="num">{v}</td>)}
                <td className="num"><b>{r.points}</b></td>
                <td><Form results={form[r.id]} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
