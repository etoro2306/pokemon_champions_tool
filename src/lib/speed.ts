/**
 * Motor de velocidad y orden de turno (mecánicas de Gen 9 aplicadas por Pokémon Champions).
 *
 * Orden de cálculo (igual que Pokémon Showdown):
 *  1. Estadística base de Velocidad con SP y naturaleza.
 *  2. Etapas (-6…+6): ⌊stat × (2+n)/2⌋ ó ⌊stat × 2/(2+|n|)⌋.
 *  3. Modificadores encadenados en base 4096 (habilidades, objeto, Viento Afín, Pantano)
 *     y redondeo final "pokéRound".
 *  4. Parálisis: ⌊v × 0,5⌋ (salvo Pies Rápidos).
 *  5. Tope de 10000.
 * El orden de actuación compara primero la prioridad del movimiento, luego los efectos
 * "primero/último de su prioridad" (Garra Rápida, Rezagado…) y después la Velocidad
 * (invertida bajo Espacio Raro; en Champions no existe el desbordamiento a 1809).
 */
import { applyStage, calcStat } from './stats';

export type Weather = '' | 'Sun' | 'Rain' | 'Sand' | 'Snow';
export type Terrain = '' | 'Electric' | 'Grassy' | 'Psychic' | 'Misty';
export type SideID = 'ally' | 'foe';

export interface SpeedMoveInfo {
  name: string;
  priority: number;
  category: 'Physical' | 'Special' | 'Status';
  type: string;
  isHeal?: boolean;
}

export interface SpeedInput {
  key: string;
  name: string;
  baseSpe: number;
  side: SideID;
  nature: string;
  sp: number;
  stage: number;
  item: string;
  ability: string;
  paralyzed: boolean;
  /** Otro problema de estado (quemado, envenenado…) — relevante para Pies Rápidos */
  otherStatus?: boolean;
  /** Interruptor de habilidades situacionales (Liviano, Inicio Lento, Protosíntesis…) */
  abilityActive?: boolean;
  /** Garra Rápida / Mano Rápida se activan este turno */
  procFirst?: boolean;
  fullHP?: boolean;
  move?: SpeedMoveInfo | null;
}

export interface SpeedField {
  trickRoom: boolean;
  weather: Weather;
  terrain: Terrain;
  magicRoom: boolean;
  tailwind: Record<SideID, boolean>;
  swamp: Record<SideID, boolean>;
}

export interface Modifier {
  label: string;
  mult: number;
  kind: 'ability' | 'item' | 'field' | 'status';
}

export interface SpeedResult {
  key: string;
  name: string;
  side: SideID;
  stat: number;
  afterStage: number;
  final: number;
  modifiers: Modifier[];
  priority: number;
  /** 1 = actúa primero en su prioridad, -1 = último, 0 = normal */
  bracket: number;
  bracketReason?: string;
  notes: string[];
}

export const DEFAULT_FIELD: SpeedField = {
  trickRoom: false,
  weather: '',
  terrain: '',
  magicRoom: false,
  tailwind: { ally: false, foe: false },
  swamp: { ally: false, foe: false },
};

/** Habilidades que anulan el clima mientras el Pokémon está en el campo. */
export const WEATHER_SUPPRESSORS = ['Cloud Nine', 'Air Lock'];

export const HEAL_MOVES = new Set([
  'Absorb', 'Drain Punch', 'Draining Kiss', 'Giga Drain', 'Horn Leech', 'Leech Life', 'Mega Drain', 'Oblivion Wing',
  'Parabolic Charge', 'Bitter Blade', 'Matcha Gotcha', 'Recover', 'Roost', 'Slack Off', 'Soft-Boiled', 'Milk Drink',
  'Synthesis', 'Moonlight', 'Morning Sun', 'Shore Up', 'Heal Pulse', 'Floral Healing', 'Life Dew', 'Jungle Healing',
  'Lunar Blessing', 'Wish', 'Strength Sap', 'Rest', 'Pollen Puff', 'Purify', 'Dream Eater',
]);

/** Encadena un multiplicador en base 4096 como hace el juego (chainModify). */
function chain(mod: number, mult: number) {
  const next = Math.trunc(mult * 4096);
  return (mod * next + 2048) >> 12;
}

function pokeRound(value: number, mod: number) {
  return Math.trunc((value * mod + 2047) / 4096);
}

/** Habilidades cuyo efecto depende de un interruptor en la interfaz. */
export const TOGGLE_ABILITIES: Record<string, string> = {
  Unburden: 'Objeto consumido (Liviano ×2)',
  'Slow Start': 'Primeros 5 turnos (×0,5)',
  Protosynthesis: 'Velocidad potenciada (×1,5)',
  'Quark Drive': 'Velocidad potenciada (×1,5)',
  'Quick Draw': 'Mano Rápida se activa (30%)',
};

