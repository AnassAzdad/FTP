import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { getMe } from "@/lib/session";

export const metadata: Metadata = { title: "FTP Stats", description: "Player and team stats for the FTP league" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const me = await getMe();
  return (
    <html lang="en">
      <body>
        <nav>
          <Link href="/" className="brand">FTP STATS</Link>
          <Link href="/players">Players</Link>
          <Link href="/teams">Teams</Link>
          <Link href="/standings">Standings</Link>
          <Link href="/matches">Matches</Link>
          <Link href="/awards">Awards</Link>
          <Link href="/compare">Compare</Link>
          <span className="spacer" />
          {me ? (
            <>
              <Link href={`/players/${me.id}`}>{me.username}</Link>
              <form action="/api/auth/logout" method="post"><button className="btn ghost">Log out</button></form>
            </>
          ) : (
            <a className="btn" href="/api/auth/discord">Login with Discord</a>
          )}
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}
