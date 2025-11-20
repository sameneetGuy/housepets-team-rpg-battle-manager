// js/ui/tabs.js

export function setupTabs() {
  const buttons = Array.from(document.querySelectorAll(".tab-button[data-tab-target]"));
  const panels = Array.from(document.querySelectorAll(".tab-panel"));

  if (!buttons.length || !panels.length) return;

  const activateTab = (targetId) => {
    panels.forEach((panel) => {
      const isActive = panel.id === targetId;
      panel.classList.toggle("active", isActive);
      panel.setAttribute("aria-hidden", isActive ? "false" : "true");
    });

    buttons.forEach((btn) => {
      const isActive = btn.dataset.tabTarget === targetId;
      btn.setAttribute("aria-selected", isActive ? "true" : "false");
      btn.tabIndex = isActive ? 0 : -1;
      btn.classList.toggle("active", isActive);
    });
  };

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => activateTab(btn.dataset.tabTarget));
  });

  const defaultTarget =
    buttons.find((btn) => btn.getAttribute("aria-selected") === "true")?.dataset
      .tabTarget || buttons[0].dataset.tabTarget;
  activateTab(defaultTarget);
}
