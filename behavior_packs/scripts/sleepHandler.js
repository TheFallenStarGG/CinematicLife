import { world, system } from "@minecraft/server";
import { CONFIG } from "./config.js";
import { isHostileNearby, incrementDaysSurvived } from "./utils.js";

const sleepingPlayers = new Map(); // playerId → { startTime, intervalId }

world.afterEvents.playerInteractWithBlock.subscribe((event) => {
  const player = event.player;
  const block = event.block;

  if (!block.typeId.includes("bed")) return;
  if (player.isSleeping) return;

  // Check for nightmare
  if (CONFIG.nightmareEnabled && isHostileNearby(player)) {
    startNightmare(player);
    return;
  }

  // Let them enter the bed normally, then we take over
  system.runTimeout(() => {
    if (player.isSleeping) {
      startCinematicSleep(player);
    }
  }, 10);
});

function startCinematicSleep(player) {
  if (sleepingPlayers.has(player.id)) return;

  // Disable vanilla daylight cycle so we control time
  world.gameRules.doDaylightCycle = false;

  let currentTime = world.getAbsoluteTime() % 24000;

  const intervalId = system.runInterval(() => {
    if (!player.isValid || !player.isSleeping) {
      endSleep(player, false);
      return;
    }

    // Early wake
    if (CONFIG.earlyWakeEnabled && player.isSneaking) {
      endSleep(player, true);
      return;
    }

    // Advance time
    currentTime += CONFIG.moonTravelSpeed;
    if (currentTime >= 24000) currentTime = 0;

    world.setTimeOfDay(currentTime);

    // Sunrise reached (around 23000–1000)
    if (currentTime >= 23000 || currentTime < 1000) {
      endSleep(player, false);
    }
  }, 1);

  sleepingPlayers.set(player.id, { intervalId });
}

function endSleep(player, early) {
  const data = sleepingPlayers.get(player.id);
  if (!data) return;

  system.clearRun(data.intervalId);
  sleepingPlayers.delete(player.id);

  world.gameRules.doDaylightCycle = true;

  // Force wake
  player.runCommand("inputpermission @s movement enabled");
  // The climb-out animation will play via the RP controller when they leave the bed

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

  // Short scary camera shake + force them out
  player.camera.fade({
    fadeTime: { fadeInTime: 0.3, holdTime: 1.5, fadeOutTime: 0.8 },
    fadeColor: { red: 0.1, green: 0, blue: 0 }
  });

  system.runTimeout(() => {
    // Kick them out of bed attempt
    player.teleport(player.location); // small jolt
  }, 30);
}
