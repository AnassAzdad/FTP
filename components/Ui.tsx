import Link from "next/link";
import type { Season } from "@/lib/stats";

export function SeasonPicker({ seasons, current, base }: { seasons: Season[]; current: Season | null; base: string }) {
  if (seasons.length < 2) return null;
  return (
    <div className="seasons">
      {seasons.map((s) => (
        <Link key={s.id} href={`${base}?season=${s.id}`} className={`pill ${s.id === current?.id ? "on" : ""}`}>
          {s.name}
        </Link>
      ))}
    </div>
  );
}

export function Leaderboard({
  title, unit, rows, href,
}: {
  title: string; unit: string; href?: string;
  rows: { id: number; username: string; team: string | null; apps: number; value: number }[];
}) {
  return (
    <div className="card">
      <h2>{href ? <Link href={href}>{title} →</Link> : title}</h2>
      <table>
        <thead><tr><th>#</th><th>Player</th><th className="num">Apps</th><th className="num">{unit}</th></tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id}>
              <td>{i + 1}</td>
              <td><Link href={`/players/${r.id}`}>{r.username}</Link><div className="muted" style={{ fontSize: 12 }}>{r.team ?? "Free agent"}</div></td>
              <td className="num">{r.apps}</td>
              <td className="num"><b>{r.value}</b></td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={4} className="muted">No data yet</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

export function MatchList({ matches }: { matches: any[] }) {
  return (
    <div className="card">
      <table>
        <tbody>
          {matches.map((m) => (
            <tr key={m.id}>
              <td className="muted">{new Date(m.played_at).toLocaleDateString("en-GB")}</td>
              <td style={{ textAlign: "right" }}>{m.home}</td>
              <td style={{ textAlign: "center" }}><Link href={`/matches/${m.id}`}><b>{m.home_score} – {m.away_score}</b></Link></td>
              <td>{m.away}</td>
              <td className="muted">{m.competition}</td>
            </tr>
          ))}
          {matches.length === 0 && <tr><td className="muted">No matches yet</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
