import { world, system } from "@minecraft/server";
import { CONFIG } from "./config.js";
import {
  playYouDiedScreen,
  hasBedSpawn,
  applyRespawnProtection
} from "./utils.js";

const inCutscene = new Set();
const pendingDeath = new Set(); // players who just died and are waiting for respawn

// Show "You Died" the moment they die
world.afterEvents.entityDie.subscribe((event) => {
  const player = event.deadEntity;
  if (player?.typeId !== "minecraft:player") return;
  if (inCutscene.has(player.id) || pendingDeath.has(player.id)) return;

  pendingDeath.add(player.id);
  playYouDiedScreen(player);
});

// After they actually respawn, run the cutscene
world.afterEvents.playerSpawn.subscribe((event) => {
  const player = event.player;
  if (event.initialSpawn) return;          // ignore first join
  if (!pendingDeath.has(player.id)) return;

  pendingDeath.delete(player.id);
  if (inCutscene.has(player.id)) return;

  // Small delay so the player is fully loaded
  system.runTimeout(() => {
    if (!player.isValid) return;
    startRespawnSequence(player);
  }, 5);
});

function startRespawnSequence(player) {
  inCutscene.add(player.id);

  if (hasBedSpawn(player)) {
    playBedWakeCutscene(player);
  } else {
    playSkyDropCutscene(player);
  }
}

function playSkyDropCutscene(player) {
  const loc = player.location;
  const dropPos = {
    x: loc.x,
    y: loc.y + CONFIG.skyDropHeight,
    z: loc.z
  };

  try {
    player.teleport(dropPos);
    player.camera.setCamera("minecraft:free", {
      location: { x: dropPos.x, y: dropPos.y + 5, z: dropPos.z },
      rotation: { x: 90, y: 0 }
    });
  } catch (e) {
    console.warn("Sky drop start failed:", e);
    endCutscene(player);
    return;
  }

  let ticks = 0;
  const fallInterval = system.runInterval(() => {
    if (!player.isValid) {
      system.clearRun(fallInterval);
      inCutscene.delete(player.id);
      return;
    }

    // Properly parenthesized skip check
    if (CONFIG.skyDropSkipEnabled && player.isSneaking) {
      endSkyDrop(player, fallInterval);
      return;
    }

    ticks++;
    const progress = Math.min(ticks / CONFIG.skyDropDuration, 1);
    const currentY = dropPos.y - (CONFIG.skyDropHeight * progress);

    try {
      player.teleport({ x: dropPos.x, y: currentY, z: dropPos.z });
      player.camera.setCamera("minecraft:free", {
        location: { x: dropPos.x, y: currentY + 4, z: dropPos.z },
        rotation: { x: 80, y: player.getRotation().y }
      });
    } catch (e) {
      endSkyDrop(player, fallInterval);
      return;
    }

    if (ticks >= CONFIG.skyDropDuration) {
      endSkyDrop(player, fallInterval);
    }
  }, 1);
}

function endSkyDrop(player, intervalId) {
  system.clearRun(intervalId);
  endCutscene(player);
  player.sendMessage("§aYou have respawned.");
}

function playBedWakeCutscene(player) {
  try {
    // Try to play the custom animation
    player.playAnimation("animation.player.cinematic.wake_up");

    const loc = player.location;
    player.camera.setCamera("minecraft:free", {
      location: { x: loc.x + 2.5, y: loc.y + 1.2, z: loc.z },
      rotation: { x: 0, y: 90 }
    });
  } catch (e) {
    console.warn("Bed wake cutscene failed:", e);
  }

  system.runTimeout(() => {
    endCutscene(player);
  }, CONFIG.wakeUpAnimDuration);
}

function endCutscene(player) {
  try {
    player.camera.clear();
  } catch (e) {}
  applyRespawnProtection(player);
  inCutscene.delete(player.id);
}
