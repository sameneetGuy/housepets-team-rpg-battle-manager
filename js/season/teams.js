// js/season/teams.js

import { GAME } from "../core/state.js";

// Base team definitions: 8 teams, 3 fighters each, built around formation
// (frontliner + mid dps/trickster + backline mage/support where possible)
const BASE_TEAMS = [
  {
    id: "babylon_knights",
    name: "Babylon Knights",
    fighterIds: ["bailey", "keene", "sabrina"],
  },
  {
    id: "k9pd",
    name: "K9PD",
    fighterIds: ["fido", "grape", "sasha"],
  },
  {
    id: "pridelands_warriors",
    name: "Pridelands Warriors",
    fighterIds: ["kevin", "maxwell", "peanut"],
  },
  {
    id: "milton_estate",
    name: "Milton Estate",
    fighterIds: ["king", "breel", "bino"],
  },
  {
    id: "odd_company",
    name: "Odd Company",
    fighterIds: ["tiger", "lucretia", "marvin"],
  },
  {
    id: "chaotic_enterprises",
    name: "Chaotic Enterprises",
    fighterIds: ["mungo", "terrace", "natalie"],
  },
  {
    id: "speedsters_casters",
    name: "Speedsters & Casters",
    fighterIds: ["fox", "joey", "lana"],
  },
  {
    id: "temple_crashers",
    name: "Temple Crashers",
    fighterIds: ["tarot", "karishad", "ralph"],
  },

  // ===== New Teams for 12-team League =====

  {
    id: "cosmic_weasel",
    name: "Cosmic Weasel",
    fighterIds: ["delusional_steve", "zach", "jessica"],
  },
  {
    id: "ancient_guardians",
    name: "Ancient Guardians",
    fighterIds: ["ptah", "satau", "rufus"],
  },
  {
    id: "forest_ferals",
    name: "Forest & Ferals",
    fighterIds: ["gale", "miles", "itsuki"],
  },
  {
    id: "street_legends",
    name: "Street Legends",
    fighterIds: ["rex", "lester", "dallas"],
  },
];

/**
 * Ensure GAME.teams is initialized exactly once from BASE_TEAMS.
 */
export function ensureInitialTeams() {
  if (GAME.teams && GAME.teams.length > 0) return;

  GAME.teams = BASE_TEAMS.map((t) => ({
    id: t.id,
    name: t.name,
    fighterIds: [...t.fighterIds],

    // Per-season league stats
    points: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    played: 0,

    // Long-term titles (these get incremented in season_manager)
    leagueTitles: 0,
    cupTitles: 0,
    superCupTitles: 0,
  }));
}

/**
 * Reset per-season stats for a new season.
 * Titles (leagueTitles, cupTitles, superCupTitles) are preserved.
 */
export function resetTeamsForNewSeason() {
  ensureInitialTeams();

  for (const team of GAME.teams) {
    team.points = 0;
    team.wins = 0;
    team.draws = 0;
    team.losses = 0;
    team.played = 0;
    // Titles remain as they are; season_manager will increment them.
  }
}

/**
 * Return teams sorted as league standings:
 * points desc → wins desc → name asc.
 */
export function getLeagueStandings() {
  ensureInitialTeams();

  const teams = GAME.teams || [];
  return teams
    .slice()
    .sort((a, b) => {
      if ((b.points || 0) !== (a.points || 0)) {
        return (b.points || 0) - (a.points || 0);
      }
      if ((b.wins || 0) !== (a.wins || 0)) {
        return (b.wins || 0) - (a.wins || 0);
      }
      // As a final tiebreaker, sort alphabetically
      return (a.name || "").localeCompare(b.name || "");
    });
}
