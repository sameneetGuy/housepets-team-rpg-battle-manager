// js/season/trades.js

import { GAME } from "../core/state.js";
import { BASE_TEAMS } from "./teams.js";

export function getSubroleBonus(subRole) {
  if (!subRole) return 0;
  return 1;
}

export function getFighterValue(fighter) {
  if (!fighter) return 0;
  const atk = fighter.attack || 0;
  const def = fighter.defense || 0;
  const spd = fighter.speed || 0;
  const bonus = getSubroleBonus(fighter.subRole);
  return atk + def + spd + bonus;
}

function findTeamById(teamId) {
  return (GAME.teams || []).find((team) => team.id === teamId);
}

function findFighter(fighterId) {
  return GAME.fighters?.[fighterId];
}

export function snapshotLastSeasonRosters() {
  GAME.lastSeasonRosters = {};
  for (const team of BASE_TEAMS) {
    GAME.lastSeasonRosters[team.id] = [...team.fighterIds];
  }
}

export function resetOffseasonTradeCounts() {
  GAME.offseasonTradesCount = {};
  for (const team of BASE_TEAMS) {
    GAME.offseasonTradesCount[team.id] = 0;
  }
}

export function ensureOffseasonTradeTracking() {
  if (!GAME.offseasonTradesCount) {
    resetOffseasonTradeCounts();
    return;
  }

  for (const team of BASE_TEAMS) {
    if (typeof GAME.offseasonTradesCount[team.id] !== "number") {
      GAME.offseasonTradesCount[team.id] = 0;
    }
  }
}

export function enterOffseason() {
  snapshotLastSeasonRosters();
  resetOffseasonTradeCounts();
  GAME.seasonPhase = "offseason";
}

function hasValidFormation(fighterIds) {
  const counts = { Tank: 0, DPS: 0, Support: 0 };
  for (const fid of fighterIds) {
    const role = findFighter(fid)?.role;
    if (counts.hasOwnProperty(role)) {
      counts[role] += 1;
    }
  }
  return counts.Tank >= 1 && counts.DPS >= 1 && counts.Support >= 1;
}

function swapFighterIds(fighterIds, outId, inId) {
  return fighterIds.map((fid) => (fid === outId ? inId : fid));
}

export function validateTrade(teamAId, fighterAId, teamBId, fighterBId, options = {}) {
  const fairnessWindow = options.fairnessWindow ?? 0.25;
  const minRatio = options.minRatio ?? 1 - fairnessWindow;
  const maxRatio = options.maxRatio ?? 1 + fairnessWindow;

  if (GAME.seasonPhase !== "offseason") {
    return { ok: false, reason: "Trades are only allowed in the offseason window." };
  }

  const teamA = findTeamById(teamAId);
  const teamB = findTeamById(teamBId);
  if (!teamA || !teamB) {
    return { ok: false, reason: "Both teams must exist." };
  }

  if (teamA.id === teamB.id) {
    return { ok: false, reason: "Cannot trade within the same team." };
  }

  const fighterA = findFighter(fighterAId);
  const fighterB = findFighter(fighterBId);
  if (!fighterA || !fighterB) {
    return { ok: false, reason: "Both fighters must exist." };
  }

  if (fighterA.role !== fighterB.role) {
    return {
      ok: false,
      reason: "Trade must be same-role (Tank↔Tank, DPS↔DPS, Support↔Support)."
    };
  }

  const eligibleA = GAME.lastSeasonRosters?.[teamAId] || [];
  const eligibleB = GAME.lastSeasonRosters?.[teamBId] || [];

  if (!eligibleA.includes(fighterAId)) {
    return { ok: false, reason: "Team A can only trade fighters who played last season for them." };
  }

  if (!eligibleB.includes(fighterBId)) {
    return { ok: false, reason: "Team B can only trade fighters who played last season for them." };
  }

  const valueA = getFighterValue(fighterA);
  const valueB = getFighterValue(fighterB);
  if (valueB === 0) {
    return { ok: false, reason: "Invalid fighter values for trade." };
  }
  const ratio = valueA / valueB;

  if (ratio < minRatio || ratio > maxRatio) {
    return { ok: false, reason: `Unfair trade: values ${valueA} vs ${valueB}.` };
  }

  const swappedA = swapFighterIds(teamA.fighterIds, fighterAId, fighterBId);
  const swappedB = swapFighterIds(teamB.fighterIds, fighterBId, fighterAId);

  if (!hasValidFormation(swappedA) || !hasValidFormation(swappedB)) {
    return {
      ok: false,
      reason: "Trade would break formation (each team needs a Tank, DPS, and Support)."
    };
  }

  return { ok: true, valueA, valueB };
}