export const SPEED_ABILITIES = new Set([
  'Swift Swim', 'Chlorophyll', 'Sand Rush', 'Slush Rush', 'Surge Surfer', 'Unburden', 'Quick Feet', 'Slow Start',
  'Protosynthesis', 'Quark Drive', 'Prankster', 'Gale Wings', 'Triage', 'Stall', 'Mycelium Might', 'Quick Draw',
  'Speed Boost', 'Cloud Nine', 'Air Lock', 'Klutz', 'Weak Armor', 'Steam Engine', 'Motor Drive', 'Rattled',
]);

export const SPEED_ITEMS = ['Choice Scarf', 'Iron Ball', 'Quick Claw', 'Lagging Tail', 'Full Incense', 'Macho Brace', 'Power Anklet', 'Custap Berry'];

export function computeSpeed(p: SpeedInput, field: SpeedField, weatherSuppressed = false): SpeedResult {
  const notes: string[] = [];
  const stat = calcStat('spe', p.baseSpe, p.sp, p.nature);
  const afterStage = applyStage(stat, p.stage);
  const weather: Weather = weatherSuppressed ? '' : field.weather;
  const itemActive = !!p.item && !field.magicRoom && p.ability !== 'Klutz';
  const item = itemActive ? p.item : '';
  if (p.item && !itemActive) notes.push(field.magicRoom ? 'Zona Mágica anula su objeto' : 'Zoquete anula su objeto');
  if (weatherSuppressed && field.weather) notes.push('Clima anulado por Aclimatación/Bucle Aire');

  const mods: Modifier[] = [];
  const status = p.paralyzed || p.otherStatus;
  switch (p.ability) {
    case 'Swift Swim': if (weather === 'Rain') mods.push({ label: 'Nado Rápido (lluvia)', mult: 2, kind: 'ability' }); break;
    case 'Chlorophyll': if (weather === 'Sun') mods.push({ label: 'Clorofila (sol)', mult: 2, kind: 'ability' }); break;
    case 'Sand Rush': if (weather === 'Sand') mods.push({ label: 'Ímpetu Arena (arena)', mult: 2, kind: 'ability' }); break;
    case 'Slush Rush': if (weather === 'Snow') mods.push({ label: 'Quitanieves (nieve)', mult: 2, kind: 'ability' }); break;
    case 'Surge Surfer': if (field.terrain === 'Electric') mods.push({ label: 'Cola Surf (campo eléctrico)', mult: 2, kind: 'ability' }); break;
    case 'Unburden': if (p.abilityActive) mods.push({ label: 'Liviano', mult: 2, kind: 'ability' }); break;
    case 'Quick Feet': if (status) mods.push({ label: 'Pies Rápidos', mult: 1.5, kind: 'ability' }); break;
    case 'Slow Start': if (p.abilityActive) mods.push({ label: 'Inicio Lento', mult: 0.5, kind: 'ability' }); break;
    case 'Protosynthesis':
      if (p.abilityActive) mods.push({ label: 'Protosíntesis', mult: 1.5, kind: 'ability' });
      else if (weather === 'Sun') notes.push('Con sol, Protosíntesis sube la Velocidad solo si es su stat más alto');
      break;
    case 'Quark Drive':
      if (p.abilityActive) mods.push({ label: 'Carga Cuark', mult: 1.5, kind: 'ability' });
      else if (field.terrain === 'Electric') notes.push('Con campo eléctrico, Carga Cuark sube la Velocidad solo si es su stat más alto');
      break;
    case 'Speed Boost': notes.push('Impulso: +1 de Velocidad al final de cada turno (usa las etapas)'); break;
  }
  switch (item) {
    case 'Choice Scarf': mods.push({ label: 'Pañuelo Elección', mult: 1.5, kind: 'item' }); break;
    case 'Iron Ball': mods.push({ label: 'Bola Férrea', mult: 0.5, kind: 'item' }); break;
    case 'Macho Brace': case 'Power Anklet': case 'Power Band': case 'Power Belt': case 'Power Bracer': case 'Power Lens': case 'Power Weight':
      mods.push({ label: p.item, mult: 0.5, kind: 'item' }); break;
  }
  if (field.tailwind[p.side]) mods.push({ label: 'Viento Afín', mult: 2, kind: 'field' });
  if (field.swamp[p.side]) mods.push({ label: 'Pantano', mult: 0.25, kind: 'field' });

  let mod = 4096;
  for (const m of mods) mod = chain(mod, m.mult);
  let final = mods.length ? pokeRound(afterStage, mod) : afterStage;
  if (p.paralyzed) {
    if (p.ability === 'Quick Feet') notes.push('Pies Rápidos ignora la reducción por parálisis');
    else {
      final = Math.floor((final * 50) / 100);
      mods.push({ label: 'Parálisis', mult: 0.5, kind: 'status' });
    }
  }
  final = Math.min(final, 10000);

  // Prioridad y "brackets"
  let priority = p.move?.priority ?? 0;
  let bracket = 0;
  let bracketReason: string | undefined;
  const mv = p.move;
  if (mv) {
    if (p.ability === 'Prankster' && mv.category === 'Status') {
      priority += 1;
      notes.push('Bromista: +1 de prioridad (falla contra tipo Siniestro)');
    }
    if (p.ability === 'Gale Wings' && mv.type === 'Flying' && p.fullHP !== false) {
      priority += 1;
      notes.push('Alas Vendaval: +1 a movimientos Volador con PS al máximo');
    }
    if (p.ability === 'Triage' && (mv.isHeal || HEAL_MOVES.has(mv.name))) {
      priority += 3;
      notes.push('Primer Auxilio: +3 a movimientos curativos');
    }
    if (mv.name === 'Grassy Glide' && field.terrain === 'Grassy') {
      priority += 1;
      notes.push('Fitoimpulso: +1 con campo de hierba');
    }
    if (p.ability === 'Mycelium Might' && mv.category === 'Status') {
      bracket = -1;
      bracketReason = 'Poder Fúngico: último en su prioridad';
    }
  }
  if (p.ability === 'Stall') {
    bracket = -1;
    bracketReason = 'Rezagado: último en su prioridad';
  }
  if (item === 'Lagging Tail' || item === 'Full Incense') {
    bracket = -1;
    bracketReason = `${p.item}: último en su prioridad`;
  }
  if (p.procFirst && (item === 'Quick Claw' || p.ability === 'Quick Draw' || item === 'Custap Berry')) {
    bracket = 1;
    bracketReason = item === 'Quick Claw' ? 'Garra Rápida activada' : item === 'Custap Berry' ? 'Baya Chiri activada' : 'Mano Rápida activada';
  } else if (item === 'Quick Claw') {
    notes.push('Garra Rápida: 20% de actuar primero en su prioridad');
  } else if (p.ability === 'Quick Draw' && mv?.category !== 'Status') {
    notes.push('Mano Rápida: 30% de actuar primero en su prioridad');
  }
  if (priority > 0 && field.terrain === 'Psychic') {
    notes.push('Campo psíquico: los movimientos con prioridad fallan contra objetivos en el suelo');
  }

  return { key: p.key, name: p.name, side: p.side, stat, afterStage, final, modifiers: mods, priority, bracket, bracketReason, notes };
}

