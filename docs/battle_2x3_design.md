# 2×3 Battle System Design

This document freezes the core rules for the new 2×3 battle system before implementation.

## Roles and Base Stats
- **Roles:** Tank, DPS, Support.
- **Stats:** Attack, Defense, Speed.
- **HP by Role:** Tank = 4 HP, DPS = 3 HP, Support = 3 HP.
- **Stat Ranges:** Base Attack/Defense/Speed between 1 and 6.
- **Buff/Debuff Caps:** Individual stat modifiers capped at ±3 with a minimum effective stat floor of 0 and an overall combat stat cap of 8.
- **Damage:** All normal attacks deal 1 HP of damage.
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
- **Heal:** Restores 1 HP to a single target, uses a long cooldown, cannot revive, and is interruptible.
- **Shield:** Blocks the next 1 damage; lasts until the target’s next turn; does not stack.
- **Kit Constraint:** Each Support kit contains only one pure heal ability.

## Turn and Combat Flow
- Turn order is determined by Speed among living fighters and advances through a queue per round.
- On a fighter's turn they choose to move or use an ability.
- Ability resolution enforces targeting rules, applies damage/heal/shield/buffs/debuffs, respects caps, applies cooldowns, and marks ultimates used.
- Interruptible abilities fail if the caster has taken damage earlier in the round.
- Win condition: a team loses when all three fighters are KO’d.
