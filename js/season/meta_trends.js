// js/season/meta_trends.js

import { GAME } from "../core/state.js";

// Lightweight seasonal meta trends that bias AI loadout selection.
// Each entry supplies a name/description plus numeric biases that
// are added to ability scores when constructing loadouts.
const META_TRENDS = [
  {
    id: "aoe_craze",
    name: "AoE Craze",
    description: "Wide attacks and multi-target spells are in vogue; teams favor cleave damage.",
    bias: {
      aoe: 0.45,
      magic: 0.15,
    },
  },
  {
    id: "turtle_season",
    name: "Turtle Season",
    description: "Defensive shells rule the ladder—heals, buffs, and shields get priority.",
    bias: {
      support: 0.4,
      heal: 0.25,
    },
  },
  {
    id: "precision_strikes",
    name: "Precision Strikes",
    description: "Single-target burst and surgical blows trend upward; flashy AoEs fall slightly behind.",
    bias: {
      singleTarget: 0.35,
      physical: 0.15,
    },
  },
];

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function rollSeasonMetaTrend() {
  const trend = randomChoice(META_TRENDS);
  return { ...trend };
}

export function setSeasonMetaTrend(trend) {
  GAME.metaTrend = trend ? { ...trend } : null;
  if (!GAME.metaHistory) GAME.metaHistory = [];
  if (trend) {
    GAME.metaHistory.push({ season: GAME.seasonNumber || 1, ...trend });
  }
}

export function getActiveMetaTrend() {
  return GAME.metaTrend || null;
}
