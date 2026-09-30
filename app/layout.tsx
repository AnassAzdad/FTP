import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { getMe } from "@/lib/session";

export const metadata: Metadata = {
  title: "FTP Stats",
  description: "Federation of TPS: player and team stats for the New Era league",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const me = await getMe();
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=Barlow:wght@400;500;600;700&display=swap"
        />
      </head>
      <body>
        <header className="topbar">
          <div className="topbar-inner">
            <Link href="/" className="brand">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="Federation of TPS" />
              <span><b>FTP STATS</b><small>Federation of TPS · New Era</small></span>
            </Link>
            <nav className="links">
              <Link href="/players">Players</Link>
              <Link href="/teams">Teams</Link>
              <Link href="/standings">Standings</Link>
              <Link href="/matches">Matches</Link>
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
              <a className="btn discord" href="/api/auth/discord">Login with Discord</a>
            )}
          </div>
        </header>
        <main>{children}</main>
        <footer>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" />
          Federation of TPS · New Era. Stats update automatically after every match.
        </footer>
      </body>
    </html>
  );
}
