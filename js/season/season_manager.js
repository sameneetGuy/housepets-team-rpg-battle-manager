// js/season/season_manager.js

import { GAME } from "../core/state.js";
import {
  compareTeamsByStandings,
  ensureInitialTeams,
  resetTeamsForNewSeason
} from "./teams.js";
import { rollSeasonMetaTrend, setSeasonMetaTrend } from "./meta_trends.js";
import { simulateTeamBattle, simulateTeamSeries } from "../battle/battle_2x3.js";

/**
 * Generate a single round-robin schedule for N teams.
 * Returns an array of "rounds"; each round is an array of [teamIndexA, teamIndexB].
 */
function generateRoundRobinSchedule(teamCount) {
  const teams = [];
  for (let i = 0; i < teamCount; i++) teams.push(i);

  if (teamCount % 2 !== 0) {
    teams.push(null); // bye
  }

  const n = teams.length;
  const rounds = [];

  for (let r = 0; r < n - 1; r++) {
    const round = [];
    for (let i = 0; i < n / 2; i++) {
      const t1 = teams[i];
      const t2 = teams[n - 1 - i];
      if (t1 !== null && t2 !== null) {
        round.push([t1, t2]);
      }
    }

    rounds.push(round);

    // rotate all but first
    const fixed = teams[0];
    const rest = teams.slice(1);
    rest.unshift(rest.pop());
    teams.splice(0, teams.length, fixed, ...rest);
  }

  return rounds;
}

function conferenceSeeds(conferenceName) {
  return GAME.teams
    .map((team, idx) => ({ ...team, idx }))
    .filter((team) => team.conference === conferenceName)
    .sort(compareTeamsByStandings)
    .slice(0, 4);
}

/**
 * Build initial Playoff pairs as [teamIndexA, teamIndexB].
 * Top 4 of each conference qualify. Bracket: 1E v 4W, 2E v 3W, 1W v 4E, 2W v 3E.
 */
function buildPlayoffPairs() {
  const east = conferenceSeeds("Eastern Conference");
  const west = conferenceSeeds("Western Conference");

  const seedIdx = (arr, seed) => arr[seed]?.idx ?? null;

  const pairs = [
    [seedIdx(east, 0), seedIdx(west, 3)],
    [seedIdx(east, 1), seedIdx(west, 2)],
    [seedIdx(west, 0), seedIdx(east, 3)],
    [seedIdx(west, 1), seedIdx(east, 2)]
  ];

  return pairs.filter(([a, b]) => a != null || b != null);
}

/**
 * Build initial Cup pairs as [teamIndexA, teamIndexB].
 * Teams are seeded by league standings: best vs worst, next-best vs next-worst, etc.
 * If there is an odd number of teams, the lowest seed gets a bye (paired with null).
 */
function initialCupPairs() {
  const rankedIndices = GAME.teams
    .map((team, idx) => ({ ...team, idx }))
    .sort(compareTeamsByStandings)
    .map((team) => team.idx);

  // Pad the seeding list up to the next power of two so higher seeds receive byes.
  const bracketSize = Math.pow(2, Math.ceil(Math.log2(Math.max(2, rankedIndices.length))));
  while (rankedIndices.length < bracketSize) {
    rankedIndices.push(null);
  }

  const pairs = [];
  let left = 0;
  let right = rankedIndices.length - 1;

  while (left <= right) {
    const a = rankedIndices[left] ?? null;
    const b = rankedIndices[right] ?? null;

    if (a == null && b == null) break;

    pairs.push([a, b]);

    left++;
    right--;
  }

  return pairs;
}

/**
 * Helper: clone a team into a list of fighter objects with HP set for battle.
 */
function buildTeamFighters(teamIndex) {
  const team = GAME.teams[teamIndex];
  return team.fighterIds.map((fid) => {
    const base = GAME.fighters[fid];
    return {
      ...base,
      hp: base.maxHP
    };
  });
}

/**
 * Simulate one league day (one round of matches).
 * Returns a text log.
 */
