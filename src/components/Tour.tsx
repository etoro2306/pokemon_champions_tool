import { useEffect, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useStore, type Tab } from '../state/store';
import { IconX } from './Icons';

interface Step {
  tab?: Tab;
  target: string;
  title: string;
  body: string;
}

const STEPS: Step[] = [
  { target: 'nav', title: 'Cuatro herramientas', body: 'Comparador de stats, Speed Calculator, Damage Calculator y esta guía. Cambia de pestaña cuando quieras: todo se guarda solo.' },
  { target: 'reg-badge', title: 'Regulación vigente', body: 'Muestra la regulación cargada. Si se detecta una nueva, se ilumina: ábrelo para actualizar los Pokémon y sus stats al instante.' },
  { tab: 'speed', target: 'speed-field', title: 'Condiciones del combate', body: 'Espacio Raro, clima, campo, Viento Afín y Pantano por equipo. Todo afecta al cálculo en tiempo real.' },
  { tab: 'speed', target: 'speed-cards', title: 'Tus Pokémon y los rivales', body: 'Configura naturaleza, SP de Velocidad, etapas, objeto, habilidad, estado y el movimiento (para la prioridad). Añade tantos como quieras.' },
  { tab: 'speed', target: 'speed-order', title: 'Orden de actuación', body: 'Ranking agrupado por prioridad. Los empates se marcan con 50%.' },
  { tab: 'speed', target: 'speed-duel', title: 'Duelo directo', body: 'Quién gana entre dos Pokémon, los SP mínimos para superarle y una matriz con todos los escenarios típicos.' },
  { tab: 'speed', target: 'speed-view', title: 'Speed tiers', body: 'Cambia a la tabla de toda la regulación para ver dónde encajan tus Pokémon.' },
  { tab: 'damage', target: 'damage-format', title: 'Formato del combate', body: 'En Dobles se aplica ×0,75 a los ataques en área. Intercambia atacante y defensor con un clic.' },
  { tab: 'damage', target: 'damage-attacker', title: 'Configura cada Pokémon', body: 'Especie, PS, habilidad, objeto, naturaleza, SP (66 máx.), etapas y 4 movimientos. Los efectos de su lado (pantallas, Refuerzo…) están al final.' },
  { tab: 'damage', target: 'damage-results', title: 'Resultados', body: 'Rango de daño, barra de vida, probabilidad de OHKO/2HKO/3HKO y las 16 tiradas. Alterna entre tus ataques y los del rival.' },
  { tab: 'compare', target: 'compare-list', title: 'Explora la regulación', body: 'Filtra por tipo, busca y ordena por cualquier stat. Pulsa un Pokémon para añadirlo a la comparación.' },
  { tab: 'compare', target: 'compare-panel', title: 'Compara', body: 'Radar, barras y stats reales a nivel 50. Envía la selección al Speed o al Damage Calculator con un botón.' },
  { tab: 'guide', target: 'guide-top', title: '¡Listo!', body: 'En la guía tienes ejemplos que se cargan en las calculadoras, un laboratorio de fórmulas y un mini-juego de velocidad.' },
];

export function Tour() {
  const { tourOpen, setTourOpen, setTab, tab } = useStore();
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const step = STEPS[i];

  useEffect(() => {
    if (tourOpen) setI(0);
  }, [tourOpen]);

  useEffect(() => {
    if (!tourOpen) return;
    if (step.tab && step.tab !== tab) setTab(step.tab);
  }, [tourOpen, step, tab, setTab]);

  useLayoutEffect(() => {
    if (!tourOpen) return;
    let raf = 0;
    let tries = 0;
    const find = () => {
      const el = document.querySelector(`[data-tour="${step.target}"]`) as HTMLElement | null;
      if (!el) {
        if (tries++ < 30) raf = requestAnimationFrame(find);
        else setRect(null);
        return;
      }
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      setTimeout(() => setRect(el.getBoundingClientRect()), 350);
    };
    const t = setTimeout(find, 60);
    const onMove = () => {
      const el = document.querySelector(`[data-tour="${step.target}"]`) as HTMLElement | null;
      if (el) setRect(el.getBoundingClientRect());
    };
    window.addEventListener('resize', onMove);
    window.addEventListener('scroll', onMove, true);
    return () => {
      clearTimeout(t);
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onMove);
      window.removeEventListener('scroll', onMove, true);
    };
  }, [tourOpen, step, tab]);

  useEffect(() => {
    if (!tourOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setTourOpen(false);
      if (e.key === 'ArrowRight') setI((x) => Math.min(STEPS.length - 1, x + 1));
      if (e.key === 'ArrowLeft') setI((x) => Math.max(0, x - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tourOpen, setTourOpen]);

  if (!tourOpen) return null;
  const pad = 8;
  const r = rect;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const cardW = Math.min(360, vw - 24);
  let cardStyle: React.CSSProperties = { left: (vw - cardW) / 2, top: vh / 2 - 90, width: cardW };
  if (r) {
    const cardH = 200;
    const gap = pad + 14;
    const centerLeft = Math.max(12, Math.min(vw - cardW - 12, r.left + r.width / 2 - cardW / 2));
    const clampTop = (t: number) => Math.max(12, Math.min(vh - cardH - 12, t));
    if (r.bottom + gap + cardH < vh) cardStyle = { left: centerLeft, top: r.bottom + gap, width: cardW };
    else if (r.top - gap - cardH > 0) cardStyle = { left: centerLeft, top: r.top - gap - cardH, width: cardW };
    else if (r.left - gap - cardW > 0) cardStyle = { left: r.left - gap - cardW, top: clampTop(r.top + 20), width: cardW };
    else if (r.right + gap + cardW < vw) cardStyle = { left: r.right + gap, top: clampTop(r.top + 20), width: cardW };
    else cardStyle = { left: centerLeft, top: vh - cardH - 16, width: cardW };
  }

  return createPortal(
    <div className="tour-root">
      <div
        className="tour-hole"
        style={
          r
            ? { left: r.left - pad, top: r.top - pad, width: r.width + pad * 2, height: r.height + pad * 2 }
            : { left: vw / 2, top: vh / 2, width: 0, height: 0 }
        }
      />
      <div className="tour-card" style={cardStyle}>
        <div className="row between">
          <span className="eyebrow" style={{ margin: 0 }}>Paso {i + 1} de {STEPS.length}</span>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setTourOpen(false)} aria-label="Cerrar tour"><IconX /></button>
        </div>
        <div className="tour-title">{step.title}</div>
        <div className="tour-body">{step.body}</div>
        <div className="tour-progress"><div style={{ width: `${((i + 1) / STEPS.length) * 100}%` }} /></div>
        <div className="row between" style={{ marginTop: 12 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setI((x) => Math.max(0, x - 1))} disabled={i === 0}>← Anterior</button>
          {i < STEPS.length - 1 ? (
            <button className="btn btn-primary btn-sm" onClick={() => setI((x) => x + 1)}>Siguiente →</button>
          ) : (
            <button className="btn btn-primary btn-sm" onClick={() => setTourOpen(false)}>Terminar</button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
