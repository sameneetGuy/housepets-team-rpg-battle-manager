// js/ui/trade_ui.js

import { GAME } from "../core/state.js";
import { BASE_TEAMS } from "../season/teams.js";
import {
  allTeamsCompletedOffseasonTradeRequirement,
  autoResolveOffseasonTrades,
  executeTrade,
  getFighterValue,
  validateTrade
} from "../season/trades.js";

let cachedSelection = {
  teamA: null,
  teamB: null,
  fighterA: null,
  fighterB: null
};

function getTeamOptions() {
  return BASE_TEAMS.map((t) => ({ id: t.id, name: t.name }));
}

function fighterLabel(fid) {
  const fighter = GAME.fighters?.[fid];
  if (!fighter) return fid;
  const value = getFighterValue(fighter);
  return `${fighter.name} — ${fighter.role} (V:${value})`;
}

function populateTeamSelect(selectEl, selectedId) {
  if (!selectEl) return;
  const options = getTeamOptions();
  selectEl.innerHTML = options
    .map((t) => `<option value="${t.id}" ${t.id === selectedId ? "selected" : ""}>${t.name}</option>`)
    .join("");
}

function populateFighterSelect(selectEl, teamId, selectedId) {
  if (!selectEl) return;
  const team = (GAME.teams || []).find((t) => t.id === teamId);
  if (!team) {
    selectEl.innerHTML = "";
    return;
  }

  selectEl.innerHTML = team.fighterIds
    .map((fid) => `<option value="${fid}" ${fid === selectedId ? "selected" : ""}>${fighterLabel(fid)}</option>`)
    .join("");
}

function readSelections() {
  const teamASelect = document.getElementById("trade-team-a");
  const teamBSelect = document.getElementById("trade-team-b");
  const fighterASelect = document.getElementById("trade-fighter-a");
  const fighterBSelect = document.getElementById("trade-fighter-b");

  return {
    teamA: teamASelect?.value || null,
    teamB: teamBSelect?.value || null,
    fighterA: fighterASelect?.value || null,
    fighterB: fighterBSelect?.value || null
  };
}

function updateRequirementBanner() {
  const requirementEl = document.getElementById("trade-requirement-banner");
  if (!requirementEl) return;

  const counts = GAME.offseasonTradesCount || {};
  const parts = BASE_TEAMS.map((team) => {
    const count = counts[team.id] || 0;
    const status = count >= 1 ? "✅" : "⚠️";
    return `<li>${status} ${team.name}: ${count} trade${count === 1 ? "" : "s"}</li>`;
  }).join("");

  const gateMet = allTeamsCompletedOffseasonTradeRequirement();
  requirementEl.innerHTML = `
    <div class="requirement-summary ${gateMet ? "ok" : "pending"}">
      ${gateMet ? "All teams have traded." : "All teams must complete at least one trade before the new season begins."}
    </div>
    <ul class="trade-progress-list">${parts}</ul>
  `;
}

function showResultMessage(text, type = "error") {
  const el = document.getElementById("trade-result");
  if (!el) return;
  el.textContent = text;
  el.className = type === "success" ? "trade-success" : "trade-error";
}

export function renderTradeUI() {
  const teamASelect = document.getElementById("trade-team-a");
  const teamBSelect = document.getElementById("trade-team-b");
  const fighterASelect = document.getElementById("trade-fighter-a");
  const fighterBSelect = document.getElementById("trade-fighter-b");
  const proposeBtn = document.getElementById("propose-trade-btn");
  const offseasonHint = document.getElementById("offseason-only-note");
  const autoResolveBtn = document.getElementById("auto-resolve-trades-btn");

  if (!teamASelect || !teamBSelect || !fighterASelect || !fighterBSelect || !proposeBtn) return;

  const seasonPhase = GAME.seasonPhase || "offseason";
  const inOffseason = seasonPhase === "offseason";

  populateTeamSelect(teamASelect, cachedSelection.teamA);
  populateTeamSelect(teamBSelect, cachedSelection.teamB);

  const selections = readSelections();
  cachedSelection = selections;

  populateFighterSelect(fighterASelect, selections.teamA, cachedSelection.fighterA);
  populateFighterSelect(fighterBSelect, selections.teamB, cachedSelection.fighterB);

  proposeBtn.disabled = !inOffseason;
  if (autoResolveBtn) {
    autoResolveBtn.disabled = !inOffseason;
  }
  if (offseasonHint) {
    offseasonHint.textContent = inOffseason
      ? "Trades are open."
      : "Trades are only allowed in the offseason window.";
  }

  updateRequirementBanner();
}

export function setupTradeUI({ renderAll }) {
  const teamASelect = document.getElementById("trade-team-a");
  const teamBSelect = document.getElementById("trade-team-b");
  const fighterASelect = document.getElementById("trade-fighter-a");
  const fighterBSelect = document.getElementById("trade-fighter-b");
  const proposeBtn = document.getElementById("propose-trade-btn");
  const autoResolveBtn = document.getElementById("auto-resolve-trades-btn");

  const refreshFighterDropdowns = () => {
    const selections = readSelections();
    cachedSelection = selections;
    populateFighterSelect(fighterASelect, selections.teamA, selections.fighterA);
    populateFighterSelect(fighterBSelect, selections.teamB, selections.fighterB);
  };

  if (teamASelect) {
    teamASelect.addEventListener("change", () => {
      cachedSelection.teamA = teamASelect.value;
      refreshFighterDropdowns();
    });
  }

  if (teamBSelect) {
    teamBSelect.addEventListener("change", () => {
      cachedSelection.teamB = teamBSelect.value;
      refreshFighterDropdowns();
    });
  }

  if (proposeBtn) {
    proposeBtn.addEventListener("click", () => {
      const { teamA, fighterA, teamB, fighterB } = readSelections();
      const validation = validateTrade(teamA, fighterA, teamB, fighterB);
      if (!validation.ok) {
        showResultMessage(validation.reason || "Trade rejected.", "error");
        return;
      }

      const outcome = executeTrade(teamA, fighterA, teamB, fighterB);
      if (!outcome.ok) {
        showResultMessage(outcome.reason || "Trade failed.", "error");
        return;
      }

      showResultMessage("Trade executed successfully!", "success");
      renderAll();
    });
  }

  if (autoResolveBtn) {
    autoResolveBtn.addEventListener("click", () => {
      autoResolveOffseasonTrades();
      renderAll();
      updateRequirementBanner();
      showResultMessage("Attempted to auto-resolve offseason trades.", "success");
    });
  }

  if (fighterASelect) {
    fighterASelect.addEventListener("change", () => {
      cachedSelection.fighterA = fighterASelect.value;
    });
  }

  if (fighterBSelect) {
    fighterBSelect.addEventListener("change", () => {
      cachedSelection.fighterB = fighterBSelect.value;
    });
  }

  renderTradeUI();
}
