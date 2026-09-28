/** Traduce al español el texto de probabilidad de KO que genera @smogon/calc. */
const AFTER: [RegExp, string][] = [
  [/Stealth Rock/g, 'Trampa Rocas'],
  [/(\d) layers? of Spikes/g, '$1 capa(s) de Púas'],
  [/Sitrus Berry recovery/g, 'recuperación de Baya Zidra'],
  [/Leftovers recovery/g, 'recuperación de Restos'],
  [/Grassy Terrain recovery/g, 'recuperación de Campo de Hierba'],
  [/Black Sludge recovery/g, 'recuperación de Lodo Negro'],
  [/sandstorm damage/g, 'daño de tormenta de arena'],
  [/burn damage/g, 'daño por quemadura'],
  [/poison damage/g, 'daño por veneno'],
  [/toxic damage/g, 'daño por veneno grave'],
  [/Leech Seed damage/g, 'daño de Drenadoras'],
  [/Salt Cure damage/g, 'daño de Salazón'],
  [/Rain Dish recovery/g, 'recuperación de Cura Lluvia'],
  [/Ice Body recovery/g, 'recuperación de Gélido'],
  [/Dry Skin damage/g, 'daño de Piel Seca'],
  [/Solar Power damage/g, 'daño de Poder Solar'],
  [/Rocky Helmet damage/g, 'daño de Casco Dentado'],
  [/life orb recoil/gi, 'retroceso de Vidasfera'],
  [/ and /g, ' y '],
];

export function translateKO(text: string): string {
  if (!text) return '';
  let t = text;
  t = t.replace(/^guaranteed OHKO/, 'OHKO garantizado');
  t = t.replace(/^guaranteed (\d+)HKO/, '$1HKO garantizado');
  t = t.replace(/^([\d.]+)% chance to OHKO/, '$1% de probabilidad de OHKO');
  t = t.replace(/^([\d.]+)% chance to (\d+)HKO/, '$1% de probabilidad de $2HKO');
  t = t.replace(/^possible (\d+)HKO/, 'Posible $1HKO');
  t = t.replace(/^possibly the worst move ever/, 'Daño prácticamente nulo');
  t = t.replace(/ after /, ' tras ');
  for (const [re, rep] of AFTER) t = t.replace(re, rep);
  return t;
}
