import Link from "next/link";
import { Crest, Panel } from "@/components/Ui";
import { standings, teamList } from "@/lib/stats";

export const dynamic = "force-dynamic";

export default async function Teams() {
  const [teams, table] = await Promise.all([teamList(), standings(null)]);
  const pos = new Map<number, number>(table.map((r: any, i: number) => [r.id, i + 1]));
  return (
    <>
      <h1>Teams</h1>
      <p className="muted" style={{ margin: "0 0 12px" }}>{teams.length} teams</p>
      <Panel>
        <table>
          <thead><tr><th>Team</th><th className="num">Position</th></tr></thead>
          <tbody>
            {teams.map((t: any) => (
              <tr key={t.id}>
                <td className="who"><span className="who-cell"><Crest name={t.name} color={t.color} short={t.short_name} /><Link href={`/teams/${t.id}`} className="name">{t.name}</Link></span></td>
                <td className="num muted">{pos.get(t.id) ?? "–"}</td>
              </tr>
            ))}
            {teams.length === 0 && <tr><td colSpan={2} className="muted">No teams yet</td></tr>}
          </tbody>
        </table>
      </Panel>
    </>
  );
}