function simulateLeagueDay() {
  const roundIndex = GAME.league.day;
  const round = GAME.league.schedule[roundIndex];
  let log = `League Round ${roundIndex + 1}\n`;
  const matches = [];

  for (const [aIdx, bIdx] of round) {
    const teamA = GAME.teams[aIdx];
    const teamB = GAME.teams[bIdx];

    const fightersA = buildTeamFighters(aIdx);
	const fightersB = buildTeamFighters(bIdx);

	// 2-game series: allow draws if each side wins one.
	const result = simulateTeamSeries(fightersA, fightersB, 2);
	const winnerFlag = result.winner; // "A", "B", or "DRAW"
	log += `  ${teamA.name} vs ${teamB.name} → `;
	let summary = `${teamA.name} vs ${teamB.name} → `;


    if (winnerFlag === "A") {
      teamA.points += 3;
      teamA.wins += 1;
      teamB.losses += 1;
      teamA.played += 1;
      teamB.played += 1;
      log += `${teamA.name} wins\n`;
      summary += `${teamA.name} wins`;
    } else if (winnerFlag === "B") {
      teamB.points += 3;
      teamB.wins += 1;
      teamA.losses += 1;
      teamA.played += 1;
      teamB.played += 1;
      log += `${teamB.name} wins\n`;
      summary += `${teamB.name} wins`;
    } else {
      // Just in case you ever allow draws
      teamA.points += 1;
      teamB.points += 1;
      teamA.draws += 1;
      teamB.draws += 1;
      teamA.played += 1;
      teamB.played += 1;
      log += `Draw\n`;
      summary += `Draw`;
    }

    log += result.log + "\n";
    matches.push({
      summary,
      log: result.log
    });
  }

  GAME.league.day++;

  if (GAME.league.day >= GAME.league.schedule.length) {
    GAME.league.finished = true;
  }

  return { log, matches };
}

export function getCupStageName(matches) {
  const slots = Array.isArray(matches) ? matches.length * 2 : 0;

  if (slots <= 2) return "Final";
  if (slots <= 4) return "Semifinals";
  if (slots <= 8) return "Quarterfinals";
  if (slots > 0) return `Round of ${slots}`;

  return "Cup Round";
}

/**
 * Simulate one Playoff round (QF, SF, Final).
 * Returns a text log.
 */
function simulatePlayoffRound() {
  let log = "";
  const matches = [];
  const roundIdx = GAME.playoffs.round; // 0 = QF, 1 = SF, 2 = Final

  const stageNames = ["Quarterfinals", "Semifinals", "Final"];
  log += `Playoffs ${stageNames[roundIdx]}\n`;

  const winners = [];
  for (const [aIdx, bIdx] of GAME.playoffs.matches) {
    const teamA = aIdx != null ? GAME.teams[aIdx] : null;
    const teamB = bIdx != null ? GAME.teams[bIdx] : null;

    // Handle byes if one slot is empty
    if (teamA == null || teamB == null) {
      const advIdx = aIdx ?? bIdx;
      const advTeam = GAME.teams[advIdx];
      winners.push(advIdx);

      const summary = `${advTeam?.name || "TBD"} advances by bye`;
      log += `  ${summary}\n`;
      matches.push({ summary, log: "" });
      continue;
    }

    const fightersA = buildTeamFighters(aIdx);
    const fightersB = buildTeamFighters(bIdx);

    // Best-of-3 series for Playoff rounds.
    const result = simulateTeamSeries(fightersA, fightersB, 3);
    const winnerFlag = result.winner; // "A" or "B" (cannot be "DRAW" with 3 games)
    let winnerIdx = null;
    let loserIdx = null;

    if (winnerFlag === "A") {
      winnerIdx = aIdx;
      loserIdx = bIdx;
    } else if (winnerFlag === "B") {
      winnerIdx = bIdx;
      loserIdx = aIdx;
    }

    if (winnerIdx == null) {
      // Safety: if somehow no winner, pick team A
      winnerIdx = aIdx;
      loserIdx = bIdx;
    }

    const wTeam = GAME.teams[winnerIdx];
    const lTeam = GAME.teams[loserIdx];

    winners.push(winnerIdx);

    const summary = `${teamA.name} vs ${teamB.name} → ${wTeam.name} advances`;
    log += `  ${summary}\n`;
    log += result.log + "\n";

    matches.push({
      summary,
      log: result.log
    });
  }

  GAME.playoffs.round++;

  if (GAME.playoffs.round >= 3) {
    // Final just played
    GAME.playoffs.finished = true;

    const playoffWinnerIdx = winners.find((idx) => idx != null) ?? null;
    GAME.playoffs.winnerTeamIndex = playoffWinnerIdx;
    GAME.playoffs.matches = [];

    if (playoffWinnerIdx != null) {
      GAME.league.championIndex = playoffWinnerIdx;
      const playoffWinnerTeam = GAME.teams[playoffWinnerIdx];
      if (playoffWinnerTeam) {
        playoffWinnerTeam.leagueTitles = (playoffWinnerTeam.leagueTitles || 0) + 1;
        for (const fid of playoffWinnerTeam.fighterIds) {
          if (GAME.fighters[fid]) {
            GAME.fighters[fid].leagueTitles =
              (GAME.fighters[fid].leagueTitles || 0) + 1;
          }
        }
      }
    }
  } else {
    // Build next round matches from winners, allowing byes if needed
    const nextPairs = [];
    for (let i = 0; i < winners.length; i += 2) {
      const a = winners[i] ?? null;
      const b = winners[i + 1] ?? null;
      if (a != null || b != null) {
        nextPairs.push([a, b]);
      }
    }
    GAME.playoffs.matches = nextPairs;
  }

  return { log, matches };
}

