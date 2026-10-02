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

export type StripItem = {
  key: string; when: string; competition: string; href?: string;
  home: string; away: string; home_color?: string | null; away_color?: string | null; home_short?: string | null; away_short?: string | null;
  home_score?: number; away_score?: number;
};

const shortDay = (d: string) => new Intl.DateTimeFormat("en-GB", { timeZone: tz(), weekday: "short", day: "numeric", month: "short" }).format(new Date(d));

/** Horizontal row of fixture/result cards for the overview. */
export function FixtureStrip({ items }: { items: StripItem[] }) {
  return (
    <div className="strip">
      {items.map((it) => {
        const played = it.home_score !== undefined;
        const body = (
          <>
            <div className="fx-top"><span>{shortDay(it.when)}{played ? "" : ` · ${timeOf(it.when)}`}</span><span>{it.competition}</span></div>
            <div className="fx-row"><Crest name={it.home} color={it.home_color} short={it.home_short} /><span className="n">{it.home}</span>{played && <b>{it.home_score}</b>}</div>
            <div className="fx-row"><Crest name={it.away} color={it.away_color} short={it.away_short} /><span className="n">{it.away}</span>{played && <b>{it.away_score}</b>}</div>
          </>
        );
        return it.href
          ? <Link key={it.key} href={it.href} className="fx-card">{body}</Link>
          : <div key={it.key} className="fx-card">{body}</div>;
      })}
    </div>
  );
}
