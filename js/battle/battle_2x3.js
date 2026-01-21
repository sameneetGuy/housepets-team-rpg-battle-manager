// js/battle/battle_2x3.js
// New 2×3 esports battle engine built for the universal ability list.

import { GAME } from "../core/state.js";
import { roll } from "../core/dice.js";

const POSITIONS = ["FL", "FC", "FR", "BL", "BC", "BR"];
const BUFF_CAP = 3;
const STAT_CAP = 8;
const DEBUG = false;

class TargetingError extends Error {
  constructor(message) {
    super(message);
    this.name = "TargetingError";
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function validateFighterState(fighter) {
  if (!DEBUG || !fighter) return;
  assert(typeof fighter.hp === "number", "Fighter hp must be a number.");
  assert(typeof fighter.maxHP === "number", "Fighter maxHP must be a number.");
  assert(fighter.hp >= 0 && fighter.hp <= fighter.maxHP, "Fighter hp out of bounds.");
  assert(fighter.shieldValue >= 0, "Fighter shieldValue must be >= 0.");
  assert(
    fighter.buffs.every((b) => (b.duration ?? 1) > 0),
    "Fighter buffs must have positive duration.",
  );
  assert(
    fighter.debuffs.every((d) => (d.duration ?? 1) > 0),
    "Fighter debuffs must have positive duration.",
  );
  if (fighter.cooldowns) {
    for (const key of Object.keys(fighter.cooldowns)) {
      assert((fighter.cooldowns[key] || 0) >= 0, "Fighter cooldowns must be >= 0.");
    }
  }
}

function indexToCoord(idx) {
  const row = idx < 3 ? 0 : 1;
  const col = idx % 3;
  return { row, col };
}

function coordToIndex(row, col) {
  return row * 3 + col;
}

function randomChoice(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function createFighterInstance(base) {
  return {
    ...base,
    hp: base.maxHP,
    buffs: [],
    debuffs: [],
    shieldValue: 0,
    shieldDecay: 0,
    cooldowns: {},
    usedUltimate: false,
  };
}

function cloneFighterForBattle(base) {
  const instance = createFighterInstance(base);
  validateFighterState(instance);
  return instance;
}

function createTeamState(fighters) {
  const grid = Array(6).fill(null);
  const fighterMap = {};
  fighters.forEach((f, idx) => {
    const instance = cloneFighterForBattle(f);
    const pos = idx < 3 ? idx : 3 + (idx - 3);
    grid[pos] = instance.id;
    fighterMap[instance.id] = instance;
  });
  return { fighters: fighterMap, grid };
}

function getTeamKey(ref) {
  return ref.team === "A" ? "teamA" : "teamB";
}

function getEnemyKey(ref) {
  return ref.team === "A" ? "teamB" : "teamA";
}

function findPosition(teamState, fighterId) {
  const idx = teamState.grid.indexOf(fighterId);
  return idx >= 0 ? idx : null;
}

function getPositionOfFighter(state, fighterId) {
  const idxA = findPosition(state.teamA, fighterId);
  if (idxA != null) return { team: "A", index: idxA, ...indexToCoord(idxA) };
  const idxB = findPosition(state.teamB, fighterId);
  if (idxB != null) return { team: "B", index: idxB, ...indexToCoord(idxB) };
  return null;
}

function getFighter(state, ref) {
  const teamState = ref.team === "A" ? state.teamA : state.teamB;
  return teamState.fighters[ref.id] || null;
}

function isAlive(f) {
  return f && f.hp > 0;
}

function statModifierTotal(fighter, stat) {
  let total = 0;
  for (const buff of fighter.buffs) {
    if (buff.stat === stat) total += buff.amount || 0;
  }
  for (const debuff of fighter.debuffs) {
    if (debuff.stat === stat) total += debuff.amount || 0;
  }
  return Math.max(-BUFF_CAP, Math.min(BUFF_CAP, total));
}

function getEffectiveStat(fighter, stat) {
  const base = fighter[stat] || 0;
  const mod = statModifierTotal(fighter, stat);
  const total = Math.max(0, Math.min(STAT_CAP, base + mod));
  return total;
}

function rollD20() {
  return Math.floor(Math.random() * 20) + 1;
}

function calculateDamage(ability, attacker, defender) {
  const baseRoll = roll(ability.damageDice);
  if (baseRoll === 0) return 0;

  const atkMod = getEffectiveStat(attacker, "attack");
  const defMod = getEffectiveStat(defender, "defense");
  const statBonus = atkMod - defMod;

  return Math.max(1, baseRoll + statBonus);
}

function calculateHealing(ability) {
  if (!ability.healDice) return 0;
  return roll(ability.healDice);
}

function calculateShield(ability) {
  if (!ability.shieldDice) return 0;
  return roll(ability.shieldDice);
}

// Contest attack vs defense to determine if a damaging ability hits.
function attemptAttackHit(state, caster, target, ability) {
  const atk = getEffectiveStat(caster, "attack");
  const def = getEffectiveStat(target, "defense");
  const attackRoll = rollD20() + atk;
  const defenseRoll = rollD20() + def;

  if (attackRoll >= defenseRoll) {
    return true;
  } else {
    state.log.push(`${caster.name}'s ${ability.name} misses ${target.name}.`);
    return false;
  }
}

// Contest speed vs speed to determine if a pure debuff lands.
function attemptDebuffHit(state, caster, target, ability) {
  const atkStat = caster.precision !== undefined
    ? getEffectiveStat(caster, "precision")
    : getEffectiveStat(caster, "speed");
  const defStat = target.precision !== undefined
    ? getEffectiveStat(target, "precision")
    : getEffectiveStat(target, "speed");
  const attackRoll = rollD20() + atkStat;
  const defenseRoll = rollD20() + defStat;

  if (attackRoll >= defenseRoll) {
    return true;
  } else {
    state.log.push(`${caster.name}'s ${ability.name} fails to affect ${target.name}.`);
    return false;
  }
}

function applyBuffs(target, buffArray) {
  if (!Array.isArray(buffArray)) return;
  for (const buff of buffArray) {
    if (buff?.stat && typeof buff.amount === "number") {
      target.buffs.push({ ...buff, duration: buff.duration ?? 1 });
    }
  }
  validateFighterState(target);
}

function applyDebuffs(target, debuffArray) {
  if (!Array.isArray(debuffArray)) return;
  for (const debuff of debuffArray) {
    if (debuff?.stat && typeof debuff.amount === "number") {
      target.debuffs.push({ ...debuff, duration: debuff.duration ?? 1 });
    }
  }
  validateFighterState(target);
}

function tickEffects(teamState) {
  for (const fighterId of Object.keys(teamState.fighters)) {
    const f = teamState.fighters[fighterId];
    f.buffs = f.buffs
      .map((b) => ({ ...b, duration: (b.duration || 1) - 1 }))
      .filter((b) => (b.duration || 0) > 0);
    f.debuffs = f.debuffs
      .map((d) => ({ ...d, duration: (d.duration || 1) - 1 }))
      .filter((d) => (d.duration || 0) > 0);
    validateFighterState(f);
  }
}

function applyShield(target, amount) {
  if (amount <= 0) return;
  target.shieldValue = Math.max(target.shieldValue, amount);
  target.shieldDecay = 1;
  validateFighterState(target);
}

function applyHeal(source, target, amount, log) {
  if (!isAlive(target)) return;
  const before = target.hp;
  target.hp = Math.min(target.maxHP, target.hp + amount);
  const healed = target.hp - before;
  if (healed > 0) {
    log.push(`${source.name} heals ${target.name} for ${healed} HP.`);
  }
  validateFighterState(target);
}

function dealDamage(state, source, targetRef, amount, log) {
  const targetTeam = targetRef.team === "A" ? state.teamA : state.teamB;
  const target = targetTeam.fighters[targetRef.id];
  if (!isAlive(target)) return;

  let damage = amount;

  if (target.shieldValue > 0) {
    const blocked = Math.min(target.shieldValue, damage);
    target.shieldValue -= blocked;
    damage -= blocked;

    if (blocked > 0) {
      log.push(`${source.name}'s attack hits ${target.name}'s shield (blocked ${blocked} damage).`);
    }

    if (damage === 0) {
      state.flags.interrupted[targetRef.id] = true;
      validateFighterState(target);
      return;
    }
  }

  target.hp = Math.max(0, target.hp - damage);
  log.push(`${source.name} hits ${target.name} for ${damage} damage!`);
  state.flags.interrupted[targetRef.id] = true;
  if (target.hp === 0) {
    log.push(`${target.name} is KO'd!`);
  }
  validateFighterState(target);
}

function tickShield(fighter) {
  if (fighter.shieldValue > 0) {
    fighter.shieldValue = Math.max(0, fighter.shieldValue - (fighter.shieldDecay || 1));
  }
  validateFighterState(fighter);
}

function setPosition(teamState, idx, fighterId) {
  const currentIndex = findPosition(teamState, fighterId);
  if (currentIndex != null) {
    teamState.grid[currentIndex] = null;
  }
  teamState.grid[idx] = fighterId;
}

function getAdjacentEmptyPositions(teamState, idx) {
  const { row, col } = indexToCoord(idx);
  const moves = [];
  for (let r = Math.max(0, row - 1); r <= Math.min(1, row + 1); r++) {
    for (let c = Math.max(0, col - 1); c <= Math.min(2, col + 1); c++) {
      if (r === row && c === col) continue;
      const candidate = coordToIndex(r, c);
      if (teamState.grid[candidate] == null) moves.push(candidate);
    }
  }
  return moves;
}

function columnAllowedForProjectile(col, casterCol) {
  if (casterCol === 1) return true; // center can hit any column
  if (casterCol === 0) return col <= 1; // left or center
  if (casterCol === 2) return col >= 1; // right or center
  return true;
}

function collectEnemyTargets(state, casterRef, ability) {
  if (lowAlly && teamState.fighters[lowAlly.id]?.hp < teamState.fighters[lowAlly.id]?.maxHP * 0.7) {
  const casterPos = getPositionOfFighter(state, casterRef.id);
  if (!casterPos) return [];

  const targets = [];
  const range = ability.range || {};

  if (range.delivery === "projectile") {
    for (let i = 0; i < enemyTeam.grid.length; i++) {
      const fid = enemyTeam.grid[i];
      if (!fid) continue;
      const fighter = enemyTeam.fighters[fid];
      if (!isAlive(fighter)) continue;
      const { col } = indexToCoord(i);
      if (columnAllowedForProjectile(col, casterPos.col)) {
        targets.push({ team: enemyTeamKey === "teamA" ? "A" : "B", id: fid, index: i, ...indexToCoord(i) });
      }
    }
    return targets;
  }

  // melee / support targeting against enemies
  const allowedCols = new Set([casterPos.col]);
  if (range.diagonal) {
    allowedCols.add(Math.max(0, casterPos.col - 1));
    allowedCols.add(Math.min(2, casterPos.col + 1));
  }

  const considerBack = range.stepIn === true;

  for (let i = 0; i < enemyTeam.grid.length; i++) {
    const fid = enemyTeam.grid[i];
    if (!fid) continue;
    const fighter = enemyTeam.fighters[fid];
    if (!isAlive(fighter)) continue;
    const { row, col } = indexToCoord(i);
    if (!allowedCols.has(col)) continue;

    if (row === 0) {
      targets.push({ team: enemyTeamKey === "teamA" ? "A" : "B", id: fid, index: i, row, col });
    } else if (considerBack) {
      targets.push({ team: enemyTeamKey === "teamA" ? "A" : "B", id: fid, index: i, row, col });
    }
  }

  return targets;
}

function collectAllyTargets(state, casterRef, ability) {
  const teamKey = getTeamKey(casterRef);
  const teamState = teamKey === "teamA" ? state.teamA : state.teamB;
  const casterPos = getPositionOfFighter(state, casterRef.id);
  if (!casterPos) return [];
  const range = ability.range || {};

  if (range.pattern === "team") {
    return Object.keys(teamState.fighters)
      .map((id) => ({ team: teamKey === "teamA" ? "A" : "B", id, index: findPosition(teamState, id), ...indexToCoord(findPosition(teamState, id)) }))
      .filter((ref) => isAlive(teamState.fighters[ref.id]));
  }

  const allowedCols = new Set();
  if (range.lanes === "self") {
    allowedCols.add(casterPos.col);
  } else if (range.lanes === "same_lane") {
    allowedCols.add(casterPos.col);
  } else if (range.lanes === "same_or_adjacent") {
    allowedCols.add(casterPos.col);
    allowedCols.add(Math.max(0, casterPos.col - 1));
    allowedCols.add(Math.min(2, casterPos.col + 1));
  } else {
    allowedCols.add(0);
    allowedCols.add(1);
    allowedCols.add(2);
  }

  const refs = [];
  for (let i = 0; i < teamState.grid.length; i++) {
    const fid = teamState.grid[i];
    if (!fid) continue;
    const fighter = teamState.fighters[fid];
    if (!isAlive(fighter)) continue;
    const { col } = indexToCoord(i);
    if (range.target === "self" && fid !== casterRef.id) continue;
    if (range.lanes === "self" && fid !== casterRef.id) continue;
    if (!allowedCols.has(col)) continue;
    refs.push({ team: teamKey === "teamA" ? "A" : "B", id: fid, index: i, ...indexToCoord(i) });
  }
  return refs;
}

function filterPatternTargets(candidates, casterPos, pattern) {
  if (pattern === "front_row") {
    return candidates.filter((t) => t.row === 0);
  }
  if (pattern === "column") {
    return candidates.filter((t) => t.col === casterPos.col);
  }
  if (pattern === "cone") {
    return candidates.filter((t) => t.col >= casterPos.col - 1 && t.col <= casterPos.col + 1 && t.row <= 1);
  }
  return candidates;
}

function isValidTargetForAbility(state, casterRef, casterPos, ability, targetRef) {
  const targetTeam = targetRef.team === "A" ? state.teamA : state.teamB;
  const target = targetTeam.fighters[targetRef.id];
  if (!isAlive(target)) return false;

  const range = ability.range || {};
  if (ability.target === "enemy") {
    if (range.delivery === "projectile") {
      return columnAllowedForProjectile(targetRef.col, casterPos.col);
    }

    const allowedCols = new Set([casterPos.col]);
    if (range.diagonal) {
      allowedCols.add(Math.max(0, casterPos.col - 1));
      allowedCols.add(Math.min(2, casterPos.col + 1));
    }
    if (!allowedCols.has(targetRef.col)) return false;

    if (range.stepIn !== true && targetRef.row !== 0) return false;

    if (range.stepIn === true && targetRef.row === 1) {
      const enemyTeam = casterPos.team === "A" ? state.teamB : state.teamA;
      const frontIdx = coordToIndex(0, targetRef.col);
      if (enemyTeam.grid[frontIdx]) return false;
    }
  }

  if (ability.target === "ally" || ability.target === "self") {
    const allowedCols = new Set();
    if (range.lanes === "self" || range.lanes === "same_lane") {
      allowedCols.add(casterPos.col);
    } else if (range.lanes === "same_or_adjacent") {
      allowedCols.add(casterPos.col);
      allowedCols.add(Math.max(0, casterPos.col - 1));
      allowedCols.add(Math.min(2, casterPos.col + 1));
    } else {
      allowedCols.add(0);
      allowedCols.add(1);
      allowedCols.add(2);
    }

    if (!allowedCols.has(targetRef.col)) return false;
    if (range.target === "self" && targetRef.id !== casterRef.id) return false;
    if (range.lanes === "self" && targetRef.id !== casterRef.id) return false;
  }

  return true;
}

function validateTargets(state, casterRef, casterPos, ability, targets) {
  if (targets.length === 0) {
    throw new TargetingError(`No valid targets for ${ability.name}.`);
  }

  for (const targetRef of targets) {
    if (!isValidTargetForAbility(state, casterRef, casterPos, ability, targetRef)) {
      throw new TargetingError(`Invalid target for ${ability.name}.`);
    }
  }
}

function selectTargets(state, casterRef, ability, preferredTargetId = null) {
  const casterPos = getPositionOfFighter(state, casterRef.id);
  if (!casterPos) return [];
  const pattern = ability.range?.pattern || "single";
  let candidates = [];

  if (ability.target === "ally" || ability.target === "self") {
    candidates = collectAllyTargets(state, casterRef, ability);
  } else {
    candidates = collectEnemyTargets(state, casterRef, ability);
  }

  candidates = filterPatternTargets(candidates, casterPos, pattern);

  if (pattern === "random2") {
    const picks = shuffle(candidates).slice(0, 2);
    validateTargets(state, casterRef, casterPos, ability, picks);
    if (picks.length < 2) {
      state.log.push(`Warning: ${ability.name} has fewer than 2 targets.`);
    }
    return picks;
  }

  if (pattern === "random") {
    const pick = randomChoice(candidates);
    const picks = pick ? [pick] : [];
    validateTargets(state, casterRef, casterPos, ability, picks);
    return picks;
  }

  if (pattern === "team") {
    validateTargets(state, casterRef, casterPos, ability, candidates);
    return candidates;
  }

  if (pattern !== "single") {
    validateTargets(state, casterRef, casterPos, ability, candidates);
    return candidates;
  }

  if (preferredTargetId) {
    const found = candidates.find((t) => t.id === preferredTargetId);
    if (found) {
      validateTargets(state, casterRef, casterPos, ability, [found]);
      return [found];
    }
  }

  const selection = candidates.length > 0 ? [candidates[0]] : [];
  validateTargets(state, casterRef, casterPos, ability, selection);
  return selection;
}

function abilityReady(fighter, ability) {
  if (!ability) return false;
  if (ability.oncePerBattle && fighter.usedUltimate && fighter.ultimateId === ability.id) return false;
  const cd = fighter.cooldowns?.[ability.id] || 0;
  return cd <= 0;
}

function reduceCooldowns(fighter) {
  for (const key of Object.keys(fighter.cooldowns)) {
    fighter.cooldowns[key] = Math.max(0, (fighter.cooldowns[key] || 0) - 1);
  }
  validateFighterState(fighter);
}

function applyAbility(state, casterRef, ability, chosenTargetId = null) {
  const caster = getFighter(state, casterRef);
  if (!caster) return;

  let targets = [];
  try {
    targets = selectTargets(state, casterRef, ability, chosenTargetId);
  } catch (error) {
    if (error instanceof TargetingError) {
      state.log.push(`Targeting error: ${error.message}`);
      return;
    }
    throw error;
  }

  if (ability.interruptible && state.flags.interrupted[casterRef.id]) {
    state.log.push(`${caster.name}'s ${ability.name} is interrupted!`);
    return;
  }

  const effect = ability.effect || {};
  const isEnemyTarget = ability.target === "enemy";

  for (const targetRef of targets) {
    const teamState = targetRef.team === "A" ? state.teamA : state.teamB;
    const target = teamState.fighters[targetRef.id];
    if (!isAlive(target)) continue;

    // --- Hit checks for enemy-targeting abilities ---
    // Hit check precedence: damage hit check first, then pure debuff checks.
    if (isEnemyTarget) {
      const hasDamage = !!ability.damageDice || !!effect.damage;
      const hasDebuffs = Array.isArray(effect.debuffs) && effect.debuffs.length > 0;

      let hit = true;
      if (hasDamage) {
        hit = attemptAttackHit(state, caster, target, ability);
      } else if (hasDebuffs && ability.category === "debuff") {
        hit = attemptDebuffHit(state, caster, target, ability);
      }
      
      if (!hit) continue;
    }

    if (ability.damageDice) {
      const damage = calculateDamage(ability, caster, target);
      dealDamage(state, caster, targetRef, damage, state.log);
    }

    if (ability.healDice) {
      const healAmount = calculateHealing(ability);
      applyHeal(caster, target, healAmount, state.log);
    }

    if (ability.shieldDice) {
      const shieldValue = calculateShield(ability);
      applyShield(target, shieldValue);
      state.log.push(`${caster.name} shields ${target.name} (${shieldValue} absorption).`);
    }

    if (effect.damage && !ability.damageDice) {
      dealDamage(state, caster, targetRef, effect.damage, state.log);
    }

    if (effect.heal && !ability.healDice) {
      applyHeal(caster, target, effect.heal, state.log);
    }

    if (effect.shield && !ability.shieldDice) {
      applyShield(target, effect.shield);
      state.log.push(`${caster.name} shields ${target.name}.`);
    }

    if (effect.buffs && effect.buffs.length > 0 && ability.target !== "enemy") {
      applyBuffs(target, effect.buffs);
      state.log.push(`${caster.name} buffs ${target.name}.`);
    }

    if (effect.debuffs && effect.debuffs.length > 0 && ability.target !== "ally") {
      applyDebuffs(target, effect.debuffs);
      state.log.push(`${caster.name} weakens ${target.name}.`);
    }
  }

  const postEffect = ability.postEffect;
  if (postEffect) {
    const teamKey = getTeamKey(casterRef);
    const teamState = teamKey === "teamA" ? state.teamA : state.teamB;
    const allies = Object.values(teamState.fighters).filter((f) => isAlive(f));

    if (postEffect.allyShield && allies.length > 0) {
      const ally = randomChoice(allies);
      const shieldValue = roll(postEffect.allyShield);
      applyShield(ally, shieldValue);
      state.log.push(`${caster.name} shields ${ally.name} (${shieldValue} absorption).`);
    }

    if (postEffect.allyHeal && allies.length > 0) {
      const lowest = allies.reduce((best, current) => (current.hp < best.hp ? current : best), allies[0]);
      const healAmount = roll(postEffect.allyHeal);
      applyHeal(caster, lowest, healAmount, state.log);
    }

    if (postEffect.allyBuff && allies.length > 0) {
      const ally = randomChoice(allies);
      applyBuffs(ally, [postEffect.allyBuff]);
      state.log.push(`${caster.name} buffs ${ally.name}.`);
    }

    if (postEffect.teamBuff && allies.length > 0) {
      for (const ally of allies) {
        applyBuffs(ally, [postEffect.teamBuff]);
      }
      state.log.push(`${caster.name} rallies the team.`);
    }
  }

  if (ability.oncePerBattle && caster.ultimateId === ability.id) {
    caster.usedUltimate = true;
  }

  if (ability.cooldown && ability.cooldown > 0) {
    caster.cooldowns[ability.id] = ability.cooldown;
  }
}

function aliveFighters(state) {
  const list = [];
  for (const id of Object.keys(state.teamA.fighters)) {
    if (isAlive(state.teamA.fighters[id])) list.push({ team: "A", id });
  }
  for (const id of Object.keys(state.teamB.fighters)) {
    if (isAlive(state.teamB.fighters[id])) list.push({ team: "B", id });
  }
  return list;
}

function buildTurnOrder(state) {
  const all = aliveFighters(state);
  return all
    .map((ref) => {
      const fighter = getFighter(state, ref);
      return { ...ref, speed: getEffectiveStat(fighter, "speed"), name: fighter.name };
    })
    .sort((a, b) => {
      if (b.speed !== a.speed) return b.speed - a.speed;
      return a.name.localeCompare(b.name);
    });
}

function isTeamDefeated(teamState) {
  return Object.values(teamState.fighters).every((f) => !isAlive(f));
}

function chooseBestTarget(targets, teamState) {
  let best = null;
  let bestHp = Infinity;
  for (const ref of targets) {
    const fighter = teamState.fighters[ref.id];
    if (!fighter) continue;
    if (fighter.hp < bestHp) {
      bestHp = fighter.hp;
      best = ref;
    }
  }
  return best;
}

function chooseAction(state, casterRef) {
  const caster = getFighter(state, casterRef);
  const subroleData = state.lookups.subroleMap?.[caster.subRole] || state.lookups.subroles?.[caster.subRole];
  const roles = subroleData?.roles || caster.roles || [subroleData?.role || caster.role].filter(Boolean);
  const isSupport = roles.includes("Support");
  const isDps = roles.includes("DPS");
  const teamKey = getTeamKey(casterRef);
  const teamState = teamKey === "teamA" ? state.teamA : state.teamB;
  const enemyKey = getEnemyKey(casterRef);
  const enemyState = enemyKey === "teamA" ? state.teamA : state.teamB;

  const abilities = (caster.abilities || [])
    .map((id) => state.lookups.abilityMap[id])
    .filter(Boolean);
  const readyAbilities = abilities.filter((ab) => abilityReady(caster, ab));

  // Healer priority
  if (isSupport) {
    const heal = readyAbilities.find((ab) => ab.category === "heal");
    if (heal) {
      let targets = [];
      try {
        targets = selectTargets(state, casterRef, heal);
      } catch (error) {
        if (error instanceof TargetingError) {
          state.log.push(`Targeting error: ${error.message}`);
          return;
        } else {
          throw error;
        }
      }
      const lowAlly = chooseBestTarget(targets, teamState);
      if (lowAlly && teamState.fighters[lowAlly.id]?.hp < teamState.fighters[lowAlly.id]?.maxHP * 0.7) {
        return { type: "ability", ability: heal, targetId: lowAlly.id };
      }
    }
  }

  // DPS finisher
  if (isDps) {
    for (const ability of readyAbilities) {
      let targets = [];
      try {
        targets = selectTargets(state, casterRef, ability);
      } catch (error) {
        if (error instanceof TargetingError) {
          targets = [];
        } else {
          throw error;
        }
      }
      const killable = targets.find((t) => enemyState.fighters[t.id]?.hp <= 3);
      if (killable) {
        return { type: "ability", ability, targetId: killable.id };
      }
    }
  }

  // Tank repositioning if in back row
  const casterPos = getPositionOfFighter(state, casterRef.id);
  if (roles.includes("Tank") && casterPos?.row === 1) {
    const frontIdx = coordToIndex(0, casterPos.col);
    if (teamState.grid[frontIdx] == null) {
      return { type: "move", targetIndex: frontIdx };
    }
  }

  // Support repositioning if exposed (no tank role)
  if (isSupport && !roles.includes("Tank") && casterPos?.row === 0) {
    const backIdx = coordToIndex(1, casterPos.col);
    if (teamState.grid[backIdx] == null) {
      return { type: "move", targetIndex: backIdx };
    }
  }

  // Choose first available ability with targets
  for (const ability of readyAbilities) {
    let targets = [];
    try {
      targets = selectTargets(state, casterRef, ability);
    } catch (error) {
      if (error instanceof TargetingError) {
        targets = [];
      } else {
        throw error;
      }
    }
    if (targets.length > 0) {
      const preferred = ability.target === "ally" ? chooseBestTarget(targets, teamState) : chooseBestTarget(targets, enemyState);
      return { type: "ability", ability, targetId: preferred?.id };
    }
  }

  // fallback: move to any adjacent empty tile
  const currentIndex = findPosition(teamState, casterRef.id);
  const moves = currentIndex != null ? getAdjacentEmptyPositions(teamState, currentIndex) : [];
  if (moves.length > 0) {
    return { type: "move", targetIndex: randomChoice(moves) };
  }

  return { type: "skip" };
}

function validateAbility(ability) {
  assert(ability.id, "Ability missing id.");
  assert(ability.name, "Ability missing name.");
  assert(ability.range, "Ability missing range.");
  assert(ability.target, "Ability missing target.");
  const hasEffect = ability.effect && Object.keys(ability.effect).length > 0;
  const hasDice = ability.damageDice || ability.healDice || ability.shieldDice;
  const hasPostEffect = ability.postEffect && Object.keys(ability.postEffect).length > 0;
  assert(hasEffect || hasDice || hasPostEffect, "Ability missing effect, postEffect, or dice.");
}

function validateAbilityData(teamA, teamB, abilityMap) {
  const fighters = [...teamA, ...teamB];
  for (const fighter of fighters) {
    for (const id of fighter.abilities || []) {
      const ability = abilityMap[id];
      assert(ability, `Missing ability for id ${id}.`);
      validateAbility(ability);
    }
  }
}

function takeTurn(state) {
  if (state.turnOrder.length === 0 || state.currentTurnIndex >= state.turnOrder.length) {
    state.turnOrder = buildTurnOrder(state);
    state.currentTurnIndex = 0;
    state.roundNumber += 1;
    state.flags.interrupted = {};
    tickEffects(state.teamA);
    tickEffects(state.teamB);
  }

  if (state.turnOrder.length === 0) return; // all fighters KO'd

  const ref = state.turnOrder[state.currentTurnIndex];
  const fighter = getFighter(state, ref);
  state.currentTurnIndex += 1;

  if (!isAlive(fighter)) return;

  tickShield(fighter);
  reduceCooldowns(fighter);

  const action = chooseAction(state, ref);
  if (action.type === "move") {
    const teamState = getTeamKey(ref) === "teamA" ? state.teamA : state.teamB;
    if (action.targetIndex != null && teamState.grid[action.targetIndex] == null) {
      setPosition(teamState, action.targetIndex, ref.id);
      state.log.push(`${fighter.name} moves to ${POSITIONS[action.targetIndex]}.`);
    }
  } else if (action.type === "ability") {
    applyAbility(state, ref, action.ability, action.targetId);
  }
}

function buildBattleState(teamA, teamB, dependencies = {}) {
  const abilityMap = dependencies.abilityMap || GAME.abilityMap;
  const subroleMap = dependencies.subroleMap || GAME.subroleMap;
  const subroles = dependencies.subroles || GAME.subroles;
  validateAbilityData(teamA, teamB, abilityMap);
  return {
    teamA: createTeamState(teamA),
    teamB: createTeamState(teamB),
    turnOrder: [],
    currentTurnIndex: 0,
    roundNumber: 0,
    log: [],
    flags: { interrupted: {} },
    lookups: { abilityMap, subroleMap, subroles },
  };
}

function determineWinner(state) {
  const aDefeated = isTeamDefeated(state.teamA);
  const bDefeated = isTeamDefeated(state.teamB);
  if (aDefeated && bDefeated) return "DRAW";
  if (aDefeated) return "B";
  if (bDefeated) return "A";
  return null;
}

export function simulateTeamBattle(teamAFighters, teamBFighters) {
  const state = buildBattleState(teamAFighters, teamBFighters);
  let safety = 500;
  while (safety-- > 0) {
    const winner = determineWinner(state);
    if (winner) {
      return { winner, log: state.log.join("\n") };
    }
    takeTurn(state);
  }
  return { winner: "DRAW", log: state.log.join("\n") + "\nTimed out" };
}

export function simulateTeamSeries(teamAFighters, teamBFighters, games = 3) {
  let aWins = 0;
  let bWins = 0;
  let combinedLog = "";

  for (let i = 0; i < games; i++) {
    const result = simulateTeamBattle(teamAFighters, teamBFighters);
    combinedLog += `Game ${i + 1}: ${result.winner}\n` + result.log + "\n";
    if (result.winner === "A") aWins++;
    else if (result.winner === "B") bWins++;
  }

  let winner = "DRAW";
  if (aWins > bWins) winner = "A";
  else if (bWins > aWins) winner = "B";

  return { winner, log: combinedLog.trim() };
}
