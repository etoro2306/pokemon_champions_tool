import type { RegulationData, SpeciesEntry, StatsTable } from '../../data/types';
import { DEFAULT_FIELD, type SpeedField } from '../../lib/speed';
import { DEFAULT_DAMAGE_FIELD, EMPTY_SIDE, type BattlerState, type FieldState } from '../../lib/damage';
import { defaultBattler, defaultSpeedMon, emptyMove, type DamageState, type SpeedMon, type SpeedState } from '../../state/store';

type Get = (id: string) => SpeciesEntry | undefined;

export interface SpeedExample {
  id: string;
  title: string;
  lesson: string;
  tags: string[];
  build: (get: Get) => SpeedState | null;
}

export interface DamageExample {
  id: string;
  title: string;
  lesson: string;
  tags: string[];
  build: (get: Get, data: RegulationData) => DamageState | null;
}

const ZERO: StatsTable = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };

function mon(get: Get, id: string, side: 'ally' | 'foe', over: Partial<SpeedMon> = {}): SpeedMon | null {
  const sp = get(id);
  return sp ? defaultSpeedMon(sp, side, over) : null;
}

function speedState(mons: (SpeedMon | null)[], field: Partial<SpeedField> = {}): SpeedState | null {
  const ok = mons.filter((m): m is SpeedMon => !!m);
  if (ok.length < 2) return null;
  const firstFoe = ok.find((m) => m.side === 'foe') ?? ok[1];
  return {
    mons: ok,
    field: { ...DEFAULT_FIELD, ...field, tailwind: { ...DEFAULT_FIELD.tailwind, ...field.tailwind }, swamp: { ...DEFAULT_FIELD.swamp, ...field.swamp } },
    pair: [ok[0].key, firstFoe.key],
    view: 'order',
  };
}

export const SPEED_EXAMPLES: SpeedExample[] = [
  {
    id: 'tailwind',
    title: 'Viento Afín da la vuelta al duelo',
    lesson: 'Garchomp (Alegre, 32 SP) es más lento que Dragapult (Miedosa, 32 SP)… hasta que su equipo activa Viento Afín y duplica su Velocidad.',
    tags: ['Viento Afín', 'Naturaleza'],
    build: (get) =>
      speedState([mon(get, 'garchomp', 'ally', { nature: 'Jolly', sp: 32 }), mon(get, 'dragapult', 'foe', { nature: 'Timid', sp: 32 })], {
        tailwind: { ally: true, foe: false },
      }),
  },
  {
    id: 'trickroom',
    title: 'Espacio Raro: los lentos mandan',
    lesson: 'Con Espacio Raro activo, Torkoal y Hatterene (naturaleza Mansa, 0 SP) actúan antes que los atacantes rápidos. Mira cómo se invierte el orden.',
    tags: ['Espacio Raro', '−Vel'],
    build: (get) =>
      speedState(
        [
          mon(get, 'torkoal', 'ally', { nature: 'Quiet', sp: 0, ability: 'Drought' }),
          mon(get, 'hatterene', 'ally', { nature: 'Quiet', sp: 0 }),
          mon(get, 'garchompmegaz', 'foe', { nature: 'Jolly', sp: 32 }),
          mon(get, 'dragapult', 'foe', { nature: 'Timid', sp: 32 }),
        ],
        { trickRoom: true, weather: 'Sun' },
      ),
  },
  {
    id: 'priority',
    title: 'Prioridad: Bromista y Sorpresa',
    lesson: 'Sorpresa (+3) de Incineroar va antes que el Viento Afín con Bromista (+1) de Whimsicott, y ambos antes que Dragapult, aunque sea mucho más rápido.',
    tags: ['Prioridad', 'Bromista'],
    build: (get) =>
      speedState([
        mon(get, 'whimsicott', 'ally', { nature: 'Timid', sp: 32, ability: 'Prankster', move: 'Tailwind' }),
        mon(get, 'incineroar', 'foe', { nature: 'Careful', sp: 0, ability: 'Intimidate', move: 'Fake Out' }),
        mon(get, 'dragapult', 'foe', { nature: 'Timid', sp: 32, move: 'Draco Meteor' }),
      ]),
  },
  {
    id: 'rain',
    title: 'Lluvia + Nado Rápido',
    lesson: 'Pelipper activa la lluvia con Llovizna y Basculegion duplica su Velocidad con Nado Rápido. Prueba a quitar la lluvia para ver la diferencia.',
    tags: ['Clima', 'Habilidad'],
    build: (get) =>
      speedState(
        [
          mon(get, 'basculegion', 'ally', { nature: 'Adamant', sp: 32, ability: 'Swift Swim' }),
          mon(get, 'pelipper', 'ally', { nature: 'Modest', sp: 0, ability: 'Drizzle' }),
          mon(get, 'garchompmegaz', 'foe', { nature: 'Jolly', sp: 32 }),
        ],
        { weather: 'Rain' },
      ),
  },
  {
    id: 'scarf-para',
    title: 'Pañuelo Elección contra parálisis',
    lesson: 'Un Pañuelo Elección multiplica por 1,5; la parálisis divide entre 2. Compara a Sneasler con Liviano activo frente a un Garchomp con Pañuelo.',
    tags: ['Objeto', 'Estado'],
    build: (get) =>
      speedState([
        mon(get, 'sneasler', 'ally', { nature: 'Jolly', sp: 32, ability: 'Unburden', abilityActive: true }),
        mon(get, 'garchomp', 'foe', { nature: 'Jolly', sp: 32, item: 'Choice Scarf' }),
        mon(get, 'dragonite', 'foe', { nature: 'Adamant', sp: 32, paralyzed: true }),
      ]),
  },
];

