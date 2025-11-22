export function getSubroleBonus(subRole) {
  if (!subRole) return 0;
  return 1; // Simple level 2 bonus system
}

export function getFighterValue(f) {
  const atk = f.attack || 0;
  const def = f.defense || 0;
  const spd = f.speed || 0;
  const bonus = getSubroleBonus(f.subRole);
  return atk + def + spd + bonus;
}
