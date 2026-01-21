# Housepets Team RPG Battle Manager

**Version 2.0 - Stat System Redesign**

A 3v3 tactical autobattler with league, cup, and playoff systems inspired by sports managers. Features a sophisticated 2×3 grid battle system with positioning, abilities, buffs, debuffs, and hybrid role support.

## Features

- **2×3 Grid Tactical Combat** - Positioning matters with front/back rows
- **Dice-Based Combat** - Damage and healing use dice rolls for variety
- **Hybrid Roles** - Fighters can have multiple role types (Tank+DPS, Support+DPS, etc.)
- **League System** - Full season with conferences, playoffs, cups, and supercup
- **Trading System** - Offseason trading between teams
- **36 Unique Fighters** - Each with distinct abilities and roles

## How to Play

1. **Start New Season** - Begin a fresh league season
2. **Next Day** - Advance through league matches, playoffs, and cups
3. **Simulate 50 Seasons** - Fast-forward for long-term results
4. **Offseason Trading** - Manage your roster between seasons

## Battle System

### Roles
- **Tank** - High HP (9-11), protects allies, taunts enemies
  - 12 stat points: Balanced and durable
  - High defense (4-6), low-medium attack (1-4)
- **DPS** - Medium HP (6-8), deals damage, finishes low-HP targets
  - 11 stat points: Specialists with clear weaknesses
  - High attack (4-6), low defense (1-4), varied speed
- **Support** - Low HP (5-7), heals allies, buffs team, debuffs enemies
  - 10 stat points: Fragile utility with high precision
  - Low attack (1-2), high precision (2-4) for abilities
- **Hybrids** - Combine two roles (e.g., Paladin = Tank+Support)
  - 11-12 stat points depending on role combination

### Combat Flow
1. Turn order determined by Speed stat
2. Fighters choose to move OR use an ability
3. Damage calculated with dice + (Attack - Defense)
4. Healing uses dice (no stat modifiers)
5. Shields absorb damage and decay over time
6. Buffs/debuffs modify stats with duration tracking

### Stats
- **Attack** - Increases damage dealt (range: 1-6)
- **Defense** - Reduces damage taken (range: 1-6)
- **Speed** - Determines turn order (range: 2-5)
- **Precision** - Accuracy for debuffs and special abilities (range: 0-4)

Damage formula: Dice + (Attack - Defense), minimum 1  
Healing formula: Dice only (no stat modifiers)  
Debuff accuracy: D20 + Precision vs D20 + Precision

## Changelog

### Version 2.0 - Stat System Redesign (January 2026)
- **BREAKING CHANGE:** Complete stat system overhaul
- Added 4th stat: Precision (affects debuff accuracy)
- Rebalanced all 27 subroles with unique stat distributions
- Wider stat ranges (1-6 instead of 2-5) for more variety
- Role-based point budgets: Tanks 12, DPS 11, Support 10
- Each subrole now has clear identity and meaningful tradeoffs
- Note: Not compatible with pre-2.0 save data

## Credits

- Based on characters from [Housepets!](https://www.housepetscomic.com/) webcomic
- Inspired by sports management games like Football Manager

## License

**Code:** MIT License (see LICENSE file)

**Characters:** All character names and personalities are property of Rick Griffin and the Housepets! webcomic. Used with respect as a fan project.
