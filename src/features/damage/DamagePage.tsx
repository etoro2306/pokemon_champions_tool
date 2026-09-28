import { useMemo, useState } from 'react';
import { useDex } from '../../data/DexContext';
import { buildPokemon, runMove, type BattlerState, type FieldState, type MoveResult, type SideState } from '../../lib/damage';
import { computeSpeed, compareSpeed, DEFAULT_FIELD } from '../../lib/speed';
import { cx, pct } from '../../lib/util';
import { useStore } from '../../state/store';
import { BattlerPanel } from './BattlerPanel';
import { WEATHER_OPTS, TERRAIN_OPTS } from '../speed/SpeedPage';
import { Sprite } from '../../components/Sprite';
import { CatIcon, Chip, Help, Segmented, TypeBadge, useToast } from '../../components/ui';
import { IconSwap, IconCopy, IconChevronDown, IconTarget, IconBolt, IconSparkle, IconAlert } from '../../components/Icons';
import { translateKO } from './koText';

export function DamagePage() {
  const { damage, setDamage } = useStore();
  const dex = useDex();
  const [dir, setDir] = useState<0 | 1>(0);
  const f = damage.field;

  const setField = (patch: Partial<FieldState>) => setDamage((s) => ({ ...s, field: { ...s.field, ...patch } }));
  const setSide = (i: 0 | 1, side: SideState) =>
    setDamage((s) => {
      const sides = [...s.field.sides] as [SideState, SideState];
      sides[i] = side;
      return { ...s, field: { ...s.field, sides } };
    });
  const setP = (key: 'p1' | 'p2') => (fn: (b: BattlerState) => BattlerState) => setDamage((s) => ({ ...s, [key]: fn(s[key]) }));
  const swap = () =>
    setDamage((s) => ({ ...s, p1: s.p2, p2: s.p1, field: { ...s.field, sides: [s.field.sides[1], s.field.sides[0]] } }));

  const sp1 = dex.get(damage.p1.speciesId) ?? dex.species[0];
  const sp2 = dex.get(damage.p2.speciesId) ?? dex.species[0];

  const { res12, res21, spe1, spe2 } = useMemo(() => {
    const a = buildPokemon(damage.p1, sp1);
    const b = buildPokemon(damage.p2, sp2);
    const res12 = damage.p1.moves.map((m) => runMove(a, b, m, f, 0));
    const res21 = damage.p2.moves.map((m) => runMove(b, a, m, f, 1));
    const sf = { ...DEFAULT_FIELD, weather: f.weather, terrain: f.terrain, magicRoom: f.magicRoom, tailwind: { ally: f.sides[0].tailwind, foe: f.sides[1].tailwind } };
    const mk = (p: BattlerState, sp: typeof sp1, side: 'ally' | 'foe', key: string) =>
      computeSpeed(
        { key, name: sp.name, baseSpe: sp.baseStats.spe, side, nature: p.nature, sp: p.sp.spe, stage: p.boosts.spe, item: p.item, ability: p.ability, paralyzed: p.status === 'par', otherStatus: !!p.status && p.status !== 'par', abilityActive: p.abilityOn },
        sf,
      );
    return { res12, res21, spe1: mk(damage.p1, sp1, 'ally', 'p1'), spe2: mk(damage.p2, sp2, 'foe', 'p2') };
  }, [damage, sp1, sp2, f]);

  const results = dir === 0 ? res12 : res21;
  const best = Math.max(0, ...results.filter((r) => r.valid).map((r) => r.maxPct));
  const [attSp, defSp] = dir === 0 ? [sp1, sp2] : [sp2, sp1];
  const cmp = compareSpeed(spe1, spe2, false);

  return (
    <div className="page-enter">
      <div className="page-head">
        <div>
          <div className="eyebrow">Damage Calculator</div>
          <h1 className="page-title">
            Cada golpe, <span className="serif">medido</span>.
          </h1>
          <p className="page-sub">
            Rango de daño, las 16 tiradas y probabilidades de OHKO / 2HKO / 3HKO con las mecánicas de Pokémon Champions: SP, naturalezas, objetos,
            habilidades, climas, campos, pantallas, Refuerzo, críticos y la reducción ×0,75 de los ataques en área en dobles.
          </p>
        </div>
        <div className="row wrap" style={{ gap: 10 }}>
          <Segmented
            value={f.gameType}
            onChange={(v) => setField({ gameType: v })}
            options={[
              { value: 'Doubles', label: 'Dobles (VGC)' },
              { value: 'Singles', label: 'Individual' },
            ]}
            tone="accent"
            data-tour="damage-format"
          />
          <button className="btn" onClick={swap} title="Intercambiar Pokémon">
            <IconSwap /> Intercambiar
          </button>
        </div>
      </div>

      <div className="card card-pad field-bar" data-tour="damage-field">
        <div className="field-bar-grid dmg">
          <div className="field">
            <label>Clima</label>
            <Segmented size="sm" value={f.weather} onChange={(v) => setField({ weather: v })} options={WEATHER_OPTS} tone="accent" />
          </div>
          <div className="field">
            <label>Campo</label>
            <Segmented size="sm" value={f.terrain} onChange={(v) => setField({ terrain: v })} options={TERRAIN_OPTS} tone="accent" />
          </div>
          <div className="field">
            <label>
              <span>Efectos globales <Help>Las habilidades "de Ruina" y las auras solo hace falta marcarlas si las tiene otro Pokémon del campo (p. ej. el aliado); las del atacante/defensor se aplican solas.</Help></span>
            </label>
            <div className="chips">
              <Chip size="sm" on={f.gravity} onClick={() => setField({ gravity: !f.gravity })}>Gravedad</Chip>
              <Chip size="sm" on={f.magicRoom} onClick={() => setField({ magicRoom: !f.magicRoom })}>Zona Mágica</Chip>
              <Chip size="sm" on={f.wonderRoom} onClick={() => setField({ wonderRoom: !f.wonderRoom })}>Zona Extraña</Chip>
              <Chip size="sm" on={f.fairyAura} onClick={() => setField({ fairyAura: !f.fairyAura })}>Aura Feérica</Chip>
              <Chip size="sm" on={f.darkAura} onClick={() => setField({ darkAura: !f.darkAura })}>Aura Oscura</Chip>
              <Chip size="sm" on={f.auraBreak} onClick={() => setField({ auraBreak: !f.auraBreak })}>Rompeaura</Chip>
              <Chip size="sm" on={f.swordOfRuin} onClick={() => setField({ swordOfRuin: !f.swordOfRuin })}>Espada Debacle</Chip>
              <Chip size="sm" on={f.beadsOfRuin} onClick={() => setField({ beadsOfRuin: !f.beadsOfRuin })}>Abalorio Debacle</Chip>
              <Chip size="sm" on={f.tabletsOfRuin} onClick={() => setField({ tabletsOfRuin: !f.tabletsOfRuin })}>Tablilla Debacle</Chip>
              <Chip size="sm" on={f.vesselOfRuin} onClick={() => setField({ vesselOfRuin: !f.vesselOfRuin })}>Caldero Debacle</Chip>
            </div>
          </div>
        </div>
      </div>

      <div className="damage-layout">
        <div data-tour="damage-attacker">
          <BattlerPanel label="Pokémon 1 · Tu lado" side="ally" state={damage.p1} onChange={setP('p1')} sideState={f.sides[0]} onSideChange={(s) => setSide(0, s)} />
        </div>

        <div className="results-col">
          <div className="card results-card" data-tour="damage-results">
            <div className="dir-tabs">
              <button className={cx('dir-tab', dir === 0 && 'active')} onClick={() => setDir(0)}>
                <Sprite species={sp1} size={34} />
                <span className="arrow-glyph">→</span>
                <Sprite species={sp2} size={34} />
                <span className="dir-label">Tus ataques</span>
              </button>
              <button className={cx('dir-tab', dir === 1 && 'active')} onClick={() => setDir(1)}>
                <Sprite species={sp2} size={34} />
                <span className="arrow-glyph">→</span>
                <Sprite species={sp1} size={34} />
                <span className="dir-label">Ataques rivales</span>
              </button>
            </div>

            <div className="speed-strip">
              <IconBolt width={14} height={14} />
              <span>
                <b>{sp1.name}</b> <span className="mono">{spe1.final}</span> vs <b>{sp2.name}</b> <span className="mono">{spe2.final}</span> —{' '}
                {cmp === 0 ? 'empate de velocidad' : <><b>{cmp > 0 ? sp1.name : sp2.name}</b> es más rápido</>}
                <span className="muted"> (sin Espacio Raro)</span>
              </span>
            </div>

            <div className="results-list">
              {results.map((r, i) => (
                <ResultCard key={i} r={r} best={r.valid && r.maxPct === best && best > 0} attacker={attSp.name} defender={defSp.name} gameType={f.gameType} />
              ))}
              {results.every((r) => !r.move) && (
                <div className="empty">
                  <IconTarget />
                  Elige movimientos en el panel del atacante.
                </div>
              )}
            </div>
          </div>
        </div>

        <div data-tour="damage-defender">
          <BattlerPanel label="Pokémon 2 · Rival" side="foe" state={damage.p2} onChange={setP('p2')} sideState={f.sides[1]} onSideChange={(s) => setSide(1, s)} />
        </div>
      </div>
    </div>
  );
}