function battler(get: Get, data: RegulationData, id: string, role: 'attacker' | 'defender', over: Partial<BattlerState> = {}): BattlerState | null {
  const sp = get(id);
  if (!sp) return null;
  return { ...defaultBattler(sp, data.learnsets, role), ...over };
}

function damageState(p1: BattlerState | null, p2: BattlerState | null, field: Partial<FieldState> = {}): DamageState | null {
  if (!p1 || !p2) return null;
  return {
    p1,
    p2,
    field: {
      ...DEFAULT_DAMAGE_FIELD,
      ...field,
      sides: field.sides ?? [{ ...EMPTY_SIDE }, { ...EMPTY_SIDE }],
    },
  };
}

const moves = (...names: string[]) => [...names, '', '', '', ''].slice(0, 4).map((n) => emptyMove(n));

export const DAMAGE_EXAMPLES: DamageExample[] = [
  {
    id: 'spread',
    title: 'Terremoto en área (dobles)',
    lesson: 'Terremoto golpea a todos los adyacentes, así que en dobles hace ×0,75. Activa «Un solo objetivo» en el segundo slot para comparar con el daño completo.',
    tags: ['Área', 'Dobles'],
    build: (get, data) =>
      damageState(
        battler(get, data, 'garchomp', 'attacker', {
          nature: 'Adamant', sp: { ...ZERO, atk: 32, spe: 32, hp: 2 },
          moves: [emptyMove('Earthquake'), { ...emptyMove('Earthquake'), singleTarget: true }, emptyMove('Rock Slide'), emptyMove('Dragon Claw')],
        }),
        battler(get, data, 'incineroar', 'defender', { nature: 'Careful', sp: { ...ZERO, hp: 32, spd: 32, def: 2 }, ability: 'Intimidate' }),
        { gameType: 'Doubles' },
      ),
  },
  {
    id: 'sun-hh',
    title: 'Sol + Refuerzo: Onda Ígnea de Mega Charizard Y',
    lesson: 'Sequía pone el sol (×1,5 a Fuego) y Refuerzo añade otro ×1,5. Marca/desmarca Refuerzo en «Efectos en su lado» para ver el salto en la probabilidad de KO.',
    tags: ['Clima', 'Refuerzo'],
    build: (get, data) =>
      damageState(
        battler(get, data, 'charizardmegay', 'attacker', {
          nature: 'Modest', sp: { ...ZERO, spa: 32, spe: 32, hp: 2 }, moves: moves('Heat Wave', 'Overheat', 'Solar Beam', 'Air Slash'),
        }),
        battler(get, data, 'rillaboom', 'defender', { nature: 'Adamant', sp: { ...ZERO, hp: 32, atk: 32, spe: 2 } }),
        { gameType: 'Doubles', weather: 'Sun', sides: [{ ...EMPTY_SIDE, helpingHand: true }, { ...EMPTY_SIDE }] },
      ),
  },
  {
    id: 'screens',
    title: 'Pantallas: cuánto protege Pantalla Luz',
    lesson: 'Gholdengo lanza Fuerza Áurea contra Garchomp con Pantalla Luz en su lado. En dobles la pantalla reduce el daño a ×0,67 aprox.',
    tags: ['Pantallas'],
    build: (get, data) =>
      damageState(
        battler(get, data, 'gholdengo', 'attacker', { nature: 'Modest', sp: { ...ZERO, spa: 32, spe: 32, hp: 2 }, moves: moves('Make It Rain', 'Shadow Ball', 'Focus Blast', 'Thunderbolt') }),
        battler(get, data, 'garchomp', 'defender', { nature: 'Jolly', sp: { ...ZERO, hp: 32, spe: 32, spd: 2 } }),
        { gameType: 'Doubles', sides: [{ ...EMPTY_SIDE }, { ...EMPTY_SIDE, lightScreen: true }] },
      ),
  },
  {
    id: 'intimidate',
    title: '¿Aguanta tras Intimidación?',
    lesson: 'Un Garchomp a −1 de Ataque (Intimidación de Incineroar) ataca a Gardevoir. Usa los pasos de etapa del atacante para ver cómo cambia cada tirada.',
    tags: ['Etapas', 'Supervivencia'],
    build: (get, data) =>
      damageState(
        battler(get, data, 'garchomp', 'attacker', {
          nature: 'Jolly', sp: { ...ZERO, atk: 32, spe: 32, hp: 2 }, boosts: { ...ZERO, atk: -1 }, moves: moves('Iron Head', 'Earthquake', 'Rock Slide', 'Dragon Claw'),
        }),
        battler(get, data, 'gardevoir', 'defender', { nature: 'Bold', sp: { ...ZERO, hp: 32, def: 32, spa: 2 } }),
        { gameType: 'Doubles' },
      ),
  },
];
