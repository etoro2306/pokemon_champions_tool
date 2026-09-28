import { useMemo, useState } from 'react';
import { useDex } from '../../data/DexContext';
import type { SpeciesEntry } from '../../data/types';
import { ALL_ITEMS, getMove } from '../../lib/dex';
import {
  computeSpeed,
  isWeatherSuppressed,
  SPEED_ABILITIES,
  spNeededToOutspeed,
  TOGGLE_ABILITIES,
  turnOrder,
  compareSpeed,
  HEAL_MOVES,
  type SpeedField,
  type SpeedInput,
  type SpeedResult,
  type Terrain,
  type Weather,
} from '../../lib/speed';
import { NATURE_BY_NAME, natureFor } from '../../lib/stats';
import { cx } from '../../lib/util';
import { defaultSpeedMon, useStore, type SpeedMon, type SpeedState } from '../../state/store';
import { SpeciesPicker, MovePicker } from '../../components/pickers';
import { Sprite } from '../../components/Sprite';
import { Chip, Help, RangeInput, Segmented, Stages, Switch, useToast } from '../../components/ui';
import {
  IconBolt,
  IconClock,
  IconList,
  IconPlus,
  IconRain,
  IconSand,
  IconSnow,
  IconSun,
  IconTrash,
  IconWind,
  IconSwap,
  IconTrophy,
  IconInfo,
  IconLayers,
  IconRefresh,
} from '../../components/Icons';
import { SpeedTiers } from './SpeedTiers';

export const WEATHER_OPTS: { value: Weather; label: string; icon?: JSX.Element }[] = [
  { value: '', label: 'Sin clima' },
  { value: 'Sun', label: 'Sol', icon: <IconSun /> },
  { value: 'Rain', label: 'Lluvia', icon: <IconRain /> },
  { value: 'Sand', label: 'Arena', icon: <IconSand /> },
  { value: 'Snow', label: 'Nieve', icon: <IconSnow /> },
];
export const TERRAIN_OPTS: { value: Terrain; label: string }[] = [
  { value: '', label: 'Sin campo' },
  { value: 'Electric', label: 'Eléctrico' },
  { value: 'Grassy', label: 'Hierba' },
  { value: 'Psychic', label: 'Psíquico' },
  { value: 'Misty', label: 'Niebla' },
];

const SPEED_ITEM_CHOICES = ['Choice Scarf', 'Iron Ball', 'Quick Claw', 'Lagging Tail', 'Full Incense', 'Custap Berry', 'Macho Brace', 'Power Anklet'].filter((i) =>
  ALL_ITEMS.includes(i),
);

export function toSpeedInput(m: SpeedMon, sp: SpeciesEntry): SpeedInput {
  const mv = m.move ? getMove(m.move) : null;
  return {
    key: m.key,
    name: sp.name,
    baseSpe: sp.baseStats.spe,
    side: m.side,
    nature: m.nature,
    sp: m.sp,
    stage: m.stage,
    item: m.item,
    ability: m.ability,
    paralyzed: m.paralyzed,
    otherStatus: m.otherStatus,
    abilityActive: m.abilityActive,
    procFirst: m.procFirst,
    move: mv ? { name: mv.name, priority: mv.priority, category: mv.category, type: mv.type, isHeal: HEAL_MOVES.has(mv.name) } : null,
  };
}

