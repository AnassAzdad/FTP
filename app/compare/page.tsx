import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { allUsernames, findPlayerByName, getSeasons, playerProfile, resolveSeason } from "@/lib/stats";

export const dynamic = "force-dynamic";

// [label, key, higherIsBetter]
const ROWS: [string, string, boolean][] = [
  ["Appearances", "apps", true], ["Avg rating", "rating", true], ["MOTM", "motm", true],
  ["Goals", "goals", true], ["Assists", "assists", true], ["Shots", "shots", true],
  ["Shots on target", "shots_on_target", true], ["Key passes", "key_passes", true],
  ["Dribbles completed", "dribbles_completed", true], ["Tackles won", "tackles_won", true],
  ["Interceptions", "interceptions", true], ["Clearances", "clearances", true],
  ["Saves", "saves", true], ["Clean sheets", "clean_sheets", true],
  ["Fouls", "fouls", false], ["Yellow cards", "yellow_cards", false], ["Red cards", "red_cards", false],
];

export default async function Compare({ searchParams }: { searchParams: Promise<{ a?: string; b?: string; season?: string }> }) {
  const sp = await searchParams;
  const [, season, names] = await Promise.all([getSeasons(), resolveSeason(sp.season), allUsernames()]);
  const [ra, rb] = await Promise.all([findPlayerByName(sp.a ?? ""), findPlayerByName(sp.b ?? "")]);
  const [pa, pb] = await Promise.all([
    ra ? playerProfile(ra.id, season?.id ?? null) : null,
    rb ? playerProfile(rb.id, season?.id ?? null) : null,
  ]);

  return (
    <>
      <h1>Compare players</h1>
      <p className="muted">{season?.name}</p>
      <form className="form" style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "12px 0 20px" }}>
        {season && <input type="hidden" name="season" value={season.id} />}
        <input name="a" list="players" placeholder="Player 1" defaultValue={sp.a ?? ""} />
        <input name="b" list="players" placeholder="Player 2" defaultValue={sp.b ?? ""} />
        <datalist id="players">{names.map((n) => <option key={n} value={n} />)}</datalist>
        <button className="btn">Compare</button>
      </form>
      {sp.a && !pa && <p className="muted">No player found for “{sp.a}”.</p>}
      {sp.b && !pb && <p className="muted">No player found for “{sp.b}”.</p>}
      {pa && pb && (
        <div className="card">
          <table>
            <thead>
              <tr>
                {[pa, pb].map((p, i) => (
                  <th key={i} style={{ textAlign: i ? "left" : "right" }}>
                    <Link href={`/players/${p.player.id}`} style={{ display: "inline-flex", gap: 8, alignItems: "center", textTransform: "none", fontSize: 16, color: "var(--text)" }}>
                      {i === 0 && p.player.username}
                      <Avatar robloxId={p.player.roblox_id} name={p.player.username} size={36} />
                      {i === 1 && p.player.username}
                    </Link>
                  </th>
                ))}
                <th />
              </tr>
            </thead>
            <tbody>
              {ROWS.map(([label, key, higher]) => {
                const x = pa.totals[key] ?? 0, y = pb.totals[key] ?? 0;
                const aWins = x !== y && (higher ? x > y : x < y), bWins = x !== y && !aWins;
                return (
                  <tr key={key}>
                    <td className="num" style={{ color: aWins ? "var(--accent)" : undefined, fontWeight: aWins ? 700 : 400 }}>{x}</td>
                    <td style={{ color: bWins ? "var(--accent)" : undefined, fontWeight: bWins ? 700 : 400 }}>{y}</td>
                    <td className="muted">{label}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
