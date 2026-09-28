/**
 * Construcción del listado de la regulación vigente de Pokémon Champions a partir de
 * los datos públicos de Pokémon Showdown (smogon/pokemon-showdown, rama master).
 *
 * Se usa en dos sitios:
 *  - `scripts/update-regulation.ts` (Node / GitHub Actions) para regenerar
 *    `src/data/regulation.json` cuando cambia la regulación.
 *  - El panel "Regulación" de la web, para comprobar/actualizar desde el navegador.
 *
 * Showdown mantiene el mod `champions` apuntando siempre a la regulación vigente
 * (las anteriores se mueven a mods como `championsregmb`), y su `formats-data.ts`
 * marca como `Illegal` todo lo que no está permitido.
 */
import { parseLiteral, parseShowdownDataFile } from './literalParser';
import type { RegulationData, SpeciesEntry, StatsTable } from './types';
import { fnv1a, toID } from '../lib/util';

export const SHOWDOWN_RAW = 'https://raw.githubusercontent.com/smogon/pokemon-showdown/master';

export const SOURCES = {
  formats: `${SHOWDOWN_RAW}/config/formats.ts`,
  formatsData: `${SHOWDOWN_RAW}/data/mods/champions/formats-data.ts`,
  pokedex: `${SHOWDOWN_RAW}/data/pokedex.ts`,
  learnsets: `${SHOWDOWN_RAW}/data/mods/champions/learnsets.ts`,
};

export type FetchText = (url: string) => Promise<string>;

export const defaultFetchText: FetchText = async (url) => {
  const res = await fetch(url, { cache: 'no-store' } as RequestInit);
  if (!res.ok) throw new Error(`HTTP ${res.status} al descargar ${url}`);
  return res.text();
};

export interface CurrentFormat {
  name: string;
  id: string;
  regulation: string;
  year?: string;
  mod: string;
  banlist: string[];
  unbanlist: string[];
  ruleset: string[];
}