export function SpeedPage() {
  const { speed, setSpeed } = useStore();
  const dex = useDex();
  const toast = useToast();

  const mons = speed.mons.filter((m) => dex.get(m.speciesId));
  const suppressed = isWeatherSuppressed(mons.map((m) => m.ability));
  const results = useMemo(
    () => mons.map((m) => computeSpeed(toSpeedInput(m, dex.get(m.speciesId)!), speed.field, suppressed)),
    [mons, speed.field, suppressed, dex],
  );
  const order = turnOrder(results, speed.field.trickRoom);

  const setField = (patch: Partial<SpeedField>) => setSpeed((s) => ({ ...s, field: { ...s.field, ...patch } }));
  const updateMon = (key: string, patch: Partial<SpeedMon>) =>
    setSpeed((s) => ({ ...s, mons: s.mons.map((m) => (m.key === key ? { ...m, ...patch } : m)) }));
  const removeMon = (key: string) =>
    setSpeed((s) => {
      const monsLeft = s.mons.filter((m) => m.key !== key);
      const pair: [string, string] = [
        s.pair[0] === key ? monsLeft[0]?.key ?? '' : s.pair[0],
        s.pair[1] === key ? monsLeft.find((m) => m.key !== s.pair[0])?.key ?? '' : s.pair[1],
      ];
      return { ...s, mons: monsLeft, pair };
    });
  const addMon = (side: 'ally' | 'foe') => {
    const pool = dex.species.filter((sp) => !sp.battleOnly);
    const sp = pool[Math.floor(Math.random() * pool.length)];
    const m = defaultSpeedMon(sp, side);
    setSpeed((s) => ({ ...s, mons: [...s.mons, m] }));
    toast(`${sp.name} añadido como ${side === 'ally' ? 'aliado' : 'rival'}`);
  };

  const f = speed.field;

  return (
    <div className="page-enter">
      <div className="page-head">
        <div>
          <div className="eyebrow">Speed Calculator</div>
          <h1 className="page-title">
            ¿Quién se mueve <span className="serif">primero</span>?
          </h1>
          <p className="page-sub">
            Configura cada Pokémon y las condiciones del combate. El orden de actuación se recalcula al instante teniendo en cuenta prioridad,
            Espacio Raro, Viento Afín, climas, campos, habilidades, objetos, etapas y parálisis.
          </p>
        </div>
        <Segmented
          value={speed.view}
          onChange={(v) => setSpeed((s) => ({ ...s, view: v }))}
          options={[
            { value: 'order', label: 'Orden de turno', icon: <IconClock /> },
            { value: 'tiers', label: 'Speed tiers', icon: <IconList /> },
          ]}
          tone="accent"
          data-tour="speed-view"
        />
      </div>

      {/* ------------------------- Condiciones de campo ------------------------- */}
      <div className="card card-pad field-bar" data-tour="speed-field">
        <div className="field-bar-grid">
          <div className="tr-toggle" data-on={f.trickRoom}>
            <div>
              <div style={{ fontWeight: 650, display: 'flex', alignItems: 'center', gap: 8 }}>
                <IconSwap width={16} height={16} /> Espacio Raro
                <Help>Durante 5 turnos, dentro de cada nivel de prioridad actúan primero los Pokémon más lentos. En Champions no hay desbordamiento: una Velocidad alta siempre es "lenta".</Help>
              </div>
              <div className="muted" style={{ fontSize: 12 }}>{f.trickRoom ? 'Activo: los lentos primero' : 'Inactivo'}</div>
            </div>
            <Switch checked={f.trickRoom} onChange={(v) => setField({ trickRoom: v })} />
          </div>
          <div className="field">
            <label>Clima {suppressed && f.weather && <span className="badge warn">Anulado</span>}</label>
            <Segmented size="sm" value={f.weather} onChange={(v) => setField({ weather: v })} options={WEATHER_OPTS} tone="accent" />
          </div>
          <div className="field">
            <label>Campo</label>
            <Segmented size="sm" value={f.terrain} onChange={(v) => setField({ terrain: v })} options={TERRAIN_OPTS} tone="accent" />
          </div>
          <div className="field">
            <label>Efectos por equipo</label>
            <div className="chips">
              <Chip size="sm" tone="ally" on={f.tailwind.ally} onClick={() => setField({ tailwind: { ...f.tailwind, ally: !f.tailwind.ally } })} icon={<IconWind />}>
                Viento Afín aliado
              </Chip>
              <Chip size="sm" tone="foe" on={f.tailwind.foe} onClick={() => setField({ tailwind: { ...f.tailwind, foe: !f.tailwind.foe } })} icon={<IconWind />}>
                Viento Afín rival
              </Chip>
              <Chip size="sm" tone="ally" on={f.swamp.ally} onClick={() => setField({ swamp: { ...f.swamp, ally: !f.swamp.ally } })}>
                Pantano aliado
              </Chip>
              <Chip size="sm" tone="foe" on={f.swamp.foe} onClick={() => setField({ swamp: { ...f.swamp, foe: !f.swamp.foe } })}>
                Pantano rival
              </Chip>
              <Chip size="sm" on={f.magicRoom} onClick={() => setField({ magicRoom: !f.magicRoom })}>
                Zona Mágica
              </Chip>
            </div>
          </div>
        </div>
      </div>

      {speed.view === 'tiers' ? (
        <SpeedTiers results={results} />
      ) : (
        <div className="speed-layout">
          <div className="speed-cards" data-tour="speed-cards">
            {mons.map((m, i) => (
              <SpeedMonCard
                key={m.key}
                mon={m}
                index={i}
                result={results.find((r) => r.key === m.key)!}
                rank={order.find((o) => o.key === m.key)?.rank ?? 0}
                onChange={(patch) => updateMon(m.key, patch)}
                onRemove={mons.length > 1 ? () => removeMon(m.key) : undefined}
                field={f}
              />
            ))}
            <div className="add-row">
              <button className="btn btn-lg add-btn side-ally" onClick={() => addMon('ally')} data-tour="speed-add">
                <IconPlus /> Añadir aliado
              </button>
              <button className="btn btn-lg add-btn side-foe" onClick={() => addMon('foe')}>
                <IconPlus /> Añadir rival
              </button>
            </div>
          </div>
          <div className="speed-side">
            <TurnOrderPanel order={order} trickRoom={f.trickRoom} speed={speed} />
            <DuelPanel speed={speed} results={results} suppressed={suppressed} setPair={(pair) => setSpeed((s) => ({ ...s, pair }))} />
          </div>
        </div>
      )}
    </div>
  );
}

