import { getFighterValue } from "./value_calc.js";
import { fighters } from "../data/fighters.js"; // adjust path
import { BASE_TEAMS } from "../data/teams.js"; // adjust path

export function validateTrade(teamAId, fighterAId, teamBId, fighterBId) {
  const teamA = BASE_TEAMS.find(t => t.id === teamAId);
  const teamB = BASE_TEAMS.find(t => t.id === teamBId);

  if (!teamA || !teamB) return { ok: false, reason: "Invalid team." };

  const fA = fighters[fighterAId];
  const fB = fighters[fighterBId];

  if (!fA || !fB) return { ok: false, reason: "Invalid fighter ID." };

  // 1. Role-lock check
  if (fA.role !== fB.role) {
    return { ok: false, reason: "Trade must be role-locked (Tank↔Tank, DPS↔DPS, or Support↔Support)." };
  }

  // 2. Value-range check
  const vA = getFighterValue(fA);
  const vB = getFighterValue(fB);
  const ratio = vA / vB;

  if (ratio < 0.75 || ratio > 1.25) {
    return { ok: false, reason: `Unfair value range. Values: ${vA} vs ${vB}.` };
  }

  // 3. Prevent same-team swaps
  if (teamAId === teamBId) {
    return { ok: false, reason: "Both fighters are already on the same team." };
  }

  // 4. Ensure each team keeps 1 Tank, 1 DPS, 1 Support
  // teamA
  const teamANew = teamA.fighterIds.map(id => id === fighterAId ? fighterBId : id);
  const teamBNew = teamB.fighterIds.map(id => id === fighterBId ? fighterAId : id);

  const checkFormation = (arr) => {
    const roles = arr.map(id => fighters[id].role);
    return roles.includes("Tank") && roles.includes("DPS") && roles.includes("Support");
  };

  if (!checkFormation(teamANew)) return { ok: false, reason: "Team A would break its 1/1/1 formation." };
  if (!checkFormation(teamBNew)) return { ok: false, reason: "Team B would break its 1/1/1 formation." };

  return { ok: true, reason: "Trade approved." };
}
