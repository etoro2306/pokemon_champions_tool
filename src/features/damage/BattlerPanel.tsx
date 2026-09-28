import { useDex } from '../../data/DexContext';
import { STAT_IDS, type StatID } from '../../data/types';
import { calcAllStats, natureMultiplier, SP_MAX_PER_STAT, SP_MAX_TOTAL, STAT_SHORT, STAT_LABEL } from '../../lib/stats';
import { getMove } from '../../lib/dex';
import type { BattlerState, SideState, Status } from '../../lib/damage';
import { cx } from '../../lib/util';
import { defaultBattler, spreadFor, type SpreadPreset } from '../../state/store';
import { AbilityPicker, ItemPicker, MovePicker, NaturePicker, SpeciesPicker } from '../../components/pickers';
import { Chip, Help, RangeInput, Segmented, Switch, Stepper } from '../../components/ui';
import { IconShield } from '../../components/Icons';

export const ABILITY_TOGGLES: Record<string, string> = {
  'Flash Fire': 'Absorbe Fuego activado (×1,5 Fuego)',
  'Slow Start': 'Inicio Lento activo (Ataque ×0,5)',
  Unburden: 'Objeto consumido',
  Stakeout: 'El objetivo acaba de entrar (×2)',
  Analytic: 'Actúa último (×1,3)',
  Protosynthesis: 'Protosíntesis activa',
  'Quark Drive': 'Carga Cuark activa',
  Plus: 'Aliado con Más/Menos',
  Minus: 'Aliado con Más/Menos',
  'Flower Gift': 'Don Floral activo',
  'Multiscale': 'PS al máximo (Compensación)',
  'Shadow Shield': 'PS al máximo',
  'Tera Shell': 'PS al máximo',
  Disguise: 'Disfraz intacto',
  'Ice Face': 'Cara de Hielo intacta',
};

const STATUS_OPTS: { value: Status; label: string }[] = [
  { value: '', label: 'Sano' },
  { value: 'brn', label: 'Quemado' },
  { value: 'par', label: 'Paralizado' },
  { value: 'psn', label: 'Envenenado' },
  { value: 'tox', label: 'Gravemente env.' },
  { value: 'slp', label: 'Dormido' },
  { value: 'frz', label: 'Congelado' },
];

const PRESETS: { id: SpreadPreset; label: string }[] = [
  { id: 'physical', label: 'Atacante físico' },
  { id: 'special', label: 'Atacante especial' },
  { id: 'bulky-phys', label: 'Tanque físico' },
  { id: 'bulky-spec', label: 'Tanque especial' },
  { id: 'balanced', label: 'PS + ataque' },
  { id: 'none', label: 'Vacío' },
];

const SIDE_FLAGS: { key: keyof SideState; label: string; help: string }[] = [
  { key: 'reflect', label: 'Reflejo', help: 'Reduce el daño físico (×0,67 en dobles)' },
  { key: 'lightScreen', label: 'Pantalla Luz', help: 'Reduce el daño especial (×0,67 en dobles)' },
  { key: 'auroraVeil', label: 'Velo Aurora', help: 'Reduce daño físico y especial' },
  { key: 'helpingHand', label: 'Refuerzo', help: 'El atacante de este lado recibe Refuerzo (×1,5)' },
  { key: 'friendGuard', label: 'Compiescolta', help: 'Aliado con Friend Guard: ×0,75 al daño recibido' },
  { key: 'battery', label: 'Batería', help: 'Aliado con Batería: ×1,3 a ataques especiales' },
  { key: 'powerSpot', label: 'Fuente Energía', help: 'Aliado con Power Spot: ×1,3' },
  { key: 'steelySpirit', label: 'Alma Acerada', help: 'Aliado con Steely Spirit: ×1,5 a Acero' },
  { key: 'flowerGift', label: 'Don Floral', help: 'Aliado con Flower Gift bajo sol' },
  { key: 'stealthRock', label: 'Trampa Rocas', help: 'Cuenta el daño de entrada para el KO' },
  { key: 'saltCure', label: 'Salazón', help: 'Daño residual de Salazón' },
  { key: 'leechSeed', label: 'Drenadoras', help: 'Daño residual de Drenadoras' },
];