function updateBaseTeamRoster(teamId, fighterIds) {
  const baseTeam = BASE_TEAMS.find((t) => t.id === teamId);
  if (baseTeam) {
    baseTeam.fighterIds = [...fighterIds];
  }
}

export function executeTrade(teamAId, fighterAId, teamBId, fighterBId) {
  const teamA = findTeamById(teamAId);
  const teamB = findTeamById(teamBId);
  if (!teamA || !teamB) return { ok: false, reason: "Both teams must exist." };

  const validation = validateTrade(teamAId, fighterAId, teamBId, fighterBId);
  if (!validation.ok) return validation;

  teamA.fighterIds = swapFighterIds(teamA.fighterIds, fighterAId, fighterBId);
  teamB.fighterIds = swapFighterIds(teamB.fighterIds, fighterBId, fighterAId);

  updateBaseTeamRoster(teamAId, teamA.fighterIds);
  updateBaseTeamRoster(teamBId, teamB.fighterIds);

  ensureOffseasonTradeTracking();
  GAME.offseasonTradesCount[teamAId] += 1;
  GAME.offseasonTradesCount[teamBId] += 1;

  return { ok: true };
}

function eligibleFightersForTeam(teamId) {
  const team = findTeamById(teamId);
  if (!team) return [];
  const eligibleIds = GAME.lastSeasonRosters?.[teamId] || [];
  return eligibleIds
    .filter((fid) => team.fighterIds.includes(fid))
    .map((fid) => ({ id: fid, role: findFighter(fid)?.role }));
}

export function allTeamsCompletedOffseasonTradeRequirement() {
  ensureOffseasonTradeTracking();
  const counts = Object.values(GAME.offseasonTradesCount || {});
  if (counts.length === 0) return true;
  return counts.every((c) => c >= 1);
}

export function autoResolveOffseasonTrades({
  maxAttemptsPerTeam = 40,
  fairnessWindow = 0.25,
  relaxedMinRatio = 0.8,
  relaxedMaxRatio = 1.25
} = {}) {
  ensureOffseasonTradeTracking();
  let madeAnyTrade = false;

  const teamsNeedingTrade = () =>
    Object.entries(GAME.offseasonTradesCount || {})
      .filter(([, count]) => count < 1)
      .map(([id]) => id);

  for (const teamId of teamsNeedingTrade()) {
    let attempts = 0;
    let found = false;
    const fightersA = eligibleFightersForTeam(teamId);

    for (const fighter of fightersA) {
      const otherTeams = (GAME.teams || []).filter((t) => t.id !== teamId);
      for (const other of otherTeams) {
        const fightersB = eligibleFightersForTeam(other.id).filter((f) => f.role === fighter.role);
        for (const fighterB of fightersB) {
          const validation = validateTrade(teamId, fighter.id, other.id, fighterB.id, {
            fairnessWindow
          });
          const relaxedValidation = validation.ok
            ? validation
            : validateTrade(teamId, fighter.id, other.id, fighterB.id, {
                minRatio: relaxedMinRatio,
                maxRatio: relaxedMaxRatio
              });

          const finalCheck = validation.ok ? validation : relaxedValidation;
          attempts += 1;

          if (finalCheck.ok) {
            executeTrade(teamId, fighter.id, other.id, fighterB.id);
            found = true;
            madeAnyTrade = true;
            break;
          }

          if (attempts >= maxAttemptsPerTeam) {
            break;
          }
        }
        if (found || attempts >= maxAttemptsPerTeam) break;
      }
      if (found || attempts >= maxAttemptsPerTeam) break;
    }
  }

  return madeAnyTrade;
}
