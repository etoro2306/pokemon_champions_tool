import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useDex } from '../../data/DexContext';
import { calcStat, NATURES } from '../../lib/stats';
import { computeSpeed, compareSpeed, DEFAULT_FIELD, type SpeedField } from '../../lib/speed';
import { cx, toID } from '../../lib/util';
import { useStore } from '../../state/store';
import { Sprite } from '../../components/Sprite';
import { RangeInput, Segmented, Types, useToast } from '../../components/ui';
import {
  IconBolt, IconSword, IconBars, IconPlay, IconSparkle, IconCompass, IconRefresh, IconDice, IconSearch,
  IconChevronDown, IconCheck, IconX, IconInfo, IconLayers,
} from '../../components/Icons';
import { DAMAGE_EXAMPLES, SPEED_EXAMPLES } from './examples';

const SECTIONS = [
  { id: 'inicio', label: 'Empieza aquí' },
  { id: 'stats', label: 'Stats en Champions' },
  { id: 'velocidad', label: 'Speed Calculator' },
  { id: 'dano', label: 'Damage Calculator' },
  { id: 'resultados', label: 'Leer un resultado' },
  { id: 'quiz', label: 'Pon a prueba' },
  { id: 'regulacion', label: 'Regulaciones' },
  { id: 'glosario', label: 'Glosario' },
  { id: 'faq', label: 'Preguntas frecuentes' },
];

export function GuidePage() {
  const [active, setActive] = useState('inicio');
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (vis) setActive(vis.target.id);
      },
      { rootMargin: '-80px 0px -60% 0px' },
    );
    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, []);

  return (
    <div className="page-enter guide">
      <aside className="guide-nav">
        <div className="section-label">Guía de usuario</div>
        {SECTIONS.map((s, i) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className={cx('guide-link', active === s.id && 'active')}
            onClick={(e) => {
              e.preventDefault();
              document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
          >
            <span className="mono">{String(i + 1).padStart(2, '0')}</span> {s.label}
          </a>
        ))}
      </aside>
      <div className="guide-content">
        <Intro />
        <StatsSection />
        <SpeedSection />
        <DamageSection />
        <AnatomySection />
        <QuizSection />
        <RegulationSection />
        <Glossary />
        <Faq />
      </div>
    </div>
  );
}

function Section({ id, eyebrow, title, children }: { id: string; eyebrow: string; title: ReactNode; children: ReactNode }) {
  return (
    <section id={id} className="guide-section">
      <div className="eyebrow">{eyebrow}</div>
      <h2 className="guide-h2">{title}</h2>
      {children}
    </section>
  );
}

/* ------------------------------- Intro ------------------------------- */

function Intro() {
  const { setTab, setTourOpen } = useStore();
  const dex = useDex();
  return (
    <section id="inicio" className="guide-section">
      <div className="guide-hero">
        <div className="eyebrow">Guía interactiva</div>
        <h1 className="page-title" style={{ fontSize: 40 }}>
          Domina <span className="serif">Champions Lab</span> en 5 minutos
        </h1>
        <p className="page-sub" style={{ fontSize: 15.5 }}>
          Tres herramientas para preparar tus combates de la regulación {dex.data.meta.regulation}. Cada ejemplo de esta guía se puede abrir con un clic en la
          calculadora correspondiente, ya configurado, para que experimentes cambiando valores.
        </p>
        <div className="row wrap" style={{ gap: 10, marginTop: 18 }}>
          <button className="btn btn-primary btn-lg" onClick={() => setTourOpen(true)}>
            <IconCompass /> Iniciar tour guiado
          </button>
          <button className="btn btn-lg" onClick={() => document.getElementById('velocidad')?.scrollIntoView({ behavior: 'smooth' })}>
            <IconPlay /> Ver ejemplos
          </button>
        </div>
      </div>
      <div className="steps-grid">
        {[
          { icon: <IconBars />, t: 'Comparador', d: 'Filtra por tipo, ordena por cualquier stat y compara hasta 6 Pokémon con radar y valores reales a nivel 50.', tab: 'compare' as const },
          { icon: <IconBolt />, t: 'Speed Calculator', d: 'Orden de turno exacto con prioridad, Espacio Raro, Viento Afín, climas, campos, habilidades, objetos y etapas.', tab: 'speed' as const },
          { icon: <IconSword />, t: 'Damage Calculator', d: 'Rangos de daño, las 16 tiradas y probabilidad de OHKO/2HKO/3HKO, con ataques en área para dobles.', tab: 'damage' as const },
        ].map((s, i) => (
          <button key={s.t} className="step-card" onClick={() => setTab(s.tab)}>
            <div className="step-num mono">0{i + 1}</div>
            <div className="step-icon">{s.icon}</div>
            <div className="step-title">{s.t}</div>
            <div className="step-desc">{s.d}</div>
            <div className="step-go">Abrir →</div>
          </button>
        ))}
      </div>
      <div className="callout info" style={{ marginTop: 16 }}>
        <IconInfo />
        <span>
          Consejo: todo lo que configuras se guarda automáticamente en tu navegador. Los nombres de Pokémon, movimientos, objetos y habilidades aparecen en
          inglés (como en Showdown y en los equipos compartidos); los textos de la interfaz, en español.
        </span>
      </div>
    </section>
  );
}

