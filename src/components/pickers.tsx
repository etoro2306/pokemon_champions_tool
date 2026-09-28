import { useMemo } from 'react';
import { useDex } from '../data/DexContext';
import type { SpeciesEntry } from '../data/types';
import { ALL_ITEMS, learnableMoves, type MoveInfo } from '../lib/dex';
import { NATURES, STAT_SHORT } from '../lib/stats';
import { TYPE_ES } from '../lib/typeData';
import { Combobox, type ComboOption } from './Combobox';
import { Sprite } from './Sprite';
import { CatIcon, TypeBadge, Types } from './ui';

export function SpeciesPicker({
  value,
  onChange,
  size = 'lg',
  showStat,
  ariaLabel = 'Pokémon',
}: {
  value: string;
  onChange: (id: string) => void;
  size?: 'lg';
  showStat?: 'spe' | 'bst';
  ariaLabel?: string;
}) {
  const dex = useDex();
  const options = useMemo<ComboOption[]>(
    () =>
      dex.species.map((s) => ({
        value: s.id,
        label: s.name,
        keywords: `${s.types.join(' ')} ${s.types.map((t) => TYPE_ES[t]).join(' ')} ${s.isMega ? 'mega' : ''} ${s.abilities.join(' ')}`,
        render: (
          <>
            <Sprite species={s} size={32} />
            <span className="grow">{s.name}</span>
            <Types types={s.types} size="sm" />
            {showStat === 'spe' && (
              <span className="mono muted" style={{ fontSize: 11, width: 44, textAlign: 'right' }}>
                {s.baseStats.spe}
              </span>
            )}
          </>
        ),
      })),
    [dex.species, showStat],
  );
  const sp = dex.get(value);
  return (
    <Combobox
      value={value}
      options={options}
      onChange={onChange}
      size={size}
      popWidth={380}
      ariaLabel={ariaLabel}
      renderValue={() =>
        sp ? (
          <>
            <div className="sprite-wrap" style={{ width: 40, height: 40 }}>
              <Sprite species={sp} size={40} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0, flex: 1 }}>
              <span className="combo-value" style={{ fontSize: 14.5, fontWeight: 650 }}>{sp.name}</span>
              <Types types={sp.types} size="sm" />
            </div>
          </>
        ) : (
          <span className="combo-placeholder">Elige un Pokémon…</span>
        )
      }
    />
  );
}

export function NaturePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select className="select" value={value} onChange={(e) => onChange(e.target.value)} aria-label="Naturaleza">
      {NATURES.map((n) => (
        <option key={n.name} value={n.name}>
          {n.name}{n.plus ? ` (+${STAT_SHORT[n.plus]} −${STAT_SHORT[n.minus!]})` : ' (neutra)'}
        </option>
      ))}
    </select>
  );
}

const ITEM_OPTIONS: ComboOption[] = ALL_ITEMS.map((i) => ({ value: i, label: i }));

export function ItemPicker({ value, onChange, species }: { value: string; onChange: (v: string) => void; species?: SpeciesEntry }) {
  const options = useMemo(() => {
    // Las Megapiedras solo aparecen si corresponden a la especie
    return ITEM_OPTIONS.filter((o) => !/ite( [XYZ])?$/.test(o.value) || ['Eviolite'].includes(o.value) || o.value === species?.requiredItem);
  }, [species?.requiredItem]);
  return <Combobox value={value} options={options} onChange={onChange} allowEmpty emptyLabel="Sin objeto" popWidth={260} ariaLabel="Objeto" />;
}

export function AbilityPicker({ value, onChange, species }: { value: string; onChange: (v: string) => void; species?: SpeciesEntry }) {
  const abilities = species?.abilities ?? [];
  const list = value && !abilities.includes(value) ? [...abilities, value] : abilities;
  return (
    <select className="select" value={value} onChange={(e) => onChange(e.target.value)} aria-label="Habilidad">
      {list.map((a) => (
        <option key={a} value={a}>{a}</option>
      ))}
    </select>
  );
}

export function MovePicker({
  value,
  onChange,
  species,
  learnsets,
  filter,
}: {
  value: string;
  onChange: (v: string) => void;
  species?: SpeciesEntry;
  learnsets: Record<string, string[]>;
  filter?: (m: MoveInfo) => boolean;
}) {
  const options = useMemo<ComboOption[]>(() => {
    const moves = learnableMoves(species, learnsets).filter((m) => (filter ? filter(m) : true));
    return moves.map((m) => ({
      value: m.name,
      label: m.name,
      keywords: `${m.type} ${TYPE_ES[m.type] ?? ''} ${m.category}`,
      render: (
        <>
          <CatIcon category={m.category} />
          <span className="grow">{m.name}</span>
          {m.priority !== 0 && <span className="badge accent" style={{ height: 18 }}>{m.priority > 0 ? `+${m.priority}` : m.priority}</span>}
          {m.isSpread && <span className="badge" style={{ height: 18 }}>Área</span>}
          <TypeBadge type={m.type} size="sm" />
          <span className="mono muted" style={{ width: 28, textAlign: 'right', fontSize: 11 }}>{m.bp || '—'}</span>
        </>
      ),
    }));
  }, [species, learnsets, filter]);
  return <Combobox value={value} options={options} onChange={onChange} allowEmpty emptyLabel="— Ninguno —" popWidth={360} ariaLabel="Movimiento" />;
}
