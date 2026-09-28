import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cx, toID } from '../lib/util';
import { IconSearch } from './Icons';
import { useAnchoredPosition } from './ui';

export interface ComboOption {
  value: string;
  label: string;
  /** texto adicional para la búsqueda (tipos, alias…) */
  keywords?: string;
  group?: string;
  render?: ReactNode;
}

export function Combobox({
  value,
  options,
  onChange,
  placeholder = 'Selecciona…',
  renderValue,
  size,
  popWidth,
  allowEmpty,
  emptyLabel = 'Ninguno',
  ariaLabel,
}: {
  value: string;
  options: ComboOption[];
  onChange: (v: string) => void;
  placeholder?: string;
  renderValue?: (opt: ComboOption | undefined) => ReactNode;
  size?: 'lg';
  popWidth?: number;
  allowEmpty?: boolean;
  emptyLabel?: string;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [hl, setHl] = useState(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const style = useAnchoredPosition(triggerRef, open, popWidth, 420);

  const all = useMemo(
    () => (allowEmpty ? [{ value: '', label: emptyLabel } as ComboOption, ...options] : options),
    [options, allowEmpty, emptyLabel],
  );
  const filtered = useMemo(() => {
    const q = toID(query);
    if (!q) return all;
    const starts: ComboOption[] = [];
    const contains: ComboOption[] = [];
    for (const o of all) {
      const id = toID(o.label);
      if (id.startsWith(q)) starts.push(o);
      else if (id.includes(q) || toID(o.keywords).includes(q)) contains.push(o);
    }
    return [...starts, ...contains];
  }, [all, query]);

  const selected = all.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    const i = all.findIndex((o) => o.value === value);
    setHl(Math.max(0, i));
    const onDoc = (e: MouseEvent) => {
      if (!popRef.current?.contains(e.target as Node) && !triggerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${hl}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [hl, open]);

  useEffect(() => setHl(0), [query]);

  const choose = (o: ComboOption) => {
    onChange(o.value);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHl((h) => Math.min(filtered.length - 1, h + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHl((h) => Math.max(0, h - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[hl]) choose(filtered[hl]);
    } else if (e.key === 'Escape') {
      setOpen(false);
      triggerRef.current?.focus();
    }
  };

  let lastGroup: string | undefined;
  return (
    <div className="combo">
      <button
        ref={triggerRef}
        type="button"
        className={cx('combo-trigger', open && 'open', size === 'lg' && 'lg')}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onKeyDown={(e) => {
          if (!open && (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            setOpen(true);
          } else if (!open && e.key.length === 1 && /\w/.test(e.key)) {
            setOpen(true);
            setQuery(e.key);
          }
        }}
      >
        {renderValue ? renderValue(selected) : selected ? <span className="combo-value">{selected.label}</span> : <span className="combo-placeholder">{placeholder}</span>}
      </button>
      {open &&
        createPortal(
          <div className="combo-pop" style={style} ref={popRef} onKeyDown={onKey}>
            <div className="combo-search">
              <IconSearch />
              <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar…" aria-label="Buscar" />
              <span className="muted" style={{ fontSize: 11 }}>{filtered.length}</span>
            </div>
            <div className="combo-list" ref={listRef} role="listbox">
              {filtered.length === 0 && <div className="combo-empty">Sin resultados</div>}
              {filtered.map((o, i) => {
                const header = !query && o.group && o.group !== lastGroup ? o.group : undefined;
                lastGroup = o.group;
                return (
                  <div key={o.value || '__empty'}>
                    {header && <div className="combo-group">{header}</div>}
                    <div
                      data-idx={i}
                      role="option"
                      aria-selected={o.value === value}
                      className={cx('combo-opt', i === hl && 'hl', o.value === value && 'sel')}
                      onMouseEnter={() => setHl(i)}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => choose(o)}
                    >
                      {o.render ?? <span className="grow">{o.label}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
