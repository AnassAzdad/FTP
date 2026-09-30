create table if not exists teams (
  id          serial primary key,
  name        text unique not null,
  short_name  text,
  color       text,
  created_at  timestamptz not null default now()
);

create table if not exists seasons (
  id         serial primary key,
  name       text unique not null,
  is_current boolean not null default false,
  created_at timestamptz not null default now()
);

-- Players are created when the game first reports them (roblox_id) and are
-- "claimed" when that person logs in with a Discord account linked to the
-- same Roblox account (discord_id set).
create table if not exists players (
  id           serial primary key,
  roblox_id    bigint unique not null,
  username     text not null,
  display_name text,
  discord_id   text unique,
  discord_name text,
  team_id      int references teams(id) on delete set null,
  position     text,
  verified_at  timestamptz,
  created_at   timestamptz not null default now()
);

create table if not exists matches (
  id            serial primary key,
  external_id   text unique not null,
  season_id     int references seasons(id),
  competition   text not null default 'League',
  home_team_id  int not null references teams(id),
  away_team_id  int not null references teams(id),
  home_score    int not null,
  away_score    int not null,
  played_at     timestamptz not null default now(),
  mvp_player_id int references players(id)
);
create index if not exists matches_season_idx on matches(season_id);

create table if not exists player_match_stats (
  match_id            int not null references matches(id) on delete cascade,
  player_id           int not null references players(id) on delete cascade,
  team_id             int not null references teams(id),
  position            text,
  minutes             int not null default 0,
  goals               int not null default 0,
  assists             int not null default 0,
  own_goals           int not null default 0,
  shots               int not null default 0,
  shots_on_target     int not null default 0,
  xg                  numeric(5,2) not null default 0,
  passes              int not null default 0,
  passes_completed    int not null default 0,
  key_passes          int not null default 0,
  crosses             int not null default 0,
  through_balls       int not null default 0,
  dribbles            int not null default 0,
  dribbles_completed  int not null default 0,
  tackles             int not null default 0,
  tackles_won         int not null default 0,
  interceptions       int not null default 0,
  clearances          int not null default 0,
  blocks              int not null default 0,
  duels               int not null default 0,
  duels_won           int not null default 0,
  saves               int not null default 0,
  penalties_saved     int not null default 0,
  goals_conceded      int not null default 0,
  clean_sheet         boolean not null default false,
  fouls               int not null default 0,
  fouls_suffered      int not null default 0,
  offsides            int not null default 0,
  yellow_cards        int not null default 0,
  red_cards           int not null default 0,
  rating              numeric(3,1) not null default 6.0,
  primary key (match_id, player_id)
);
create index if not exists pms_player_idx on player_match_stats(player_id);

create table if not exists match_events (
  id                 serial primary key,
  match_id           int not null references matches(id) on delete cascade,
  minute             int not null,
  type               text not null, -- goal, own_goal, penalty_goal, yellow_card, red_card, sub, ...
  team_id            int references teams(id),
  player_id          int references players(id),
  related_player_id  int references players(id)
);
create index if not exists events_match_idx on match_events(match_id);

-- Scheduled matches, mostly imported from the Discord fixtures channel.
create table if not exists fixtures (
  id            serial primary key,
  season_id     int references seasons(id),
  competition   text not null default 'League',
  home_team_id  int not null references teams(id),
  away_team_id  int not null references teams(id),
  kickoff       timestamptz not null,
  source        text not null default 'manual',   -- 'discord' | 'manual'
  source_id     text unique,                      -- discord: "<message id>:<line>"
  source_text   text,                             -- the line it was parsed from
  match_id      int references matches(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists fixtures_kickoff_idx on fixtures(kickoff);

create table if not exists sync_state (
  key   text primary key,
  value text not null
);
