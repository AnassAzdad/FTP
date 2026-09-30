import Link from "next/link";
import { teamList } from "@/lib/stats";

export const dynamic = "force-dynamic";

export default async function Teams() {
  const teams = await teamList();
  return (
    <>
      <h1>Teams</h1>
      <div className="grid">
        {teams.map((t: any) => (
          <Link key={t.id} href={`/teams/${t.id}`} className="card" style={{ borderLeft: `4px solid ${t.color ?? "var(--line)"}` }}>
            <b>{t.name}</b>
          </Link>
        ))}
      </div>
    </>
  );
}
