import Link from "next/link";
import type { Season } from "@/lib/stats";
import { Avatar } from "./Avatar";

export function SeasonPicker({ seasons, current, base }: { seasons: Season[]; current: Season | null; base: string }) {
  if (seasons.length < 2) return null;
  const sep = base.includes("?") ? "&" : "?";
  return (
    <nav className="tabs">
      {seasons.map((s) => (
        <Link key={s.id} href={`${base}${sep}season=${s.id}`} className={s.id === current?.id ? "on" : ""}>
          {s.name}
        </Link>
      ))}
    </nav>
  );
}

export function Panel({ title, more, children, pad }: { title?: string; more?: string; children: React.ReactNode; pad?: boolean }) {
  return (
    <section className="panel">
      {title && (
        <div className="head">
          <h2>{title}</h2>
          {more && <Link className="more" href={more}>View all</Link>}
        </div>
      )}
      {pad ? <div className="body">{children}</div> : <div className="scroll">{children}</div>}
    </section>
  );
}

/** Colour-coded match rating, as on FotMob/Sofascore. */
export function Rating({ value, lg }: { value: number | string | null | undefined; lg?: boolean }) {
  if (value === null || value === undefined) return <span className="muted">–</span>;
  const v = Number(value);
  const tier = v >= 8 ? "r4" : v >= 7 ? "r3" : v >= 6 ? "r2" : v > 0 ? "r1" : "r0";
  return <span className={`rating ${tier}${lg ? " lg" : ""}`}>{v.toFixed(lg ? 2 : 1)}</span>;
}

export function Crest({ name, short, color, lg }: { name: string; short?: string | null; color?: string | null; lg?: boolean }) {
  const label = short || name.split(/\s+/).map((w) => w[0]).join("").slice(0, 3).toUpperCase();
  return <span className={`crest${lg ? " lg" : ""}`} style={{ background: color || "#5b6b8a" }} title={name}>{label}</span>;
}

export function Form({ results }: { results?: string[] }) {
  if (!results?.length) return <span className="muted">–</span>;
  const color: Record<string, string> = { W: "var(--good)", D: "var(--warn)", L: "var(--bad)" };
  return (
    <span className="form-run">
      {results.map((r, i) => <span key={i} style={{ background: color[r] }} title={r}>{r}</span>)}
    </span>
  );
}

export function PlayerCell({ id, roblox_id, username, sub, verified }: {
  id: number; roblox_id: string | number; username: string; sub?: string | null; verified?: boolean;
}) {
  return (
    <div className="who-cell">
      <Avatar robloxId={roblox_id} name={username} size={26} />
      <div style={{ minWidth: 0 }}>
        <Link href={`/players/${id}`} className="name">{username}</Link>
        {verified && <span className="verified" title="Verified via Discord">✓</span>}
        {sub && <div className="sub">{sub}</div>}
      </div>
    </div>
  );
}

export function Leaderboard({ title, unit, rows, href, limit }: {
  title: string; unit: string; href?: string; limit?: number;
  rows: { id: number; roblox_id: string; username: string; team: string | null; apps: number; value: number }[];
}) {
  const shown = limit ? rows.slice(0, limit) : rows;
  return (
    <Panel title={title} more={href}>
      <table>
        <thead><tr><th>#</th><th>Player</th><th className="num">Apps</th><th className="num">{unit}</th></tr></thead>
        <tbody>
          {shown.map((r, i) => (
            <tr key={r.id}>
              <td className="rank">{i + 1}</td>
              <td className="who"><PlayerCell id={r.id} roblox_id={r.roblox_id} username={r.username} sub={r.team ?? "Free agent"} /></td>
              <td className="num">{r.apps}</td>
              <td className="num"><b>{unit === "Avg rating" ? <Rating value={r.value} /> : r.value}</b></td>
            </tr>
          ))}
          {shown.length === 0 && <tr><td colSpan={4} className="muted">No data yet</td></tr>}
        </tbody>
      </table>
    </Panel>
  );
}

const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });

export function MatchList({ matches, title, more }: { matches: any[]; title?: string; more?: string }) {
  const groups = new Map<string, any[]>();
  for (const m of matches) {
    const k = fmtDate(m.played_at);
    (groups.get(k) ?? groups.set(k, []).get(k)!).push(m);
  }
  return (
    <Panel title={title} more={more}>
      <div className="fixtures">
        {[...groups].map(([date, ms]) => (
          <div key={date}>
            <div className="date">{date}</div>
            {ms.map((m) => (
              <Link key={m.id} href={`/matches/${m.id}`} className="fixture">
                <span className="team home"><span className="n">{m.home}</span><Crest name={m.home} color={m.home_color} short={m.home_short} /></span>
                <span className="score">{m.home_score} – {m.away_score}</span>
                <span className="team"><Crest name={m.away} color={m.away_color} short={m.away_short} /><span className="n">{m.away}</span></span>
                {m.competition !== "League" && <span className="meta">{m.competition}</span>}
              </Link>
            ))}
          </div>
        ))}
        {matches.length === 0 && <div className="body muted" style={{ padding: 14 }}>No matches yet</div>}
      </div>
    </Panel>
  );
}
