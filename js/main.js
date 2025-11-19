// js/main.js

import { loadFighters } from "./core/loader.js";
import { ensureInitialTeams } from "./season/teams.js";
import { startNewSeason, advanceDay } from "./season/season_manager.js";
import { renderAll } from "./ui/render.js";
import { setupUIEvents } from "./ui/ui_events.js";

document.addEventListener("DOMContentLoaded", async () => {
  await loadFighters();
  ensureInitialTeams();
  renderAll(); // initial render (no season yet)
  setupUIEvents({ startNewSeason, advanceDay, renderAll });
});
