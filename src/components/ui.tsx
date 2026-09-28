import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { TYPE_COLORS, TYPE_ES } from '../lib/typeData';
import { cx } from '../lib/util';
import { IconCheck, IconX } from './Icons';

/* ----------------------------- Segmented ----------------------------- */

export interface SegOption<T extends string | number> {
  value: T;
  label: ReactNode;
  icon?: ReactNode;
  title?: string;
  tone?: 'accent' | 'ally' | 'foe';
}

export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  block,
  size,
  tone,
  ...rest
}: {
  value: T;
  options: SegOption<T>[];
  onChange: (v: T) => void;
  block?: boolean;
  size?: 'sm';
  tone?: 'accent' | 'ally' | 'foe';
  'data-tour'?: string;
}) {
  return (
    <div className={cx('seg', block && 'block', size === 'sm' && 'seg-sm')} role="radiogroup" data-tour={rest['data-tour']}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          title={o.title}
          className={cx('seg-btn', o.value === value && 'active', (o.tone ?? tone) && `tone-${o.tone ?? tone}`)}
          onClick={() => onChange(o.value)}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------- Chip -------------------------------- */

export function Chip({
  on,
  onClick,
  children,
  tone,
  size,
  title,
  icon,
}: {
  on: boolean;
  onClick: () => void;
  children: ReactNode;
  tone?: 'ally' | 'foe';
  size?: 'sm';
  title?: string;
  icon?: ReactNode;
}) {
  return (
    <button
      type="button"
      className={cx('chip', on && 'on', tone && `tone-${tone}`, size === 'sm' && 'chip-sm')}
      aria-pressed={on}
      onClick={onClick}
      title={title}
    >
      {icon ?? <span className="dot" />}
      {children}
    </button>
  );
}

/* ------------------------------ Switch ------------------------------- */

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: ReactNode }) {
  return (
    <label className="switch">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="track" />
      {label}
    </label>
  );
}

/* ------------------------------ Stages ------------------------------- */

export function Stages({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const vals = [-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6];
  return (
    <div className="stages" role="radiogroup" aria-label="Etapas">
      {vals.map((v) => (
        <button
          key={v}
          type="button"
          className={cx(v === value && 'active', v > 0 ? 'pos' : v < 0 ? 'neg' : 'zero')}
          onClick={() => onChange(v)}
          aria-checked={v === value}
          role="radio"
        >
          {v > 0 ? `+${v}` : v}
        </button>
      ))}
    </div>
  );
}

export function Stepper({ value, onChange, min = -6, max = 6 }: { value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  return (
    <div className="stepper">
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))} aria-label="Bajar">−</button>
      <span className={cx('val', value > 0 && 'pos', value < 0 && 'neg')}>{value > 0 ? `+${value}` : value}</span>
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))} aria-label="Subir">+</button>
    </div>
  );
}

/* ------------------------------ Slider ------------------------------- */

export function RangeInput({
  value,
  min = 0,
  max,
  onChange,
  showInput = true,
  ariaLabel,
}: {
  value: number;
  min?: number;
  max: number;
  onChange: (v: number) => void;
  showInput?: boolean;
  ariaLabel?: string;
}) {
  const fill = ((value - min) / (max - min)) * 100;
  return (
    <div className="slider-row">
      <input
        className="range"
        type="range"
        min={min}
        max={max}
        value={value}
        aria-label={ariaLabel}
        style={{ ['--fill' as any]: `${fill}%` }}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      {showInput && (
        <input
          className="input input-num"
          type="number"
          min={min}
          max={max}
          value={value}
          aria-label={ariaLabel}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (!Number.isNaN(n)) onChange(Math.max(min, Math.min(max, Math.round(n))));
          }}
        />
      )}
    </div>
  );
}

/* ------------------------------ Badges ------------------------------- */

export function TypeBadge({ type, size }: { type: string; size?: 'sm' }) {
  return (
    <span className={cx('type-badge', size === 'sm' && 'sm')} style={{ ['--type-color' as any]: TYPE_COLORS[type] ?? '#777' }}>
      {TYPE_ES[type] ?? type}
    </span>
  );
}

export function Types({ types, size }: { types: string[]; size?: 'sm' }) {
  return (
    <span className="types">
      {types.map((t) => (
        <TypeBadge key={t} type={t} size={size} />
      ))}
    </span>
  );
}

export function CatIcon({ category }: { category: string }) {
  const label = category === 'Physical' ? 'FÍS' : category === 'Special' ? 'ESP' : 'EST';
  return <span className={`cat-icon cat-${category}`} title={category}>{label}</span>;
}

/* ------------------------------ Tooltip ------------------------------ */

export function Tooltip({ content, children }: { content: ReactNode; children: ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const show = () => {
    const r = ref.current?.getBoundingClientRect();
    if (r) setPos({ x: r.left + r.width / 2, y: r.top });
  };
  return (
    <span className="tip" ref={ref} onMouseEnter={show} onMouseLeave={() => setPos(null)} onFocus={show} onBlur={() => setPos(null)}>
      {children}
      {pos &&
        createPortal(
          <div
            className="tip-bubble"
            style={{ left: Math.min(window.innerWidth - 150, Math.max(150, pos.x)), top: pos.y - 8, transform: 'translate(-50%, -100%)' }}
          >
            {content}
          </div>,
          document.body,
        )}
    </span>
  );
}

export function Help({ children }: { children: ReactNode }) {
  return (
    <Tooltip content={children}>
      <span className="help-dot" tabIndex={0}>?</span>
    </Tooltip>
  );
}

/* ------------------------------ Drawer ------------------------------- */

export function Drawer({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <>
      <div className="overlay" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-modal="true">
        <div className="drawer-head">
          <div style={{ fontWeight: 650, fontSize: 15 }}>{title}</div>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose} aria-label="Cerrar">
            <IconX />
          </button>
        </div>
        <div className="drawer-body">{children}</div>
      </aside>
    </>,
    document.body,
  );
}

/* ------------------------------ Toasts ------------------------------- */

interface Toast {
  id: number;
  text: ReactNode;
}
const ToastCtx = createContext<(text: ReactNode) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((text: ReactNode) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      {createPortal(
        <div className="toasts">
          {toasts.map((t) => (
            <div className="toast" key={t.id}>
              <IconCheck width={16} height={16} />
              {t.text}
            </div>
          ))}
        </div>,
        document.body,
      )}
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);

/* ------------------------------ Popover ------------------------------ */

/** Posiciona un elemento flotante bajo (o sobre) un ancla, respetando el viewport. */
export function useAnchoredPosition(anchor: React.RefObject<HTMLElement>, open: boolean, width?: number, maxH = 380) {
  const [style, setStyle] = useState<React.CSSProperties>({});
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const r = anchor.current?.getBoundingClientRect();
      if (!r) return;
      const w = Math.min(window.innerWidth - 16, Math.max(width ?? r.width, r.width));
      const left = Math.max(8, Math.min(r.left, window.innerWidth - w - 8));
      const below = window.innerHeight - r.bottom - 12;
      const above = r.top - 12;
      if (below >= Math.min(maxH, 260) || below >= above) {
        setStyle({ left, top: r.bottom + 6, width: w, maxHeight: Math.min(maxH, below) });
      } else {
        setStyle({ left, bottom: window.innerHeight - r.top + 6, width: w, maxHeight: Math.min(maxH, above) });
      }
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, anchor, width, maxH]);
  return style;
}
