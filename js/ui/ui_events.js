// js/ui/ui_events.js

import { GAME } from "../core/state.js";

/**
 * Wire up UI events: start season, next day, and calendar log toggling.
 */
export function setupUIEvents({ startNewSeason, advanceDay, renderAll, statusEl }) {
  const startBtn = document.getElementById("start-season-btn");
  const nextBtn = document.getElementById("next-day-btn");
  const dayLabel = document.getElementById("day-label");

  const setStatus = (text) => {
    if (statusEl) {
      statusEl.textContent = text || "";
    }
  };

  if (startBtn) {
    startBtn.addEventListener("click", () => {
      startNewSeason();
      if (nextBtn) nextBtn.disabled = false;
      setStatus("");
      updateDayLabel(dayLabel);
      renderAll();
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      const result = advanceDay();
      updateDayLabel(dayLabel);
      renderAll();
      if (result && result.status === "finished") {
        nextBtn.disabled = true;
        setStatus("Season finished. Start a new season to continue.");
      }
    });
  }

  // Initial label
  updateDayLabel(dayLabel);
}

function updateDayLabel(el) {
  if (!el) return;
  const day = GAME.dayNumber || 1;
  el.textContent = `Day ${day}`;
}
