# Sending match data from the game (for the game developer)

At the end of every match, the game's **server** script POSTs one JSON document to the stats site.

- **URL:** `https://<your-site>/api/ingest/match`
- **Auth:** header `Authorization: Bearer <INGEST_API_KEY>` (the key is shared privately; keep it in a
  server-only script/ServerStorage — never in a LocalScript or anything replicated to clients)
- **Requires:** *Game Settings → Security → Allow HTTP Requests* enabled
- **Idempotent:** re-sending the same `matchId` replaces that match, so retrying is safe.

## Payload

```json
{
  "matchId": "unique-id-from-the-game",
  "season": "Season 1",
  "competition": "League",
  "playedAt": "2026-09-30T18:00:00Z",
  "home": {
    "name": "Red Lions", "shortName": "RED", "color": "#e53935", "score": 2,
    "players": [
      { "robloxId": 123456, "username": "Striker1", "position": "ST", "minutes": 90,
        "stats": { "goals": 2, "assists": 0, "shots": 5, "shots_on_target": 3 } }
    ]
  },
  "away": { "name": "Blue Hawks", "score": 1, "players": [ ] },
  "events": [
    { "minute": 12, "type": "goal", "team": "home", "robloxId": 123456, "relatedRobloxId": 654321 }
  ]
}
```

Required: `matchId`, `season`, `home`/`away` (`name`, `score`, `players[]`), and per player `robloxId`,
`username`. Everything in `stats` is optional and defaults to 0 — send whatever the game tracks.
Supported stat keys: `goals assists own_goals shots shots_on_target xg passes passes_completed key_passes
crosses through_balls dribbles dribbles_completed tackles tackles_won interceptions clearances blocks
duels duels_won saves penalties_saved fouls fouls_suffered offsides yellow_cards red_cards rating`.

- `rating` (1–10) is optional; if omitted the site computes one (`lib/rating.ts`).
- `goals_conceded`, `clean_sheet` and man-of-the-match are derived by the site.
- Event `type`s the UI knows: `goal penalty_goal own_goal yellow_card red_card sub`.
- Positions: `GK CB LB RB LWB RWB CM CDM CAM LW RW ST` (used for goalkeeper/defender stats).

## Luau example (ServerScriptService)

```lua
local HttpService = game:GetService("HttpService")
local URL = "https://<your-site>/api/ingest/match"
local KEY = "<INGEST_API_KEY>" -- server-side only!

local function reportMatch(payload)
	for attempt = 1, 4 do
		local ok, res = pcall(HttpService.RequestAsync, HttpService, {
			Url = URL,
			Method = "POST",
			Headers = { ["Content-Type"] = "application/json", ["Authorization"] = "Bearer " .. KEY },
			Body = HttpService:JSONEncode(payload),
		})
		if ok and res.Success then return true end
		warn("stats upload failed", ok and res.StatusCode or res, ok and res.Body or "")
		task.wait(2 ^ attempt)
	end
	return false
end
```