/**
 * Simulate one Cup round (QF, SF, Final).
 * Returns a text log.
 */
function simulateCupRound() {
  let log = "";
  const matches = [];

  const stageName = getCupStageName(GAME.cup.matches);
  log += `Cup ${stageName}\n`;

  const winners = [];
  for (const [aIdx, bIdx] of GAME.cup.matches) {
    const teamA = aIdx != null ? GAME.teams[aIdx] : null;
    const teamB = bIdx != null ? GAME.teams[bIdx] : null;

    // Handle byes if one slot is empty
    if (teamA == null || teamB == null) {
      const advIdx = aIdx ?? bIdx;
      const advTeam = GAME.teams[advIdx];
      winners.push(advIdx);

      const summary = `${advTeam?.name || "TBD"} advances by bye`;
      log += `  ${summary}\n`;
      matches.push({ summary, log: "" });
      continue;
    }

    const fightersA = buildTeamFighters(aIdx);
    const fightersB = buildTeamFighters(bIdx);

    // Best-of-3 series for Cup rounds.
    const result = simulateTeamSeries(fightersA, fightersB, 3);
    const winnerFlag = result.winner; // "A" or "B" (cannot be "DRAW" with 3 games)
    let winnerIdx = null;
    let loserIdx = null;

    if (winnerFlag === "A") {
      winnerIdx = aIdx;
      loserIdx = bIdx;
    } else if (winnerFlag === "B") {
      winnerIdx = bIdx;
      loserIdx = aIdx;
    }

    if (winnerIdx == null) {
      // Safety: if somehow no winner, pick team A
      winnerIdx = aIdx;
      loserIdx = bIdx;
    }

    const wTeam = GAME.teams[winnerIdx];
    const lTeam = GAME.teams[loserIdx];

    winners.push(winnerIdx);

    const summary = `${teamA.name} vs ${teamB.name} → ${wTeam.name} advances`;
    log += `  ${summary}\n`;
    log += result.log + "\n";

    matches.push({
      summary,
      log: result.log
    });
  }

  GAME.cup.round++;

  const realWinners = winners.filter((idx) => idx != null);

  if (realWinners.length <= 1) {
    // Cup champion decided
    GAME.cup.finished = true;

    const cupWinnerIdx = realWinners[0] ?? null;
    GAME.cup.winnerTeamIndex = cupWinnerIdx;
    GAME.cup.matches = [];

    const cupWinnerTeam =
      cupWinnerIdx != null ? GAME.teams[cupWinnerIdx] : undefined;
    if (cupWinnerTeam) {
      // Team Cup titles
      cupWinnerTeam.cupTitles = (cupWinnerTeam.cupTitles || 0) + 1;

      // Fighter Cup titles
      for (const fid of cupWinnerTeam.fighterIds) {
        if (GAME.fighters[fid]) {
          GAME.fighters[fid].cupTitles =
            (GAME.fighters[fid].cupTitles || 0) + 1;
        }
      }
    }

    // Prepare Super Cup: league champion vs cup winner (if available)
    const leagueChampIdx = getLeagueChampionIndex();
    let superCupOpponentIdx = cupWinnerIdx;

    if (leagueChampIdx === cupWinnerIdx) {
      // If same team, use league runner-up instead
      superCupOpponentIdx = getLeagueRunnerUpIndex();
    }

    if (leagueChampIdx != null && superCupOpponentIdx != null) {
      GAME.supercup = {
        aIdx: leagueChampIdx,
        bIdx: superCupOpponentIdx,
        played: false
      };
    } else {
      GAME.supercup = null;
    }
  } else {
    // Build next round matches from winners, allowing byes if needed
    const nextPairs = [];
    for (let i = 0; i < winners.length; i += 2) {
      const a = winners[i] ?? null;
      const b = winners[i + 1] ?? null;
      if (a != null || b != null) {
        nextPairs.push([a, b]);
      }
    }
    GAME.cup.matches = nextPairs;
  }

  return { log, matches };
}

