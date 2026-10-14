import { world, system } from "@minecraft/server";
import { CONFIG } from "./config.js";
import { 
  playYouDiedScreen, 
  hasBedSpawn, 
  applyRespawnProtection,
  getDaysSurvived 
} from "./utils.js";

const inCutscene = new Set();

world.afterEvents.entityDie.subscribe((event) => {
  const player = event.deadEntity;
  if (player.typeId !== "minecraft:player") return;
  if (inCutscene.has(player.id)) return;

  // Show "You Died" + Days Survived
  playYouDiedScreen(player);

  // Force very fast respawn
  system.runTimeout(() => {
    if (!player.isValid) return;
    startRespawnSequence(player);
  }, CONFIG.youDiedDuration);
});

function startRespawnSequence(player) {
  inCutscene.add(player.id);

  // Instantly bring them back (vanilla respawn still happens, we just control the presentation)
  system.runTimeout(() => {
    if (!player.isValid) {
      inCutscene.delete(player.id);
      return;
    }

    if (hasBedSpawn(player)) {
      playBedWakeCutscene(player);
    } else {
      playSkyDropCutscene(player);
    }
  }, 5);
}

function playSkyDropCutscene(player) {
  const spawn = player.dimension.getBlock({ x: 0, y: 100, z: 0 }) // fallback, better to use actual spawn later
    ? player.location 
    : { x: player.location.x, y: 100, z: player.location.z };

  // Teleport high up
  const dropPos = {
    x: player.location.x,
    y: player.location.y + CONFIG.skyDropHeight,
    z: player.location.z
  };

  player.teleport(dropPos);
  player.camera.setCamera("minecraft:free", {
    location: { x: dropPos.x, y: dropPos.y + 5, z: dropPos.z },
    rotation: { x: 90, y: 0 }
  });

  let ticks = 0;
  const fallInterval = system.runInterval(() => {
    if (!player.isValid || player.isSneaking && CONFIG.skyDropSkipEnabled) {
      // Skip
      endSkyDrop(player, fallInterval);
      return;
    }

    ticks++;
    const progress = ticks / CONFIG.skyDropDuration;
    const currentY = dropPos.y - (CONFIG.skyDropHeight * progress);

    player.teleport({ x: dropPos.x, y: currentY, z: dropPos.z });
    player.camera.setCamera("minecraft:free", {
      location: { x: dropPos.x, y: currentY + 4, z: dropPos.z },
      rotation: { x: 80, y: player.getRotation().y }
    });

    if (ticks >= CONFIG.skyDropDuration) {
      endSkyDrop(player, fallInterval);
    }
  }, 1);
}

function endSkyDrop(player, intervalId) {
  system.clearRun(intervalId);
  player.camera.clear();
  applyRespawnProtection(player);
  inCutscene.delete(player.id);
  player.sendMessage("§aYou have respawned.");
}

function playBedWakeCutscene(player) {
  // Play the custom climb-out animation (defined in RP)
  player.playAnimation("animation.player.cinematic.wake_up");

  // Simple camera looking at the player from the side
  const loc = player.location;
  player.camera.setCamera("minecraft:free", {
    location: { x: loc.x + 2.5, y: loc.y + 1.2, z: loc.z },
    rotation: { x: 0, y: 90 }
  });

  system.runTimeout(() => {
    if (!player.isValid) return;
    player.camera.clear();
    applyRespawnProtection(player);
    inCutscene.delete(player.id);
  }, CONFIG.wakeUpAnimDuration);
}
