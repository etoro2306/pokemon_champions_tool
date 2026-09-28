import { useMemo, useState } from 'react';
import { useDex } from '../../data/DexContext';
import { STAT_IDS, type SpeciesEntry, type StatID } from '../../data/types';
import { bst, calcStat, STAT_LABEL, STAT_SHORT } from '../../lib/stats';
import { ALL_TYPES, TYPE_COLORS, TYPE_ES } from '../../lib/typeData';
import { cx, toID } from '../../lib/util';
import { useStore } from '../../state/store';
import { Sprite } from '../../components/Sprite';
import { Help, Segmented, Types, useToast } from '../../components/ui';
import { IconGrid, IconList, IconPlus, IconSearch, IconX, IconBolt, IconSword } from '../../components/Icons';
import { defaultSpeedMon } from '../../state/store';
import { defaultBattler } from '../../state/store';

const SERIES_COLORS = ['#dcb46e', '#7aa7ff', '#ff7a8a', '#5fd49a', '#c58cff', '#5fc3c9'];
const MAX_COMPARE = 6;

type SortKey = StatID | 'bst' | 'name' | 'num';

export function ComparePage() {
  const dex = useDex();
  const { compare, setCompare, setSpeed, setDamage, setTab } = useStore();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [type, setType] = useState('');
  const [megas, setMegas] = useState<'all' | 'no' | 'only'>('all');
  const [sort, setSort] = useState<SortKey>('bst');
  const [view, setView] = useState<'grid' | 'table'>('grid');

  const selected = compare.ids.map((id) => dex.get(id)).filter((s): s is SpeciesEntry => !!s);

  const list = useMemo(() => {
    const qid = toID(q);
    return dex.species
      .filter((s) => !s.battleOnly || s.isMega)
      .filter((s) => (megas === 'no' ? !s.isMega : megas === 'only' ? s.isMega : true))
      .filter((s) => !type || s.types.includes(type))
      .filter((s) => !qid || toID(s.name).includes(qid) || s.abilities.some((a) => toID(a).includes(qid)))
      .sort((a, b) => {
        if (sort === 'name') return a.name.localeCompare(b.name);
        if (sort === 'num') return a.num - b.num;
        const va = sort === 'bst' ? bst(a.baseStats) : a.baseStats[sort];
        const vb = sort === 'bst' ? bst(b.baseStats) : b.baseStats[sort];
        return vb - va || a.name.localeCompare(b.name);
      });
  }, [dex.species, q, type, megas, sort]);

  const toggle = (id: string) =>
    setCompare((c) => {
      if (c.ids.includes(id)) return { ...c, ids: c.ids.filter((x) => x !== id) };
      if (c.ids.length >= MAX_COMPARE) {
        toast(`Máximo ${MAX_COMPARE} Pokémon a la vez`);
        return c;
      }
      return { ...c, ids: [...c.ids, id] };
    });

  const natureFor = compare.nature === 'plus' ? 'plus' : compare.nature === 'minus' ? 'minus' : 'neutral';
  const statAt = (s: SpeciesEntry, stat: StatID) => {
    if (stat === 'hp') return calcStat('hp', s.baseStats.hp, compare.sp);
    const n = natureFor === 'plus' ? 'Jolly' : natureFor === 'minus' ? 'Brave' : 'Serious';
    // Para "+"/"−" se aplica el modificador al stat mostrado (1,1 / 0,9)
    const raw = s.baseStats[stat] + 20 + compare.sp;
    if (n === 'Serious') return raw;
    return Math.floor((raw * (natureFor === 'plus' ? 110 : 90)) / 100);
  };

  const sendToSpeed = () => {
    if (!selected.length) return;
    setSpeed((s) => {
      const mons = selected.map((sp, i) => defaultSpeedMon(sp, i % 2 === 0 ? 'ally' : 'foe'));
      return { ...s, mons, pair: [mons[0].key, mons[1]?.key ?? mons[0].key], view: 'order' };
    });
    setTab('speed');
    toast('Pokémon enviados al Speed Calculator');
  };
  const sendToDamage = () => {
    if (selected.length < 2) return toast('Selecciona al menos 2 Pokémon');
    setDamage((d) => ({ ...d, p1: defaultBattler(selected[0], dex.data.learnsets, 'attacker'), p2: defaultBattler(selected[1], dex.data.learnsets, 'defender') }));
    setTab('damage');
    toast(`${selected[0].name} vs ${selected[1].name} en el Damage Calculator`);
  };

  return (
    <div className="page-enter">
      <div className="page-head">
        <div>
          <div className="eyebrow">Comparador · Regulación {dex.data.meta.regulation}</div>
          <h1 className="page-title">
            Todas las stats, <span className="serif">cara a cara</span>.
          </h1>
          <p className="page-sub">
            Explora los {dex.data.meta.speciesCount} Pokémon y {dex.data.meta.megaCount} Megaevoluciones legales. Selecciona hasta {MAX_COMPARE} para comparar sus
            estadísticas base y sus valores reales a nivel 50.
          </p>
        </div>
      </div>

      <div className="compare-layout">
        {/* ---------------------- Comparación ---------------------- */}
        <div className="card compare-panel" data-tour="compare-panel">
          <div className="card-head">
            <h3 className="card-title">Comparación ({selected.length}/{MAX_COMPARE})</h3>
            <div className="row" style={{ gap: 6 }}>
              <button className="btn btn-sm" onClick={sendToSpeed} disabled={!selected.length} title="Abrir en el Speed Calculator">
                <IconBolt /> Velocidad
              </button>
              <button className="btn btn-sm" onClick={sendToDamage} disabled={selected.length < 2} title="Los dos primeros al Damage Calculator">
                <IconSword /> Daño
              </button>
              {selected.length > 0 && (
                <button className="btn btn-sm btn-ghost" onClick={() => setCompare((c) => ({ ...c, ids: [] }))}>Vaciar</button>
              )}
            </div>
          </div>
          <div className="card-body">
            {selected.length === 0 ? (
              <div className="empty">
                <IconPlus />
                Pulsa sobre los Pokémon de la lista para añadirlos a la comparación.
              </div>
            ) : (
              <>
                <div className="compare-chips">
                  {selected.map((s, i) => (
                    <div key={s.id} className="compare-chip" style={{ ['--c' as any]: SERIES_COLORS[i] }}>
                      <Sprite species={s} size={40} />
                      <div style={{ minWidth: 0 }}>
                        <div className="truncate" style={{ fontWeight: 650 }}>{s.name}</div>
                        <Types types={s.types} size="sm" />
                      </div>
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => toggle(s.id)} aria-label={`Quitar ${s.name}`}>
                        <IconX />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="compare-body">
                  <Radar species={selected} />
                  <div className="compare-bars">
                    {STAT_IDS.map((stat) => {
                      const vals = selected.map((s) => s.baseStats[stat]);
                      const maxV = Math.max(...vals);
                      return (
                        <div key={stat} className="cmp-stat">
                          <div className="cmp-stat-label">{STAT_LABEL[stat]}</div>
                          {selected.map((s, i) => (
                            <div key={s.id} className="cmp-bar-row">
                              <div className="cmp-bar">
                                <div style={{ width: `${Math.min(100, (s.baseStats[stat] / 200) * 100)}%`, background: SERIES_COLORS[i] }} />
                              </div>
                              <span className={cx('mono cmp-val', s.baseStats[stat] === maxV && selected.length > 1 && 'top')}>{s.baseStats[stat]}</span>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="row between wrap" style={{ marginTop: 18, gap: 10 }}>
                  <div className="section-label" style={{ margin: 0 }}>
                    Stats reales a nivel 50 <Help>Fórmula Champions: PS = Base + 75 + SP · Resto = (Base + 20 + SP) × naturaleza. IV 31 siempre.</Help>
                  </div>
                  <div className="row wrap" style={{ gap: 8 }}>
                    <Segmented size="sm" value={compare.sp} onChange={(v) => setCompare((c) => ({ ...c, sp: v }))} options={[{ value: 0, label: '0 SP' }, { value: 32, label: '32 SP' }]} />
                    <Segmented
                      size="sm"
                      value={compare.nature}
                      onChange={(v) => setCompare((c) => ({ ...c, nature: v }))}
                      options={[
                        { value: 'minus', label: '×0,9' },
                        { value: 'neutral', label: 'Neutra' },
                        { value: 'plus', label: '×1,1' },
                      ]}
                    />
                  </div>
                </div>
                <div className="table-wrap" style={{ marginTop: 10 }}>
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th>Pokémon</th>
                        {STAT_IDS.map((s) => <th key={s} className="num">{STAT_SHORT[s]}</th>)}
                        <th className="num">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selected.map((s, i) => (
                        <tr key={s.id}>
                          <td>
                            <span className="row" style={{ gap: 8 }}>
                              <span className="legend-dot" style={{ background: SERIES_COLORS[i] }} />
                              {s.name}
                            </span>
                          </td>
                          {STAT_IDS.map((st) => {
                            const v = statAt(s, st);
                            const maxV = Math.max(...selected.map((o) => statAt(o, st)));
                            return <td key={st} className={cx('num mono', v === maxV && selected.length > 1 && 'accent-text')}>{v}</td>;
                          })}
                          <td className="num mono muted">{bst(s.baseStats)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="row wrap" style={{ gap: 12, marginTop: 14 }}>
                  {selected.map((s) => (
                    <div key={s.id} className="ability-line">
                      <b>{s.name}:</b> <span className="muted">{s.abilities.join(' · ')}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ------------------------ Listado ------------------------ */}
        <div className="card" data-tour="compare-list">
          <div className="card-head" style={{ flexWrap: 'wrap' }}>
            <div className="search-box">
              <IconSearch />
              <input className="input" placeholder="Buscar Pokémon o habilidad…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <div className="row" style={{ gap: 6 }}>
              <select className="select" style={{ width: 'auto' }} value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label="Ordenar">
                <option value="bst">Ordenar: Total</option>
                {STAT_IDS.map((s) => <option key={s} value={s}>Ordenar: {STAT_LABEL[s]}</option>)}
                <option value="num">Ordenar: Nº Pokédex</option>
                <option value="name">Ordenar: Nombre</option>
              </select>
              <Segmented
                size="sm"
                value={view}
                onChange={setView}
                options={[
                  { value: 'grid', label: '', icon: <IconGrid />, title: 'Cuadrícula' },
                  { value: 'table', label: '', icon: <IconList />, title: 'Tabla' },
                ]}
              />
            </div>
          </div>
          <div className="card-body" style={{ paddingBottom: 8 }}>
            <div className="chips" style={{ marginBottom: 10 }}>
              <Segmented size="sm" value={megas} onChange={setMegas} options={[{ value: 'all', label: 'Todos' }, { value: 'no', label: 'Sin Megas' }, { value: 'only', label: 'Megas' }]} />
            </div>
            <div className="type-filter">
              <button className={cx('type-pill', !type && 'on')} onClick={() => setType('')}>Todos</button>
              {ALL_TYPES.map((t) => (
                <button key={t} className={cx('type-pill', type === t && 'on')} style={{ ['--type-color' as any]: TYPE_COLORS[t] }} onClick={() => setType(type === t ? '' : t)}>
                  {TYPE_ES[t]}
                </button>
              ))}
            </div>
            <div className="muted" style={{ fontSize: 12, margin: '10px 0 4px' }}>{list.length} resultados</div>
          </div>
          {view === 'grid' ? (
            <div className="mon-grid">
              {list.map((s) => {
                const on = compare.ids.includes(s.id);
                const idx = compare.ids.indexOf(s.id);
                return (
                  <button key={s.id} className={cx('mon-tile', on && 'on')} style={on ? { ['--c' as any]: SERIES_COLORS[idx] } : undefined} onClick={() => toggle(s.id)}>
                    <div className="mon-tile-top">
                      <span className="mono muted" style={{ fontSize: 10.5 }}>#{String(s.num).padStart(4, '0')}</span>
                      {s.isMega && <span className="badge accent" style={{ height: 17, fontSize: 9.5 }}>MEGA</span>}
                    </div>
                    <Sprite species={s} size={64} />
                    <div className="mon-tile-name truncate">{s.name}</div>
                    <Types types={s.types} size="sm" />
                    <div className="mini-stats">
                      {STAT_IDS.map((st) => (
                        <div key={st} className="mini-stat" title={`${STAT_LABEL[st]}: ${s.baseStats[st]}`}>
                          <div style={{ height: `${Math.min(100, (s.baseStats[st] / 180) * 100)}%` }} className={sort === st ? 'hl' : undefined} />
                        </div>
                      ))}
                    </div>
                    <div className="mono" style={{ fontSize: 11 }}>
                      <span className="muted">{sort !== 'bst' && sort !== 'name' && sort !== 'num' ? STAT_SHORT[sort] : 'Total'} </span>
                      <b>{sort !== 'bst' && sort !== 'name' && sort !== 'num' ? s.baseStats[sort] : bst(s.baseStats)}</b>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="table-wrap" style={{ maxHeight: '70vh' }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th />
                    <th>Pokémon</th>
                    {STAT_IDS.map((s) => (
                      <th key={s} className={cx('num sortable', sort === s && 'sorted')} onClick={() => setSort(s)}>{STAT_SHORT[s]}</th>
                    ))}
                    <th className={cx('num sortable', sort === 'bst' && 'sorted')} onClick={() => setSort('bst')}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((s) => (
                    <tr key={s.id} className={cx(compare.ids.includes(s.id) && 'hl')} onClick={() => toggle(s.id)} style={{ cursor: 'pointer' }}>
                      <td style={{ width: 36 }}>
                        <span className={cx('chip chip-sm', compare.ids.includes(s.id) && 'on')}>{compare.ids.includes(s.id) ? '✓' : '+'}</span>
                      </td>
                      <td>
                        <span className="row" style={{ gap: 8 }}>
                          <Sprite species={s} size={30} />
                          <span style={{ fontWeight: 560 }}>{s.name}</span>
                          <Types types={s.types} size="sm" />
                        </span>
                      </td>
                      {STAT_IDS.map((st) => (
                        <td key={st} className={cx('num mono', sort === st && 'accent-text')}>{s.baseStats[st]}</td>
                      ))}
                      <td className={cx('num mono', sort === 'bst' && 'accent-text')}>{bst(s.baseStats)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ Radar SVG ------------------------------ */

function Radar({ species }: { species: SpeciesEntry[] }) {
  const size = 260;
  const c = size / 2;
  const r = c - 34;
  const order: StatID[] = ['hp', 'atk', 'def', 'spe', 'spd', 'spa'];
  const pt = (i: number, v: number) => {
    const a = (Math.PI * 2 * i) / order.length - Math.PI / 2;
    return [c + Math.cos(a) * r * v, c + Math.sin(a) * r * v];
  };
  const MAXV = 180;
  return (
    <svg className="radar" viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Gráfico radar de estadísticas base">
      {[0.25, 0.5, 0.75, 1].map((k) => (
        <polygon key={k} points={order.map((_, i) => pt(i, k).join(',')).join(' ')} className="radar-grid" />
      ))}
      {order.map((s, i) => {
        const [x, y] = pt(i, 1);
        const [lx, ly] = pt(i, 1.17);
        return (
          <g key={s}>
            <line x1={c} y1={c} x2={x} y2={y} className="radar-axis" />
            <text x={lx} y={ly} className="radar-label" textAnchor="middle" dominantBaseline="middle">{STAT_SHORT[s]}</text>
          </g>
        );
      })}
      {species.map((sp, si) => (
        <polygon
          key={sp.id}
          points={order.map((s, i) => pt(i, Math.min(1, sp.baseStats[s] / MAXV)).join(',')).join(' ')}
          fill={SERIES_COLORS[si]}
          fillOpacity={0.14}
          stroke={SERIES_COLORS[si]}
          strokeWidth={2}
          strokeLinejoin="round"
          className="radar-poly"
        />
      ))}
    </svg>
  );
}
