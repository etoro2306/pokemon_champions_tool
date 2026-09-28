/**
 * Envoltorio del motor de daño de @smogon/calc (mecánicas de Pokémon Champions) con
 * cálculo propio de probabilidades de OHKO / 2HKO / 3HKO a partir de las 16 tiradas.
 */
import { calculate, Field, Move, Pokemon } from '@smogon/calc';
import type { SpeciesEntry, StatsTable } from '../data/types';
import { GEN, calcSpeciesName, getMove, type MoveInfo } from './dex';
import type { Terrain, Weather } from './speed';

export type Status = '' | 'brn' | 'par' | 'psn' | 'tox' | 'slp' | 'frz';

export interface MoveSlot {
  name: string;
  crit: boolean;
  /** nº de golpes para movimientos multigolpe (0 = por defecto) */
  hits: number;
  /** Si es un ataque en área, forzar "un solo objetivo" (sin reducción ×0,75) */
  singleTarget: boolean;
  /** usos previos (Rage Fist, Last Respects…) — opcional */
  timesUsed?: number;
}

export interface BattlerState {
  speciesId: string;
  ability: string;
  abilityOn: boolean;
  item: string;
  nature: string;
  sp: StatsTable;
  boosts: StatsTable;
  status: Status;
  hpPercent: number;
  moves: MoveSlot[];
  alliesFainted: number;
}

export interface SideState {
  reflect: boolean;
  lightScreen: boolean;
  auroraVeil: boolean;
  helpingHand: boolean;
  friendGuard: boolean;
  battery: boolean;
  powerSpot: boolean;
  steelySpirit: boolean;
  flowerGift: boolean;
  tailwind: boolean;
  stealthRock: boolean;
  spikes: number;
  saltCure: boolean;
  leechSeed: boolean;
  foresight: boolean;
  charge: boolean;
}

export interface FieldState {
  gameType: 'Singles' | 'Doubles';
  weather: Weather;
  terrain: Terrain;
  gravity: boolean;
  magicRoom: boolean;
  wonderRoom: boolean;
  fairyAura: boolean;
  darkAura: boolean;
  auraBreak: boolean;
  beadsOfRuin: boolean;
  swordOfRuin: boolean;
  tabletsOfRuin: boolean;
  vesselOfRuin: boolean;
  sides: [SideState, SideState];
}

export const EMPTY_SIDE: SideState = {
  reflect: false, lightScreen: false, auroraVeil: false, helpingHand: false, friendGuard: false, battery: false,
  powerSpot: false, steelySpirit: false, flowerGift: false, tailwind: false, stealthRock: false, spikes: 0,
  saltCure: false, leechSeed: false, foresight: false, charge: false,
};

export const DEFAULT_DAMAGE_FIELD: FieldState = {
  gameType: 'Doubles', weather: '', terrain: '', gravity: false, magicRoom: false, wonderRoom: false,
  fairyAura: false, darkAura: false, auraBreak: false, beadsOfRuin: false, swordOfRuin: false,
  tabletsOfRuin: false, vesselOfRuin: false, sides: [{ ...EMPTY_SIDE }, { ...EMPTY_SIDE }],
};

const WEATHER_MAP: Record<string, string | undefined> = { Sun: 'Sun', Rain: 'Rain', Sand: 'Sand', Snow: 'Snow', '': undefined };

export function buildPokemon(state: BattlerState, sp: SpeciesEntry): Pokemon {
  const { name, overrides } = calcSpeciesName(sp);
  const p = new Pokemon(GEN, name, {
    level: 50,
    ability: (state.ability || undefined) as any,
    abilityOn: state.abilityOn,
    item: (state.item || undefined) as any,
    nature: state.nature as any,
    evs: state.sp,
    boosts: state.boosts,
    status: state.status as any,
    alliesFainted: state.alliesFainted,
    boostedStat: 'auto',
    overrides,
  });
  const max = p.maxHP();
  p.originalCurHP = Math.max(1, Math.min(max, Math.round((max * state.hpPercent) / 100)));
  return p;
}

function buildSide(s: SideState) {
  return {
    isReflect: s.reflect, isLightScreen: s.lightScreen, isAuroraVeil: s.auroraVeil, isHelpingHand: s.helpingHand,
    isFriendGuard: s.friendGuard, isBattery: s.battery, isPowerSpot: s.powerSpot, isSteelySpirit: s.steelySpirit,
    isFlowerGift: s.flowerGift, isTailwind: s.tailwind, isSR: s.stealthRock, spikes: s.spikes,
    isSaltCured: s.saltCure, isSeeded: s.leechSeed, isForesight: s.foresight, isCharge: s.charge,
  };
}

/** Construye el campo de @smogon/calc desde la perspectiva de quien ataca (índice de lado). */
export function buildField(f: FieldState, attackerSide: 0 | 1): Field {
  const atk = f.sides[attackerSide];
  const def = f.sides[attackerSide === 0 ? 1 : 0];
  return new Field({
    gameType: f.gameType,
    weather: WEATHER_MAP[f.weather] as any,
    terrain: (f.terrain || undefined) as any,
    isGravity: f.gravity,
    isMagicRoom: f.magicRoom,
    isWonderRoom: f.wonderRoom,
    isFairyAura: f.fairyAura,
    isDarkAura: f.darkAura,
    isAuraBreak: f.auraBreak,
    isBeadsOfRuin: f.beadsOfRuin,
    isSwordOfRuin: f.swordOfRuin,
    isTabletsOfRuin: f.tabletsOfRuin,
    isVesselOfRuin: f.vesselOfRuin,
    attackerSide: buildSide(atk),
    defenderSide: buildSide(def),
  });
}

