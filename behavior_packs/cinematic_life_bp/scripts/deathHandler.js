import { world, system } from "@minecraft/server";
import { CONFIG } from "./config.js";
import {
  playYouDiedScreen,
  hasBedSpawn,
  applyRespawnProtection,
  distance2D,
  lerp,
  getPlayerUseCustomEntity
} from "./utils.js";

const inCutscene = new Set();
const pendingDeath = new Map(); // playerId → { deathLoc }

// === DEATH ===
world.afterEvents.entityDie.subscribe((event) => {
  const player = event.deadEntity;
  if (player?.typeId !== "minecraft:player") return;
  if (inCutscene.has(player.id) || pendingDeath.has(player.id)) return;

  const deathLoc = {
    x: player.location.x,
    y: player.location.y,
    z: player.location.z
  };

  pendingDeath.set(player.id, { deathLoc });

  // Soft black fade
  if (CONFIG.deathFade) {
    try {
      player.camera.fade({
        fadeTime: { fadeInTime: 0.15, holdTime: 0.4, fadeOutTime: 0.3 },
        fadeColor: { red: 0, green: 0, blue: 0 }
      });
    } catch (e) {}
  }

  // Death sound
  try {
    player.playSound(CONFIG.deathSound, { volume: 0.7, pitch: 0.9 });
  } catch (e) {}

  // Show randomised "You Died" title
  system.runTimeout(() => {
    if (player.isValid) playYouDiedScreen(player);
  }, 8);
});

// === RESPAWN ===
world.afterEvents.playerSpawn.subscribe((event) => {
  const player = event.player;
  if (event.initialSpawn) return;
  if (!pendingDeath.has(player.id)) return;

  const data = pendingDeath.get(player.id);
  pendingDeath.delete(player.id);

  if (inCutscene.has(player.id)) return;

  // Tiny delay so the player is fully valid
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

// === SKY DROP ===
function playSkyDropCutscene(player, deathLoc) {
  const spawnLoc = player.location;
  const dist = distance2D(deathLoc, spawnLoc);

  // Scale intensity by distance
  const t = Math.min(dist / 200, 1);
  const height = lerp(CONFIG.skyDropBaseHeight, CONFIG.skyDropMaxHeight, t);
  const duration = Math.floor(lerp(CONFIG.skyDropBaseDuration, CONFIG.skyDropMaxDuration, t));

  const startY = spawnLoc.y + height;
  const dropPos = { x: spawnLoc.x, y: startY, z: spawnLoc.z };

  try {
    player.teleport(dropPos);
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
    const eased = progress * progress; // ease-in
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

// === BED WAKE CUTSCENE (branches here) ===
function playBedWakeCutscene(player) {
  const useCustom = getPlayerUseCustomEntity(player);

  if (useCustom) {
    playCustomEntityWakeCutscene(player);
  } else {
    playRealPlayerWakeCutscene(player);
  }
}

function playRealPlayerWakeCutscene(player) {
  try {
    player.playAnimation("animation.player.cinematic.wake_up");
  } catch (e) {}

  runOrbitCamera(player, player.location, () => {
    endCutscene(player);
  });
}

function playCustomEntityWakeCutscene(player) {
  const loc = player.location;
  const dim = player.dimension;

  // Hide real player
  try {
    player.addEffect("invisibility", 200, {
      amplifier: 0,
      showParticles: false
    });
  } catch (e) {}

  let entity = null;
  try {
    entity = dim.spawnEntity("cinematic:cutscene_player", loc);
  } catch (e) {
    console.warn("Failed to spawn cutscene entity:", e);
    // Fallback to real player method
    try {
      player.removeEffect("invisibility");
    } catch (e2) {}
    playRealPlayerWakeCutscene(player);
    return;
  }

  // Face the same direction as the player
  try {
    entity.setRotation(player.getRotation());
  } catch (e) {}

  runOrbitCamera(player, loc, () => {
    try {
      if (entity && entity.isValid) entity.remove();
    } catch (e) {}

    try {
      player.removeEffect("invisibility");
    } catch (e) {}

    endCutscene(player);
  });
}

// Shared orbiting camera
function runOrbitCamera(player, center, onDone) {
  if (!CONFIG.bedCameraOrbit) {
    system.runTimeout(onDone, CONFIG.wakeUpAnimDuration);
    return;
  }

  const radius = 3.2;
  const duration = CONFIG.wakeUpAnimDuration;
  let ticks = 0;

  const orbit = system.runInterval(() => {
    if (!player.isValid) {
      system.clearRun(orbit);
      onDone();
      return;
    }

    ticks++;
    const progress = ticks / duration;
    const angle = progress * Math.PI * 1.4; // slow arc

    const camX = center.x + Math.cos(angle) * radius;
    const camZ = center.z + Math.sin(angle) * radius;
    const camY = center.y + 1.4 + Math.sin(progress * Math.PI) * 0.6;

    try {
      player.camera.setCamera("minecraft:free", {
        location: { x: camX, y: camY, z: camZ },
        facingLocation: {
          x: center.x,
          y: center.y + 1.0,
          z: center.z
        }
      });
    } catch (e) {}

    if (ticks >= duration) {
      system.clearRun(orbit);
      onDone();
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
