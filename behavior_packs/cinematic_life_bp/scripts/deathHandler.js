import { world, system } from "@minecraft/server";
import { CONFIG } from "./config.js";
import {
  playYouDiedScreen,
  hasBedSpawn,
  applyRespawnProtection,
  distance2D,
  lerp
} from "./utils.js";

const inCutscene = new Set();
const pendingDeath = new Map(); // playerId → { deathLoc, time }

// === DEATH ===
world.afterEvents.entityDie.subscribe((event) => {
  const player = event.deadEntity;
  if (player?.typeId !== "minecraft:player") return;
  if (inCutscene.has(player.id) || pendingDeath.has(player.id)) return;

  const deathLoc = { ...player.location };

  pendingDeath.set(player.id, { deathLoc, time: system.currentTick });

  // Soft black fade + sound (improvement 7)
  if (CONFIG.deathFade) {
    try {
      player.camera.fade({
        fadeTime: { fadeInTime: 0.15, holdTime: 0.4, fadeOutTime: 0.3 },
        fadeColor: { red: 0, green: 0, blue: 0 }
      });
    } catch (e) {}
  }

  try {
    player.playSound(CONFIG.deathSound, { volume: 0.7, pitch: 0.9 });
  } catch (e) {}

  // Show randomised title almost immediately
  system.runTimeout(() => {
    if (player.isValid) playYouDiedScreen(player);
  }, 8);
});

// === RESPAWN (true-ish instant feel) ===
world.afterEvents.playerSpawn.subscribe((event) => {
  const player = event.player;
  if (event.initialSpawn) return;
  if (!pendingDeath.has(player.id)) return;

  const data = pendingDeath.get(player.id);
  pendingDeath.delete(player.id);

  if (inCutscene.has(player.id)) return;

  // Extremely short delay so the player is fully valid, then cutscene
  system.runTimeout(() => {
    if (!player.isValid) return;
    startRespawnSequence(player, data.deathLoc);
  }, 2);
});

function startRespawnSequence(player, deathLoc) {
  inCutscene.add(player.id);

  if (hasBedSpawn(player)) {
    playBedWakeCutscene(player);
  } else {
    playSkyDropCutscene(player, deathLoc);
  }
}

// === SKY DROP (improvements 9 + 10) ===
function playSkyDropCutscene(player, deathLoc) {
  const spawnLoc = player.location;
  const dist = distance2D(deathLoc, spawnLoc);

  // Scale height & duration by distance (improvement 10)
  const t = Math.min(dist / 200, 1); // 200 blocks = max intensity
  const height = lerp(CONFIG.skyDropBaseHeight, CONFIG.skyDropMaxHeight, t);
  const duration = Math.floor(lerp(CONFIG.skyDropBaseDuration, CONFIG.skyDropMaxDuration, t));

  const startY = spawnLoc.y + height;
  const dropPos = { x: spawnLoc.x, y: startY, z: spawnLoc.z };

  try {
    player.teleport(dropPos);

    // Initial high camera
    player.camera.setCamera("minecraft:free", {
      location: { x: dropPos.x, y: dropPos.y + 6, z: dropPos.z },
      rotation: { x: 90, y: 0 }
    });
  } catch (e) {
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

    if (CONFIG.skyDropSkipEnabled && player.isSneaking) {
      endSkyDrop(player, fallInterval);
      return;
    }

    ticks++;
    const progress = Math.min(ticks / duration, 1);
    // Ease-in curve for smoother fall (improvement 9)
    const eased = progress * progress;
    const currentY = startY - (height * eased);

    try {
      player.teleport({ x: dropPos.x, y: currentY, z: dropPos.z });

      player.camera.setCamera("minecraft:free", {
        location: { x: dropPos.x, y: currentY + 5, z: dropPos.z },
        rotation: { x: 75 + progress * 15, y: player.getRotation().y }
      });
    } catch (e) {
      endSkyDrop(player, fallInterval);
      return;
    }

    if (ticks >= duration) {
      endSkyDrop(player, fallInterval);
    }
  }, 1);
}

function endSkyDrop(player, intervalId) {
  system.clearRun(intervalId);
  endCutscene(player);
  player.sendMessage("§aYou have respawned.");
}

// === BED WAKE (improvement 12 – slow orbit) ===
function playBedWakeCutscene(player) {
  try {
    player.playAnimation("animation.player.cinematic.wake_up");
  } catch (e) {}

  const center = player.location;
  const radius = 3.2;
  const duration = CONFIG.wakeUpAnimDuration;
  let ticks = 0;

  const orbit = system.runInterval(() => {
    if (!player.isValid) {
      system.clearRun(orbit);
      inCutscene.delete(player.id);
      return;
    }

    ticks++;
    const progress = ticks / duration;
    const angle = progress * Math.PI * 1.4; // ~250 degree slow arc

    const camX = center.x + Math.cos(angle) * radius;
    const camZ = center.z + Math.sin(angle) * radius;
    const camY = center.y + 1.4 + Math.sin(progress * Math.PI) * 0.6;

    try {
      player.camera.setCamera("minecraft:free", {
        location: { x: camX, y: camY, z: camZ },
        facingLocation: { x: center.x, y: center.y + 1.0, z: center.z }
      });
    } catch (e) {}

    if (ticks >= duration) {
      system.clearRun(orbit);
      endCutscene(player);
    }
  }, 1);
}

function endCutscene(player) {
  try {
    player.camera.clear();
  } catch (e) {}
  applyRespawnProtection(player);
  inCutscene.delete(player.id);
        }