/**
 * Simulate the Babylon Gardens Super Cup match.
 * Returns an object { log, matches }.
 */
function simulateSuperCup() {
  if (!GAME.supercup) {
    return { log: "", matches: [] };
  }
  if (GAME.supercup.played) {
    return { log: "", matches: [] };
  }

  const { aIdx, bIdx } = GAME.supercup;
  const teamA = GAME.teams[aIdx];
  const teamB = GAME.teams[bIdx];

  const fightersA = buildTeamFighters(aIdx);
  const fightersB = buildTeamFighters(bIdx);

  let log = "Super Cup\n";
  const result = simulateTeamBattle(fightersA, fightersB);
  const winnerFlag = result.winner;

  let winnerIdx = aIdx;
  if (winnerFlag === "B") winnerIdx = bIdx;
  
  GAME.supercup.winner = winnerIdx;

  const winnerTeam = GAME.teams[winnerIdx];

  const summary = `${teamA.name} vs ${teamB.name} → ${winnerTeam.name} wins Super Cup`;
  log += `  ${summary}\n`;

  const matches = [
    {
      summary,
      log: result.log
    }
  ];

  GAME.supercup.played = true;

  if (winnerTeam) {
    winnerTeam.superCupTitles = (winnerTeam.superCupTitles || 0) + 1;
    for (const fid of winnerTeam.fighterIds) {
      if (GAME.fighters[fid]) {
        GAME.fighters[fid].superCupTitles =
          (GAME.fighters[fid].superCupTitles || 0) + 1;
      }
    }
  }

  return { log, matches };
}

/**
 * Determine league champion (index in GAME.teams), or null if league not finished.
 */
export function getLeagueChampionIndex() {
  if (!GAME.league.finished) return null;
  if (GAME.playoffs.finished && GAME.playoffs.winnerTeamIndex != null) {
    return GAME.playoffs.winnerTeamIndex;
  }

  let bestIdx = null;
  for (let i = 0; i < GAME.teams.length; i++) {
    const t = GAME.teams[i];
    if (bestIdx == null) {
      bestIdx = i;
      continue;
    }
    const b = GAME.teams[bestIdx];
    if (t.points > b.points) {
      bestIdx = i;
    } else if (t.points === b.points) {
      if (t.wins > b.wins) {
        bestIdx = i;
      } else if (t.wins === b.wins && t.name < b.name) {
        bestIdx = i;
      }
    }
  }
  return bestIdx;
}

/**
 * League runner-up (used for Super Cup if same team wins League & Cup)
 */
function getLeagueRunnerUpIndex() {
  if (!GAME.league.finished) return null;
  let sorted = [...GAME.teams].map((t, idx) => ({ t, idx }));
  sorted.sort((a, b) => {
    if (b.t.points !== a.t.points) return b.t.points - a.t.points;
    if (b.t.wins !== a.t.wins) return b.t.wins - a.t.wins;
    return a.t.name.localeCompare(b.t.name);
  });
  if (sorted.length < 2) return sorted[0]?.idx ?? null;
  return sorted[1].idx;
}

/**
 * Start (or restart) a season.
 * Keeps teams and fighter title history; resets league/cup/supercup state.
 */
