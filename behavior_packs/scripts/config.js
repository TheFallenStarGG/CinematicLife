export const CONFIG = {
  // === Death / Respawn ===
  youDiedDuration: 60,               // ticks (3 seconds)
  respawnProtectionSeconds: 5,       // seconds of resistance after cutscene
  skyDropHeight: 80,                 // blocks above spawn
  skyDropDuration: 80,               // ticks for the fall
  skyDropSkipEnabled: true,          // can skip by crouching

  // === Sleep ===
  moonTravelSpeed: 8,                // how many ticks to advance time per tick (higher = faster night)
  earlyWakeEnabled: true,            // sneak to wake early
  nightmareEnabled: true,            // nightmare if hostiles nearby
  nightmareDuration: 100,            // ticks

  // === Cutscene timing ===
  wakeUpAnimDuration: 60,            // ticks for climb-out-of-bed
  titleFadeIn: 10,
  titleStay: 40,
  titleFadeOut: 10
};