export function isWeatherSuppressed(abilities: string[]) {
  return abilities.some((a) => WEATHER_SUPPRESSORS.includes(a));
}

export interface OrderEntry extends SpeedResult {
  rank: number;
  tiedWith: string[];
}

/** Ordena a los Pokémon según prioridad, bracket y velocidad (con Espacio Raro). */
export function turnOrder(results: SpeedResult[], trickRoom: boolean): OrderEntry[] {
  const cmp = (a: SpeedResult, b: SpeedResult) => {
    if (a.priority !== b.priority) return b.priority - a.priority;
    if (a.bracket !== b.bracket) return b.bracket - a.bracket;
    return trickRoom ? a.final - b.final : b.final - a.final;
  };
  const sorted = [...results].sort(cmp);
  const out: OrderEntry[] = [];
  let rank = 0;
  sorted.forEach((r, i) => {
    if (i === 0 || cmp(sorted[i - 1], r) !== 0) rank = i + 1;
    out.push({ ...r, rank, tiedWith: [] });
  });
  for (const e of out) e.tiedWith = out.filter((o) => o !== e && o.rank === e.rank).map((o) => o.key);
  return out;
}

/** Compara dos resultados: 1 si `a` actúa antes, -1 si después, 0 si empate de velocidad. */
export function compareSpeed(a: SpeedResult, b: SpeedResult, trickRoom: boolean): number {
  if (a.priority !== b.priority) return a.priority > b.priority ? 1 : -1;
  if (a.bracket !== b.bracket) return a.bracket > b.bracket ? 1 : -1;
  if (a.final === b.final) return 0;
  return (a.final > b.final) !== trickRoom ? 1 : -1;
}

/**
 * Mínimo de SP (0-32) que necesita `p` para actuar estrictamente antes que `target`
 * con la configuración actual. Devuelve null si ni con 32 SP lo consigue.
 * Bajo Espacio Raro devuelve el MÁXIMO de SP con el que sigue siendo más lento.
 */
export function spNeededToOutspeed(
  p: SpeedInput,
  target: SpeedResult,
  field: SpeedField,
  weatherSuppressed = false,
): { sp: number; speed: number } | null {
  if (!field.trickRoom) {
    for (let sp = 0; sp <= 32; sp++) {
      const r = computeSpeed({ ...p, sp }, field, weatherSuppressed);
      if (r.final > target.final) return { sp, speed: r.final };
    }
    return null;
  }
  for (let sp = 32; sp >= 0; sp--) {
    const r = computeSpeed({ ...p, sp }, field, weatherSuppressed);
    if (r.final < target.final) return { sp, speed: r.final };
  }
  return null;
}
