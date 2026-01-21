# 2×3 Battle System Design

This document freezes the core rules for the new 2×3 battle system before implementation.

## Roles and Base Stats
- **Roles:** Tank, DPS, Support (with hybrid combinations).
- **Stats:** Attack, Defense, Speed.
- **HP by Role:** Tanks range from 9-11 HP, DPS range from 6-8 HP, Support range from 5-7 HP.
- **Stat Ranges:** Base Attack/Defense/Speed between 1 and 6.
- **Buff/Debuff Caps:** Individual stat modifiers capped at ±3 with a minimum effective stat floor of 0 and an overall combat stat cap of 8.
- **Damage:** Attacks use dice rolls for variable damage output.
- **Other Limits:** No revives and no overheal.

## Grid and Movement
- **Board:** 2×3 grid per team with positions [Front/Back] × [Left/Center/Right].
- **Movement:** A fighter may move one tile instead of using an ability on their turn. Movement replaces the action.
- **Step-In:** Certain melee abilities allow a temporary step-in to reach backline targets; positions revert after resolution.

## Targeting Rules
- **Melee:** Targets the same-lane front enemy by default; some abilities permit diagonal targeting.
- **Step-In Melee:** May strike back row in the same lane (and allowed diagonals) without permanently moving.
- **Projectiles:**
  - From center: may target any enemy tile.
  - From left: may target left and center columns.
  - From right: may target right and center columns.
- **AoE:** Each fighter has one once-per-battle ability shaped as defined (front row, column, cone, two random spaces, etc.).
- **Random Targeting:** "Hit 2 random spaces" selects from valid targetable tiles for the ability.

## Support Rules
- **Heal:** Restores HP using dice rolls with long cooldowns, cannot revive, and is interruptible.
- **Shield:** Absorbs damage, decays each turn, and does not stack.
- **Kit Constraint:** Each Support kit contains only one pure heal ability.

## Dice-Based Damage and Healing

### Damage
- All damage abilities now use dice notation (e.g., "1d6").
- Base damage is modified by (Attack - Defense).
- Minimum damage is always 1 once a hit check passes.

**Damage Types:**
- Light attacks: 1d4 (1-4 damage).
- Medium attacks: 1d6 (1-6 damage).
- Heavy attacks: 1d8 (1-8 damage).
- Ultimate abilities: 2d6 (2-12 damage).

### Healing
- Heals use dice notation (e.g., "1d4").
- No stat modifiers apply to healing.
- Healing output stays below damage output for attrition.

**Heal Types:**
- Basic heals: 1d4 (1-4 HP restored).
- Strong heals: 1d6 (1-6 HP restored).
- Ultimate heals: 2d4 (2-8 HP restored).

### Shields
- Shields absorb damage instead of blocking completely.
- Shield value decreases when hit.
- Shields decay by 1 each turn.
- Shields do not stack; higher values replace lower ones.

**Shield Types:**
- Basic shields: 1d4 (1-4 damage absorbed).
- Medium shields: 1d6 (1-6 damage absorbed).
- Strong shields: 2d4 (2-8 damage absorbed).

### HP Pools
- Tank: 9-11 HP (depending on subrole).
- DPS: 6-8 HP (depending on subrole).
- Support: 5-7 HP (depending on subrole).
- Hybrids: average of their two roles.

## Stat System Design

### Four Stats: Attack, Defense, Speed, Precision

**Attack (A):**
- Increases damage output.
- Added to damage dice: Damage = DamageDice + (Attack - Defense).
- Range: 1-6.

**Defense (D):**
- Reduces incoming damage.
- Subtracted from attacker's bonus: Damage = DamageDice + (Attack - Defense).
- Range: 1-6.

**Speed (S):**
- Determines turn order (higher = goes first).
- Breaks ties randomly.
- Range: 2-5.

**Precision (P):**
- Used for debuff accuracy contests.
- Debuff hit check: D20 + Caster Precision vs D20 + Target Precision.
- Does NOT affect healing (heals use dice only).
- Range: 0-4 (0 = physical fighters, 4 = specialists).

### Stat Point Budgets by Role

**Tanks: 12 total points**
- Most versatile role.
- High survivability, moderate damage.
- Example: Defender (1/6/2/3), BruiserTank (4/4/2/2).

**DPS: 11 total points**
- Specialist damage dealers.
- High attack, low defense (glass cannons allowed).
- Example: Berserker (6/1/4/0), Striker (5/2/4/0).

**Support: 10 total points**
- Fragile utility role.
- Low combat stats, high precision.
- Example: Healer (1/2/3/4), Debuffer (1/2/3/4).

**Hybrids:**
- Tank hybrids: 12 points (maintain tank durability).
- DPS hybrids: 11 points (average of Support 10 + DPS 11).
- Example: Paladin (2/5/2/3), Leader (4/2/3/2).

### Design Philosophy

Each subrole has a **clear identity** with meaningful strengths and weaknesses:

- **Berserker** (6/1/4/0): Highest attack, paper defense, pure physical.
- **Defender** (1/6/2/3): Lowest attack, highest defense, good resistance.
- **Healer** (1/2/3/4): Minimal damage, fragile, maximum precision.
- **Agile** (4/2/5/0): Speed demon, goes first, good attack.
- **Debuffer** (1/2/3/4): No damage, fragile, lands every hex.

Wide stat ranges (1-6) create meaningful differences between fighters. A Berserker (A:6) deals significantly more damage than a Defender (A:1), creating clear role distinction.

## Turn and Combat Flow
- Turn order is determined by Speed among living fighters and advances through a queue per round.
- On a fighter's turn they choose to move or use an ability.
- Ability resolution enforces targeting rules, applies damage/heal/shield/buffs/debuffs, respects caps, applies cooldowns, and marks ultimates used.
- Interruptible abilities fail if the caster has taken damage earlier in the round.
- Win condition: a team loses when all three fighters are KO’d.