/* ================================ Tarjeta ================================ */

function speedNatureMode(nature: string): '+' | '=' | '-' {
  const n = NATURE_BY_NAME[nature];
  if (n?.plus === 'spe') return '+';
  if (n?.minus === 'spe') return '-';
  return '=';
}

function SpeedMonCard({
  mon,
  result,
  rank,
  onChange,
  onRemove,
  field,
}: {
  mon: SpeedMon;
  index: number;
  result: SpeedResult;
  rank: number;
  onChange: (p: Partial<SpeedMon>) => void;
  onRemove?: () => void;
  field: SpeedField;
}) {
  const dex = useDex();
  const sp = dex.get(mon.speciesId)!;
  const physical = sp.baseStats.atk >= sp.baseStats.spa;
  const mode = speedNatureMode(mon.nature);
  const setMode = (m: '+' | '=' | '-') => {
    const off = physical ? 'atk' : 'spa';
    const dump = physical ? 'spa' : 'atk';
    onChange({ nature: m === '+' ? natureFor('spe', dump) : m === '-' ? natureFor(off, 'spe') : natureFor(off, dump) });
  };
  const toggleLabel = TOGGLE_ABILITIES[mon.ability];
  const canProc = mon.item === 'Quick Claw' || mon.item === 'Custap Berry' || mon.ability === 'Quick Draw';
  const itemChoices = [...new Set([...(sp.requiredItem ? [sp.requiredItem] : []), ...SPEED_ITEM_CHOICES])];
  const statusChoice = mon.paralyzed ? 'par' : mon.otherStatus ? 'other' : '';

  const onSpecies = (id: string) => {
    const next = dex.get(id)!;
    onChange({
      speciesId: id,
      ability: next.abilities[0] ?? '',
      item: next.requiredItem ?? (mon.item && !sp.requiredItem ? mon.item : ''),
      abilityActive: false,
      move: '',
    });
  };

  return (
    <div className={cx('card sided speed-card', mon.side === 'ally' ? 'side-ally' : 'side-foe')}>
      <div className="speed-card-head">
        <div className="rank-pill" title="Posición en el orden de turno">{rank}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <SpeciesPicker value={mon.speciesId} onChange={onSpecies} showStat="spe" />
        </div>
        <div className="final-speed">
          <div className="num">{result.final}</div>
          <div className="lbl">Vel. final</div>
        </div>
        {onRemove && (
          <button className="btn btn-ghost btn-icon btn-sm btn-danger" onClick={onRemove} title="Quitar" aria-label={`Quitar ${sp.name}`}>
            <IconTrash />
          </button>
        )}
      </div>

      <div className="speed-card-body">
        <div className="speed-grid">
          <div className="field">
            <label>Equipo</label>
            <Segmented
              size="sm"
              block
              value={mon.side}
              onChange={(v) => onChange({ side: v })}
              options={[
                { value: 'ally', label: 'Aliado', tone: 'ally' },
                { value: 'foe', label: 'Rival', tone: 'foe' },
              ]}
            />
          </div>
          <div className="field">
            <label>
              Naturaleza <span className="mono muted" style={{ fontWeight: 500 }}>{mon.nature}</span>
            </label>
            <Segmented
              size="sm"
              block
              value={mode}
              onChange={setMode}
              options={[
                { value: '+', label: '+Vel', tone: 'accent' },
                { value: '=', label: 'Neutra' },
                { value: '-', label: '−Vel' },
              ]}
            />
          </div>
          <div className="field span-2">
            <label>
              <span>
                SP en Velocidad <Help>Stat Points: cada SP suma exactamente 1 punto al stat (máx. 32 por stat, 66 en total).</Help>
              </span>
              <span className="row" style={{ gap: 4 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => onChange({ sp: 0 })}>0</button>
                <button className="btn btn-ghost btn-sm" onClick={() => onChange({ sp: 32 })}>32</button>
              </span>
            </label>
            <RangeInput value={mon.sp} max={32} onChange={(v) => onChange({ sp: v })} ariaLabel="SP de Velocidad" />
          </div>
          <div className="field span-2">
            <label>Etapas de Velocidad</label>
            <Stages value={mon.stage} onChange={(v) => onChange({ stage: v })} />
          </div>
          <div className="field">
            <label>Objeto</label>
            <select className="select" value={mon.item} onChange={(e) => onChange({ item: e.target.value, procFirst: false })}>
              <option value="">Sin objeto / sin efecto</option>
              {itemChoices.map((i) => (
                <option key={i} value={i}>{i}{i === sp.requiredItem ? ' (Mega)' : ''}</option>
              ))}
              {mon.item && !itemChoices.includes(mon.item) && <option value={mon.item}>{mon.item}</option>}
            </select>
          </div>
          <div className="field">
            <label>Habilidad</label>
            <select className="select" value={mon.ability} onChange={(e) => onChange({ ability: e.target.value, abilityActive: false })}>
              {sp.abilities.map((a) => (
                <option key={a} value={a}>{SPEED_ABILITIES.has(a) ? `★ ${a}` : a}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Estado</label>
            <Segmented
              size="sm"
              block
              value={statusChoice}
              onChange={(v) => onChange({ paralyzed: v === 'par', otherStatus: v === 'other' })}
              options={[
                { value: '', label: 'Sano' },
                { value: 'par', label: 'Parálisis', tone: 'foe' },
                { value: 'other', label: 'Otro', title: 'Quemado, envenenado… (activa Pies Rápidos)' },
              ]}
            />
          </div>
          <div className="field">
            <label>
              <span>Movimiento <Help>Opcional. Define la prioridad (Sorpresa +3, Protección +4, Espacio Raro −7…). Bromista, Alas Vendaval o Primer Auxilio se aplican automáticamente.</Help></span>
            </label>
            <MovePicker value={mon.move} onChange={(v) => onChange({ move: v })} species={sp} learnsets={dex.data.learnsets} />
          </div>
        </div>

        {(toggleLabel || canProc) && (
          <div className="row wrap" style={{ gap: 16, marginTop: 12 }}>
            {toggleLabel && <Switch checked={mon.abilityActive} onChange={(v) => onChange({ abilityActive: v })} label={`${mon.ability}: ${toggleLabel}`} />}
            {canProc && (
              <Switch
                checked={mon.procFirst}
                onChange={(v) => onChange({ procFirst: v })}
                label={mon.item === 'Quick Claw' ? 'Garra Rápida se activa este turno' : mon.item === 'Custap Berry' ? 'Baya Chiri activada' : 'Mano Rápida se activa'}
              />
            )}
          </div>
        )}

        <Breakdown result={result} sp={sp} mon={mon} field={field} />
      </div>
    </div>
  );
}

function Breakdown({ result, sp, mon }: { result: SpeedResult; sp: SpeciesEntry; mon: SpeedMon; field: SpeedField }) {
  const stageMult = mon.stage === 0 ? null : mon.stage > 0 ? `×${((2 + mon.stage) / 2).toFixed(2).replace(/\.?0+$/, '')}` : `×${(2 / (2 - mon.stage)).toFixed(2)}`;
  return (
    <div className="breakdown">
      <div className="breakdown-flow">
        <span className="step"><span className="k">Base</span><span className="v">{sp.baseStats.spe}</span></span>
        <span className="arrow">→</span>
        <span className="step" title="(Base + 20 + SP) × naturaleza"><span className="k">Stat</span><span className="v">{result.stat}</span></span>
        {stageMult && (
          <>
            <span className="arrow">→</span>
            <span className={cx('step', mon.stage > 0 ? 'good' : 'bad')}><span className="k">Etapa {mon.stage > 0 ? `+${mon.stage}` : mon.stage}</span><span className="v">{stageMult}</span></span>
          </>
        )}
        {result.modifiers.map((m, i) => (
          <span key={i} className="row" style={{ gap: 6 }}>
            <span className="arrow">→</span>
            <span className={cx('step', m.mult > 1 ? 'good' : 'bad')}><span className="k">{m.label}</span><span className="v">×{String(m.mult).replace('.', ',')}</span></span>
          </span>
        ))}
        <span className="arrow">=</span>
        <span className="step total"><span className="k">Final</span><span className="v">{result.final}</span></span>
        {result.priority !== 0 && <span className="badge accent">Prioridad {result.priority > 0 ? `+${result.priority}` : result.priority}</span>}
        {result.bracketReason && <span className={cx('badge', result.bracket > 0 ? 'good' : 'warn')}>{result.bracketReason}</span>}
      </div>
      {result.notes.length > 0 && (
        <ul className="notes">
          {result.notes.map((n, i) => (
            <li key={i}><IconInfo width={13} height={13} /> {n}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ============================== Orden de turno ============================== */

function TurnOrderPanel({ order, trickRoom, speed }: { order: ReturnType<typeof turnOrder>; trickRoom: boolean; speed: SpeedState }) {
  const dex = useDex();
  const max = Math.max(1, ...order.map((o) => o.final));
  return (
    <div className="card" data-tour="speed-order">
      <div className="card-head">
        <h3 className="card-title"><IconTrophy /> Orden de actuación</h3>
        {trickRoom ? <span className="badge accent"><IconSwap /> Espacio Raro</span> : <span className="badge">Normal</span>}
      </div>
      <div className="order-list">
        {order.map((o, i) => {
          const mon = speed.mons.find((m) => m.key === o.key)!;
          const sp = dex.get(mon.speciesId)!;
          const prevPriority = i > 0 ? order[i - 1].priority : null;
          return (
            <div key={o.key}>
              {(i === 0 || prevPriority !== o.priority) && (
                <div className="order-bracket">Prioridad {o.priority > 0 ? `+${o.priority}` : o.priority}</div>
              )}
              <div className={cx('order-row', o.side === 'ally' ? 'side-ally' : 'side-foe')} style={{ animationDelay: `${i * 40}ms` }}>
                <div className="order-rank">{o.rank}</div>
                <Sprite species={sp} size={36} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="row between">
                    <span className="truncate" style={{ fontWeight: 600 }}>{sp.name}</span>
                    <span className="mono" style={{ fontWeight: 700 }}>{o.final}</span>
                  </div>
                  <div className="order-bar"><div style={{ width: `${(o.final / max) * 100}%` }} /></div>
                  <div className="row wrap" style={{ gap: 4, marginTop: 4 }}>
                    <span className={cx('badge', o.side === 'ally' ? 'ally' : 'foe')} style={{ height: 18 }}>{o.side === 'ally' ? 'Aliado' : 'Rival'}</span>
                    {o.tiedWith.length > 0 && <span className="badge warn" style={{ height: 18 }}>Empate · 50%</span>}
                    {o.bracket !== 0 && <span className="badge" style={{ height: 18 }}>{o.bracket > 0 ? 'Primero de su prioridad' : 'Último de su prioridad'}</span>}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="card-body" style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
        <p className="muted" style={{ margin: 0, fontSize: 12 }}>
          Orden: prioridad del movimiento → efectos de "primero/último" → Velocidad {trickRoom ? '(invertida por Espacio Raro)' : ''}. Empates: 50% aleatorio.
        </p>
      </div>
    </div>
  );
}

/* ================================ Duelo ================================ */

type Scenario = { id: string; label: string; apply: (m: SpeedMon, f: SpeedField) => [SpeedMon, SpeedField] };

const SCENARIOS: Scenario[] = [
  { id: 'cur', label: 'Actual', apply: (m, f) => [m, f] },
  { id: 'p1', label: '+1', apply: (m, f) => [{ ...m, stage: Math.min(6, m.stage + 1) }, f] },
  { id: 'p2', label: '+2', apply: (m, f) => [{ ...m, stage: Math.min(6, m.stage + 2) }, f] },
  { id: 'm1', label: '−1', apply: (m, f) => [{ ...m, stage: Math.max(-6, m.stage - 1) }, f] },
  { id: 'tw', label: 'Viento Afín', apply: (m, f) => [m, { ...f, tailwind: { ...f.tailwind, [m.side]: true } }] },
  { id: 'scarf', label: 'Pañuelo', apply: (m, f) => [{ ...m, item: 'Choice Scarf' }, f] },
  { id: 'par', label: 'Parálisis', apply: (m, f) => [{ ...m, paralyzed: true }, f] },
];

function DuelPanel({
  speed,
  results,
  suppressed,
  setPair,
}: {
  speed: SpeedState;
  results: SpeedResult[];
  suppressed: boolean;
  setPair: (p: [string, string]) => void;
}) {
  const dex = useDex();
  const mons = speed.mons.filter((m) => dex.get(m.speciesId));
  const aKey = mons.find((m) => m.key === speed.pair[0])?.key ?? mons[0]?.key;
  const bKey = mons.find((m) => m.key === speed.pair[1] && m.key !== aKey)?.key ?? mons.find((m) => m.key !== aKey)?.key;
  const [showTR, setShowTR] = useState(false);
  if (!aKey || !bKey) {
    return (
      <div className="card card-pad">
        <div className="empty">Añade al menos dos Pokémon para ver el duelo directo.</div>
      </div>
    );
  }
  const A = mons.find((m) => m.key === aKey)!;
  const B = mons.find((m) => m.key === bKey)!;
  const spA = dex.get(A.speciesId)!;
  const spB = dex.get(B.speciesId)!;
  const rA = results.find((r) => r.key === aKey)!;
  const rB = results.find((r) => r.key === bKey)!;
  const f = speed.field;
  const cmp = compareSpeed(rA, rB, f.trickRoom);

  const needA = spNeededToOutspeed(toSpeedInput(A, spA), rB, f, suppressed);
  const needB = spNeededToOutspeed(toSpeedInput(B, spB), rA, f, suppressed);

  const matrixField = { ...f, trickRoom: showTR ? !f.trickRoom : f.trickRoom };
  const cell = (sa: Scenario, sb: Scenario) => {
    const [ma, fa] = sa.apply(A, matrixField);
    const [mb, fb0] = sb.apply(B, fa);
    const ra = computeSpeed(toSpeedInput(ma, spA), fb0, suppressed);
    const rb = computeSpeed(toSpeedInput(mb, spB), fb0, suppressed);
    return { c: compareSpeed(ra, rb, fb0.trickRoom), ra, rb };
  };

  const options = mons.map((m) => ({ key: m.key, label: `${dex.get(m.speciesId)!.name} · ${m.side === 'ally' ? 'Aliado' : 'Rival'}` }));

  return (
    <div className="card" data-tour="speed-duel">
      <div className="card-head">
        <h3 className="card-title"><IconBolt /> Duelo directo</h3>
        <button className="btn btn-ghost btn-sm" onClick={() => setPair([bKey, aKey])} title="Intercambiar">
          <IconSwap /> Invertir
        </button>
      </div>
      <div className="card-body">
        <div className="duel-selects">
          <select className="select" value={aKey} onChange={(e) => setPair([e.target.value, e.target.value === bKey ? aKey : bKey])}>
            {options.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>
          <span className="muted" style={{ fontWeight: 700 }}>vs</span>
          <select className="select" value={bKey} onChange={(e) => setPair([e.target.value === aKey ? bKey : aKey, e.target.value])}>
            {options.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>
        </div>

        <div className={cx('verdict', cmp > 0 ? 'win-a' : cmp < 0 ? 'win-b' : 'tie')}>
          <div className="verdict-mon">
            <Sprite species={spA} size={56} />
            <div className="mono verdict-num">{rA.final}</div>
            <div className="verdict-name truncate">{spA.name}</div>
          </div>
          <div className="verdict-mid">
            <div className="verdict-sym">{cmp > 0 ? '›' : cmp < 0 ? '‹' : '='}</div>
            <div className="verdict-text">
              {cmp === 0 ? 'Empate de velocidad (50%)' : `${cmp > 0 ? spA.name : spB.name} actúa primero`}
            </div>
            {rA.priority !== rB.priority && <div className="muted" style={{ fontSize: 11 }}>Decidido por prioridad</div>}
          </div>
          <div className="verdict-mon">
            <Sprite species={spB} size={56} />
            <div className="mono verdict-num">{rB.final}</div>
            <div className="verdict-name truncate">{spB.name}</div>
          </div>
        </div>

        <div className="bench">
          {rA.priority !== rB.priority || rA.bracket !== rB.bracket ? (
            <div className="bench-line">
              <span className="badge accent">i</span>
              <span>
                El orden lo decide la <b>prioridad</b> ({rA.priority !== rB.priority ? `${rA.priority > 0 ? '+' : ''}${rA.priority} vs ${rB.priority > 0 ? '+' : ''}${rB.priority}` : 'efecto de primero/último'}): la Velocidad no cambia el resultado.
                Quita o cambia el movimiento para comparar solo velocidades.
              </span>
            </div>
          ) : (
            <>
              <BenchLine name={spA.name} need={needA} current={A.sp} tr={f.trickRoom} otherName={spB.name} />
              <BenchLine name={spB.name} need={needB} current={B.sp} tr={f.trickRoom} otherName={spA.name} />
            </>
          )}
        </div>

        <div className="row between" style={{ marginTop: 18, marginBottom: 8 }}>
          <div className="section-label" style={{ margin: 0 }}>
            <IconLayers width={13} height={13} /> Matriz de escenarios
            <Help>Filas: {spA.name} bajo cada condición. Columnas: {spB.name}. Cada celda indica quién actúa primero combinando ambas condiciones con el resto del campo actual.</Help>
          </div>
          <Chip size="sm" on={showTR} onClick={() => setShowTR((v) => !v)} icon={<IconRefresh />}>
            {f.trickRoom ? 'Sin Espacio Raro' : 'Con Espacio Raro'}
          </Chip>
        </div>
        <div className="matrix-wrap">
          <table className="matrix">
            <thead>
              <tr>
                <th className="corner" title={`Filas: ${spA.name} · Columnas: ${spB.name}`}>
                  <span className="ally-text">A</span>↓ <span className="foe-text">B</span>→
                </th>
                {SCENARIOS.map((s) => <th key={s.id}>{s.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {SCENARIOS.map((sa) => (
                <tr key={sa.id}>
                  <th>{sa.label}</th>
                  {SCENARIOS.map((sb) => {
                    const { c, ra, rb } = cell(sa, sb);
                    return (
                      <td key={sb.id} className={c > 0 ? 'a' : c < 0 ? 'b' : 't'} title={`${spA.name}: ${ra.final} · ${spB.name}: ${rb.final}`}>
                        {c > 0 ? 'A' : c < 0 ? 'B' : '='}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="row" style={{ gap: 14, marginTop: 8, fontSize: 11.5 }}>
          <span className="row" style={{ gap: 6 }}><span className="legend a" /> A = {spA.name}</span>
          <span className="row" style={{ gap: 6 }}><span className="legend b" /> B = {spB.name}</span>
          <span className="row" style={{ gap: 6 }}><span className="legend t" /> Empate</span>
        </div>
        <p className="muted" style={{ fontSize: 11.5, marginBottom: 0 }}>
          Matriz calculada {matrixField.trickRoom ? 'con' : 'sin'} Espacio Raro. Pasa el ratón por una celda para ver las velocidades.
        </p>
      </div>
    </div>
  );
}

function BenchLine({ name, need, current, tr, otherName }: { name: string; need: { sp: number; speed: number } | null; current: number; tr: boolean; otherName: string }) {
  if (!need) {
    return (
      <div className="bench-line">
        <span className="badge bad">✕</span>
        <span>
          <b>{name}</b> no puede {tr ? 'ser más lento que' : 'superar a'} {otherName} solo con SP. Prueba naturaleza, objeto o etapas.
        </span>
      </div>
    );
  }
  const ok = tr ? current <= need.sp : current >= need.sp;
  return (
    <div className="bench-line">
      <span className={cx('badge', ok ? 'good' : 'warn')}>{ok ? '✓' : '!'}</span>
      <span>
        <b>{name}</b> {tr ? `actúa antes que ${otherName} con como máximo` : `supera a ${otherName} con al menos`}{' '}
        <b className="mono accent-text">{need.sp} SP</b> <span className="muted">(Vel. {need.speed}; tiene {current})</span>
      </span>
    </div>
  );
}
