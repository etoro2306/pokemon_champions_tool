import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import bundled from './regulation.json';
import type { RegulationData, SpeciesEntry } from './types';

const STORAGE_KEY = 'cl:regulation';
const BUNDLED = bundled as unknown as RegulationData;

function loadOverride(): RegulationData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as RegulationData;
    if (!data?.meta || !Array.isArray(data.species)) return null;
    // Si la web se ha redesplegado con datos más nuevos que los guardados, gana la web.
    if (new Date(data.meta.generatedAt) < new Date(BUNDLED.meta.generatedAt)) return null;
    return data;
  } catch {
    return null;
  }
}

interface DexValue {
  data: RegulationData;
  bundled: RegulationData;
  isOverride: boolean;
  species: SpeciesEntry[];
  byId: Record<string, SpeciesEntry>;
  get: (id: string | undefined) => SpeciesEntry | undefined;
  applyRegulation: (data: RegulationData) => void;
  resetRegulation: () => void;
}

const DexCtx = createContext<DexValue | null>(null);

export function DexProvider({ children }: { children: ReactNode }) {
  const [override, setOverride] = useState<RegulationData | null>(() => loadOverride());
  const data = override ?? BUNDLED;

  const applyRegulation = useCallback((d: RegulationData) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
    } catch {
      /* almacenamiento lleno o bloqueado: se aplica solo en esta sesión */
    }
    setOverride(d);
  }, []);

  const resetRegulation = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setOverride(null);
  }, []);

  const value = useMemo<DexValue>(() => {
    const byId = Object.fromEntries(data.species.map((s) => [s.id, s]));
    return {
      data,
      bundled: BUNDLED,
      isOverride: !!override,
      species: data.species,
      byId,
      get: (id) => (id ? byId[id] : undefined),
      applyRegulation,
      resetRegulation,
    };
  }, [data, override, applyRegulation, resetRegulation]);

  return <DexCtx.Provider value={value}>{children}</DexCtx.Provider>;
}

export function useDex() {
  const v = useContext(DexCtx);
  if (!v) throw new Error('useDex fuera de DexProvider');
  return v;
}
