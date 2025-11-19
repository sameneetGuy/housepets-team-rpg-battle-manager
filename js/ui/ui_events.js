// js/ui/ui_events.js

import { GAME } from "../core/state.js";

/**
 * Wire up UI events: start season, next day, and calendar log toggling.
 */
export function setupUIEvents({ startNewSeason, advanceDay, renderAll }) {
  const startBtn = document.getElementById("start-season-btn");
  const nextBtn = document.getElementById("next-day-btn");
  const calendarEntries = document.getElementById("calendar-entries");
  const dayLabel = document.getElementById("day-label");

  if (startBtn) {
    startBtn.addEventListener("click", () => {
      startNewSeason();
      if (nextBtn) nextBtn.disabled = false;
      updateDayLabel(dayLabel);
      renderAll();
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      advanceDay();
      updateDayLabel(dayLabel);
      renderAll();
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
