// js/core/loader.js

import { GAME } from "./state.js";

/**
 * Load fighters from fighters.json and normalize their data a bit.
 * Returns a Promise that resolves when loading is complete.
 */
export function loadFighters() {
  return fetch("fighters.json")
    .then((r) => {
      if (!r.ok) {
        throw new Error(`Failed to load fighters.json: ${r.status}`);
      }
      return r.json();
    })
    .then((json) => {
      // Store raw fighters
      GAME.fighters = json;

      // Stable order of fighters (by id)
      GAME.fighterOrder = Object.keys(json);

      // Normalize fighter fields
      for (const fid of GAME.fighterOrder) {
        const f = GAME.fighters[fid];

        // Ensure title stats exist (for multi-season tracking)
        f.leagueTitles = f.leagueTitles || 0;
        f.cupTitles = f.cupTitles || 0;
        f.superCupTitles = f.superCupTitles || 0;

        // Ensure maxHP exists (should already be in fighters.json)
        if (typeof f.maxHP !== "number") {
          f.maxHP = 30;
        }

        // Normalize abilities a bit (rank + placeholders)
        if (Array.isArray(f.abilities)) {
          for (const ability of f.abilities) {
            // Default rank = 1 if not specified
            if (ability.rank == null) {
              ability.rank = 1;
            }

            // In the future, you might add:
            // - currentXP
            // - maxRank
            // For now we only guarantee rank exists.
          }
        } else {
          // Safety: ensure abilities is always an array
          f.abilities = [];
        }
      }
    });
}
