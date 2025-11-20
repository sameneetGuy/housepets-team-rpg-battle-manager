// js/ui/render.js

import { GAME } from "../core/state.js";
import { getConferenceStandings } from "../season/teams.js";
import {
  getCupStageName,
  getLeagueChampionIndex
} from "../season/season_manager.js";

export function renderAll() {
  renderParticipants();
  renderTeamsTitles();
  renderLeague();
  renderPlayoffs();
  renderCup();
  renderCalendar();
  renderDayLabel();
  renderSeasonMeta();
}

function renderDayLabel() {
  const el = document.getElementById("day-label");
  if (!el) return;
  const day = GAME.dayNumber || 1;
  el.textContent = `Day ${day}`;
}

function renderSeasonMeta() {
  const el = document.getElementById("season-meta-banner");
  if (!el) return;

  const meta = GAME.metaTrend;

  if (!meta) {
    el.textContent = "Start a season to roll a new meta trend.";
    return;
  }

  const season = GAME.seasonNumber || 1;
  el.innerHTML = `
    <div class="meta-title">Season ${season} Meta: ${meta.name}</div>
    <div class="meta-desc">${meta.description}</div>
  `;
}

function renderParticipants() {
  const div = document.getElementById("participants-list");
  if (!div) return;

  const fighters = Object.values(GAME.fighters);
  fighters.sort((a, b) => a.name.localeCompare(b.name));

  let html = `<div><strong>Season ${GAME.seasonNumber || 1}</strong></div>`;
  html += `<table>
    <thead>
      <tr>
        <th>Fighter</th>
        <th>League Titles</th>
        <th>Cup Titles</th>
        <th>Super Cup Titles</th>
      </tr>
    </thead>
    <tbody>`;

  for (const f of fighters) {
    html += `<tr>
      <td>${f.name}</td>
      <td>${f.leagueTitles || 0}</td>
      <td>${f.cupTitles || 0}</td>
      <td>${f.superCupTitles || 0}</td>
    </tr>`;
  }

  html += `</tbody></table>`;
  div.innerHTML = html;
}

function renderTeamsTitles() {
  const div = document.getElementById("teams-titles-list");
  if (!div) return;

  const teams = GAME.teams || [];

  let html = `<table>
    <thead>
      <tr>
        <th>Team</th>
        <th>League Titles</th>
        <th>Cup Titles</th>
        <th>Super Cup Titles</th>
      </tr>
    </thead>
    <tbody>
  `;

  teams
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach((t) => {
      html += `
        <tr>
          <td>${t.name}</td>
          <td>${t.leagueTitles || 0}</td>
          <td>${t.cupTitles || 0}</td>
          <td>${t.superCupTitles || 0}</td>
        </tr>
      `;
    });

  html += `</tbody></table>`;
  div.innerHTML = html;
}

function renderLeague() {
  const statusDiv = document.getElementById("league-status");
  const eastBody = document.getElementById("east-league-body");
  const westBody = document.getElementById("west-league-body");
  if (!statusDiv || !eastBody || !westBody) return;

  const league = GAME.league;

  if (!league.schedule || league.schedule.length === 0) {
    statusDiv.textContent = "League not started.";
    eastBody.innerHTML = "";
    westBody.innerHTML = "";
    return;
  }

  if (!league.finished) {
    statusDiv.textContent = `Round ${league.day + 1} of ${league.schedule.length}`;
  } else {
    const champIdx = getLeagueChampionIndex();
    if (champIdx != null) {
      const team = GAME.teams[champIdx];
      statusDiv.textContent = `Finished. Champion: ${team.name}`;
    } else {
      statusDiv.textContent = "Finished.";
    }
  }

  const eastern = getConferenceStandings("Eastern Conference");
  const western = getConferenceStandings("Western Conference");

  const buildRows = (list) =>
    list
      .map((t, idx) => {
        const playoffClass = idx < 4 ? " class=\"playoff-line\"" : "";
        return `<tr${playoffClass}>
      <td>${t.name}</td>
      <td>${t.points}</td>
      <td>${t.wins}</td>
      <td>${t.draws}</td>
      <td>${t.losses}</td>
    </tr>`;
      })
      .join("");

  eastBody.innerHTML = buildRows(eastern);
  westBody.innerHTML = buildRows(western);
}

function renderPlayoffs() {
  const statusDiv = document.getElementById("playoffs-status");
  if (!statusDiv) return;

  const playoffs = GAME.playoffs;

  if (!playoffs || ((!playoffs.matches || playoffs.matches.length === 0) && !playoffs.finished)) {
    statusDiv.textContent = "Playoffs not started.";
    return;
  }

  const parts = [];

  if (playoffs.finished) {
    if (playoffs.winnerTeamIndex != null) {
      const team = GAME.teams[playoffs.winnerTeamIndex];
      parts.push(`Playoffs finished. Champion: ${team.name}`);
    } else {
      parts.push("Playoffs finished.");
    }
  } else {
    const roundNames = ["Quarterfinals", "Semifinals", "Final"];
    const roundName = roundNames[playoffs.round] || "Playoff Round";
    parts.push(`<div>Current Round: ${roundName}</div>`);
    if (Array.isArray(playoffs.matches) && playoffs.matches.length > 0) {
      const li = playoffs.matches
        .map(([aIdx, bIdx]) => {
          const a = GAME.teams[aIdx];
          const b = GAME.teams[bIdx];
          return `<li>${a?.name ?? "?"} vs ${b?.name ?? "?"}</li>`;
        })
        .join("");
      if (li) {
        parts.push(`<ul>${li}</ul>`);
      }
    }
  }

  statusDiv.innerHTML = parts.join("");
}

