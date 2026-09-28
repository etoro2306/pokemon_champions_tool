import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { SpeciesEntry, StatsTable } from '../data/types';
import { useDex } from '../data/DexContext';
import { DEFAULT_FIELD, type SideID, type SpeedField } from '../lib/speed';
import { DEFAULT_DAMAGE_FIELD, EMPTY_SIDE, type BattlerState, type FieldState, type MoveSlot } from '../lib/damage';
import { suggestMoves } from '../lib/dex';
import { natureFor } from '../lib/stats';

export type Tab = 'compare' | 'speed' | 'damage' | 'guide';
export const TABS: Tab[] = ['compare', 'speed', 'damage', 'guide'];

export interface SpeedMon {
  key: string;
  speciesId: string;
  side: SideID;
  nature: string;
  sp: number;
  stage: number;
  item: string;
  ability: string;
  paralyzed: boolean;
  otherStatus: boolean;
  abilityActive: boolean;
  procFirst: boolean;
  move: string;
}

export interface SpeedState {
  field: SpeedField;
  mons: SpeedMon[];
  pair: [string, string];
  view: 'order' | 'tiers';
}

export interface DamageState {
  field: FieldState;
  p1: BattlerState;
  p2: BattlerState;
}

export interface CompareState {
  ids: string[];
  sp: number;
  nature: 'neutral' | 'plus' | 'minus';
}

const ZERO: StatsTable = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };

let keySeq = 0;
export const newKey = () => `m${Date.now().toString(36)}${(keySeq++).toString(36)}`;

export function defaultSpeedMon(sp: SpeciesEntry, side: SideID, over: Partial<SpeedMon> = {}): SpeedMon {
  const physical = sp.baseStats.atk >= sp.baseStats.spa;
  return {
    key: newKey(),
    speciesId: sp.id,
    side,
    nature: physical ? 'Jolly' : 'Timid',
    sp: 32,
    stage: 0,
    item: sp.requiredItem ?? '',
    ability: sp.abilities[0] ?? '',
    paralyzed: false,
    otherStatus: false,
    abilityActive: false,
    procFirst: false,
    move: '',
    ...over,
  };
}

export function emptyMove(name = ''): MoveSlot {
  return { name, crit: false, hits: 0, singleTarget: false };
}

export type SpreadPreset = 'physical' | 'special' | 'bulky-phys' | 'bulky-spec' | 'balanced' | 'none';

export function spreadFor(preset: SpreadPreset, sp: SpeciesEntry): { sp: StatsTable; nature: string } {
  switch (preset) {
    case 'physical':
      return { sp: { ...ZERO, atk: 32, spe: 32, hp: 2 }, nature: 'Jolly' };
    case 'special':
      return { sp: { ...ZERO, spa: 32, spe: 32, hp: 2 }, nature: 'Timid' };
    case 'bulky-phys':
      return { sp: { ...ZERO, hp: 32, def: 32, spd: 2 }, nature: sp.baseStats.atk >= sp.baseStats.spa ? 'Impish' : 'Bold' };
    case 'bulky-spec':
      return { sp: { ...ZERO, hp: 32, spd: 32, def: 2 }, nature: sp.baseStats.atk >= sp.baseStats.spa ? 'Careful' : 'Calm' };
    case 'balanced':
      return { sp: { ...ZERO, hp: 32, [sp.baseStats.atk >= sp.baseStats.spa ? 'atk' : 'spa']: 32, spe: 2 } as StatsTable, nature: sp.baseStats.atk >= sp.baseStats.spa ? 'Adamant' : 'Modest' };
    default:
      return { sp: { ...ZERO }, nature: 'Serious' };
  }
}

export function defaultBattler(sp: SpeciesEntry, learnsets: Record<string, string[]>, role: 'attacker' | 'defender'): BattlerState {
  const physical = sp.baseStats.atk >= sp.baseStats.spa;
  const spread = role === 'attacker' ? spreadFor(physical ? 'physical' : 'special', sp) : spreadFor('bulky-phys', sp);
  if (role === 'attacker') spread.nature = physical ? natureFor('atk', 'spa') : natureFor('spa', 'atk');
  const moves = suggestMoves(sp, learnsets);
  while (moves.length < 4) moves.push('');
  return {
    speciesId: sp.id,
    ability: sp.abilities[0] ?? '',
    abilityOn: false,
    item: sp.requiredItem ?? '',
    nature: spread.nature,
    sp: spread.sp,
    boosts: { ...ZERO },
    status: '',
    hpPercent: 100,
    moves: moves.map((m) => emptyMove(m)),
    alliesFainted: 0,
  };
}

interface Store {
  tab: Tab;
  setTab: (t: Tab) => void;
  speed: SpeedState;
  setSpeed: (fn: (s: SpeedState) => SpeedState) => void;
  damage: DamageState;
  setDamage: (fn: (s: DamageState) => DamageState) => void;
  compare: CompareState;
  setCompare: (fn: (s: CompareState) => CompareState) => void;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  tourOpen: boolean;
  setTourOpen: (v: boolean) => void;
  regOpen: boolean;
  setRegOpen: (v: boolean) => void;
}

