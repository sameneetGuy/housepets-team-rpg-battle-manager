// js/season/season_manager.js

import { GAME } from "../core/state.js";
import { ensureInitialTeams, resetTeamsForNewSeason } from "./teams.js";
import { simulateTeamBattle, simulateTeamSeries } from "../battle/battle_3v3.js";

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

/**
 * Build initial Cup pairs as [teamIndexA, teamIndexB].
 * For now we just pair (0 vs 1), (2 vs 3), (4 vs 5), (6 vs 7).
 */
function initialCupPairs() {
  const idxs = GAME.teams.map((_, i) => i);
  const pairs = [];
  for (let i = 0; i < idxs.length; i += 2) {
    pairs.push([idxs[i], idxs[i + 1]]);
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

    const champIdx = getLeagueChampionIndex();
    GAME.league.championIndex = champIdx;

    const champTeam = GAME.teams[champIdx];
    if (champTeam) {
      // Team-wide league title
      champTeam.leagueTitles = (champTeam.leagueTitles || 0) + 1;

      // Fighter league titles
      for (const fid of champTeam.fighterIds) {
        if (GAME.fighters[fid]) {
          GAME.fighters[fid].leagueTitles =
            (GAME.fighters[fid].leagueTitles || 0) + 1;
        }
      }
    }
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
  const roundIdx = GAME.cup.round; // 0 = QF, 1 = SF, 2 = Final

  const stageNames = ["Quarterfinals", "Semifinals", "Final"];
  log += `Cup ${stageNames[roundIdx]}\n`;

  const winners = [];
  for (const [aIdx, bIdx] of GAME.cup.matches) {
    const teamA = GAME.teams[aIdx];
    const teamB = GAME.teams[bIdx];

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

  if (GAME.cup.round >= 3) {
    // Final just played
    GAME.cup.finished = true;

    const cupWinnerIdx = winners[0]; // Only one match in the final
	GAME.cup.winnerTeamIndex = cupWinnerIdx

    const cupWinnerTeam = GAME.teams[cupWinnerIdx];
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

    // Prepare Super Cup: league champion vs cup winner
    const leagueChampIdx = getLeagueChampionIndex();
    let superCupOpponentIdx = cupWinnerIdx;

    if (leagueChampIdx === cupWinnerIdx) {
      // If same team, use league runner-up instead
      superCupOpponentIdx = getLeagueRunnerUpIndex();
    }

    GAME.supercup = {
      aIdx: leagueChampIdx,
      bIdx: superCupOpponentIdx,
      played: false
    };
  } else {
    // Build next round matches from winners
    const nextPairs = [];
    for (let i = 0; i < winners.length; i += 2) {
      if (i + 1 < winners.length) {
        nextPairs.push([winners[i], winners[i + 1]]);
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
  resetTeamsForNewSeason();

  GAME.league.schedule = generateRoundRobinSchedule(GAME.teams.length);
  GAME.league.day = 0;
  GAME.league.finished = false;

  GAME.cup.matches = [];
  GAME.cup.round = 0;
  GAME.cup.finished = false;
  GAME.cup.winnerTeamIndex = null;

  GAME.supercup = null;

  GAME.log = "";
  GAME.calendar = [];
  GAME.dayNumber = 1;

  // You can choose when to increment seasonNumber; here we only increment
  // if a previous season has already been played.
  if (GAME._seasonStartedBefore) {
    GAME.seasonNumber = (GAME.seasonNumber || 1) + 1;
  }
  GAME._seasonStartedBefore = true;
}

/**
 * Advance to the next match day:
 *  1) Play next league round, until league finished
 *  2) Then play Cup rounds (QF → SF → Final)
 *  3) Then play Super Cup
 *
 * Also appends to GAME.calendar with { day, phase, shortLabel, log }.
 */
export function advanceDay() {
  let log = "";
  let phase = "";
  let shortLabel = "";
  let matches = [];

  // 1) League phase
  if (!GAME.league.finished) {
    phase = "League";
    shortLabel = `League Round ${GAME.league.day + 1}`;
    const res = simulateLeagueDay();
    log = res.log;
    matches = res.matches || [];
  }
  // 2) Cup phase
  else if (!GAME.cup.finished) {
    if (GAME.cup.round === 0 && GAME.cup.matches.length === 0) {
      GAME.cup.matches = initialCupPairs();
    }
    const roundNames = ["Quarterfinals", "Semifinals", "Final"];
    phase = "Cup";
    shortLabel = roundNames[GAME.cup.round] || "Cup Round";
    const res = simulateCupRound();
    log = res.log;
    matches = res.matches || [];
  }
  // 3) Super Cup
  else if (GAME.supercup && !GAME.supercup.played) {
    phase = "Super Cup";
    shortLabel = "Super Cup Match";
    const res = simulateSuperCup();
    log = res.log;
    matches = res.matches || [];
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
}

