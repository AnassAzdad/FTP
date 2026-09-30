# Fixtures from Discord

Posts in the fixtures channel are read automatically and shown on the **Fixtures** page. When the game
reports a result, it is linked to the matching fixture (same two teams, kickoff within 36 hours).

## How it works

Discord does not push channel messages to websites, so the site asks Discord for the latest 50 messages
in the channel on a schedule (`GET /api/sync/discord`), parses them, and saves any fixtures it finds.
Re-reading the last 50 posts means **editing a post updates the fixture**. Deleting a post does not
remove a fixture (delete it from the database, or edit the post instead).

## Writing fixtures so they are picked up

One fixture per line, `home vs away`, with a time. The easiest reliable format uses Discord's timestamp
markup (type `<t:` and pick a time, or use a timestamp generator):

```
**Matchday 5 fixtures**
Red Lions vs Blue Hawks <t:1790800000:F>
Green Wolves vs Gold Eagles <t:1790803600:F>
```

Plain times also work; the date is taken from a header line or, failing that, the day the message was posted:

```
Fixtures 30/09
Red Lions vs Blue Hawks 20:00
Green Wolves v Gold Eagles @ 8:30pm
```

Notes:
- `vs`, `v` and `x` are accepted as separators. `Team A - Team B` works when neither name contains a dash.
- Clock times without a Discord timestamp are read in `LEAGUE_TZ` (set in the site's environment).
- A line or post containing "cup", "friendly" or "playoff" sets the competition; everything else is League.
- Team names are matched to existing teams ignoring case and punctuation; a name that matches nothing
  creates a new team, so spell names consistently.
- Bold, bullets, emoji and role mentions are ignored.

## Setup

1. In the Discord developer portal, open the site's application → **Bot** → *Reset Token*; copy it into
   `DISCORD_BOT_TOKEN`. Turn on **Message Content Intent** on the same page.
2. Invite the bot to the server: **OAuth2 → URL Generator**, scope `bot`, permissions *View Channels* and
   *Read Message History*. Open the generated link. The bot needs access to the fixtures channel.
3. In Discord, turn on *Developer Mode* (User Settings → Advanced), right-click the fixtures channel →
   *Copy Channel ID* → `DISCORD_FIXTURES_CHANNEL_ID`.
4. Set `CRON_SECRET` to a long random string and `LEAGUE_TZ` to the league's time zone.
5. Schedule the sync. The included GitHub Actions workflow (`.github/workflows/sync-fixtures.yml`) calls
   the endpoint every 10 minutes; add repository secrets `SITE_URL` and `CRON_SECRET`. Any other scheduler
   (cron-job.org, Vercel Cron on a paid plan) works the same way: `GET <site>/api/sync/discord` with
   header `Authorization: Bearer <CRON_SECRET>`.

## Testing a message format

```
curl -X POST https://<site>/api/sync/discord \
  -H "Authorization: Bearer <CRON_SECRET>" -H "Content-Type: application/json" \
  -d '{"text":"Fixtures 30/09\nRed Lions vs Blue Hawks 20:00"}'
```
Returns the fixtures the parser found without saving anything.
