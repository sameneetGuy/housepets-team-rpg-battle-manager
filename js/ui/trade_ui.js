import { BASE_TEAMS } from "../data/teams.js";
import { fighters } from "../data/fighters.js";
import { validateTrade } from "../trading/trade_rules.js";
import { executeTrade } from "../trading/trade_exec.js";

export function attemptTrade() {
  const teamA = document.getElementById("trade-teamA").value;
  const fighterA = document.getElementById("trade-fighterA").value;
  const teamB = document.getElementById("trade-teamB").value;
  const fighterB = document.getElementById("trade-fighterB").value;

  const result = validateTrade(teamA, fighterA, teamB, fighterB);

  const output = document.getElementById("trade-result");

  if (!result.ok) {
    output.innerHTML = `<span style='color:red;'>${result.reason}</span>`;
    return;
  }

  executeTrade(teamA, fighterA, teamB, fighterB);
  output.innerHTML = `<span style='color:green;'>Trade completed!</span>`;
}
