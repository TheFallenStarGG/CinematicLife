export const CONFIG = {
  // === Death / Respawn ===
  youDiedDuration: 50,
  respawnProtectionSeconds: 5,
  skyDropBaseHeight: 60,
  skyDropMaxHeight: 140,
  skyDropBaseDuration: 60,
  skyDropMaxDuration: 120,
  skyDropSkipEnabled: true,
  deathSound: "random.hurt",
  deathFade: true,

  deathTitles: [
    { title: "§cYou Died", subtitle: "§7Days Survived: §f{days}" },
    { title: "§cNot like this...", subtitle: "§7Days Survived: §f{days}" },
    { title: "§cAgain?", subtitle: "§7Days Survived: §f{days}" },
    { title: "§cWasted", subtitle: "§7Days Survived: §f{days}" },
    { title: "§4You Died", subtitle: "§8The void claims another... §f{days} days" }
  ],

  // === Sleep ===
  moonTravelSpeed: 7,
  earlyWakeEnabled: true,
  nightmareEnabled: true,
  nightAmbientSound: "ambient.cave",
  nightAmbientInterval: 80,

  // === Cutscene ===
  wakeUpAnimDuration: 70,
  bedCameraOrbit: true,
  titleFadeIn: 8,
  titleStay: 35,
  titleFadeOut: 10,

  // === Protection ===
  protectionParticles: true,

  // === NEW: Cutscene method ===
  // Server default (only changeable by operators)
  serverUseCustomEntity: false
};
