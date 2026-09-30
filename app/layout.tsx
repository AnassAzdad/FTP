import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { getMe } from "@/lib/session";

export const metadata: Metadata = {
  title: "FTP Stats",
  description: "Federation of TPS: player and team statistics for the New Era league",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const me = await getMe();
  return (
    <html lang="en">
      <body>
        <header className="topbar">
          <div className="topbar-inner">
            <Link href="/" className="brand">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="" />
              Federation of TPS
            </Link>
            <nav className="links">
              <Link href="/">Overview</Link>
              <Link href="/matches">Matches</Link>
              <Link href="/standings">Table</Link>
              <Link href="/players">Players</Link>
              <Link href="/teams">Teams</Link>
              <Link href="/awards">Awards</Link>
              <Link href="/compare">Compare</Link>
            </nav>
            <span className="spacer" />
            {me ? (
              <div className="user">
                <Link href={`/players/${me.id}`}>{me.username}</Link>
                <form action="/api/auth/logout" method="post"><button className="btn ghost">Log out</button></form>
              </div>
            ) : (
              <a className="btn discord" href="/api/auth/discord">Log in with Discord</a>
            )}
          </div>
        </header>
        <main>{children}</main>
        <footer>Federation of TPS · New Era. Statistics are recorded automatically at the end of every match.</footer>
      </body>
    </html>
  );
}
