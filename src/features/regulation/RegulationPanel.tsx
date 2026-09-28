import { useCallback, useEffect, useState } from 'react';
import { useDex } from '../../data/DexContext';
import { buildRegulation, checkRemoteRegulation } from '../../data/showdownSource';
import type { RegulationData } from '../../data/types';
import { Drawer, Switch, useToast } from '../../components/ui';
import { IconCheck, IconRefresh, IconAlert, IconGithub, IconExternal, IconDownload, IconInfo } from '../../components/Icons';

export const REPO_URL = 'https://github.com/etoro2306/pokemon_champions_tool';
const WORKFLOW_URL = `${REPO_URL}/actions/workflows/update-regulation.yml`;
const AUTO_KEY = 'cl:autocheck';
const LAST_KEY = 'cl:lastcheck';
const CHECK_EVERY_MS = 6 * 60 * 60 * 1000;

export interface RemoteStatus {
  state: 'idle' | 'checking' | 'uptodate' | 'changed' | 'error';
  regulation?: string;
  formatName?: string;
  legalCount?: number;
  error?: string;
  checkedAt?: string;
}

function readAuto() {
  try {
    return localStorage.getItem(AUTO_KEY) !== 'false';
  } catch {
    return true;
  }
}

/** Comprobación (manual o automática al abrir) de si la regulación de Showdown ha cambiado. */
export function useRegulationCheck() {
  const dex = useDex();
  const [status, setStatus] = useState<RemoteStatus>({ state: 'idle' });

  const check = useCallback(async () => {
    setStatus({ state: 'checking' });
    try {
      const remote = await checkRemoteRegulation();
      const changed = remote.fingerprint !== dex.data.meta.fingerprint;
      const st: RemoteStatus = {
        state: changed ? 'changed' : 'uptodate',
        regulation: remote.format.regulation,
        formatName: remote.format.name,
        legalCount: remote.legalCount,
        checkedAt: new Date().toISOString(),
      };
      setStatus(st);
      try {
        localStorage.setItem(LAST_KEY, JSON.stringify({ ...st, fingerprint: dex.data.meta.fingerprint }));
      } catch {
        /* ignore */
      }
      return st;
    } catch (e) {
      const st: RemoteStatus = { state: 'error', error: e instanceof Error ? e.message : String(e) };
      setStatus(st);
      return st;
    }
  }, [dex.data.meta.fingerprint]);

  // Comprobación automática al abrir (como mucho cada 6 h)
  useEffect(() => {
    if (!readAuto()) return;
    try {
      const last = JSON.parse(localStorage.getItem(LAST_KEY) ?? 'null');
      if (last && last.fingerprint === dex.data.meta.fingerprint && Date.now() - new Date(last.checkedAt).getTime() < CHECK_EVERY_MS) {
        setStatus(last);
        return;
      }
    } catch {
      /* ignore */
    }
    const t = setTimeout(() => void check(), 1500);
    return () => clearTimeout(t);
  }, [check, dex.data.meta.fingerprint]);

  return { status, check };
}

