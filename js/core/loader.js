// js/core/loader.js

import { GAME } from "./state.js";

/**
 * Load fighters and the universal ability list.
 * Returns a Promise that resolves when loading is complete.
 */
export async function loadFighters() {
  let fighterResponse;
  let abilityResponse;

  try {
    [fighterResponse, abilityResponse] = await Promise.all([
      fetch("fighters.json"),
      fetch("abilities_2x3.json"),
    ]);
  } catch (err) {
    throw new Error(`Unable to reach data files: ${err.message}`);
  }

  if (!fighterResponse?.ok) {
    throw new Error(`Failed to load fighters.json: ${fighterResponse?.status}`);
  }

  if (!abilityResponse?.ok) {
    throw new Error(`Failed to load abilities_2x3.json: ${abilityResponse?.status}`);
  }

  let fightersJson;
  let abilitiesJson;
  try {
    fightersJson = await fighterResponse.json();
  } catch (err) {
    throw new Error(`Invalid fighters.json: ${err.message}`);
  }

  try {
    abilitiesJson = await abilityResponse.json();
  } catch (err) {
    throw new Error(`Invalid abilities_2x3.json: ${err.message}`);
  }

  // Store raw fighters
  GAME.fighters = fightersJson;

  // Stable order of fighters (by id)
  GAME.fighterOrder = Object.keys(fightersJson);

  // Universal abilities
  GAME.abilities = Array.isArray(abilitiesJson) ? abilitiesJson : [];
  GAME.abilityMap = {};
  for (const ability of GAME.abilities) {
    if (ability?.id) {
      GAME.abilityMap[ability.id] = ability;
    }
  }

  // Normalize fighter fields
  for (const fid of GAME.fighterOrder) {
    const f = GAME.fighters[fid];

    // Ensure title stats exist (for multi-season tracking)
    f.leagueTitles = f.leagueTitles || 0;
    f.cupTitles = f.cupTitles || 0;
    f.superCupTitles = f.superCupTitles || 0;

    // Ensure maxHP exists (should already be in fighters.json)
    if (typeof f.maxHP !== "number") {
      f.maxHP = f.role === "Tank" ? 4 : 3;
    }
  }
}
