import { world, system } from "@minecraft/server";
import { CONFIG } from "./config.js";
import { isHostileNearby, incrementDaysSurvived } from "./utils.js";

// Per-player sleep tracking (improvement 5)
const sleepingPlayers = new Map(); // playerId → { intervalId, ambientId }
let timeController = null;         // playerId currently controlling time

world.afterEvents.playerInteractWithBlock.subscribe((event) => {
  const { player, block } = event;
  if (!block.typeId.includes("bed")) return;
  if (player.isSleeping) return;

  // === NIGHTMARE – properly block sleep (improvement 3) ===
  if (CONFIG.nightmareEnabled && isHostileNearby(player)) {
    startNightmare(player);
    return; // do not allow sleep to continue
  }

  system.runTimeout(() => {
    if (player.isValid && player.isSleeping) {
      startCinematicSleep(player);
    }
  }, 12);
});

function startCinematicSleep(player) {
  if (sleepingPlayers.has(player.id)) return;

  // First sleeper takes control of time
  if (timeController === null) {
    timeController = player.id;
    world.gameRules.doDaylightCycle = false;
  }

  let currentTime = world.getTimeOfDay();

  const intervalId = system.runInterval(() => {
    if (!player.isValid || !player.isSleeping) {
      endSleep(player, false);
      return;
    }

    if (CONFIG.earlyWakeEnabled && player.isSneaking) {
      endSleep(player, true);
      return;
    }

    // Only the time controller advances time
    if (timeController === player.id) {
      currentTime += CONFIG.moonTravelSpeed;
      if (currentTime >= 24000) currentTime -= 24000;

      try {
        world.setTimeOfDay(currentTime);
      } catch (e) {}

      if (currentTime >= 23000 || currentTime < 1000) {
        endSleep(player, false);
      }
    }
  }, 1);

  // Soft ambient night sounds (improvement 13)
  const ambientId = system.runInterval(() => {
    if (!player.isValid || !player.isSleeping) return;
    try {
      player.playSound(CONFIG.nightAmbientSound, {
        volume: 0.25,
        pitch: 0.8 + Math.random() * 0.3
      });
    } catch (e) {}
  }, CONFIG.nightAmbientInterval);

  sleepingPlayers.set(player.id, { intervalId, ambientId });
}

function endSleep(player, early) {
  const data = sleepingPlayers.get(player.id);
  if (!data) return;

  system.clearRun(data.intervalId);
  system.clearRun(data.ambientId);
  sleepingPlayers.delete(player.id);

  // If this player was controlling time, hand it off or restore
  if (timeController === player.id) {
    if (sleepingPlayers.size > 0) {
      // Give control to another sleeper
      timeController = sleepingPlayers.keys().next().value;
    } else {
      timeController = null;
      world.gameRules.doDaylightCycle = true;
    }
  }

  if (!early) {
    incrementDaysSurvived(player);
    player.sendMessage("§eYou slept through the night. Days Survived increased.");
  } else {
    player.sendMessage("§7You woke up early.");
  }
}

// === NIGHTMARE – actually prevent sleep ===
function startNightmare(player) {
  player.onScreenDisplay.setTitle("§4Nightmare", {
    fadeInDuration: 4,
    stayDuration: 35,
    fadeOutDuration: 12,
    subtitle: "§8You are not safe here..."
  });

  try {
    player.camera.fade({
      fadeTime: { fadeInTime: 0.2, holdTime: 1.2, fadeOutTime: 0.6 },
      fadeColor: { red: 0.18, green: 0, blue: 0 }
    });
    player.playSound("mob.warden.agitated", { volume: 0.6, pitch: 0.7 });
  } catch (e) {}

  // Force them out / prevent sleep by teleporting slightly + clearing sleep state
  system.runTimeout(() => {
    if (!player.isValid) return;
    try {
      const loc = player.location;
      player.teleport({
        x: loc.x + (Math.random() - 0.5) * 0.8,
        y: loc.y,
        z: loc.z + (Math.random() - 0.5) * 0.8
      });
      // Extra insurance
      player.runCommandAsync("inputpermission @s movement enabled");
    } catch (e) {}
  }, 15);
}
