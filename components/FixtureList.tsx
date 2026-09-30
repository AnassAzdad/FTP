import Link from "next/link";
import { Crest, Panel } from "./Ui";

const tz = () => process.env.LEAGUE_TZ || "UTC";
const dayOf = (d: string) => new Intl.DateTimeFormat("en-GB", { timeZone: tz(), weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(new Date(d));
const timeOf = (d: string) => new Intl.DateTimeFormat("en-GB", { timeZone: tz(), hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(d));

export function FixtureList({ fixtures, title, more }: { fixtures: any[]; title?: string; more?: string }) {
  const groups = new Map<string, any[]>();
  for (const f of fixtures) {
    const k = dayOf(f.kickoff);
    (groups.get(k) ?? groups.set(k, []).get(k)!).push(f);
  }
  return (
    <Panel title={title} more={more}>
      <div className="fixtures">
        {[...groups].map(([date, fs]) => (
          <div key={date}>
            <div className="date">{date}</div>
            {fs.map((f) => {
              const inner = (
                <>
                  <span className="team home"><span className="n">{f.home}</span><Crest name={f.home} color={f.home_color} short={f.home_short} /></span>
                  {f.match_id ? <span className="score">{f.home_score} – {f.away_score}</span> : <span className="kickoff">{timeOf(f.kickoff)}</span>}
                  <span className="team"><Crest name={f.away} color={f.away_color} short={f.away_short} /><span className="n">{f.away}</span></span>
                  {f.competition !== "League" && <span className="meta">{f.competition}</span>}
                </>
              );
              return f.match_id
                ? <Link key={f.id} href={`/matches/${f.match_id}`} className="fixture">{inner}</Link>
                : <div key={f.id} className="fixture">{inner}</div>;
            })}
          </div>
        ))}
        {fixtures.length === 0 && <div className="muted" style={{ padding: 14 }}>No upcoming fixtures</div>}
      </div>
    </Panel>
  );
}
