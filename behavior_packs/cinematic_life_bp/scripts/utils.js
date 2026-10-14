import { world, system, GameMode } from "@minecraft/server";
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
  const spawn = player.getSpawnPoint();
  return spawn !== undefined;
}

export function applyRespawnProtection(player) {
  player.addEffect("resistance", CONFIG.respawnProtectionSeconds * 20, {
    amplifier: 255,
    showParticles: false
  });
  player.addEffect("fire_resistance", CONFIG.respawnProtectionSeconds * 20, {
    amplifier: 0,
    showParticles: false
  });
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
  const hostiles = player.dimension.getEntities({
    location: player.location,
    maxDistance: radius,
    excludeTypes: ["minecraft:player", "minecraft:item", "minecraft:xp_orb"],
    excludeFamilies: ["inanimate"]
  });
  return hostiles.some(e => {
    const type = e.typeId;
    return type.includes("zombie") || type.includes("skeleton") || 
           type.includes("creeper") || type.includes("spider") || 
           type.includes("enderman") || type.includes("witch") ||
           type.includes("phantom") || type.includes("pillager");
  });
}