export interface MoveResult {
  slot: MoveSlot;
  move: MoveInfo | null;
  valid: boolean;
  isSpread: boolean;
  spreadApplied: boolean;
  hitsAlly: boolean;
  /** distribución de daño total: valor → probabilidad */
  rolls: number[];
  min: number;
  max: number;
  minPct: number;
  maxPct: number;
  defenderHP: number;
  defenderMaxHP: number;
  ohko: number;
  twoHko: number;
  threeHko: number;
  koText: string;
  desc: string;
  effectiveness: number;
  error?: string;
}

type Dist = Map<number, number>;

function convolve(a: Dist, b: Dist): Dist {
  const out: Dist = new Map();
  for (const [va, pa] of a) for (const [vb, pb] of b) out.set(va + vb, (out.get(va + vb) ?? 0) + pa * pb);
  return out;
}

function toDist(values: number[]): Dist {
  const d: Dist = new Map();
  for (const v of values) d.set(v, (d.get(v) ?? 0) + 1 / values.length);
  return d;
}

/** Distribución del daño de un uso del movimiento (combina golpes múltiples). */
export function damageDistribution(damage: number | number[] | number[][]): Dist {
  if (typeof damage === 'number') return new Map([[damage, 1]]);
  if (damage.length && Array.isArray(damage[0])) {
    return (damage as number[][]).map(toDist).reduce((acc, d) => convolve(acc, d));
  }
  return toDist(damage as number[]);
}

export function koProbability(dist: Dist, hp: number, hits: number): number {
  let acc: Dist = new Map([[0, 1]]);
  for (let i = 0; i < hits; i++) {
    acc = convolve(acc, dist);
    // Compacta: todo lo que ya supera hp se agrupa
    const compact: Dist = new Map();
    for (const [v, p] of acc) {
      const k = v >= hp ? hp : v;
      compact.set(k, (compact.get(k) ?? 0) + p);
    }
    acc = compact;
  }
  let p = 0;
  for (const [v, pr] of acc) if (v >= hp) p += pr;
  return Math.min(1, p);
}

export function runMove(
  attacker: Pokemon,
  defender: Pokemon,
  slot: MoveSlot,
  field: FieldState,
  attackerSide: 0 | 1,
): MoveResult {
  const info = slot.name ? getMove(slot.name) : null;
  const base: MoveResult = {
    slot, move: info, valid: false, isSpread: !!info?.isSpread, spreadApplied: false, hitsAlly: !!info?.hitsAlly,
    rolls: [], min: 0, max: 0, minPct: 0, maxPct: 0, defenderHP: defender.curHP(), defenderMaxHP: defender.maxHP(),
    ohko: 0, twoHko: 0, threeHko: 0, koText: '', desc: '', effectiveness: 1,
  };
  if (!info) return base;
  try {
    const overrides: any = {};
    if (info.isSpread && slot.singleTarget) overrides.target = 'normal';
    const move = new Move(GEN, info.name, {
      isCrit: slot.crit,
      hits: slot.hits || undefined,
      timesUsed: slot.timesUsed,
      overrides: Object.keys(overrides).length ? overrides : undefined,
    });
    const result = calculate(GEN, attacker, defender, move, buildField(field, attackerSide));
    const dmg = result.damage as number | number[] | number[][];
    const dist = damageDistribution(dmg);
    const values = [...dist.keys()].sort((a, b) => a - b);
    const hp = defender.curHP();
    const maxHP = defender.maxHP();
    const [min, max] = result.range();
    let koText = '';
    try {
      koText = max > 0 ? result.kochance().text : '';
    } catch {
      koText = '';
    }
    let desc = '';
    try {
      desc = result.desc();
    } catch {
      desc = '';
    }
    const eff = info.category === 'Status' ? 1 : (GEN.types.get(info.type.toLowerCase() as any) ? typeEffectiveness(info.type, defender.types) : 1);
    return {
      ...base,
      valid: info.category !== 'Status',
      spreadApplied: info.isSpread && !slot.singleTarget && field.gameType === 'Doubles',
      rolls: typeof dmg === 'number' ? [dmg] : Array.isArray(dmg[0]) ? values : (dmg as number[]),
      min,
      max,
      minPct: min / maxHP,
      maxPct: max / maxHP,
      defenderHP: hp,
      defenderMaxHP: maxHP,
      ohko: max > 0 ? koProbability(dist, hp, 1) : 0,
      twoHko: max > 0 ? koProbability(dist, hp, 2) : 0,
      threeHko: max > 0 ? koProbability(dist, hp, 3) : 0,
      koText,
      desc,
      effectiveness: eff,
    };
  } catch (e) {
    return { ...base, error: e instanceof Error ? e.message : String(e) };
  }
}

export function typeEffectiveness(moveType: string, defTypes: string[]): number {
  const t = GEN.types.get(moveType.toLowerCase() as any) as any;
  if (!t) return 1;
  return defTypes.reduce((acc, d) => acc * (t.effectiveness?.[d] ?? 1), 1);
}