const Ctx = createContext<Store | null>(null);

function readHashTab(): Tab {
  const h = window.location.hash.replace(/^#\/?/, '');
  const map: Record<string, Tab> = { comparador: 'compare', velocidad: 'speed', dano: 'damage', daño: 'damage', guia: 'guide', guía: 'guide' };
  return map[decodeURIComponent(h)] ?? 'speed';
}
const HASH: Record<Tab, string> = { compare: 'comparador', speed: 'velocidad', damage: 'dano', guide: 'guia' };

function load<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const dex = useDex();
  const learnsets = dex.data.learnsets;
  const pick = (ids: string[]) => ids.map((id) => dex.get(id)).find(Boolean) ?? dex.species[0];

  const [tab, setTabState] = useState<Tab>(readHashTab);
  const setTab = useCallback((t: Tab) => {
    setTabState(t);
    if (readHashTab() !== t || !window.location.hash) window.history.replaceState(null, '', `#/${HASH[t]}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);
  useEffect(() => {
    const on = () => setTabState(readHashTab());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);

  const validSpeed = (s: SpeedState | null): SpeedState | null =>
    s && Array.isArray(s.mons) && s.mons.every((m) => dex.get(m.speciesId)) && s.mons.length > 0
      ? { ...s, field: { ...DEFAULT_FIELD, ...s.field } }
      : null;
  const [speed, setSpeedState] = useState<SpeedState>(() => {
    const saved = validSpeed(load<SpeedState>('cl:speed'));
    if (saved) return saved;
    const a = defaultSpeedMon(pick(['garchompmegaz', 'garchomp']), 'ally');
    const b = defaultSpeedMon(pick(['incineroar', 'dragonite']), 'foe', { nature: 'Adamant', sp: 0 });
    return { field: { ...DEFAULT_FIELD }, mons: [a, b], pair: [a.key, b.key], view: 'order' };
  });

  const validDamage = (s: DamageState | null): DamageState | null =>
    s && s.p1 && s.p2 && dex.get(s.p1.speciesId) && dex.get(s.p2.speciesId)
      ? { ...s, field: { ...DEFAULT_DAMAGE_FIELD, ...s.field, sides: [{ ...EMPTY_SIDE, ...s.field?.sides?.[0] }, { ...EMPTY_SIDE, ...s.field?.sides?.[1] }] } }
      : null;
  const [damage, setDamageState] = useState<DamageState>(() => {
    const saved = validDamage(load<DamageState>('cl:damage'));
    if (saved) return saved;
    return {
      field: { ...DEFAULT_DAMAGE_FIELD, sides: [{ ...EMPTY_SIDE }, { ...EMPTY_SIDE }] },
      p1: defaultBattler(pick(['garchomp', 'garchompmegaz']), learnsets, 'attacker'),
      p2: defaultBattler(pick(['incineroar']), learnsets, 'defender'),
    };
  });

  const [compare, setCompareState] = useState<CompareState>(() => {
    const saved = load<CompareState>('cl:compare');
    if (saved && Array.isArray(saved.ids)) return { ...saved, ids: saved.ids.filter((id) => dex.get(id)) };
    return { ids: ['garchomp', 'incineroar', 'gardevoir', 'dragonite'].filter((id) => dex.get(id)), sp: 32, nature: 'neutral' };
  });

  // Persistencia con pequeño retardo
  const timers = useRef<Record<string, number>>({});
  const persist = (key: string, v: unknown) => {
    clearTimeout(timers.current[key]);
    timers.current[key] = window.setTimeout(() => save(key, v), 300);
  };
  useEffect(() => persist('cl:speed', speed), [speed]);
  useEffect(() => persist('cl:damage', damage), [damage]);
  useEffect(() => persist('cl:compare', compare), [compare]);

  const [theme, setTheme] = useState<'dark' | 'light'>(() => (document.documentElement.dataset.theme as 'light') || 'dark');
  const toggleTheme = useCallback(() => {
    setTheme((t) => {
      const next = t === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      try {
        localStorage.setItem('cl:theme', next);
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const [tourOpen, setTourOpen] = useState(false);
  const [regOpen, setRegOpen] = useState(false);

  const value = useMemo<Store>(
    () => ({
      tab,
      setTab,
      speed,
      setSpeed: (fn) => setSpeedState(fn),
      damage,
      setDamage: (fn) => setDamageState(fn),
      compare,
      setCompare: (fn) => setCompareState(fn),
      theme,
      toggleTheme,
      tourOpen,
      setTourOpen,
      regOpen,
      setRegOpen,
    }),
    [tab, setTab, speed, damage, compare, theme, toggleTheme, tourOpen, regOpen],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useStore fuera de StoreProvider');
  return v;
}
