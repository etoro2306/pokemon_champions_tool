import type { StatID, StatsTable } from '../data/types';

export const LEVEL = 50;
export const SP_MAX_PER_STAT = 32;
export const SP_MAX_TOTAL = 66;

export interface Nature {
  name: string;
  es: string;
  plus?: Exclude<StatID, 'hp'>;
  minus?: Exclude<StatID, 'hp'>;
}

export const NATURES: Nature[] = [
  { name: 'Hardy', es: 'Fuerte' },
  { name: 'Lonely', es: 'Huraña', plus: 'atk', minus: 'def' },
  { name: 'Brave', es: 'Audaz', plus: 'atk', minus: 'spe' },
  { name: 'Adamant', es: 'Firme', plus: 'atk', minus: 'spa' },
  { name: 'Naughty', es: 'Pícara', plus: 'atk', minus: 'spd' },
  { name: 'Bold', es: 'Osada', plus: 'def', minus: 'atk' },
  { name: 'Docile', es: 'Dócil' },
  { name: 'Relaxed', es: 'Plácida', plus: 'def', minus: 'spe' },
  { name: 'Impish', es: 'Agitada', plus: 'def', minus: 'spa' },
  { name: 'Lax', es: 'Floja', plus: 'def', minus: 'spd' },
  { name: 'Timid', es: 'Miedosa', plus: 'spe', minus: 'atk' },
  { name: 'Hasty', es: 'Activa', plus: 'spe', minus: 'def' },
  { name: 'Serious', es: 'Seria' },
  { name: 'Jolly', es: 'Alegre', plus: 'spe', minus: 'spa' },
  { name: 'Naive', es: 'Ingenua', plus: 'spe', minus: 'spd' },
  { name: 'Modest', es: 'Modesta', plus: 'spa', minus: 'atk' },
  { name: 'Mild', es: 'Afable', plus: 'spa', minus: 'def' },
  { name: 'Quiet', es: 'Mansa', plus: 'spa', minus: 'spe' },
  { name: 'Bashful', es: 'Tímida' },
  { name: 'Rash', es: 'Alocada', plus: 'spa', minus: 'spd' },
  { name: 'Calm', es: 'Serena', plus: 'spd', minus: 'atk' },
  { name: 'Gentle', es: 'Amable', plus: 'spd', minus: 'def' },
  { name: 'Sassy', es: 'Grosera', plus: 'spd', minus: 'spe' },
  { name: 'Careful', es: 'Cauta', plus: 'spd', minus: 'spa' },
  { name: 'Quirky', es: 'Rara' },
];

export const NATURE_BY_NAME: Record<string, Nature> = Object.fromEntries(NATURES.map((n) => [n.name, n]));

export const STAT_LABEL: Record<StatID, string> = {
  hp: 'PS',
  atk: 'Ataque',
  def: 'Defensa',
  spa: 'At. Esp.',
  spd: 'Def. Esp.',
  spe: 'Velocidad',
};

export const STAT_SHORT: Record<StatID, string> = {
  hp: 'PS',
  atk: 'Atq',
  def: 'Def',
  spa: 'AtE',
  spd: 'DfE',
  spe: 'Vel',
};

export function natureMultiplier(nature: string | undefined, stat: StatID): number {
  const n = nature ? NATURE_BY_NAME[nature] : undefined;
  if (!n || stat === 'hp') return 1;
  if (n.plus === stat && n.minus === stat) return 1;
  if (n.plus === stat) return 1.1;
  if (n.minus === stat) return 0.9;
  return 1;
}

/**
 * Fórmula de estadísticas de Pokémon Champions (nivel 50, IV 31 fijos, 1 SP = +1 punto):
 *   PS    = Base + 75 + SP
 *   Resto = ⌊(Base + 20 + SP) × Naturaleza⌋
 * (idéntica a la implementada por Showdown en data/mods/champions/scripts.ts)
 */
export function calcStat(stat: StatID, base: number, sp: number, nature?: string): number {
  if (stat === 'hp') return base === 1 ? 1 : base + 75 + sp;
  const raw = base + 20 + sp;
  const m = natureMultiplier(nature, stat);
  if (m === 1.1) return Math.floor((raw * 110) / 100);
  if (m === 0.9) return Math.floor((raw * 90) / 100);
  return raw;
}

export function calcAllStats(base: StatsTable, sp: Partial<StatsTable>, nature?: string): StatsTable {
  const out = {} as StatsTable;
  for (const s of ['hp', 'atk', 'def', 'spa', 'spd', 'spe'] as StatID[]) {
    out[s] = calcStat(s, base[s], sp[s] ?? 0, nature);
  }
  return out;
}

/** Multiplicador de etapas (-6…+6) para Ataque, Defensa, At. Esp., Def. Esp. y Velocidad. */
export function stageMultiplier(stage: number): number {
  return stage >= 0 ? (2 + stage) / 2 : 2 / (2 - stage);
}

export function applyStage(stat: number, stage: number): number {
  if (stage === 0) return stat;
  return stage > 0 ? Math.floor((stat * (2 + stage)) / 2) : Math.floor((stat * 2) / (2 - stage));
}

export function bst(base: StatsTable) {
  return base.hp + base.atk + base.def + base.spa + base.spd + base.spe;
}

/** Busca una naturaleza con el stat que sube y el que baja indicados. */
export function natureFor(plus?: Exclude<StatID, 'hp'>, minus?: Exclude<StatID, 'hp'>): string {
  if (!plus || !minus) return 'Serious';
  return NATURES.find((n) => n.plus === plus && n.minus === minus)?.name ?? 'Serious';
}
