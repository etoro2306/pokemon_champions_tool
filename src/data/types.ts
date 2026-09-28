export type StatID = 'hp' | 'atk' | 'def' | 'spa' | 'spd' | 'spe';
export type StatsTable = Record<StatID, number>;

export const STAT_IDS: StatID[] = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];

export interface SpeciesEntry {
  /** id de Showdown, p. ej. "garchompmegaz" */
  id: string;
  /** nombre canónico, p. ej. "Garchomp-Mega-Z" */
  name: string;
  num: number;
  types: string[];
  baseStats: StatsTable;
  abilities: string[];
  weightkg: number;
  baseSpecies: string;
  forme?: string;
  isMega: boolean;
  /** Formas que solo existen en combate (Mega, Aegislash-Blade, Castform-Sunny…) */
  battleOnly?: string;
  requiredItem?: string;
  tier?: string;
  /** clave dentro de `RegulationData.learnsets` */
  learnset?: string;
}

export interface RegulationMeta {
  /** Código de la regulación, p. ej. "M-C" */
  regulation: string;
  year?: string;
  formatName: string;
  formatId: string;
  source: string;
  generatedAt: string;
  /** Especies base (sin Megas ni formas de combate) */
  speciesCount: number;
  megaCount: number;
  totalEntries: number;
  /** Huella de la lista legal: cambia cuando cambia la regulación o sus Pokémon */
  fingerprint: string;
  bannedTags: string[];
}

export interface RegulationData {
  meta: RegulationMeta;
  species: SpeciesEntry[];
  learnsets: Record<string, string[]>;
}
