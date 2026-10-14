export const CONFIG = {
  // === Death / Respawn ===
  youDiedDuration: 50,                 // ticks the title stays
  respawnProtectionSeconds: 5,
  skyDropBaseHeight: 60,
  skyDropMaxHeight: 140,
  skyDropBaseDuration: 60,
  skyDropMaxDuration: 120,
  skyDropSkipEnabled: true,
  deathSound: "random.hurt",           // plays on death
  deathFade: true,                     // soft black fade before title

  // Random death titles (first one is the main title, rest are subtitles)
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
  nightAmbientSound: "ambient.cave",   // loops softly while watching the moon
  nightAmbientInterval: 80,            // ticks between ambient sounds

  // === Cutscene timing ===
  wakeUpAnimDuration: 70,
  bedCameraOrbit: true,                // slow orbit instead of static
  titleFadeIn: 8,
  titleStay: 35,
  titleFadeOut: 10,

  // === Protection visual ===
  protectionParticles: true
};
