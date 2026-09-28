import { useMemo, useState } from 'react';
import { useDex } from '../../data/DexContext';
import { calcStat, applyStage } from '../../lib/stats';
import type { SpeedResult } from '../../lib/speed';
import { cx, toID } from '../../lib/util';
import { useStore } from '../../state/store';
import { Sprite } from '../../components/Sprite';
import { Chip, Segmented, Types } from '../../components/ui';
import { IconSearch } from '../../components/Icons';

type Col = 'min' | 'neutral0' | 'neutral32' | 'max' | 'maxP1' | 'scarf' | 'tailwind';

const COLS: { id: Col; label: string; title: string }[] = [
  { id: 'min', label: 'Mín.', title: '0 SP, naturaleza −Vel' },
  { id: 'neutral0', label: 'Neutra 0', title: '0 SP, naturaleza neutra' },
  { id: 'neutral32', label: 'Neutra 32', title: '32 SP, naturaleza neutra' },
  { id: 'max', label: 'Máx.', title: '32 SP, naturaleza +Vel' },
  { id: 'maxP1', label: 'Máx. +1', title: 'Máx. con +1 de Velocidad' },
  { id: 'scarf', label: 'Máx. Pañuelo', title: 'Máx. con Pañuelo Elección (×1,5)' },
  { id: 'tailwind', label: 'Máx. Viento', title: 'Máx. con Viento Afín (×2)' },
];

function speeds(base: number): Record<Col, number> {
  const max = calcStat('spe', base, 32, 'Jolly');
  return {
    min: calcStat('spe', base, 0, 'Brave'),
    neutral0: calcStat('spe', base, 0, 'Serious'),
    neutral32: calcStat('spe', base, 32, 'Serious'),
    max,
    maxP1: applyStage(max, 1),
    scarf: Math.trunc((max * 6144 + 2047) / 4096),
    tailwind: max * 2,
  };
}

export function SpeedTiers({ results }: { results: SpeedResult[] }) {
  const dex = useDex();
  const { speed } = useStore();
  const [col, setCol] = useState<Col>('max');
  const [q, setQ] = useState('');
  const [megas, setMegas] = useState<'all' | 'no' | 'only'>('all');
  const [markers, setMarkers] = useState(true);

  const rows = useMemo(() => {
    const qid = toID(q);
    return dex.species
      .filter((s) => !s.battleOnly || s.isMega)
      .filter((s) => (megas === 'no' ? !s.isMega : megas === 'only' ? s.isMega : true))
      .filter((s) => !qid || toID(s.name).includes(qid) || s.types.some((t) => toID(t) === qid))
      .map((s) => ({ s, v: speeds(s.baseStats.spe) }))
      .sort((a, b) => b.v[col] - a.v[col] || a.s.name.localeCompare(b.s.name))
      .map((r, i) => ({ ...r, rank: i + 1 }));
  }, [dex.species, col, q, megas]);

  // Inserta los Pokémon configurados como marcadores en su posición
  type Line = ({ kind: 'row' } & (typeof rows)[number]) | { kind: 'marker'; r: SpeedResult };
  const lines: Line[] = [];
  const mk = markers ? [...results].sort((a, b) => b.final - a.final) : [];
  let mi = 0;
  for (const row of rows) {
    while (mi < mk.length && mk[mi].final > row.v[col]) lines.push({ kind: 'marker', r: mk[mi++] });
    lines.push({ kind: 'row', ...row });
  }
  while (mi < mk.length) lines.push({ kind: 'marker', r: mk[mi++] });

  return (
    <div className="card fade-in" style={{ marginTop: 16 }}>
      <div className="card-head" style={{ flexWrap: 'wrap' }}>
        <div className="row wrap" style={{ gap: 10 }}>
          <div className="search-box">
            <IconSearch />
            <input className="input" placeholder="Buscar Pokémon o tipo…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Segmented
            size="sm"
            value={megas}
            onChange={setMegas}
            options={[
              { value: 'all', label: 'Todos' },
              { value: 'no', label: 'Sin Megas' },
              { value: 'only', label: 'Solo Megas' },
            ]}
          />
          <Chip size="sm" on={markers} onClick={() => setMarkers((m) => !m)}>
            Mostrar mis Pokémon
          </Chip>
        </div>
        <span className="muted" style={{ fontSize: 12 }}>{rows.length} Pokémon · ordenado por «{COLS.find((c) => c.id === col)!.label}»</span>
      </div>
      <div className="table-wrap" style={{ maxHeight: '70vh' }}>
        <table className="tbl">
          <thead>
            <tr>
              <th style={{ width: 44 }}>#</th>
              <th>Pokémon</th>
              <th className="num">Base</th>
              {COLS.map((c) => (
                <th key={c.id} className={cx('num sortable', col === c.id && 'sorted')} title={c.title} onClick={() => setCol(c.id)}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => {
              if (l.kind === 'marker') {
                const mon = speed.mons.find((m) => m.key === l.r.key);
                const sp = mon && dex.get(mon.speciesId);
                return (
                  <tr key={`m-${l.r.key}`} className="hl marker-row">
                    <td colSpan={3 + COLS.length}>
                      <div className="row" style={{ gap: 10 }}>
                        <span className={cx('badge', l.r.side === 'ally' ? 'ally' : 'foe')}>Tu {l.r.side === 'ally' ? 'aliado' : 'rival'}</span>
                        {sp && <Sprite species={sp} size={28} />}
                        <b>{l.r.name}</b>
                        <span className="muted">configuración actual:</span>
                        <b className="mono accent-text">{l.r.final}</b>
                      </div>
                    </td>
                  </tr>
                );
              }
              return (
                <tr key={l.s.id}>
                  <td className="muted mono">{l.rank}</td>
                  <td>
                    <div className="row" style={{ gap: 10 }}>
                      <Sprite species={l.s} size={30} />
                      <span style={{ fontWeight: 560 }}>{l.s.name}</span>
                      <Types types={l.s.types} size="sm" />
                    </div>
                  </td>
                  <td className="num mono muted">{l.s.baseStats.spe}</td>
                  {COLS.map((c) => (
                    <td key={c.id} className={cx('num mono', col === c.id && 'accent-text')} style={{ fontWeight: col === c.id ? 700 : 400 }}>
                      {l.v[c.id]}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