export function startNewSeason() {
  // Increment season number before applying meta so history records correctly.
  if (GAME._seasonStartedBefore) {
    GAME.seasonNumber = (GAME.seasonNumber || 1) + 1;
  } else {
    GAME.seasonNumber = GAME.seasonNumber || 1;
  }

  resetTeamsForNewSeason();

  GAME.league.schedule = generateRoundRobinSchedule(GAME.teams.length);
  GAME.league.day = 0;
  GAME.league.finished = false;
  GAME.league.championIndex = null;

  GAME.playoffs.matches = [];
  GAME.playoffs.round = 0;
  GAME.playoffs.finished = false;
  GAME.playoffs.winnerTeamIndex = null;

  GAME.cup.matches = [];
  GAME.cup.round = 0;
  GAME.cup.finished = false;
  GAME.cup.winnerTeamIndex = null;

  GAME.supercup = null;

  GAME.log = "";
  GAME.calendar = [];
  GAME.dayNumber = 1;
  GAME.seasonComplete = false;

  // Roll a new seasonal meta trend and record it for history/AI use.
  setSeasonMetaTrend(rollSeasonMetaTrend());

  GAME._seasonStartedBefore = true;
}

/**
 * Advance to the next match day:
 *  1) Play next league round, until league finished
 *  2) Playoffs decide the league champion (QF → SF → Final)
 *  3) Cup knockout
 *  4) Super Cup
 *
 * Also appends to GAME.calendar with { day, phase, shortLabel, log }.
 */
export function advanceDay() {
  if (GAME.seasonComplete) {
    return { status: "finished", phase: "Off-season", shortLabel: "Season finished" };
  }

  let log = "";
  let phase = "";
  let shortLabel = "";
  let matches = [];
  let status = "league";

  // 1) League phase
  if (!GAME.league.finished) {
    phase = "League";
    shortLabel = `League Round ${GAME.league.day + 1}`;
    const res = simulateLeagueDay();
    log = res.log;
    matches = res.matches || [];
    status = "league";
  }
  // 2) Playoff phase
  else if (!GAME.playoffs.finished) {
    if (GAME.playoffs.round === 0 && GAME.playoffs.matches.length === 0) {
      GAME.playoffs.matches = buildPlayoffPairs();
    }
    const roundNames = ["Quarterfinals", "Semifinals", "Final"];
    phase = "Playoffs";
    shortLabel = roundNames[GAME.playoffs.round] || "Playoff Round";
    const res = simulatePlayoffRound();
    log = res.log;
    matches = res.matches || [];
    status = "playoffs";
  }
  // 3) Cup phase
  else if (!GAME.cup.finished) {
    if (GAME.cup.round === 0 && GAME.cup.matches.length === 0) {
      GAME.cup.matches = initialCupPairs();
    }
    phase = "Cup";
    shortLabel = getCupStageName(GAME.cup.matches);
    const res = simulateCupRound();
    log = res.log;
    matches = res.matches || [];
    status = "cup";
  }
  // 4) Super Cup
  else if (GAME.supercup && !GAME.supercup.played) {
    phase = "Super Cup";
    shortLabel = "Super Cup Match";
    const res = simulateSuperCup();
    log = res.log;
    matches = res.matches || [];
    // Treat the season as finished immediately after the Super Cup so the UI
    // doesn't require an extra "off-season" click.
    const finishSummary = "Season finished. Start a new season to continue.";
    matches.push({ summary: finishSummary, log: res.log });
    log = `${log}\n${finishSummary}\n`;
    status = "finished";
    GAME.seasonComplete = true;
  } else {
    phase = "Off-season";
    shortLabel = "Season finished";
    log = "Season finished. Start a new season to continue.\n";
    matches = [
      {
        summary: "Season finished. Start a new season to continue.",
        log
      }
    ];
    status = "finished";
  }

  GAME.log = log;
  GAME.calendar.push({
    day: GAME.dayNumber || 1,
    phase,
    shortLabel,
    log,
    matches
  });
  GAME.dayNumber = (GAME.dayNumber || 1) + 1;

  if (status === "finished") {
    GAME.seasonComplete = true;
  }

  return { status, phase, shortLabel, log, matches };
}

