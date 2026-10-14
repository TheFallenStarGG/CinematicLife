import { world, system } from "@minecraft/server";
import { CONFIG } from "./config.js";
import { isHostileNearby, incrementDaysSurvived } from "./utils.js";

const sleepingPlayers = new Map(); // playerId → intervalId

world.afterEvents.playerInteractWithBlock.subscribe((event) => {
  const { player, block } = event;
  if (!block.typeId.includes("bed")) return;
  if (player.isSleeping) return;

  // Nightmare check before they fully enter
  if (CONFIG.nightmareEnabled && isHostileNearby(player)) {
    startNightmare(player);
    return;
  }

  // Wait a moment for the vanilla sleep to start, then take over
  system.runTimeout(() => {
    if (player.isValid && player.isSleeping) {
      startCinematicSleep(player);
    }
  }, 15);
});

function startCinematicSleep(player) {
  if (sleepingPlayers.has(player.id)) return;

  // Take control of time
  world.gameRules.doDaylightCycle = false;

  let currentTime = world.getTimeOfDay();

  const intervalId = system.runInterval(() => {
    if (!player.isValid || !player.isSleeping) {
      endSleep(player, false);
      return;
    }

    // Early wake by sneaking
    if (CONFIG.earlyWakeEnabled && player.isSneaking) {
      endSleep(player, true);
      return;
    }

    // Advance time
    currentTime += CONFIG.moonTravelSpeed;
    if (currentTime >= 24000) currentTime -= 24000;

    try {
      world.setTimeOfDay(currentTime);
    } catch (e) {
      console.warn("Failed to set time:", e);
    }

    // Sunrise reached (roughly 23000 → 1000)
    if (currentTime >= 23000 || currentTime < 1000) {
      endSleep(player, false);
    }
  }, 1);

  sleepingPlayers.set(player.id, intervalId);
}

function endSleep(player, early) {
  const intervalId = sleepingPlayers.get(player.id);
  if (intervalId === undefined) return;

  system.clearRun(intervalId);
  sleepingPlayers.delete(player.id);

  // Restore normal daylight cycle
  world.gameRules.doDaylightCycle = true;

  if (!early) {
    incrementDaysSurvived(player);
    player.sendMessage("§eYou slept through the night. Days Survived increased.");
  } else {
    player.sendMessage("§7You woke up early.");
  }
}

function startNightmare(player) {
  player.onScreenDisplay.setTitle("§4Nightmare", {
    fadeInDuration: 5,
    stayDuration: 40,
    fadeOutDuration: 15,
    subtitle: "§8Something is watching..."
  });

  try {
    player.camera.fade({
      fadeTime: { fadeInTime: 0.3, holdTime: 1.5, fadeOutTime: 0.8 },
      fadeColor: { red: 0.15, green: 0, blue: 0 }
    });
  } catch (e) {}

  // Small jolt to help break sleep attempt
  system.runTimeout(() => {
    if (player.isValid) {
      try {
        player.teleport(player.location);
      } catch (e) {}
    }
  }, 25);
}
