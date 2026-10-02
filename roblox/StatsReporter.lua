--[[
	StatsReporter (ModuleScript) - ServerScriptService
	Collects match stats and sends them to the FTP stats website when a match ends.

	Setup (once):
	  1. Game Settings -> Security -> "Allow HTTP Requests" = ON
	  2. Fill in URL and API_KEY below (server-side only; never put the key in a LocalScript)

	Usage from your match script:
	  local Stats = require(game.ServerScriptService.StatsReporter)
	  local match = Stats.new("Season 1", "Red Lions", "Blue Hawks")   -- season name, home team, away team
	  match:addPlayer(player, "home", "ST")        -- call for every player: side is "home"/"away", position optional
	  match:add(player, "goals", 1)                -- any stat key from the list below
	  match:add(assister, "assists", 1)
	  match:event("goal", player, assister)        -- optional timeline entry (types: goal, penalty_goal, own_goal, yellow_card, red_card, sub)
	  match:setMinutes(player, 90)                 -- minutes played (defaults to full match)
	  match:finish(2, 1)                           -- home score, away score -> uploads (retries automatically)

	Stat keys: goals assists own_goals shots shots_on_target xg passes passes_completed key_passes
	  crosses through_balls dribbles dribbles_completed tackles tackles_won interceptions clearances
	  blocks duels duels_won saves penalties_saved fouls fouls_suffered offsides yellow_cards red_cards
	Positions: GK CB LB RB LWB RWB CM CDM CAM LW RW ST
	Send whatever your game already tracks; missing stats default to 0.
]]

local HttpService = game:GetService("HttpService")

local URL = "https://YOUR-SITE.vercel.app/api/ingest/match" -- given by the site owner
local API_KEY = "PASTE-INGEST-API-KEY-HERE"                  -- given by the site owner
local COMPETITION = "League"                                 -- or "Cup", "Friendly", ...

local Stats = {}
Stats.__index = Stats

function Stats.new(season, homeTeam, awayTeam)
	local self = setmetatable({}, Stats)
	self.matchId = HttpService:GenerateGUID(false)
	self.season = season
	self.teams = { home = homeTeam, away = awayTeam }
	self.players = {}   -- [userId] = { player data }
	self.events = {}
	self.startClock = os.clock()
	self.startTime = os.time()
	return self
end

function Stats:addPlayer(player, side, position)
	self.players[player.UserId] = {
		robloxId = player.UserId,
		username = player.Name,
		displayName = player.DisplayName,
		position = position,
		side = side,
		minutes = nil,
		stats = {},
	}
end

function Stats:add(player, key, amount)
	local p = self.players[player.UserId]
	if not p then return end
	p.stats[key] = (p.stats[key] or 0) + (amount or 1)
end

function Stats:setRating(player, rating) -- optional, 1-10; the site computes one otherwise
	local p = self.players[player.UserId]
	if p then p.stats.rating = rating end
end

function Stats:setMinutes(player, minutes)
	local p = self.players[player.UserId]
	if p then p.minutes = minutes end
end

function Stats:event(eventType, player, relatedPlayer)
	table.insert(self.events, {
		minute = math.floor((os.clock() - self.startClock) / 60),
		type = eventType,
		team = player and self.players[player.UserId] and self.players[player.UserId].side or nil,
		robloxId = player and player.UserId or nil,
		relatedRobloxId = relatedPlayer and relatedPlayer.UserId or nil,
	})
end

local function post(body)
	for attempt = 1, 4 do
		local ok, res = pcall(HttpService.RequestAsync, HttpService, {
			Url = URL,
			Method = "POST",
			Headers = { ["Content-Type"] = "application/json", ["Authorization"] = "Bearer " .. API_KEY },
			Body = body,
		})
		if ok and res.Success then
			return true
		end
		warn(("[StatsReporter] upload failed (attempt %d): %s"):format(attempt, ok and (res.StatusCode .. " " .. res.Body) or tostring(res)))
		task.wait(2 ^ attempt)
	end
	return false
end

function Stats:finish(homeScore, awayScore)
	local fullMinutes = math.max(1, math.floor((os.clock() - self.startClock) / 60))
	local sides = { home = { name = self.teams.home, score = homeScore, players = {} },
	                away = { name = self.teams.away, score = awayScore, players = {} } }
	for _, p in pairs(self.players) do
		local side = sides[p.side] or sides.home
		table.insert(side.players, {
			robloxId = p.robloxId, username = p.username, displayName = p.displayName,
			position = p.position, minutes = p.minutes or fullMinutes, stats = p.stats,
		})
	end
	local payload = {
		matchId = self.matchId,
		season = self.season,
		competition = COMPETITION,
		playedAt = os.date("!%Y-%m-%dT%H:%M:%SZ", self.startTime),
		home = sides.home,
		away = sides.away,
		events = self.events,
	}
	-- Runs in the background so the game never waits on the network.
	task.spawn(post, HttpService:JSONEncode(payload))
end

return Stats