function renderCup() {
  const statusDiv = document.getElementById("cup-status");
  if (!statusDiv) return;

  const cup = GAME.cup;

  if (!cup || ((!cup.matches || cup.matches.length === 0) && !cup.finished)) {
    const superCupHtml = buildSuperCupPanel();
    if (superCupHtml) {
      statusDiv.innerHTML = superCupHtml;
    } else {
      statusDiv.textContent = "Cup not started.";
    }
    return;
  }

  const parts = [];

  if (cup.finished) {
    if (cup.winnerTeamIndex != null) {
      const team = GAME.teams[cup.winnerTeamIndex];
      parts.push(`Cup finished. Winner: ${team.name}`);
    } else {
      parts.push("Cup finished.");
    }
  } else {
    const roundName = getCupStageName(cup.matches);
    parts.push(`<div>Current Round: ${roundName}</div>`);
    if (Array.isArray(cup.matches) && cup.matches.length > 0) {
      const li = cup.matches
        .map(([aIdx, bIdx]) => {
          const a = GAME.teams[aIdx];
          const b = GAME.teams[bIdx];
          return `<li>${a?.name ?? "?"} vs ${b?.name ?? "?"}</li>`;
        })
        .join("");
      if (li) {
        parts.push(`<ul>${li}</ul>`);
      }
    }
  }

  const superCupHtml = buildSuperCupPanel();
  if (superCupHtml) {
    parts.push(superCupHtml);
  }

  statusDiv.innerHTML = parts.join("");
}

function buildSuperCupPanel() {
  const s = GAME.supercup;
  if (!s) return "";

  const hasLeagueChampion = Number.isInteger(s.aIdx);
  const hasCupChampion = Number.isInteger(s.bIdx);
  if (!hasLeagueChampion || !hasCupChampion) {
    return "";
  }

  const leagueTeam = GAME.teams[s.aIdx];
  const cupTeam = GAME.teams[s.bIdx];
  if (!leagueTeam || !cupTeam) {
    return "";
  }

  let html = `<div class="supercup-panel">
    <h3>Babylon Gardens Super Cup</h3>
    <p>Match: ${leagueTeam.name} (League Champion) vs ${cupTeam.name} (Cup Champion)</p>
  `;

  if (s.played) {
    const winnerTeam = Number.isInteger(s.winner) ? GAME.teams[s.winner] : null;
    if (winnerTeam) {
      html += `<p><strong>Super Cup Winner:</strong> ${winnerTeam.name}</p>`;
    }
  } else {
    html += `<p><em>Super Cup not played yet.</em></p>`;
  }

  html += `</div>`;
  return html;
}

function renderCalendar() {
  const container = document.getElementById("calendar-entries");
  if (!container) return;

  container.innerHTML = "";
  const entries = GAME.calendar || [];

  entries
    .slice()
    .sort((a, b) => (a.day || 0) - (b.day || 0))
    .forEach((entry, entryIndex) => {
      const wrap = document.createElement("div");
      wrap.className = "day-entry";

      const header = document.createElement("div");
      header.className = "day-header";
      header.textContent = `Day ${entry.day} — ${entry.phase}`;

      const meta = document.createElement("div");
      meta.className = "day-meta";
      meta.textContent = entry.shortLabel || "";

      wrap.appendChild(header);
      wrap.appendChild(meta);

      // Fallback: if for some reason matches is missing, use the old combined log
      const matches =
        entry.matches && entry.matches.length
          ? entry.matches
          : [
              {
                summary: entry.shortLabel || "(no summary)",
                log: entry.log || ""
              }
            ];

      matches.forEach((match, matchIndex) => {
        const matchWrap = document.createElement("div");
        matchWrap.className = "calendar-match";

        const summarySpan = document.createElement("span");
        summarySpan.textContent = match.summary || "(no summary)";

        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "toggle-log-btn";
        const logId = `cal-log-${entryIndex}-${matchIndex}`;
        btn.dataset.logTarget = logId;
        btn.textContent = "Show Log";

        const logDiv = document.createElement("div");
        logDiv.className = "match-log";
        logDiv.id = logId;
        logDiv.style.display = "none";
        logDiv.textContent = match.log || "";

        btn.addEventListener("click", () => {
          const isHidden =
            logDiv.style.display === "none" || logDiv.style.display === "";
          logDiv.style.display = isHidden ? "block" : "none";
          btn.textContent = isHidden ? "Hide Log" : "Show Log";
        });

        matchWrap.appendChild(summarySpan);
        matchWrap.appendChild(btn);
        matchWrap.appendChild(logDiv);

        wrap.appendChild(matchWrap);
      });

      container.appendChild(wrap);
    });
}
