import "./deathHandler.js";
import "./sleepHandler.js";
import { world, system } from "@minecraft/server";
import { setDaysSurvived } from "./utils.js";
import { openConfigForm } from "./configUI.js";

// Initialize days on first join
world.afterEvents.playerSpawn.subscribe((event) => {
  if (event.initialSpawn) {
    const player = event.player;
    if (player.getDynamicProperty("cinematic:days_survived") === undefined) {
      setDaysSurvived(player, 0);
    }
  }
});

// Simple command to open config: !cinematic or !cl
world.beforeEvents.chatSend.subscribe((event) => {
  const msg = event.message.toLowerCase().trim();
  if (msg === "!cinematic" || msg === "!cl" || msg === "!clconfig") {
    event.cancel = true;
    const player = event.sender;
    system.run(() => openConfigForm(player));
  }
});

console.warn("[Cinematic Life] v1.1.0 loaded.");