export function RegulationPanel({
  open,
  onClose,
  status,
  check,
}: {
  open: boolean;
  onClose: () => void;
  status: RemoteStatus;
  check: () => Promise<RemoteStatus>;
}) {
  const dex = useDex();
  const toast = useToast();
  const meta = dex.data.meta;
  const [auto, setAuto] = useState(readAuto);
  const [progress, setProgress] = useState<string | null>(null);
  const [diff, setDiff] = useState<{ added: string[]; removed: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const update = async () => {
    setError(null);
    setDiff(null);
    setProgress('Iniciando…');
    try {
      const next: RegulationData = await buildRegulation(undefined, setProgress);
      const before = new Map(dex.data.species.map((s) => [s.id, s.name]));
      const after = new Map(next.species.map((s) => [s.id, s.name]));
      const added = [...after].filter(([id]) => !before.has(id)).map(([, n]) => n);
      const removed = [...before].filter(([id]) => !after.has(id)).map(([, n]) => n);
      dex.applyRegulation(next);
      setDiff({ added, removed });
      toast(`Regulación ${next.meta.regulation} aplicada`);
      await check();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setProgress(null);
    }
  };

  const download = () => {
    const blob = new Blob([JSON.stringify(dex.data)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `regulation-${meta.regulation}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <Drawer open={open} onClose={onClose} title="Regulación y actualizaciones">
      <div className="reg-hero">
        <div className="eyebrow" style={{ marginBottom: 6 }}>Regulación vigente</div>
        <div className="reg-code">
          <span className="serif">Reg.</span> {meta.regulation}
        </div>
        <div className="muted" style={{ fontSize: 12.5 }}>{meta.formatName}</div>
        <div className="reg-stats">
          <div><b className="mono">{meta.speciesCount}</b><span>especies</span></div>
          <div><b className="mono">{meta.megaCount}</b><span>Megas</span></div>
          <div><b className="mono">{meta.totalEntries}</b><span>formas totales</span></div>
        </div>
        <div className="muted" style={{ fontSize: 12 }}>
          Datos generados el {new Date(meta.generatedAt).toLocaleString('es-ES')} · {dex.isOverride ? 'actualizados desde el navegador' : 'incluidos en la web'}
        </div>
      </div>

      <div className="section-label" style={{ marginTop: 22 }}>Comprobar cambios</div>
      <div className="card card-pad" style={{ boxShadow: 'none' }}>
        <StatusLine status={status} current={meta.regulation} />
        <div className="row wrap" style={{ gap: 8, marginTop: 14 }}>
          <button className="btn" onClick={() => void check()} disabled={status.state === 'checking' || !!progress}>
            <IconRefresh className={status.state === 'checking' ? 'spin' : undefined} /> Comprobar ahora
          </button>
          <button className="btn btn-primary" onClick={() => void update()} disabled={!!progress}>
            <IconDownload /> {status.state === 'changed' ? 'Actualizar a la nueva regulación' : 'Forzar actualización'}
          </button>
        </div>
        {progress && (
          <div className="progress-line">
            <IconRefresh className="spin" width={14} height={14} /> {progress}
          </div>
        )}
        {error && <div className="callout warn" style={{ marginTop: 12 }}><IconAlert /> <span>No se pudo actualizar: {error}</span></div>}
        {diff && (
          <div className="callout" style={{ marginTop: 12 }}>
            <IconCheck />
            <div>
              <b>Datos actualizados.</b>
              <div style={{ marginTop: 4 }}>Añadidos ({diff.added.length}): {diff.added.join(', ') || '—'}</div>
              <div>Retirados ({diff.removed.length}): {diff.removed.join(', ') || '—'}</div>
            </div>
          </div>
        )}
        <div style={{ marginTop: 14 }}>
          <Switch
            checked={auto}
            onChange={(v) => {
              setAuto(v);
              try {
                localStorage.setItem(AUTO_KEY, String(v));
              } catch {
                /* ignore */
              }
            }}
            label="Avisarme automáticamente al abrir la web si cambia la regulación"
          />
        </div>
        {dex.isOverride && (
          <button className="btn btn-ghost btn-sm" style={{ marginTop: 10 }} onClick={() => { dex.resetRegulation(); toast('Restaurados los datos incluidos en la web'); }}>
            Restaurar datos incluidos en la web
          </button>
        )}
      </div>

      <div className="section-label" style={{ marginTop: 22 }}>Trigger automático del repositorio</div>
      <div className="col" style={{ gap: 10, fontSize: 13, color: 'var(--text-2)' }}>
        <p style={{ margin: 0 }}>
          El workflow <code>update-regulation.yml</code> de GitHub Actions comprueba cada día la regulación vigente en Pokémon Showdown. Si cambia, regenera
          <code> src/data/regulation.json</code>, hace commit y vuelve a desplegar la web, así que todos los usuarios reciben los nuevos Pokémon y stats.
        </p>
        <p style={{ margin: 0 }}>También puedes lanzarlo a mano con <b>Run workflow</b> o desde la terminal con <code>npm run update:regulation</code>.</p>
        <div className="row wrap" style={{ gap: 8 }}>
          <a className="btn" href={WORKFLOW_URL} target="_blank" rel="noreferrer"><IconGithub /> Abrir el workflow <IconExternal /></a>
          <button className="btn btn-ghost" onClick={download}><IconDownload /> Descargar JSON actual</button>
        </div>
        <div className="callout info">
          <IconInfo />
          <span>
            Fuente: <code>smogon/pokemon-showdown</code> (mod <code>champions</code>). Las mecánicas de daño las aporta <code>@smogon/calc</code>; el workflow
            también la actualiza para incorporar nuevos movimientos u objetos.
          </span>
        </div>
      </div>
    </Drawer>
  );
}

function StatusLine({ status, current }: { status: RemoteStatus; current: string }) {
  switch (status.state) {
    case 'checking':
      return <div className="status-line"><IconRefresh className="spin" /> Consultando Pokémon Showdown…</div>;
    case 'uptodate':
      return (
        <div className="status-line good">
          <IconCheck /> Al día: la regulación vigente sigue siendo <b>{status.regulation}</b> ({status.legalCount} formas legales).
        </div>
      );
    case 'changed':
      return (
        <div className="status-line warn">
          <IconAlert />
          {status.regulation !== current ? (
            <span>¡Nueva regulación detectada! <b>{status.regulation}</b> sustituye a {current}. Actualiza para cargar sus Pokémon.</span>
          ) : (
            <span>La lista de Pokémon legales de <b>{status.regulation}</b> ha cambiado. Actualiza para sincronizar.</span>
          )}
        </div>
      );
    case 'error':
      return <div className="status-line bad"><IconAlert /> No se pudo comprobar ({status.error}). ¿Sin conexión?</div>;
    default:
      return <div className="status-line muted"><IconInfo /> Aún no se ha comprobado en esta sesión.</div>;
  }
}
