import { describe, expect, it } from 'vitest';
import { calcStat, applyStage } from './stats';
import { computeSpeed, DEFAULT_FIELD, turnOrder, spNeededToOutspeed, type SpeedInput } from './speed';
import { buildPokemon, runMove, DEFAULT_DAMAGE_FIELD, koProbability, damageDistribution, type BattlerState } from './damage';
import { parseLiteral, parseShowdownDataFile } from '../data/literalParser';
import { detectCurrentFormat } from '../data/showdownSource';
import regulation from '../data/regulation.json';
import type { RegulationData } from '../data/types';

const reg = regulation as unknown as RegulationData;
const sp = (id: string) => reg.species.find((s) => s.id === id)!;

describe('stats (fórmula Champions)', () => {
  it('calcula PS y stats con SP y naturaleza', () => {
    // Garchomp: 108/130/95/80/85/102
    expect(calcStat('hp', 108, 32)).toBe(215);
    expect(calcStat('spe', 102, 32, 'Jolly')).toBe(169); // floor(154 * 1.1)
    expect(calcStat('spe', 102, 0, 'Brave')).toBe(109); // floor(122 * 0.9)
    expect(calcStat('atk', 130, 0, 'Hardy')).toBe(150);
  });
  it('aplica etapas', () => {
    expect(applyStage(100, 1)).toBe(150);
    expect(applyStage(101, 1)).toBe(151);
    expect(applyStage(100, -1)).toBe(66);
    expect(applyStage(100, 6)).toBe(400);
  });
});

const base = (over: Partial<SpeedInput>): SpeedInput => ({
  key: 'a', name: 'X', baseSpe: 100, side: 'ally', nature: 'Hardy', sp: 0, stage: 0, item: '', ability: '', paralyzed: false, ...over,
});

describe('velocidad', () => {
  it('Viento Afín, Pañuelo y parálisis', () => {
    const f = { ...DEFAULT_FIELD, tailwind: { ally: true, foe: false } };
    expect(computeSpeed(base({}), DEFAULT_FIELD).final).toBe(120);
    expect(computeSpeed(base({}), f).final).toBe(240);
    expect(computeSpeed(base({ item: 'Choice Scarf' }), f).final).toBe(360);
    expect(computeSpeed(base({ paralyzed: true }), DEFAULT_FIELD).final).toBe(60);
    expect(computeSpeed(base({ paralyzed: true, ability: 'Quick Feet' }), DEFAULT_FIELD).final).toBe(180);
  });
  it('habilidades de clima y anulación', () => {
    const rain = { ...DEFAULT_FIELD, weather: 'Rain' as const };
    expect(computeSpeed(base({ ability: 'Swift Swim' }), rain).final).toBe(240);
    expect(computeSpeed(base({ ability: 'Swift Swim' }), rain, true).final).toBe(120);
  });
  it('Espacio Raro invierte el orden dentro de la misma prioridad', () => {
    const f = { ...DEFAULT_FIELD, trickRoom: true };
    const a = computeSpeed(base({ key: 'a', baseSpe: 30 }), f);
    const b = computeSpeed(base({ key: 'b', baseSpe: 130 }), f);
    const c = computeSpeed(base({ key: 'c', baseSpe: 130, move: { name: 'Fake Out', priority: 3, category: 'Physical', type: 'Normal' } }), f);
    expect(turnOrder([a, b, c], true).map((e) => e.key)).toEqual(['c', 'a', 'b']);
  });
  it('Bromista da +1 a movimientos de estado', () => {
    const r = computeSpeed(base({ ability: 'Prankster', move: { name: 'Tailwind', priority: 0, category: 'Status', type: 'Flying' } }), DEFAULT_FIELD);
    expect(r.priority).toBe(1);
  });
  it('calcula SP necesarios', () => {
    const target = computeSpeed(base({ key: 't', baseSpe: 100, sp: 10 }), DEFAULT_FIELD); // 130
    expect(spNeededToOutspeed(base({ baseSpe: 100 }), target, DEFAULT_FIELD)).toEqual({ sp: 11, speed: 131 });
  });
});

describe('daño (@smogon/calc, gen Champions)', () => {
  const state = (speciesId: string, over: Partial<BattlerState> = {}): BattlerState => ({
    speciesId, ability: sp(speciesId).abilities[0], abilityOn: false, item: '', nature: 'Hardy',
    sp: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }, boosts: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
    status: '', hpPercent: 100, moves: [], alliesFainted: 0, ...over,
  });
  it('aplica reducción en área en dobles', () => {
    const a = buildPokemon(state('garchomp', { nature: 'Adamant', sp: { hp: 0, atk: 32, def: 0, spa: 0, spd: 0, spe: 32 } }), sp('garchomp'));
    const d = buildPokemon(state('incineroar'), sp('incineroar'));
    const spread = runMove(a, d, { name: 'Earthquake', crit: false, hits: 0, singleTarget: false }, DEFAULT_DAMAGE_FIELD, 0);
    const single = runMove(a, d, { name: 'Earthquake', crit: false, hits: 0, singleTarget: true }, DEFAULT_DAMAGE_FIELD, 0);
    expect(spread.spreadApplied).toBe(true);
    expect(spread.max).toBeLessThan(single.max);
    expect(spread.rolls).toHaveLength(16);
    expect(single.ohko).toBeGreaterThanOrEqual(0);
    expect(single.twoHko).toBeGreaterThanOrEqual(single.ohko);
  });
  it('resuelve Aegislash', () => {
    const a = buildPokemon(state('aegislash'), sp('aegislash'));
    expect(a.maxHP()).toBe(60 + 75);
  });
  it('probabilidades de KO', () => {
    const dist = damageDistribution([50, 50, 60, 60]);
    expect(koProbability(dist, 60, 1)).toBeCloseTo(0.5);
    expect(koProbability(dist, 100, 2)).toBeCloseTo(1);
    expect(koProbability(dist, 111, 2)).toBeCloseTo(0.25);
  });
});

describe('parser de datos de Showdown', () => {
  it('parsea claves numéricas, comentarios y comas finales', () => {
    expect(parseLiteral(`{a: 1, 0: "x", 'b': [1, 2,], // c\n c: {d: null},}`)).toEqual({ a: 1, 0: 'x', b: [1, 2], c: { d: null } });
    expect(parseShowdownDataFile(`export const Foo: import('x').T = {bar: {baz: true}};`)).toEqual({ bar: { baz: true } });
  });
  it('rechaza código', () => {
    expect(() => parseLiteral(`{a: function() {}}`)).toThrow();
  });
  it('detecta el formato vigente', () => {
    const src = `
\t{
\t\tname: "[Gen 9 Champions] VGC 2026 Reg M-C",
\t\tmod: 'champions',
\t\tgameType: 'doubles',
\t\truleset: ['Flat Rules', 'VGC Timer'],
\t},
\t{
\t\tname: "[Gen 9 Champions] VGC 2026 Reg M-B",
\t\tmod: 'championsregmb',
\t\truleset: ['Flat Rules'],
\t},`;
    const f = detectCurrentFormat(src);
    expect(f.regulation).toBe('M-C');
    expect(f.ruleset).toContain('Flat Rules');
  });
  it('el dataset incluido es coherente', () => {
    expect(reg.meta.speciesCount).toBeGreaterThan(100);
    expect(reg.species.every((s) => s.baseStats.spe > 0)).toBe(true);
  });
});
