# For the game developer

`StatsReporter.lua` is a ModuleScript. Put it in **ServerScriptService** and:

1. Turn on **Game Settings → Security → Allow HTTP Requests**.
2. Paste the `URL` and `API_KEY` you were given at the top of the module (server-side only).
3. In your match code:

```lua
local Stats = require(game.ServerScriptService.StatsReporter)

-- when a match starts
local match = Stats.new("Season 1", homeTeamName, awayTeamName)
for _, plr in ipairs(homePlayers) do match:addPlayer(plr, "home", positionOf(plr)) end
for _, plr in ipairs(awayPlayers) do match:addPlayer(plr, "away", positionOf(plr)) end

-- wherever things happen
match:add(scorer, "goals")            -- +1 goal
match:add(assister, "assists")
match:event("goal", scorer, assister) -- optional timeline
match:add(keeper, "saves")
match:add(defender, "tackles_won")
match:add(plr, "shots") ; match:add(plr, "shots_on_target")

-- when the match ends
match:finish(homeScore, awayScore)
```

Only players, positions and the score are required. Add stat calls for whatever the game already
counts; anything not sent shows as 0. The full key list is at the top of the module.
Uploads retry 4 times and run in the background. A failed upload is logged with `[StatsReporter]`.