function effLabel(e: number) {
  if (e === 0) return { t: 'Inmune', c: 'bad' };
  if (e >= 4) return { t: 'Súper eficaz ×4', c: 'good' };
  if (e >= 2) return { t: 'Súper eficaz ×2', c: 'good' };
  if (e <= 0.25) return { t: 'Poco eficaz ×¼', c: 'warn' };
  if (e < 1) return { t: 'Poco eficaz ×½', c: 'warn' };
  return null;
}

function ResultCard({ r, best, attacker, defender, gameType }: { r: MoveResult; best: boolean; attacker: string; defender: string; gameType: string }) {
  const [open, setOpen] = useState(false);
  const toast = useToast();
  if (!r.move) return null;
  const m = r.move;
  const eff = r.valid ? effLabel(r.effectiveness) : null;
  const remainMin = Math.max(0, r.defenderHP - r.max) / r.defenderMaxHP;
  const remainMax = Math.max(0, r.defenderHP - r.min) / r.defenderMaxHP;
  const curPct = r.defenderHP / r.defenderMaxHP;
  const koClass = r.ohko >= 1 ? 'ko-sure' : r.ohko > 0 ? 'ko-maybe' : r.twoHko >= 1 ? 'ko-2' : '';

  return (
    <div className={cx('result', best && 'best', koClass)}>
      <div className="result-head">
        <div className="row" style={{ gap: 8, minWidth: 0 }}>
          <CatIcon category={m.category} />
          <span className="result-move truncate">{m.name}</span>
          <TypeBadge type={m.type} size="sm" />
          {m.bp > 0 && <span className="mono muted" style={{ fontSize: 11.5 }}>{m.bp} BP</span>}
        </div>
        <div className="row" style={{ gap: 6 }}>
          {best && <span className="badge accent"><IconSparkle /> Mejor</span>}
          {r.slot.crit && <span className="badge warn">Crítico</span>}
          {r.isSpread && gameType === 'Doubles' && (
            r.spreadApplied ? (
              <span className="badge" title="En dobles, los ataques que golpean a varios objetivos hacen ×0,75">Área ×0,75</span>
            ) : (
              <span className="badge">Área · 1 objetivo</span>
            )
          )}
          {r.hitsAlly && gameType === 'Doubles' && <span className="badge foe" title="Este movimiento también golpea a tu compañero"><IconAlert /> Golpea al aliado</span>}
          {eff && <span className={cx('badge', eff.c)}>{eff.t}</span>}
        </div>
      </div>

      {r.error ? (
        <div className="muted" style={{ fontSize: 12 }}>No se pudo calcular: {r.error}</div>
      ) : !r.valid ? (
        <div className="muted" style={{ fontSize: 12.5 }}>Movimiento de estado: no causa daño directo.</div>
      ) : r.max === 0 ? (
        <div className="muted" style={{ fontSize: 12.5 }}>No causa daño a {defender}.</div>
      ) : (
        <>
          <div className="result-main">
            <div className="result-pct">
              <span className="num">{(r.minPct * 100).toFixed(1)}</span>
              <span className="sep">–</span>
              <span className="num">{(r.maxPct * 100).toFixed(1)}</span>
              <span className="unit">%</span>
            </div>
            <div className="result-abs mono muted">
              {r.min}–{r.max} / {r.defenderHP} PS
            </div>
          </div>

          <div className="hpbar" title="PS restantes tras el golpe (rango)">
            <div className="hp-range" style={{ left: `${remainMin * 100}%`, width: `${Math.max(0.5, (remainMax - remainMin) * 100)}%` }} />
            <div className="hp-fill green" style={{ width: `${remainMin * 100}%` }} />
            <div className="hp-cur" style={{ left: `${curPct * 100}%` }} />
            <div className="hp-mark" style={{ left: '50%' }} />
          </div>

          <div className="ko-row">
            <KoPill label="OHKO" p={r.ohko} />
            <KoPill label="2HKO" p={r.twoHko} />
            <KoPill label="3HKO" p={r.threeHko} />
            <span className="ko-text">{translateKO(r.koText)}</span>
          </div>

          <button className="expand" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
            <IconChevronDown style={{ transform: open ? 'rotate(180deg)' : undefined, transition: 'transform 200ms' }} width={14} height={14} />
            {open ? 'Ocultar detalle' : 'Ver tiradas y descripción'}
          </button>
          {open && (
            <div className="result-detail fade-in">
              <div className="section-label">Las {r.rolls.length} tiradas de daño</div>
              <div className="rolls">
                {r.rolls.map((v, i) => (
                  <span key={i} className={cx('roll', v >= r.defenderHP && 'kill')}>{v}</span>
                ))}
              </div>
              <div className="desc-box">
                <code>{r.desc}</code>
                <button
                  className="btn btn-sm btn-ghost"
                  onClick={() => {
                    navigator.clipboard?.writeText(r.desc).then(() => toast('Descripción copiada'), () => toast('No se pudo copiar'));
                  }}
                >
                  <IconCopy /> Copiar
                </button>
              </div>
              <p className="muted" style={{ fontSize: 11.5, margin: '8px 0 0' }}>
                {attacker} → {defender}. OHKO/2HKO/3HKO se calculan combinando las tiradas sin contar recuperación; el texto de la derecha (motor de Showdown) sí
                incluye bayas, Restos, trampas y clima.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function KoPill({ label, p }: { label: string; p: number }) {
  const tone = p >= 1 ? 'sure' : p > 0 ? 'maybe' : 'none';
  return (
    <span className={cx('ko-pill', tone)}>
      <span className="k">{label}</span>
      <span className="v mono">{p >= 1 ? '100%' : p <= 0 ? '0%' : pct(p, p < 0.1 ? 2 : 1)}</span>
    </span>
  );
}