/** Detecta en `config/formats.ts` el formato VGC oficial vigente de Champions. */
export function detectCurrentFormat(formatsSource: string): CurrentFormat {
  const re = /\{\s*name:\s*["'`](\[Gen \d+ Champions\][^"'`]*)["'`],([\s\S]*?)\n\t\},/g;
  const candidates: CurrentFormat[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(formatsSource))) {
    const name = m[1];
    const body = m[2];
    const mod = /mod:\s*['"](\w+)['"]/.exec(body)?.[1] ?? '';
    const reg = /Reg(?:ulation)?\s+([A-Z0-9]+(?:-[A-Z0-9]+)?)/.exec(name);
    if (!reg) continue;
    const list = (key: string): string[] => {
      const lm = new RegExp(`\\b${key}:\\s*(\\[[^\\]]*\\])`).exec(body);
      if (!lm) return [];
      try {
        return parseLiteral<string[]>(lm[1]);
      } catch {
        return [];
      }
    };
    candidates.push({
      name,
      id: toID(name),
      regulation: reg[1],
      year: /(\d{4})/.exec(name)?.[1],
      mod,
      banlist: list('banlist'),
      unbanlist: list('unbanlist'),
      ruleset: list('ruleset'),
    });
  }
  const score = (f: CurrentFormat) =>
    (f.mod === 'champions' ? 100 : 0) + (/\bVGC\b/.test(f.name) ? 10 : 0) + (/Bo3/.test(f.name) ? -5 : 0);
  candidates.sort((a, b) => score(b) - score(a));
  const best = candidates[0];
  if (!best) throw new Error('No se encontró ningún formato de Pokémon Champions en formats.ts');
  return best;
}

interface FormatsDataEntry {
  isNonstandard?: string | null;
  tier?: string;
}

/** Ids legales según `formats-data.ts` del mod champions (antes de filtros de reglas). */
export function legalIdsFromFormatsData(formatsData: Record<string, FormatsDataEntry>): string[] {
  return Object.keys(formatsData)
    .filter((id) => {
      const e = formatsData[id];
      return !e.isNonstandard && e.tier !== 'Illegal';
    })
    .sort();
}

export function computeFingerprint(format: CurrentFormat, legalIds: string[]) {
  return fnv1a(`${format.name}|${format.banlist.join(',')}|${legalIds.join(',')}`);
}

/** Comprobación rápida (2 descargas pequeñas): ¿ha cambiado la regulación? */
export async function checkRemoteRegulation(fetchText: FetchText = defaultFetchText) {
  const [formatsSrc, fdSrc] = await Promise.all([fetchText(SOURCES.formats), fetchText(SOURCES.formatsData)]);
  const format = detectCurrentFormat(formatsSrc);
  const legalIds = legalIdsFromFormatsData(parseShowdownDataFile(fdSrc, 'FormatsData'));
  return { format, legalCount: legalIds.length, fingerprint: computeFingerprint(format, legalIds) };
}

const FLAT_RULES_BANNED_TAGS = ['Mythical', 'Restricted Legendary'];

/** Descarga completa y construcción del dataset de la regulación vigente. */
export async function buildRegulation(
  fetchText: FetchText = defaultFetchText,
  onProgress?: (msg: string) => void,
): Promise<RegulationData> {
  onProgress?.('Detectando la regulación vigente…');
  const formatsSrc = await fetchText(SOURCES.formats);
  const format = detectCurrentFormat(formatsSrc);

  onProgress?.(`Regulación ${format.regulation}: descargando datos de especies…`);
  const [fdSrc, dexSrc, lsSrc] = await Promise.all([
    fetchText(SOURCES.formatsData),
    fetchText(SOURCES.pokedex),
    fetchText(SOURCES.learnsets),
  ]);

  onProgress?.('Procesando Pokédex y movimientos…');
  const formatsData = parseShowdownDataFile<Record<string, FormatsDataEntry>>(fdSrc, 'FormatsData');
  const dex = parseShowdownDataFile<Record<string, any>>(dexSrc, 'Pokedex');
  const learnsetsRaw = parseShowdownDataFile<Record<string, { learnset?: Record<string, unknown> }>>(lsSrc, 'Learnsets');

  return assembleRegulation(format, formatsData, dex, learnsetsRaw);
}

export function assembleRegulation(
  format: CurrentFormat,
  formatsData: Record<string, FormatsDataEntry>,
  dex: Record<string, any>,
  learnsetsRaw: Record<string, { learnset?: Record<string, unknown> }>,
): RegulationData {
  const legalIds = legalIdsFromFormatsData(formatsData);
  const usesFlatRules = format.ruleset.some((r) => toID(r) === 'flatrules');
  const bannedTags = usesFlatRules ? FLAT_RULES_BANNED_TAGS : [];
  const banned = new Set(format.banlist.map(toID));
  const unbanned = new Set(format.unbanlist.map(toID));

  const learnsets: Record<string, string[]> = {};
  const learnsetFor = (sp: any): string | undefined => {
    const chain: string[] = [];
    const push = (name?: string | string[]) => {
      if (!name) return;
      for (const n of Array.isArray(name) ? name : [name]) {
        const id = toID(n);
        if (id && !chain.includes(id)) chain.push(id);
      }
    };
    push(sp.name);
    push(sp.changesFrom);
    push(sp.battleOnly);
    push(sp.baseSpecies);
    const owner = chain.find((id) => learnsetsRaw[id]?.learnset);
    if (!owner) return undefined;
    if (!learnsets[owner]) {
      const moves = new Set(Object.keys(learnsetsRaw[owner].learnset!));
      // Movimientos heredados de preevoluciones
      let prevo = dex[owner]?.prevo;
      let guard = 0;
      while (prevo && guard++ < 4) {
        const pid = toID(prevo);
        for (const mv of Object.keys(learnsetsRaw[pid]?.learnset ?? {})) moves.add(mv);
        prevo = dex[pid]?.prevo;
      }
      learnsets[owner] = [...moves].sort();
    }
    return owner;
  };

  const species: SpeciesEntry[] = [];
  for (const id of legalIds) {
    const sp = dex[id];
    if (!sp) continue;
    const tags: string[] = sp.tags ?? [];
    const baseId = toID(sp.baseSpecies ?? sp.name);
    if (!unbanned.has(id) && !unbanned.has(baseId)) {
      if (banned.has(id) || tags.some((t) => bannedTags.includes(t))) continue;
      const baseTags: string[] = dex[baseId]?.tags ?? [];
      if (baseTags.some((t) => bannedTags.includes(t))) continue;
    }
    const isMega = /Mega/.test(sp.forme ?? '');
    species.push({
      id,
      name: sp.name,
      num: sp.num,
      types: sp.types,
      baseStats: sp.baseStats as StatsTable,
      abilities: [...new Set(Object.values(sp.abilities ?? {}) as string[])].filter(Boolean),
      weightkg: sp.weightkg,
      baseSpecies: sp.baseSpecies ?? sp.name,
      forme: sp.forme || undefined,
      isMega,
      battleOnly: Array.isArray(sp.battleOnly) ? sp.battleOnly[0] : sp.battleOnly || undefined,
      requiredItem: sp.requiredItem || (Array.isArray(sp.requiredItems) ? sp.requiredItems[0] : undefined),
      tier: formatsData[id]?.tier,
      learnset: learnsetFor(sp),
    });
  }
  species.sort((a, b) => a.num - b.num || (a.forme ? 1 : 0) - (b.forme ? 1 : 0) || a.name.localeCompare(b.name));

  return {
    meta: {
      regulation: format.regulation,
      year: format.year,
      formatName: format.name,
      formatId: format.id,
      source: 'smogon/pokemon-showdown@master (mod champions)',
      generatedAt: new Date().toISOString(),
      speciesCount: new Set(species.filter((s) => !s.battleOnly && !s.isMega).map((s) => s.baseSpecies)).size,
      megaCount: species.filter((s) => s.isMega).length,
      totalEntries: species.length,
      fingerprint: computeFingerprint(format, legalIds),
      bannedTags,
    },
    species,
    learnsets,
  };
}
