import { useLayoutEffect, useRef, useState } from 'react';
import { useDex } from './data/DexContext';
import { useStore, TABS, type Tab } from './state/store';
import { ComparePage } from './features/compare/ComparePage';
import { SpeedPage } from './features/speed/SpeedPage';
import { DamagePage } from './features/damage/DamagePage';
import { GuidePage } from './features/guide/GuidePage';
import { RegulationPanel, REPO_URL, useRegulationCheck } from './features/regulation/RegulationPanel';
import { Tour } from './components/Tour';
import { BrandMark, IconBars, IconBolt, IconBook, IconCompass, IconGithub, IconMoon, IconSun, IconSword } from './components/Icons';
import { cx } from './lib/util';

const NAV: Record<Tab, { label: string; icon: JSX.Element }> = {
  compare: { label: 'Comparador', icon: <IconBars /> },
  speed: { label: 'Velocidad', icon: <IconBolt /> },
  damage: { label: 'Daño', icon: <IconSword /> },
  guide: { label: 'Guía', icon: <IconBook /> },
};

export function App() {
  const { tab, setTab, theme, toggleTheme, setTourOpen, regOpen, setRegOpen } = useStore();
  const dex = useDex();
  const { status, check } = useRegulationCheck();
  const navRef = useRef<HTMLDivElement>(null);
  const [ind, setInd] = useState({ left: 4, width: 0 });

  useLayoutEffect(() => {
    const update = () => {
      const el = navRef.current?.querySelector<HTMLElement>(`[data-tab="${tab}"]`);
      if (el) setInd({ left: el.offsetLeft, width: el.offsetWidth });
    };
    update();
    window.addEventListener('resize', update);
    document.fonts?.ready.then(update);
    return () => window.removeEventListener('resize', update);
  }, [tab]);

  const changed = status.state === 'changed';

  return (
    <>
      <header className="app-header">
        <div className="brand" onClick={() => setTab('guide')} title="Champions Lab">
          <span className="brand-mark"><BrandMark /></span>
          <span className="brand-text">
            Champions <em>Lab</em>
            <small>Pokémon Champions toolkit</small>
          </span>
        </div>

        <nav className="nav" ref={navRef} data-tour="nav">
          <span className="nav-indicator" style={{ left: ind.left, width: ind.width }} />
          {TABS.map((t) => (
            <button key={t} data-tab={t} className={cx('nav-btn', tab === t && 'active')} onClick={() => setTab(t)} aria-current={tab === t ? 'page' : undefined}>
              {NAV[t].icon}
              <span className="lbl">{NAV[t].label}</span>
            </button>
          ))}
        </nav>

        <div className="header-actions">
          <button className={cx('reg-badge', changed && 'alert')} onClick={() => setRegOpen(true)} data-tour="reg-badge" title="Regulación y actualizaciones">
            <span className="reg-dot" />
            <span className="hide-sm">Reg.</span> <b>{dex.data.meta.regulation}</b>
            <span className="hide-sm muted mono">· {dex.data.meta.speciesCount}</span>
            {changed && <span className="reg-new">Nueva</span>}
          </button>
          <button className="btn btn-ghost btn-icon hide-sm" onClick={() => setTourOpen(true)} title="Tour guiado">
            <IconCompass />
          </button>
          <button className="btn btn-ghost btn-icon" onClick={toggleTheme} title={theme === 'dark' ? 'Tema claro' : 'Tema oscuro'}>
            {theme === 'dark' ? <IconSun /> : <IconMoon />}
          </button>
        </div>
      </header>

      {changed && (
        <div className="update-banner">
          <span>
            Se ha detectado {status.regulation !== dex.data.meta.regulation ? <>la nueva <b>Regulación {status.regulation}</b></> : <>un cambio en la lista de la <b>Regulación {status.regulation}</b></>}.
          </span>
          <button className="btn btn-primary btn-sm" onClick={() => setRegOpen(true)}>Actualizar Pokémon y stats</button>
        </div>
      )}

      <main className="main" key={tab}>
        <div data-tour="guide-top" />
        {tab === 'compare' && <ComparePage />}
        {tab === 'speed' && <SpeedPage />}
        {tab === 'damage' && <DamagePage />}
        {tab === 'guide' && <GuidePage />}
      </main>

      <footer className="footer">
        <span>
          Champions Lab · Regulación {dex.data.meta.regulation} · datos de Pokémon Showdown y @smogon/calc
        </span>
        <span className="row" style={{ gap: 14 }}>
          <a href={REPO_URL} target="_blank" rel="noreferrer" className="row" style={{ gap: 6 }}><IconGithub width={14} height={14} /> Código</a>
          <span>Herramienta de fans · sin afiliación con Nintendo / The Pokémon Company</span>
        </span>
      </footer>

      <RegulationPanel open={regOpen} onClose={() => setRegOpen(false)} status={status} check={check} />
      <Tour />
    </>
  );
}
