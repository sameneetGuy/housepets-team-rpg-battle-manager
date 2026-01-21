/**
 * Roll dice using standard notation (e.g., "2d6", "1d4+2", "1d8-1")
 * @param {string} notation - Dice notation
 * @returns {number} - Total roll result
 */
export function roll(notation) {
  if (!notation) return 0;

  const match = notation.match(/(\d+)d(\d+)([+-]\d+)?/);
  if (!match) return 0;

  const count = parseInt(match[1]);
  const sides = parseInt(match[2]);
  const modifier = parseInt(match[3] || "0");

  let total = 0;
  for (let i = 0; i < count; i++) {
    total += Math.floor(Math.random() * sides) + 1;
  }

  return total + modifier;
}

/**
 * Roll a single die
 */
export function rollDice(sides) {
  return Math.floor(Math.random() * sides) + 1;
}

/**
 * Roll with advantage (roll twice, take higher)
 */
export function rollWithAdvantage(notation) {
  const roll1 = roll(notation);
  const roll2 = roll(notation);
  return Math.max(roll1, roll2);
}

/**
 * Roll with disadvantage (roll twice, take lower)
 */
export function rollWithDisadvantage(notation) {
  const roll1 = roll(notation);
  const roll2 = roll(notation);
  return Math.min(roll1, roll2);
}
