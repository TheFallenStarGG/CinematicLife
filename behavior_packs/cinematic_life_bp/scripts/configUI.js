import { system } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { CONFIG } from "./config.js";

export function openConfigForm(player) {
  const form = new ModalFormData()
    .title("Cinematic Life Settings")
    .slider("You Died Duration (ticks)", 20, 100, 5, CONFIG.youDiedDuration)
    .slider("Respawn Protection (seconds)", 0, 15, 1, CONFIG.respawnProtectionSeconds)
    .slider("Sky Drop Base Height", 30, 100, 5, CONFIG.skyDropBaseHeight)
    .slider("Moon Travel Speed", 2, 20, 1, CONFIG.moonTravelSpeed)
    .toggle("Sky Drop Skip (crouch)", CONFIG.skyDropSkipEnabled)
    .toggle("Early Wake (sneak)", CONFIG.earlyWakeEnabled)
    .toggle("Nightmares", CONFIG.nightmareEnabled)
    .toggle("Death Fade", CONFIG.deathFade)
    .toggle("Protection Particles", CONFIG.protectionParticles)
    .toggle("Bed Camera Orbit", CONFIG.bedCameraOrbit);

  form.show(player).then(response => {
    if (response.canceled) return;

    const v = response.formValues;
    CONFIG.youDiedDuration = v[0];
    CONFIG.respawnProtectionSeconds = v[1];
    CONFIG.skyDropBaseHeight = v[2];
    CONFIG.moonTravelSpeed = v[3];
    CONFIG.skyDropSkipEnabled = v[4];
    CONFIG.earlyWakeEnabled = v[5];
    CONFIG.nightmareEnabled = v[6];
    CONFIG.deathFade = v[7];
    CONFIG.protectionParticles = v[8];
    CONFIG.bedCameraOrbit = v[9];

    player.sendMessage("§aCinematic Life settings updated.");
  });
}
