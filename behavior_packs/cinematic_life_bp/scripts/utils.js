import { CONFIG } from "./config.js";

export function getDaysSurvived(player) {
  return player.getDynamicProperty("cinematic:days_survived") ?? 0;
}

export function setDaysSurvived(player, value) {
  player.setDynamicProperty("cinematic:days_survived", value);
}

export function incrementDaysSurvived(player) {
  const current = getDaysSurvived(player);
  setDaysSurvived(player, current + 1);
}

export function hasBedSpawn(player) {
  return player.getSpawnPoint() !== undefined;
}

export function applyRespawnProtection(player) {
  try {
    player.addEffect("resistance", CONFIG.respawnProtectionSeconds * 20, {
      amplifier: 255,
      showParticles: false
    });
    player.addEffect("fire_resistance", CONFIG.respawnProtectionSeconds * 20, {
      amplifier: 0,
      showParticles: false
    });
  } catch (e) {
    console.warn("Failed to apply respawn protection:", e);
  }
}

export function playYouDiedScreen(player) {
  const days = getDaysSurvived(player);
  player.onScreenDisplay.setTitle("§cYou Died", {
    fadeInDuration: CONFIG.titleFadeIn,
    stayDuration: CONFIG.titleStay,
    fadeOutDuration: CONFIG.titleFadeOut,
    subtitle: `§7Days Survived: §f${days}`
  });
}

export function isHostileNearby(player, radius = 12) {
  const entities = player.dimension.getEntities({
    location: player.location,
    maxDistance: radius,
    excludeTypes: ["minecraft:player", "minecraft:item", "minecraft:xp_orb"]
  });

  const hostileKeywords = [
    "zombie", "skeleton", "creeper", "spider", "enderman",
    "witch", "phantom", "pillager", "vindicator", "evoker",
    "ravager", "hoglin", "piglin_brute", "warden"
  ];

  return entities.some(e => {
    const id = e.typeId.toLowerCase();
    return hostileKeywords.some(k => id.includes(k));
  });
}
