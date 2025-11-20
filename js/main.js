// js/main.js

import { loadFighters } from "./core/loader.js";
import { ensureInitialTeams } from "./season/teams.js";
import { startNewSeason, advanceDay } from "./season/season_manager.js";
import { renderAll } from "./ui/render.js";
import { setupUIEvents } from "./ui/ui_events.js";
import { setupTabs } from "./ui/tabs.js";

document.addEventListener("DOMContentLoaded", async () => {
  const statusEl = document.getElementById("app-status");
  const startBtn = document.getElementById("start-season-btn");
  const nextBtn = document.getElementById("next-day-btn");
  const simulateBtn = document.getElementById("simulate-50-btn");

  setupTabs();

  if (startBtn) startBtn.disabled = true;
  if (nextBtn) nextBtn.disabled = true;
  if (simulateBtn) simulateBtn.disabled = true;
  if (statusEl) statusEl.textContent = "Loading fighters…";

  try {
    await loadFighters();
  } catch (err) {
    console.error(err);
    if (statusEl) {
      statusEl.textContent =
        "Failed to load fighter data. Check your connection and refresh the page.";
    }
    return;
  }

  ensureInitialTeams();
  renderAll(); // initial render (no season yet)
  setupUIEvents({ startNewSeason, advanceDay, renderAll, statusEl });

  if (startBtn) startBtn.disabled = false;
  if (simulateBtn) simulateBtn.disabled = false;
  if (statusEl) statusEl.textContent = "";
});