export function BattlerPanel({
  label,
  side,
  state,
  onChange,
  sideState,
  onSideChange,
}: {
  label: string;
  side: 'ally' | 'foe';
  state: BattlerState;
  onChange: (fn: (s: BattlerState) => BattlerState) => void;
  sideState: SideState;
  onSideChange: (s: SideState) => void;
}) {
  const dex = useDex();
  const sp = dex.get(state.speciesId) ?? dex.species[0];
  const stats = calcAllStats(sp.baseStats, state.sp, state.nature);
  const spTotal = STAT_IDS.reduce((a, s) => a + (state.sp[s] ?? 0), 0);
  const set = (patch: Partial<BattlerState>) => onChange((s) => ({ ...s, ...patch }));

  const setSP = (stat: StatID, v: number) =>
    onChange((s) => {
      const others = STAT_IDS.filter((x) => x !== stat).reduce((a, x) => a + (s.sp[x] ?? 0), 0);
      const val = Math.max(0, Math.min(SP_MAX_PER_STAT, v, SP_MAX_TOTAL - others));
      return { ...s, sp: { ...s.sp, [stat]: val } };
    });

  const onSpecies = (id: string) => {
    const next = dex.get(id)!;
    onChange((s) => {
      const fresh = defaultBattler(next, dex.data.learnsets, side === 'ally' ? 'attacker' : 'defender');
      // conserva el reparto si es compatible; cambia movimientos, habilidad y objeto
      return { ...s, speciesId: id, ability: fresh.ability, abilityOn: false, item: next.requiredItem ?? (s.item && !dex.get(s.speciesId)?.requiredItem ? s.item : ''), moves: fresh.moves };
    });
  };

  const hpNow = Math.max(1, Math.round((stats.hp * state.hpPercent) / 100));

  return (
    <div className={cx('card sided battler', side === 'ally' ? 'side-ally' : 'side-foe')}>
      <div className="card-head">
        <h3 className="card-title">
          <span className={cx('badge', side === 'ally' ? 'ally' : 'foe')}>{label}</span>
        </h3>
        <span className="muted mono" style={{ fontSize: 12 }}>BST {Object.values(sp.baseStats).reduce((a, b) => a + b, 0)}</span>
      </div>
      <div className="card-body col" style={{ gap: 14 }}>
        <SpeciesPicker value={sp.id} onChange={onSpecies} />

        <div className="field">
          <label>
            <span>PS actuales</span>
            <span className="mono">{hpNow}/{stats.hp} · {state.hpPercent}%</span>
          </label>
          <div className="hp-edit">
            <div className="hpbar big"><div className={cx('hp-fill', state.hpPercent <= 20 ? 'red' : state.hpPercent <= 50 ? 'yellow' : 'green')} style={{ width: `${state.hpPercent}%` }} /></div>
          </div>
          <RangeInput value={state.hpPercent} min={1} max={100} onChange={(v) => set({ hpPercent: v })} ariaLabel="PS actuales (%)" />
        </div>

        <div className="grid-2">
          <div className="field">
            <label>Habilidad</label>
            <AbilityPicker value={state.ability} onChange={(v) => set({ ability: v, abilityOn: false })} species={sp} />
          </div>
          <div className="field">
            <label>Objeto</label>
            <ItemPicker value={state.item} onChange={(v) => set({ item: v })} species={sp} />
          </div>
          <div className="field">
            <label>Naturaleza</label>
            <NaturePicker value={state.nature} onChange={(v) => set({ nature: v })} />
          </div>
          <div className="field">
            <label>Estado</label>
            <select className="select" value={state.status} onChange={(e) => set({ status: e.target.value as Status })}>
              {STATUS_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
        {ABILITY_TOGGLES[state.ability] && (
          <Switch checked={state.abilityOn} onChange={(v) => set({ abilityOn: v })} label={ABILITY_TOGGLES[state.ability]} />
        )}
        {state.ability === 'Supreme Overlord' && (
          <div className="field">
            <label>Aliados debilitados (Supreme Overlord)</label>
            <Segmented size="sm" value={state.alliesFainted} onChange={(v) => set({ alliesFainted: v })} options={[0, 1, 2, 3, 4, 5].map((n) => ({ value: n, label: String(n) }))} />
          </div>
        )}

        <div>
          <div className="section-label row between">
            <span>Stat Points (SP) y etapas</span>
            <span className={cx('badge', spTotal > SP_MAX_TOTAL ? 'bad' : spTotal === SP_MAX_TOTAL ? 'good' : '')}>
              {spTotal}/{SP_MAX_TOTAL} SP
            </span>
          </div>
          <div className="chips" style={{ marginBottom: 10 }}>
            {PRESETS.map((p) => (
              <button key={p.id} className="btn btn-sm" onClick={() => onChange((s) => ({ ...s, ...spreadFor(p.id, sp) }))}>
                {p.label}
              </button>
            ))}
          </div>
          <div className="sp-table">
            {STAT_IDS.map((stat) => {
              const m = natureMultiplier(state.nature, stat);
              return (
                <div className="sp-row" key={stat}>
                  <span className={cx('sp-lbl', m > 1 && 'good-text', m < 1 && 'bad-text')} title={STAT_LABEL[stat]}>
                    {STAT_SHORT[stat]}{m > 1 ? '+' : m < 1 ? '−' : ''}
                  </span>
                  <span className="mono muted sp-base">{sp.baseStats[stat]}</span>
                  <RangeInput value={state.sp[stat] ?? 0} max={32} onChange={(v) => setSP(stat, v)} ariaLabel={`SP ${STAT_LABEL[stat]}`} />
                  <span className="mono sp-final">{stats[stat]}</span>
                  {stat === 'hp' ? (
                    <span className="sp-stage-empty" />
                  ) : (
                    <Stepper value={state.boosts[stat] ?? 0} onChange={(v) => onChange((s) => ({ ...s, boosts: { ...s.boosts, [stat]: v } }))} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <div className="section-label">Movimientos</div>
          <div className="col" style={{ gap: 8 }}>
            {state.moves.map((mv, i) => {
              const info = mv.name ? getMove(mv.name) : null;
              const multi = info?.multihit;
              const updateMove = (patch: Partial<typeof mv>) =>
                onChange((s) => ({ ...s, moves: s.moves.map((m, j) => (j === i ? { ...m, ...patch } : m)) }));
              return (
                <div key={i} className="move-edit">
                  <MovePicker value={mv.name} onChange={(v) => updateMove({ name: v, hits: 0, singleTarget: false })} species={sp} learnsets={dex.data.learnsets} />
                  <div className="row wrap" style={{ gap: 6 }}>
                    <Chip size="sm" on={mv.crit} onClick={() => updateMove({ crit: !mv.crit })}>Crítico</Chip>
                    {info?.isSpread && (
                      <Chip size="sm" on={mv.singleTarget} onClick={() => updateMove({ singleTarget: !mv.singleTarget })} title="Si solo queda un objetivo en el campo, no se aplica la reducción ×0,75">
                        Un solo objetivo
                      </Chip>
                    )}
                    {Array.isArray(multi) && (
                      <select className="select" style={{ height: 26, width: 'auto', fontSize: 12 }} value={mv.hits || 0} onChange={(e) => updateMove({ hits: Number(e.target.value) })}>
                        <option value={0}>Golpes: auto</option>
                        {Array.from({ length: multi[1] - multi[0] + 1 }, (_, k) => multi[0] + k).map((n) => (
                          <option key={n} value={n}>{n} golpes</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <details className="side-details">
          <summary>
            <IconShield width={14} height={14} /> Efectos en su lado del campo
            {Object.entries(sideState).some(([k, v]) => k !== 'spikes' && v === true) || sideState.spikes > 0 ? <span className="badge accent">Activos</span> : null}
          </summary>
          <div className="chips" style={{ marginTop: 10 }}>
            {SIDE_FLAGS.map((f) => (
              <Chip key={f.key} size="sm" tone={side} on={!!sideState[f.key]} onClick={() => onSideChange({ ...sideState, [f.key]: !sideState[f.key] })} title={f.help}>
                {f.label}
              </Chip>
            ))}
          </div>
          <div className="field" style={{ marginTop: 10 }}>
            <label>
              <span>Púas <Help>Capas de Púas en este lado; se suman al daño de entrada para calcular el KO.</Help></span>
            </label>
            <Segmented size="sm" value={sideState.spikes} onChange={(v) => onSideChange({ ...sideState, spikes: v })} options={[0, 1, 2, 3].map((n) => ({ value: n, label: String(n) }))} />
          </div>
        </details>
      </div>
    </div>
  );
}
