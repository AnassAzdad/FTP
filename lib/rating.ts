export type RatingInput = {
  position?: string | null;
  minutes: number;
  goals: number;
  assists: number;
  own_goals: number;
  shots_on_target: number;
  key_passes: number;
  passes: number;
  passes_completed: number;
  tackles_won: number;
  interceptions: number;
  clearances: number;
  blocks: number;
  dribbles_completed: number;
  saves: number;
  penalties_saved: number;
  goals_conceded: number;
  clean_sheet: boolean;
  fouls: number;
  yellow_cards: number;
  red_cards: number;
  team_won: boolean;
  team_lost: boolean;
};

/**
 * Fallback rating (1.0-10.0) used when the game does not send its own.
 * Tune the weights freely — ratings are recomputed only at ingest time.
 */
export function computeRating(s: RatingInput): number {
  if (s.minutes <= 0) return 6.0;
  const pos = (s.position ?? "").toUpperCase();
  const isGK = pos === "GK";
  const isDef = ["CB", "LB", "RB", "LWB", "RWB", "DEF"].includes(pos);

  let r = 6.0;
  r += s.goals * 1.0 + s.assists * 0.7;
  r += s.shots_on_target * 0.1 + s.key_passes * 0.15;
  r += s.dribbles_completed * 0.08;
  r += s.tackles_won * 0.12 + s.interceptions * 0.12;
  r += s.clearances * 0.05 + s.blocks * 0.1;
  r += s.saves * 0.25 + s.penalties_saved * 1.0;
  if (s.passes >= 10) r += (s.passes_completed / s.passes - 0.75) * 1.5;
  if ((isGK || isDef) && s.clean_sheet) r += 0.6;
  if (isGK || isDef) r -= s.goals_conceded * 0.25;
  r -= s.own_goals * 1.0 + s.fouls * 0.05;
  r -= s.yellow_cards * 0.3 + s.red_cards * 1.5;
  if (s.team_won) r += 0.3;
  if (s.team_lost) r -= 0.2;

  return Math.round(Math.min(10, Math.max(1, r)) * 10) / 10;
}
