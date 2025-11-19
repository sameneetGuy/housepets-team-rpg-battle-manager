// js/ui/ui_events.js

import { GAME } from "../core/state.js";

/**
 * Wire up UI events: start season, next day, and calendar log toggling.
 */
export function setupUIEvents({ startNewSeason, advanceDay, renderAll, statusEl }) {
  const startBtn = document.getElementById("start-season-btn");
  const nextBtn = document.getElementById("next-day-btn");
  const simulateBtn = document.getElementById("simulate-50-btn");
  const dayLabel = document.getElementById("day-label");

  const setStatus = (text) => {
    if (statusEl) {
      statusEl.textContent = text || "";
    }
  };

  const toggleButtons = (disabled) => {
    if (startBtn) startBtn.disabled = disabled;
    if (nextBtn) nextBtn.disabled = disabled;
    if (simulateBtn) simulateBtn.disabled = disabled;
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

  if (simulateBtn) {
    simulateBtn.addEventListener("click", () => {
      toggleButtons(true);
      setStatus("Simulating 50 seasons…");

      for (let i = 0; i < 50; i++) {
        startNewSeason();
        updateDayLabel(dayLabel);

        let result;
        do {
          result = advanceDay();
        } while (result && result.status !== "finished");
      }

      renderAll();
      updateDayLabel(dayLabel);
      setStatus("Finished simulating 50 seasons.");
      if (startBtn) startBtn.disabled = false;
      if (simulateBtn) simulateBtn.disabled = false;
      if (nextBtn) nextBtn.disabled = true;
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
