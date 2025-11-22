import { BASE_TEAMS } from "../data/teams.js";

export function executeTrade(teamAId, fighterAId, teamBId, fighterBId) {
  const teamA = BASE_TEAMS.find(t => t.id === teamAId);
  const teamB = BASE_TEAMS.find(t => t.id === teamBId);

  teamA.fighterIds = teamA.fighterIds.map(id => id === fighterAId ? fighterBId : id);
  teamB.fighterIds = teamB.fighterIds.map(id => id === fighterBId ? fighterAId : id);

  return { ok: true };
}
