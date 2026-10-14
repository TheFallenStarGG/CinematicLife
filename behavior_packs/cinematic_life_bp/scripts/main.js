import "./deathHandler.js";
import "./sleepHandler.js";
import { world } from "@minecraft/server";
import { setDaysSurvived } from "./utils.js";

// Initialize days survived on first join
world.afterEvents.playerSpawn.subscribe((event) => {
  if (event.initialSpawn) {
    const player = event.player;
    if (player.getDynamicProperty("cinematic:days_survived") === undefined) {
      setDaysSurvived(player, 0);
    }
  }
});

console.warn("[Cinematic Life] Loaded successfully.");
