# FTP Stats

Stats site for the FTP Roblox football league: leaderboards, player/team profiles, standings and match
pages. Next.js + Postgres (works with Supabase). Players log in with Discord; their linked Roblox account
is matched to the stats the game reports.

## How it works
1. **Game → site:** the game server POSTs each finished match to `POST /api/ingest/match`
   (see [docs/ROBLOX_INTEGRATION.md](docs/ROBLOX_INTEGRATION.md)). Players are created by Roblox ID.
2. **Login:** "Login with Discord" (scopes `identify connections`) reads the Roblox account linked in the
   user's Discord profile and claims the matching player (✓ verified badge). Users without a linked
   Roblox account are told to add one in Discord → Settings → Connections.

## Setup
```bash
npm install
cp .env.example .env      # fill in values
npm run db:migrate        # create tables
npm run db:seed           # optional: fake league data
npm run dev
```
- **Discord:** create an app at https://discord.com/developers/applications, add the redirect URI from
  `DISCORD_REDIRECT_URI` under OAuth2, and copy the client ID/secret into `.env`.
- **Database:** any Postgres. On Supabase use the connection string from Project Settings → Database.
- **Secrets:** `SESSION_SECRET` and `INGEST_API_KEY` should be long random strings (`openssl rand -hex 32`).
- **Deploy:** Vercel; set the same env vars and update `DISCORD_REDIRECT_URI` to the production URL.

## Layout
`db/schema.sql` schema · `lib/ingest.ts` payload validation + storage · `lib/stats.ts` queries and
leaderboard metrics · `lib/rating.ts` fallback match rating · `app/` pages and API routes.
