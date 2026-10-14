import { system } from "@minecraft/server";
import { CONFIG } from "./config.js";

export function getDaysSurvived(player) {
  return player.getDynamicProperty("cinematic:days_survived") ?? 0;
}

export function setDaysSurvived(player, value) {
  player.setDynamicProperty("cinematic:days_survived", value);
}

export function incrementDaysSurvived(player) {
  setDaysSurvived(player, getDaysSurvived(player) + 1);
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

    // Visual indicator
    if (CONFIG.protectionParticles) {
      player.addEffect("absorption", CONFIG.respawnProtectionSeconds * 20, {
        amplifier: 0,
        showParticles: true
      });
    }
  } catch (e) {
    console.warn("Protection failed:", e);
  }
}

export function playYouDiedScreen(player) {
  const days = getDaysSurvived(player);
  const choice = CONFIG.deathTitles[Math.floor(Math.random() * CONFIG.deathTitles.length)];
  const subtitle = choice.subtitle.replace("{days}", days);

  player.onScreenDisplay.setTitle(choice.title, {
    fadeInDuration: CONFIG.titleFadeIn,
    stayDuration: CONFIG.titleStay,
    fadeOutDuration: CONFIG.titleFadeOut,
    subtitle: subtitle
  });
}

export function isHostileNearby(player, radius = 14) {
  const entities = player.dimension.getEntities({
    location: player.location,
    maxDistance: radius,
    excludeTypes: ["minecraft:player", "minecraft:item", "minecraft:xp_orb"]
  });

  const keywords = [
    "zombie", "skeleton", "creeper", "spider", "enderman", "witch",
    "phantom", "pillager", "vindicator", "evoker", "ravager",
    "hoglin", "piglin_brute", "warden", "blaze", "ghast"
  ];

  return entities.some(e => {
    const id = e.typeId.toLowerCase();
    return keywords.some(k => id.includes(k));
  });
}

export function distance2D(a, b) {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function getPlayerUseCustomEntity(player) {
  const personal = player.getDynamicProperty("cinematic:use_custom_entity");
  if (personal !== undefined) return personal;          // player has personal preference
  return CONFIG.serverUseCustomEntity;                  // fall back to server default
}

export function setPlayerUseCustomEntity(player, value) {
  player.setDynamicProperty("cinematic:use_custom_entity", value);
}

export function isOperator(player) {
  // Simple check – works on most servers / Realms
  try {
    return player.isOp; // available in newer Script API
  } catch {
    return false;
  }
}
