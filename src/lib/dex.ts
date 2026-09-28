/**
 * Acceso a los datos de mecánicas de @smogon/calc (generación 0 = Pokémon Champions):
 * movimientos, objetos y habilidades legales en Champions.
 */
import { Generations } from '@smogon/calc';
import type { SpeciesEntry } from '../data/types';
import { toID } from './util';

export const GEN = Generations.get(0 as any);

export interface MoveInfo {
  id: string;
  name: string;
  type: string;
  category: 'Physical' | 'Special' | 'Status';
  bp: number;
  priority: number;
  target: string;
  multihit?: number | number[];
  isSpread: boolean;
  hitsAlly: boolean;
}

const moveCache = new Map<string, MoveInfo | null>();

export function getMove(nameOrId: string): MoveInfo | null {
  const id = toID(nameOrId);
  if (moveCache.has(id)) return moveCache.get(id)!;
  const m = GEN.moves.get(id as any) as any;
  const info: MoveInfo | null = m
    ? {
        id,
        name: m.name,
        type: m.type,
        category: m.category ?? 'Status',
        bp: m.bp ?? m.basePower ?? 0,
        priority: m.priority ?? 0,
        target: m.target ?? 'normal',
        multihit: m.multihit,
        isSpread: m.target === 'allAdjacent' || m.target === 'allAdjacentFoes',
        hitsAlly: m.target === 'allAdjacent',
      }
    : null;
  moveCache.set(id, info);
  return info;
}

export const ALL_MOVES: MoveInfo[] = [...GEN.moves]
  .map((m: any) => getMove(m.id))
  .filter((m): m is MoveInfo => !!m && m.name !== '(No Move)')
  .sort((a, b) => a.name.localeCompare(b.name));

export const ALL_ITEMS: string[] = [...GEN.items].map((i: any) => i.name as string).sort();

export const ALL_ABILITIES: string[] = [...GEN.abilities].map((a: any) => a.name as string).sort();

export function learnableMoves(sp: SpeciesEntry | undefined, learnsets: Record<string, string[]>): MoveInfo[] {
  if (!sp?.learnset) return ALL_MOVES;
  const ids = learnsets[sp.learnset] ?? [];
  const moves = ids.map((id) => getMove(id)).filter((m): m is MoveInfo => !!m);
  return moves.sort((a, b) => a.name.localeCompare(b.name));
}

/** Sugiere 4 movimientos ofensivos: STAB más potentes + cobertura. */
export function suggestMoves(sp: SpeciesEntry, learnsets: Record<string, string[]>): string[] {
  const moves = learnableMoves(sp, learnsets).filter((m) => m.category !== 'Status' && m.bp > 0);
  const physical = sp.baseStats.atk >= sp.baseStats.spa;
  const score = (m: MoveInfo) => {
    let s = m.bp;
    if (sp.types.includes(m.type)) s *= 1.5;
    if ((m.category === 'Physical') !== physical) s *= 0.6;
    if (['Hyper Beam', 'Giga Impact', 'Explosion', 'Self-Destruct', 'Focus Punch', 'Solar Beam', 'Solar Blade', 'Sky Attack', 'Future Sight', 'Dream Eater', 'Belch', 'Steel Beam', 'Meteor Beam', 'Last Resort', 'Synchronoise', 'Head Smash', 'Mind Blown'].includes(m.name)) s *= 0.4;
    return s;
  };
  const sorted = [...moves].sort((a, b) => score(b) - score(a));
  const picked: MoveInfo[] = [];
  const usedTypes = new Set<string>();
  for (const m of sorted) {
    if (picked.length >= 4) break;
    if (usedTypes.has(m.type)) continue;
    picked.push(m);
    usedTypes.add(m.type);
  }
  return picked.map((m) => m.name);
}

/** Resuelve el nombre de especie que entiende @smogon/calc (p. ej. Aegislash → Aegislash-Shield). */
export function calcSpeciesName(sp: SpeciesEntry): { name: string; overrides?: any } {
  if (GEN.species.get(sp.id as any)) return { name: sp.name };
  for (const suffix of ['-Shield', '-Base']) {
    const alt = GEN.species.get(toID(sp.name + suffix) as any);
    if (alt) return { name: alt.name };
  }
  // Especie nueva que la librería aún no conoce: se le pasan sus datos.
  const abilities: Record<string, string> = {};
  sp.abilities.forEach((a, i) => (abilities[i === 0 ? '0' : i === 1 ? '1' : 'H'] = a));
  return {
    name: sp.name,
    overrides: { name: sp.name, types: sp.types, baseStats: sp.baseStats, weightkg: sp.weightkg, abilities },
  };
}