/* ------------------------------- Stats ------------------------------- */

function StatsSection() {
  const [base, setBase] = useState(100);
  const [sp, setSp] = useState(32);
  const [nat, setNat] = useState<'plus' | 'neutral' | 'minus'>('plus');
  const [isHP, setIsHP] = useState(false);
  const natureName = nat === 'plus' ? 'Jolly' : nat === 'minus' ? 'Brave' : 'Serious';
  const value = isHP ? calcStat('hp', base, sp) : calcStat('spe', base, sp, natureName);
  const raw = base + 20 + sp;
  return (
    <Section id="stats" eyebrow="Fundamentos" title={<>Cómo se calculan los stats en <span className="serif">Champions</span></>}>
      <p className="guide-p">
        Pokémon Champions simplifica el entrenamiento: todos los Pokémon combaten a <b>nivel 50</b>, con <b>IV perfectos</b> (31) y los antiguos EV se sustituyen
        por <b>Stat Points (SP)</b>: hasta <b>32 por stat</b> y <b>66 en total</b>. Cada SP suma exactamente <b>+1</b> al stat final.
      </p>
      <div className="playground card">
        <div className="card-head">
          <h3 className="card-title"><IconSparkle /> Laboratorio de fórmula</h3>
          <Segmented size="sm" value={isHP ? 'hp' : 'other'} onChange={(v) => setIsHP(v === 'hp')} options={[{ value: 'other', label: 'Ataque, Defensa, Velocidad…' }, { value: 'hp', label: 'PS' }]} />
        </div>
        <div className="card-body playground-grid">
          <div className="col" style={{ gap: 16 }}>
            <div className="field">
              <label>Stat base <span className="mono">{base}</span></label>
              <RangeInput value={base} min={5} max={200} onChange={setBase} />
            </div>
            <div className="field">
              <label>Stat Points (SP) <span className="mono">{sp}</span></label>
              <RangeInput value={sp} max={32} onChange={setSp} />
            </div>
            {!isHP && (
              <div className="field">
                <label>Naturaleza</label>
                <Segmented block value={nat} onChange={setNat} options={[{ value: 'minus', label: 'Perjudica ×0,9' }, { value: 'neutral', label: 'Neutra' }, { value: 'plus', label: 'Favorece ×1,1', tone: 'accent' }]} />
              </div>
            )}
          </div>
          <div className="formula">
            <div className="formula-line mono">
              {isHP ? (
                <>
                  <span className="f-k">PS</span> = <span className="f-v">{base}</span> + 75 + <span className="f-v">{sp}</span>
                </>
              ) : (
                <>
                  <span className="f-k">Stat</span> = ⌊(<span className="f-v">{base}</span> + 20 + <span className="f-v">{sp}</span>) × {nat === 'plus' ? '1,1' : nat === 'minus' ? '0,9' : '1'}⌋
                  <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>= ⌊{raw} × {nat === 'plus' ? '1,1' : nat === 'minus' ? '0,9' : '1'}⌋</div>
                </>
              )}
            </div>
            <div className="formula-result">
              <span className="num">{value}</span>
            </div>
            <div className="muted" style={{ fontSize: 12 }}>
              Equivalente al juego principal: a nivel 50, 1 SP ≈ 8 EV (el primero 4).
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}

/* ------------------------------- Speed ------------------------------- */

const SPEED_TABLE: [string, string, string][] = [
  ['Etapas +1 … +6', '×1,5 · ×2 · ×2,5 · ×3 · ×3,5 · ×4', 'Danza Dragón, Nitrocarga, Impulso…'],
  ['Etapas −1 … −6', '×0,67 · ×0,5 · ×0,4 · ×0,33 · ×0,29 · ×0,25', 'Viento Hielo, Electrotela, Red Viscosa'],
  ['Viento Afín', '×2 (4 turnos)', 'Solo al equipo que lo usa'],
  ['Pañuelo Elección', '×1,5', 'Bloquea en un movimiento'],
  ['Nado Rápido / Clorofila / Ímpetu Arena / Quitanieves', '×2', 'Con lluvia / sol / arena / nieve'],
  ['Cola Surf', '×2', 'Con Campo Eléctrico'],
  ['Liviano', '×2', 'Al consumir o perder el objeto'],
  ['Pies Rápidos', '×1,5', 'Con problema de estado; ignora la parálisis'],
  ['Protosíntesis / Carga Cuark', '×1,5', 'Si la Velocidad es su stat más alto'],
  ['Parálisis', '×0,5', 'En Champions, 12,5% de quedarse sin moverse'],
  ['Bola Férrea', '×0,5', ''],
  ['Pantano (Voto Planta + Agua)', '×0,25', ''],
  ['Espacio Raro', 'Invierte el orden', 'Dentro de la misma prioridad; sin desbordamiento'],
];

function SpeedSection() {
  return (
    <Section id="velocidad" eyebrow="Herramienta 2" title={<>Speed Calculator: <span className="serif">paso a paso</span></>}>
      <ol className="guide-steps">
        <li><b>Condiciones del combate</b> (arriba): activa Espacio Raro, elige clima y campo, y marca Viento Afín o Pantano para cada equipo.</li>
        <li><b>Tarjetas de Pokémon</b>: elige especie, equipo (aliado/rival), naturaleza (+Vel / neutra / −Vel), SP en Velocidad, etapas, objeto, habilidad y estado.</li>
        <li><b>Movimiento (opcional)</b>: define la prioridad. Bromista, Alas Vendaval, Primer Auxilio o Fitoimpulso se aplican solos.</li>
        <li><b>Orden de actuación</b>: ranking en tiempo real, agrupado por prioridad, con empates señalados.</li>
        <li><b>Duelo directo</b>: quién gana entre dos Pokémon, cuántos SP necesitas para superarle y una <b>matriz de escenarios</b> (+1, Viento Afín, Pañuelo, parálisis…).</li>
        <li><b>Speed tiers</b>: la tabla de toda la regulación con tus Pokémon insertados en su posición.</li>
      </ol>
      <ExampleGrid kind="speed" />
      <div className="card" style={{ marginTop: 18 }}>
        <div className="card-head"><h3 className="card-title"><IconLayers /> Modificadores de velocidad</h3></div>
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>Efecto</th><th>Multiplicador</th><th>Notas</th></tr></thead>
            <tbody>
              {SPEED_TABLE.map(([a, b, c]) => (
                <tr key={a}><td style={{ fontWeight: 560 }}>{a}</td><td className="mono accent-text">{b}</td><td className="muted" style={{ whiteSpace: 'normal' }}>{c}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="callout" style={{ marginTop: 14 }}>
        <IconInfo />
        <span>
          Orden de cálculo: stat → etapas → modificadores encadenados (habilidad, objeto, Viento Afín) → parálisis. Después se compara la <b>prioridad</b>, luego
          efectos de «primero/último» (Garra Rápida, Rezagado) y por último la Velocidad.
        </span>
      </div>
    </Section>
  );
}

function ExampleGrid({ kind }: { kind: 'speed' | 'damage' }) {
  const dex = useDex();
  const { setSpeed, setDamage, setTab } = useStore();
  const toast = useToast();
  const list = kind === 'speed' ? SPEED_EXAMPLES : DAMAGE_EXAMPLES;
  return (
    <div className="example-grid">
      {list.map((ex) => {
        const run = () => {
          if (kind === 'speed') {
            const st = (ex as (typeof SPEED_EXAMPLES)[number]).build(dex.get);
            if (!st) return toast('Este ejemplo usa Pokémon que no están en la regulación actual');
            setSpeed(() => st);
            setTab('speed');
          } else {
            const st = (ex as (typeof DAMAGE_EXAMPLES)[number]).build(dex.get, dex.data);
            if (!st) return toast('Este ejemplo usa Pokémon que no están en la regulación actual');
            setDamage(() => st);
            setTab('damage');
          }
          toast(`Ejemplo cargado: ${ex.title}`);
        };
        return (
          <div key={ex.id} className="example-card">
            <div className="row wrap" style={{ gap: 6 }}>
              {ex.tags.map((t) => <span key={t} className="badge">{t}</span>)}
            </div>
            <div className="example-title">{ex.title}</div>
            <p className="example-lesson">{ex.lesson}</p>
            <button className="btn btn-primary btn-sm" onClick={run}>
              <IconPlay /> Probar en la calculadora
            </button>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------- Damage ------------------------------ */

function DamageSection() {
  return (
    <Section id="dano" eyebrow="Herramienta 3" title={<>Damage Calculator: <span className="serif">cada detalle cuenta</span></>}>
      <ol className="guide-steps">
        <li><b>Formato</b>: Dobles (VGC) aplica ×0,75 a los ataques que golpean a varios objetivos (Terremoto, Onda Ígnea, Avalancha…). Individual no.</li>
        <li><b>Pokémon 1 y 2</b>: especie, PS actuales, habilidad, objeto, naturaleza, estado, SP (con contador 66 máx.) y etapas por stat. Los botones de reparto rellenan SP típicos.</li>
        <li><b>Movimientos</b>: hasta 4 por lado. Marca «Crítico», elige nº de golpes o «Un solo objetivo» si en el campo solo queda un rival.</li>
        <li><b>Efectos de campo</b>: clima, campo, Gravedad, Zonas, Auras y habilidades Debacle. En cada panel, «Efectos en su lado»: pantallas, Refuerzo, Compiescolta, Batería, trampas…</li>
        <li><b>Resultados</b>: alterna entre «Tus ataques» y «Ataques rivales». El mejor ataque se resalta en dorado.</li>
      </ol>
      <ExampleGrid kind="damage" />
    </Section>
  );
}

/* ------------------------------ Anatomy ------------------------------ */

function AnatomySection() {
  const [hl, setHl] = useState<number | null>(null);
  const notes = [
    'Nombre, categoría (FÍS/ESP), tipo y potencia del movimiento. Etiquetas: mejor ataque, crítico, ataque en área, eficacia.',
    'Rango de daño en porcentaje de los PS máximos del objetivo (tirada mínima – máxima).',
    'El mismo rango en PS absolutos sobre los PS actuales del objetivo.',
    'Barra de vida tras el golpe: verde = lo que queda en el peor caso; franja = lo que depende de la tirada; línea = PS actuales.',
    'Probabilidades exactas de derrotar en 1, 2 o 3 golpes combinando las 16 tiradas, y el veredicto del motor de Showdown (incluye bayas, Restos, trampas…).',
  ];
  return (
    <Section id="resultados" eyebrow="Interpretación" title={<>Anatomía de un <span className="serif">resultado</span></>}>
      <p className="guide-p">Pasa el ratón (o toca) cada número para ver qué significa.</p>
      <div className="anatomy">
        <div className="result mock">
          <div className={cx('result-head', 'anat', hl === 0 && 'on')} onMouseEnter={() => setHl(0)} onClick={() => setHl(0)}>
            <div className="row" style={{ gap: 8 }}>
              <span className="anat-n">1</span>
              <span className="cat-icon cat-Physical">FÍS</span>
              <span className="result-move">Earthquake</span>
              <span className="type-badge sm" style={{ ['--type-color' as any]: '#c79a4e' }}>Tierra</span>
              <span className="mono muted" style={{ fontSize: 11.5 }}>100 BP</span>
            </div>
            <div className="row" style={{ gap: 6 }}>
              <span className="badge">Área ×0,75</span>
              <span className="badge good">Súper eficaz ×2</span>
            </div>
          </div>
          <div className="result-main">
            <div className={cx('result-pct anat', hl === 1 && 'on')} onMouseEnter={() => setHl(1)} onClick={() => setHl(1)}>
              <span className="anat-n">2</span>
              <span className="num">45.5</span><span className="sep">–</span><span className="num">54.4</span><span className="unit">%</span>
            </div>
            <div className={cx('result-abs mono muted anat', hl === 2 && 'on')} onMouseEnter={() => setHl(2)} onClick={() => setHl(2)}>
              <span className="anat-n">3</span> 92–110 / 202 PS
            </div>
          </div>
          <div className={cx('anat', hl === 3 && 'on')} onMouseEnter={() => setHl(3)} onClick={() => setHl(3)} style={{ position: 'relative' }}>
            <span className="anat-n" style={{ position: 'absolute', left: -28, top: -4 }}>4</span>
            <div className="hpbar">
              <div className="hp-range" style={{ left: '45.6%', width: '9%' }} />
              <div className="hp-fill green" style={{ width: '45.6%' }} />
              <div className="hp-cur" style={{ left: '100%' }} />
              <div className="hp-mark" style={{ left: '50%' }} />
            </div>
          </div>
          <div className={cx('ko-row anat', hl === 4 && 'on')} onMouseEnter={() => setHl(4)} onClick={() => setHl(4)}>
            <span className="anat-n">5</span>
            <span className="ko-pill none"><span className="k">OHKO</span><span className="v mono">0%</span></span>
            <span className="ko-pill maybe"><span className="k">2HKO</span><span className="v mono">52.3%</span></span>
            <span className="ko-pill sure"><span className="k">3HKO</span><span className="v mono">100%</span></span>
            <span className="ko-text">52.3% de probabilidad de 2HKO</span>
          </div>
        </div>
        <div className="anatomy-note">
          {hl === null ? (
            <span className="muted">Selecciona una zona del resultado…</span>
          ) : (
            <>
              <span className="anat-n big">{hl + 1}</span>
              <span>{notes[hl]}</span>
            </>
          )}
        </div>
      </div>
    </Section>
  );
}

/* -------------------------------- Quiz ------------------------------- */

interface QuizQ {
  a: string;
  b: string;
  natA: string;
  natB: string;
  spA: number;
  spB: number;
  field: SpeedField;
  label: string;
  stageA: number;
  itemB: string;
}

function randomQuiz(ids: string[]): QuizQ {
  const pick = () => ids[Math.floor(Math.random() * ids.length)];
  const a = pick();
  let b = pick();
  while (b === a) b = pick();
  const variants: { label: string; field: Partial<SpeedField>; stageA?: number; itemB?: string }[] = [
    { label: 'Sin condiciones especiales', field: {} },
    { label: 'Espacio Raro activo', field: { trickRoom: true } },
    { label: 'Viento Afín en el equipo de A', field: { tailwind: { ally: true, foe: false } } },
    { label: 'A tiene +1 de Velocidad', field: {}, stageA: 1 },
    { label: 'B lleva Pañuelo Elección', field: {}, itemB: 'Choice Scarf' },
  ];
  const v = variants[Math.floor(Math.random() * variants.length)];
  const nats = ['Jolly', 'Timid', 'Adamant', 'Modest', 'Brave', 'Quiet'];
  return {
    a, b,
    natA: nats[Math.floor(Math.random() * nats.length)],
    natB: nats[Math.floor(Math.random() * nats.length)],
    spA: Math.random() < 0.5 ? 32 : 0,
    spB: Math.random() < 0.5 ? 32 : 0,
    field: { ...DEFAULT_FIELD, ...v.field, tailwind: { ...DEFAULT_FIELD.tailwind, ...(v.field.tailwind ?? {}) } },
    label: v.label,
    stageA: v.stageA ?? 0,
    itemB: v.itemB ?? '',
  };
}

function QuizSection() {
  const dex = useDex();
  const ids = useMemo(() => dex.species.filter((s) => !s.battleOnly).map((s) => s.id), [dex.species]);
  const [q, setQ] = useState<QuizQ>(() => randomQuiz(ids));
  const [answer, setAnswer] = useState<'a' | 'b' | 'tie' | null>(null);
  const [score, setScore] = useState({ ok: 0, total: 0 });
  const A = dex.get(q.a)!;
  const B = dex.get(q.b)!;
  const nat = (n: string) => NATURES.find((x) => x.name === n)!;
  const rA = computeSpeed({ key: 'a', name: A.name, baseSpe: A.baseStats.spe, side: 'ally', nature: q.natA, sp: q.spA, stage: q.stageA, item: '', ability: '', paralyzed: false }, q.field);
  const rB = computeSpeed({ key: 'b', name: B.name, baseSpe: B.baseStats.spe, side: 'foe', nature: q.natB, sp: q.spB, stage: 0, item: q.itemB, ability: '', paralyzed: false }, q.field);
  const c = compareSpeed(rA, rB, q.field.trickRoom);
  const correct = c > 0 ? 'a' : c < 0 ? 'b' : 'tie';

  const choose = (x: 'a' | 'b' | 'tie') => {
    if (answer) return;
    setAnswer(x);
    setScore((s) => ({ ok: s.ok + (x === correct ? 1 : 0), total: s.total + 1 }));
  };
  const next = () => {
    setQ(randomQuiz(ids));
    setAnswer(null);
  };
  const desc = (n: string, sp: number) => `${n} (${nat(n).es}${nat(n).plus === 'spe' ? ', +Vel' : nat(n).minus === 'spe' ? ', −Vel' : ''}) · ${sp} SP`;

  return (
    <Section id="quiz" eyebrow="Practica" title={<>¿Quién se mueve <span className="serif">primero</span>?</>}>
      <p className="guide-p">Un mini-juego para entrenar tu intuición de speed tiers. Las respuestas se calculan con el mismo motor que el Speed Calculator.</p>
      <div className="card quiz">
        <div className="card-head">
          <span className="badge accent"><IconDice /> {q.label}</span>
          <span className="mono muted">Aciertos {score.ok}/{score.total}</span>
        </div>
        <div className="card-body">
          <div className="quiz-grid">
            {[{ k: 'a' as const, s: A, d: desc(q.natA, q.spA), r: rA, extra: q.stageA ? '+1 Vel' : q.field.tailwind.ally ? 'Viento Afín' : '' }, { k: 'b' as const, s: B, d: desc(q.natB, q.spB), r: rB, extra: q.itemB ? 'Pañuelo Elección' : '' }].map((x) => (
              <button key={x.k} className={cx('quiz-opt', answer && correct === x.k && 'right', answer === x.k && correct !== x.k && 'wrong')} onClick={() => choose(x.k)}>
                <span className="quiz-letter">{x.k.toUpperCase()}</span>
                <Sprite species={x.s} size={72} />
                <b>{x.s.name}</b>
                <Types types={x.s.types} size="sm" />
                <span className="muted" style={{ fontSize: 12 }}>Base {x.s.baseStats.spe} · {x.d}</span>
                {x.extra && <span className="badge accent">{x.extra}</span>}
                {answer && <span className="mono quiz-speed">{x.r.final}</span>}
              </button>
            ))}
          </div>
          <div className="row" style={{ justifyContent: 'center', gap: 10, marginTop: 14 }}>
            <button className={cx('btn', answer && correct === 'tie' && 'btn-primary')} onClick={() => choose('tie')} disabled={!!answer}>Empate</button>
            <button className="btn btn-ghost" onClick={next}><IconRefresh /> {answer ? 'Siguiente' : 'Saltar'}</button>
          </div>
          {answer && (
            <div className={cx('callout', answer === correct ? '' : 'warn')} style={{ marginTop: 14 }}>
              {answer === correct ? <IconCheck /> : <IconX />}
              <span>
                {answer === correct ? '¡Correcto! ' : 'Casi. '}
                {A.name}: <b className="mono">{rA.final}</b> · {B.name}: <b className="mono">{rB.final}</b>.{' '}
                {q.field.trickRoom ? 'Con Espacio Raro actúa primero el más lento.' : 'Actúa primero el más rápido.'}{' '}
                {correct === 'tie' ? 'Empate: 50% cada uno.' : `Primero: ${correct === 'a' ? A.name : B.name}.`}
              </span>
            </div>
          )}
        </div>
      </div>
    </Section>
  );
}

/* ----------------------------- Regulación ---------------------------- */

function RegulationSection() {
  const { setRegOpen } = useStore();
  const dex = useDex();
  return (
    <Section id="regulacion" eyebrow="Siempre al día" title={<>Cuando cambia la <span className="serif">regulación</span></>}>
      <p className="guide-p">
        Las regulaciones de Champions cambian cada pocos meses (M-A → M-B → M-C…). La web mantiene la lista de Pokémon legales y sus stats sincronizada de tres formas:
      </p>
      <div className="steps-grid">
        <div className="step-card static">
          <div className="step-num mono">A</div>
          <div className="step-title">Trigger automático</div>
          <div className="step-desc">Un workflow de GitHub Actions revisa cada día Pokémon Showdown. Si la regulación cambia, regenera los datos, hace commit y redespliega la web.</div>
        </div>
        <div className="step-card static">
          <div className="step-num mono">B</div>
          <div className="step-title">Aviso en la web</div>
          <div className="step-desc">Al abrir la web se comprueba (como mucho cada 6 h) si hay una regulación nueva. Si la hay, el indicador de la cabecera se ilumina.</div>
        </div>
        <div className="step-card static">
          <div className="step-num mono">C</div>
          <div className="step-title">Actualizar desde el navegador</div>
          <div className="step-desc">En el panel de regulación puedes descargar y aplicar la nueva lista al momento, sin esperar al redespliegue.</div>
        </div>
      </div>
      <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setRegOpen(true)}>
        Abrir panel de regulación ({dex.data.meta.regulation})
      </button>
    </Section>
  );
}

/* ------------------------------ Glosario ----------------------------- */

const GLOSSARY: [string, string][] = [
  ['SP (Stat Points)', 'Puntos de entrenamiento de Champions: 0-32 por stat y 66 en total. Cada SP suma +1 al stat.'],
  ['Base stats / BST', 'Estadísticas base de la especie y su suma total.'],
  ['Naturaleza', 'Sube un stat ×1,1 y baja otro ×0,9 (o ninguno si es neutra).'],
  ['Etapas (boosts)', 'Modificadores temporales de −6 a +6 (Danza Dragón, Intimidación…).'],
  ['Prioridad', 'Nivel del movimiento (+4 Protección, +3 Sorpresa, +1 Bromista, −7 Espacio Raro). Se compara antes que la Velocidad.'],
  ['Espacio Raro (Trick Room)', 'Durante 5 turnos, dentro de cada prioridad actúa primero el más lento.'],
  ['Viento Afín (Tailwind)', 'Duplica la Velocidad del equipo durante 4 turnos.'],
  ['Speed tier', 'Valor de Velocidad de referencia de un Pokémon con una inversión concreta (p. ej. «max speed»).'],
  ['Speed tie', 'Empate de Velocidad: se decide al azar (50%).'],
  ['STAB', 'Bonificación ×1,5 al usar un movimiento de tu mismo tipo.'],
  ['Ataque en área (spread)', 'Movimiento que golpea a varios objetivos: en dobles hace ×0,75.'],
  ['Tirada (roll)', 'El daño varía aleatoriamente entre el 85% y el 100%: 16 valores posibles.'],
  ['OHKO / 2HKO / 3HKO', 'Derrotar al rival en 1, 2 o 3 golpes.'],
  ['Crítico', 'Golpe ×1,5 que ignora las mejoras defensivas del rival y tus bajadas de ataque.'],
  ['Refuerzo (Helping Hand)', 'Aumenta ×1,5 el siguiente ataque del aliado.'],
  ['Pantallas', 'Reflejo (físico), Pantalla Luz (especial) y Velo Aurora (ambos): reducen el daño recibido.'],
  ['Megaevolución', 'Una por combate. Cambia stats, tipo y habilidad; el Pokémon usa su Velocidad de Mega desde el turno en que evoluciona.'],
  ['Regulación', 'Reglamento que fija qué Pokémon y Megas son legales en el ranked durante un periodo.'],
];

function Glossary() {
  const [q, setQ] = useState('');
  const list = GLOSSARY.filter(([t, d]) => !q || toID(t + d).includes(toID(q)));
  return (
    <Section id="glosario" eyebrow="Referencia" title="Glosario">
      <div className="search-box" style={{ maxWidth: 360, marginBottom: 14 }}>
        <IconSearch />
        <input className="input" placeholder="Buscar término…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="glossary">
        {list.map(([t, d]) => (
          <div key={t} className="gloss-item">
            <div className="gloss-term">{t}</div>
            <div className="gloss-def">{d}</div>
          </div>
        ))}
        {!list.length && <div className="muted">Sin resultados.</div>}
      </div>
    </Section>
  );
}

/* -------------------------------- FAQ -------------------------------- */

const FAQS: [string, ReactNode][] = [
  ['¿De dónde salen los datos?', 'La lista de Pokémon legales y sus stats se genera desde el código abierto de Pokémon Showdown (mod «champions»). Las fórmulas de daño usan @smogon/calc, el mismo motor que la calculadora de Showdown, con las mecánicas de Champions.'],
  ['¿Por qué el daño sale en rangos?', 'Cada ataque aplica un factor aleatorio entre 0,85 y 1,00 (16 valores). Por eso mostramos el mínimo, el máximo y la probabilidad real de KO.'],
  ['¿Qué diferencia hay entre mis % de 2HKO y el texto del motor?', 'Nuestras cifras combinan las tiradas de dos golpes idénticos sin recuperación. El texto del motor además tiene en cuenta Baya Zidra, Restos, trampas, clima o veneno.'],
  ['¿Se aplica la reducción de área si solo queda un rival?', 'No. Si un ataque en área solo impacta a un objetivo, no hay reducción. Usa el botón «Un solo objetivo» en ese movimiento.'],
  ['¿Cómo simulo Intimidación?', 'Pon −1 en el Ataque del atacante (paso de etapas en su panel).'],
  ['¿Por qué no hay Teracristalización ni Cinta Elegida?', 'Pokémon Champions no incluye Teracristalización y solo permite los objetos disponibles en el juego; la lista de objetos se ajusta automáticamente.'],
  ['¿Mis configuraciones se guardan?', 'Sí, en el almacenamiento local de tu navegador. Si borras los datos del sitio, se restauran los valores por defecto.'],
];

function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <Section id="faq" eyebrow="Dudas" title="Preguntas frecuentes">
      <div className="faq">
        {FAQS.map(([q, a], i) => (
          <div key={q} className={cx('faq-item', open === i && 'open')}>
            <button className="faq-q" onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i}>
              {q}
              <IconChevronDown width={16} height={16} />
            </button>
            {open === i && <div className="faq-a fade-in">{a}</div>}
          </div>
        ))}
      </div>
      <FooterNote />
    </Section>
  );
}

function FooterNote() {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div ref={ref} className="muted" style={{ fontSize: 12, marginTop: 30 }}>
      Pokémon y todos los nombres relacionados son marcas de Nintendo, Creatures Inc. y GAME FREAK inc. Champions Lab es una herramienta de fans sin afiliación oficial.
    </div>
  );
}
