import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { Panel, Rating } from "@/components/Ui";
import { allUsernames, findPlayerByName, getSeasons, playerProfile, resolveSeason } from "@/lib/stats";

export const dynamic = "force-dynamic";

// [label, key, higherIsBetter]
const ROWS: [string, string, boolean][] = [
  ["Appearances", "apps", true], ["Average rating", "rating", true], ["Player of the match", "motm", true],
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
      <p className="muted" style={{ margin: "0 0 12px" }}>{season?.name}</p>
      <form className="form" style={{ marginBottom: 16 }}>
        {season && <input type="hidden" name="season" value={season.id} />}
        <input id="a" name="a" list="players" placeholder="Player 1" defaultValue={sp.a ?? ""} autoComplete="off" />
        <input id="b" name="b" list="players" placeholder="Player 2" defaultValue={sp.b ?? ""} autoComplete="off" />
        <datalist id="players">{names.map((n) => <option key={n} value={n} />)}</datalist>
        <button className="btn">Compare</button>
      </form>
      {sp.a && !pa && <p className="muted">No player named “{sp.a}”.</p>}
      {sp.b && !pb && <p className="muted">No player named “{sp.b}”.</p>}
      {pa && pb && (
        <Panel>
          <table>
            <thead>
              <tr>
                {[pa, pb].map((p, i) => (
                  <th key={i} style={{ textAlign: i ? "left" : "right", textTransform: "none", fontSize: 14, color: "var(--text)" }}>
                    <Link href={`/players/${p.player.id}`} style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                      {i === 0 && p.player.username}
                      <Avatar robloxId={p.player.roblox_id} name={p.player.username} size={30} />
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
                const show = (v: number) => (key === "rating" ? <Rating value={v} /> : v);
                return (
                  <tr key={key}>
                    <td className="num" style={{ fontWeight: aWins ? 700 : 400, color: aWins ? "var(--accent)" : undefined }}>{show(x)}</td>
                    <td style={{ fontWeight: bWins ? 700 : 400, color: bWins ? "var(--accent)" : undefined }}>{show(y)}</td>
                    <td className="muted">{label}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Panel>
      )}
    </>
  );
}
