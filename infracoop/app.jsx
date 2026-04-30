/* Infra.Coop · Motor de Brechas — prototipo funcional
   Single-file React app rendered into #root. */

const { useState, useMemo, useEffect, useRef } = React;

/* ---------- DATA (mock embebido, pero coherente con DS/NM reales) ---------- */

const DATASETS = [
  { id:"DS-002", name:"SESNSP · Feminicidio", country:"MEX", year:2024, quality:"Parcial",
    agendas:["Género","Datos"], source:"Secretariado Ejecutivo SNSP",
    s1:0.9, s2:1.0, s3:0.30, s4:1.0, format:"CSV", desagreg:"Estatal · Mensual",
    note:"Cobertura nacional con desagregación estatal. Falta municipalización." },
  { id:"DS-027", name:"ENVIGMU 2019", country:"ECU", year:2019, quality:"Parcial",
    agendas:["Género","Datos"], source:"INEC Ecuador",
    s1:1.0, s2:0.5, s3:1.0, s4:1.0, format:"CSV+microdato", desagreg:"Provincia · Cantón",
    note:"Microdatos completos pero la encuesta tiene >2 años: requiere actualización." },
  { id:"DS-029", name:"Informes femicidio Ecuador", country:"ECU", year:2025, quality:"Parcial",
    agendas:["Género","Datos"], source:"Fiscalía General del Estado",
    s1:0.7, s2:1.0, s3:0.30, s4:0.25, format:"PDF", desagreg:"Provincial",
    note:"Publicación reciente pero formato PDF: no es procesable sin scraping." },
  { id:"DS-038", name:"RNFJA · Registro Nacional de Femicidios", country:"ARG", year:2024, quality:"Parcial",
    agendas:["Género","Datos"], source:"Corte Suprema · Oficina de la Mujer",
    s1:1.0, s2:1.0, s3:0.30, s4:1.0, format:"CSV", desagreg:"Provincial · Anual",
    note:"Datos judiciales sólidos, pero sin municipalización ni cruces con tipo penal." },
  { id:"DS-003", name:"CEPALSTAT · Igualdad de Género", country:"REG", year:2024, quality:"Completa",
    agendas:["Género","Datos","Tecnológica"], source:"CEPAL",
    s1:1.0, s2:1.0, s3:0.30, s4:1.0, format:"API", desagreg:"País",
    note:"Indicadores armonizados regionales. Comparabilidad alta, granularidad país." },
];

const NORMATIVAS = [
  { id:"NM-002", name:"Convención de Belém do Pará", body:"OEA", scope:"ALyC",
    obligation:"Producir datos sobre violencia contra las mujeres con desagregación geográfica y por tipo." },
  { id:"NM-016", name:"LGAMVLV · México", body:"Congreso de la Unión", scope:"MEX",
    obligation:"Levantar estadísticas anuales sobre todas las modalidades de violencia y publicar resultados." },
  { id:"NM-020", name:"LOIPEVM · Ecuador", body:"Asamblea Nacional", scope:"ECU",
    obligation:"Mantener un Registro Único de Violencia con tipos, victimarios y rutas de atención." },
];

/* Pre-canned answers — fixed scores, no Math.random */
const QUERIES = [
  {
    id:"q-femi-mun-ec",
    match:["feminicid","municipi","ecuador","desagreg"],
    text:"¿Existen datos de feminicidio desagregados por municipio en Ecuador?",
    score: 78,                         // Crítica
    breakdown:{ "Género":72, "Datos":85, "Tecnológica":40 },
    similarity: 0.42,                  // 1 - sim = 0.58
    coverage:  0.75,                   // cobertura normativa alta (existe norma, falta dato granular)
    datasets:["DS-027","DS-029","DS-003"],
    norms:["NM-002","NM-020"],
    diagnosis:"La normativa exige Registro Único con desagregación geográfica, pero los datasets disponibles llegan a nivel provincial — no cantonal ni municipal. Brecha crítica de granularidad.",
    countries:["ECU"]
  },
  {
    id:"q-femi-mx",
    match:["feminicid","mexico","mensual","municip"],
    text:"¿Hay datos de feminicidio mensual a nivel municipal en México?",
    score: 58,                         // Parcial
    breakdown:{ "Género":62, "Datos":55, "Tecnológica":45 },
    similarity: 0.55,
    coverage:  0.62,
    datasets:["DS-002","DS-003"],
    norms:["NM-016","NM-002"],
    diagnosis:"SESNSP publica feminicidios mensuales con desagregación estatal y CSV abierto. Falta capa municipal sistemática y reconciliación con registros del poder judicial.",
    countries:["MEX"]
  },
  {
    id:"q-violencia-digital",
    match:["digital","tecnolog","violencia","ciberacoso"],
    text:"¿Qué datos hay sobre violencia digital contra mujeres en la región?",
    score: 84,                         // Crítica
    breakdown:{ "Género":58, "Datos":70, "Tecnológica":92 },
    similarity: 0.22,
    coverage:  0.55,
    datasets:["DS-003"],
    norms:["NM-002"],
    diagnosis:"La agenda tecnológica es la más desatendida: ningún dataset nacional registra violencia digital de forma sistemática. CEPALSTAT incluye indicadores agregados regionales pero sin granularidad.",
    countries:["REG"]
  },
  {
    id:"q-femi-ar",
    match:["argentina","femicid","provincia","registro"],
    text:"¿Cómo está la cobertura del registro de femicidios en Argentina?",
    score: 46,                         // Parcial
    breakdown:{ "Género":50, "Datos":42, "Tecnológica":48 },
    similarity: 0.62,
    coverage:  0.70,
    datasets:["DS-038","DS-003"],
    norms:["NM-002"],
    diagnosis:"El RNFJA cubre desde 2014 con metodología documentada y CSV. Cobertura provincial sólida; persiste brecha en cruces con tipo penal y municipalización.",
    countries:["ARG"]
  },
];

const DEFAULT_QUERY = QUERIES[0];

/* Aggregate / collective monitor */
const AGENDA_AGG = [
  { key:"Género",      score:71, n:18, color:"#6C3FA0", trend:+3 },
  { key:"Datos",       score:64, n:12, color:"#2E5AAC", trend:-2 },
  { key:"Tecnológica", score:82, n:7,  color:"#1F7A7A", trend:+8 },
];

const WEEKLY = [
  // last 10 weeks of question volume (real-feeling, not random)
  { w:"S-10", n:14 }, { w:"S-9",  n:18 }, { w:"S-8",  n:11 },
  { w:"S-7",  n:23 }, { w:"S-6",  n:27 }, { w:"S-5",  n:22 },
  { w:"S-4",  n:31 }, { w:"S-3",  n:38 }, { w:"S-2",  n:34 }, { w:"S-1", n:42 },
];

const COUNTRY_DIST = [
  { c:"MEX", n:18, label:"México" },
  { c:"ECU", n:8,  label:"Ecuador" },
  { c:"ARG", n:8,  label:"Argentina" },
  { c:"REG", n:4,  label:"Regional ALyC" },
  { c:"COL", n:1,  label:"Colombia" },
  { c:"CHL", n:1,  label:"Chile" },
  { c:"BRA", n:0,  label:"Brasil" },
  { c:"PER", n:0,  label:"Perú" },
  { c:"BOL", n:0,  label:"Bolivia" },
];

const FRAMES = [
  { code:"OGP",   name:"Open Government Partnership", coverage:62, k:"datos abiertos · accountability" },
  { code:"DDHH",  name:"Sistema Interamericano DDHH", coverage:74, k:"Belém do Pará · CEDAW" },
  { code:"DIG",   name:"Agenda Digital Regional",     coverage:38, k:"eLAC · brecha digital" },
  { code:"COOP",  name:"Marco Cooperativo de Datos",  coverage:55, k:"gobernanza colectiva" },
];

const TOP_QUESTIONS = [
  { q:"¿Hay datos de feminicidio desagregados por municipio?", n:42, status:"Crítica" },
  { q:"¿Existen registros de violencia digital contra mujeres?", n:31, status:"Crítica" },
  { q:"¿Qué cobertura tiene la salud reproductiva por edad?", n:24, status:"Parcial" },
  { q:"¿Cuántas mujeres en STEM hay por país y nivel?", n:19, status:"Parcial" },
  { q:"¿Hay registro de transfeminicidios?", n:17, status:"Crítica" },
  { q:"¿Existen datos de brecha digital con perspectiva de género?", n:14, status:"Parcial" },
];

const MISSING = [
  { topic:"Transfeminicidios", agenda:"Género",      countries:"todos", note:"Ningún dataset registra de forma desagregada." },
  { topic:"Violencia digital con tipología", agenda:"Tecnológica", countries:"REG", note:"Solo indicadores agregados en CEPALSTAT." },
  { topic:"Feminicidio · municipio", agenda:"Datos", countries:"ECU · MEX", note:"Granularidad detenida en provincia/estado." },
  { topic:"Mujeres en STEM por nivel educativo", agenda:"Tecnológica", countries:"todos", note:"Datos agregados, sin trayectoria." },
  { topic:"Acceso a aborto seguro · municipal", agenda:"Género", countries:"ARG · MEX", note:"Brecha jurídica/dato." },
  { topic:"Brecha salarial con cuidados no remunerados", agenda:"Datos", countries:"REG", note:"Encuestas de uso del tiempo discontinuas." },
];

/* ---------- helpers ---------- */
const scoreColor = (s) => s >= 70 ? "#C2185B" : s >= 40 ? "#C77B0E" : "#3F7A4E";
const scoreLabel = (s) => s >= 70 ? "Crítica" : s >= 40 ? "Parcial" : "Cubierta";
const agendaColor = (a) => ({"Género":"#6C3FA0","Datos":"#2E5AAC","Tecnológica":"#1F7A7A"})[a] || "#1A0A2E";
const qualityDot = (q) => ({"Completa":"#3F7A4E","Parcial":"#C77B0E","Nula":"#C2185B"})[q] || "#9472BC";

function classNames(...x){ return x.filter(Boolean).join(" "); }

function findQuery(text, filters){
  const t = (text || "").toLowerCase();
  let best = null, bestHits = 0;
  for (const q of QUERIES){
    const hits = q.match.reduce((acc,k)=> acc + (t.includes(k) ? 1 : 0), 0);
    if (hits > bestHits){ bestHits = hits; best = q; }
  }
  if (!best) best = DEFAULT_QUERY;
  // soft-apply country filter
  if (filters.country !== "todos" && best.countries && !best.countries.includes(filters.country)) {
    // adjust score upward (more critical) — feels reactive
    return { ...best, score: Math.min(95, best.score + 9), _filtered:true };
  }
  return best;
}

/* ---------- shared atoms ---------- */

const AgendaBadge = ({ a }) => (
  <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium"
        style={{ background: agendaColor(a)+"14", color: agendaColor(a), border:"1px solid "+agendaColor(a)+"33" }}>
    <span className="w-1.5 h-1.5 rounded-full" style={{ background: agendaColor(a) }} />
    Ag. {a}
  </span>
);

const Pill = ({ active, onClick, children, mono=false }) => (
  <button onClick={onClick}
    className={classNames(
      "px-3 py-1.5 rounded-full border text-sm transition-colors",
      mono && "font-mono text-[12px] tracking-tight",
      active ? "bg-ink text-paper border-ink" : "bg-white text-ink border-line hover:border-plum2"
    )}>
    {children}
  </button>
);

const Card = ({ children, className="" }) => (
  <div className={classNames("bg-white border border-line rounded-2xl", className)}>{children}</div>
);

const SectionLabel = ({ children, n }) => (
  <div className="flex items-baseline gap-3 mb-4">
    <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-plum">{children}</span>
    <span className="h-px flex-1 bg-line" />
    {n != null && <span className="font-mono text-[11px] text-ink/50">{String(n).padStart(2,"0")}</span>}
  </div>
);

/* ---------- top chrome ---------- */

const NAV = [
  { id:"monitor",   label:"Monitor de Brechas",  num:"01" },
  { id:"colectivo", label:"Monitor Colectivo",   num:"02" },
  { id:"queremos",  label:"¿Qué datos queremos?", num:"03" },
  { id:"about",     label:"¿Qué es Infra.Coop?", num:"04" },
];

function Header({ tab, setTab }){
  return (
    <header className="border-b border-line bg-paper/95 backdrop-blur sticky top-0 z-20" style={{ backgroundColor: "rgba(250,247,242,0.96)" }}>
      <div className="max-w-[860px] mx-auto px-6 pt-5 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo />
            <div className="leading-tight">
              <div className="font-serif text-[18px]">Infra<span className="text-plum">.</span>Coop</div>
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink/55">Motor de brechas · v0.4</div>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2 font-mono text-[11px] text-ink/55">
            <span className="w-1.5 h-1.5 rounded-full bg-moss" />
            42 datasets · 35 normativas · ALyC
          </div>
        </div>
        <nav className="mt-4 -mx-1 flex gap-1 overflow-x-auto nopills" data-screen-label="nav">
          {NAV.map(n => (
            <button key={n.id} onClick={()=>setTab(n.id)}
              className={classNames(
                "px-3 py-2 rounded-full text-sm whitespace-nowrap flex items-center gap-2 border transition-colors",
                tab===n.id
                  ? "bg-plum text-white border-plum"
                  : "bg-white text-ink border-line hover:border-plum2"
              )}>
              <span className={classNames("font-mono text-[10px]", tab===n.id ? "text-white/70" : "text-ink/45")}>{n.num}</span>
              {n.label}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}

function Logo(){
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" aria-hidden="true">
      <rect x="0.5" y="0.5" width="35" height="35" rx="9" fill="#F5F0FF" stroke="#6C3FA0" strokeOpacity=".35"/>
      {/* gap symbol: two vertical bars with a wedge cut out */}
      <rect x="9"  y="9"  width="5" height="18" fill="#6C3FA0"/>
      <rect x="22" y="9"  width="5" height="18" fill="#1A0A2E"/>
      <path d="M14 18 L22 12 L22 24 Z" fill="#FAF7F2" stroke="#6C3FA0" strokeWidth="1"/>
    </svg>
  );
}

/* ---------- score arc (custom, not a circle progress slop) ---------- */

function ScoreArc({ value, size=156 }){
  const r = (size-18)/2;
  const cx = size/2, cy = size/2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value)) / 100;
  // 3/4 arc style: start at 135°, end at 45° (270° sweep)
  const sweep = 0.78; // fraction of full circle
  const dash = c * sweep;
  const offset = dash * (1 - pct);
  const color = scoreColor(value);
  const rotation = -90 - (sweep*360)/2;
  return (
    <div className="relative" style={{ width:size, height:size }}>
      <svg width={size} height={size} style={{ transform:`rotate(${rotation}deg)` }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#E6DEF1" strokeWidth="8"
                strokeDasharray={`${dash} ${c}`} strokeLinecap="round" />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="8"
                strokeDasharray={`${dash} ${c}`} strokeDashoffset={offset}
                strokeLinecap="round"
                style={{ "--start": dash, "--end": offset, transition:"stroke-dashoffset .9s cubic-bezier(.2,.7,.2,1)" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="font-serif num text-[44px] leading-none" style={{ color }}>{value}</div>
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] mt-1.5" style={{ color }}>{scoreLabel(value)}</div>
        <div className="font-mono text-[10px] text-ink/45 mt-1">/ 100</div>
      </div>
    </div>
  );
}

/* ============================================================
   01 · MONITOR DE BRECHAS
   ============================================================ */

const COUNTRIES = [
  { id:"todos", label:"todos" },
  { id:"MEX",   label:"MEX" },
  { id:"ECU",   label:"ECU" },
  { id:"ARG",   label:"ARG" },
  { id:"REG",   label:"REG" },
];
const AGENDAS = [
  { id:"todas", label:"todas" },
  { id:"Género", label:"Género" },
  { id:"Datos",  label:"Datos" },
  { id:"Tecnológica", label:"Tecnológica" },
];
const QUALITIES = [
  { id:"todas", label:"todas" },
  { id:"Completa", label:"Completa" },
  { id:"Parcial",  label:"Parcial" },
  { id:"Nula",     label:"Nula" },
];

const SUGGESTED = [
  "¿Existen datos de feminicidio desagregados por municipio en Ecuador?",
  "¿Hay datos de feminicidio mensual a nivel municipal en México?",
  "¿Qué datos hay sobre violencia digital contra mujeres en la región?",
  "¿Cómo está la cobertura del registro de femicidios en Argentina?",
];

function MonitorBrechas(){
  const [text, setText] = useState(SUGGESTED[0]);
  const [filters, setFilters] = useState({ agenda:"todas", country:"todos", quality:"todas" });
  const [result, setResult] = useState(()=> findQuery(SUGGESTED[0], { agenda:"todas", country:"todos", quality:"todas" }));
  const [loading, setLoading] = useState(false);
  const [pulse, setPulse] = useState(0); // re-trigger animations
  const taRef = useRef(null);

  const search = () => {
    if (!text.trim()) return;
    setLoading(true);
    // genuine work: filter datasets in-memory, not setTimeout
    requestAnimationFrame(() => {
      const r = findQuery(text, filters);
      setResult(r);
      setLoading(false);
      setPulse(p => p+1);
    });
  };

  // visible datasets respecting filters
  const datasets = useMemo(()=> {
    if (!result) return [];
    let list = DATASETS.filter(d => result.datasets.includes(d.id));
    if (filters.country !== "todos") list = list.filter(d => d.country === filters.country);
    if (filters.quality !== "todas") list = list.filter(d => d.quality === filters.quality);
    if (filters.agenda  !== "todas") list = list.filter(d => d.agendas.includes(filters.agenda));
    return list;
  }, [result, filters]);

  const norms = useMemo(()=> {
    if (!result) return [];
    let list = NORMATIVAS.filter(n => result.norms.includes(n.id));
    if (filters.country !== "todos") list = list.filter(n => n.scope === filters.country || n.scope === "ALyC");
    return list;
  }, [result, filters]);

  return (
    <div className="max-w-[860px] mx-auto px-6 pt-10 pb-24" data-screen-label="01 Monitor de Brechas">
      {/* Hero */}
      <section className="mb-8">
        <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-plum mb-3">Pantalla 01 · Consulta</div>
        <h1 className="font-serif text-[44px] md:text-[56px] leading-[0.98] tracking-tight">
          Motor de <span className="display-italic text-plum">Brechas</span>.
        </h1>
        <p className="mt-4 text-[17px] text-ink/75 max-w-[58ch]">
          Pregunta por un dato de género, tecnología o violencia. Infra.Coop cruza
          <span className="font-mono text-[14px] text-plum"> 42 datasets</span> con
          <span className="font-mono text-[14px] text-plum"> 35 normativas</span> de América Latina y devuelve un
          <em className="display-italic"> score de brecha</em>: qué tan ausente está el dato que la ley dice que debería existir.
        </p>
      </section>

      {/* Composer */}
      <Card className="p-5 md:p-6 mb-5">
        <SectionLabel n={1}>Consulta</SectionLabel>
        <div className="relative">
          <textarea ref={taRef}
            value={text} onChange={e=>setText(e.target.value)}
            onKeyDown={e=>{ if ((e.metaKey||e.ctrlKey) && e.key==="Enter") search(); }}
            rows={2}
            placeholder="Escribe tu pregunta sobre datos de género, tecnología o violencia…"
            className="w-full resize-none bg-haze/60 border border-line rounded-xl p-4 text-[17px] leading-snug font-serif placeholder:font-sans placeholder:text-ink/40 ring-plum"
          />
          <div className="absolute bottom-3 right-3 font-mono text-[10px] text-ink/40">⌘ + ↵</div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink/45 self-center mr-1">Sugeridas</span>
          {SUGGESTED.map((s,i)=>(
            <button key={i} onClick={()=>{ setText(s); }}
              className="text-[12px] font-mono px-2.5 py-1 rounded-full border border-line hover:border-plum2 hover:bg-haze/50 text-ink/70">
              {s.length > 64 ? s.slice(0,62)+"…" : s}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="mt-5 grid md:grid-cols-3 gap-4 border-t border-line pt-5">
          <FilterGroup label="Agenda" options={AGENDAS}
            value={filters.agenda} onChange={v=>setFilters({...filters, agenda:v})} />
          <FilterGroup label="País" options={COUNTRIES} mono
            value={filters.country} onChange={v=>setFilters({...filters, country:v})} />
          <FilterGroup label="Calidad" options={QUALITIES}
            value={filters.quality} onChange={v=>setFilters({...filters, quality:v})} />
        </div>

        <div className="mt-5 flex items-center justify-between">
          <div className="font-mono text-[11px] text-ink/55">
            {datasets.length} datasets · {norms.length} normativas tras filtros
          </div>
          <button onClick={search}
            className="bg-plum text-white px-5 py-2.5 rounded-full text-sm font-medium hover:bg-ink transition-colors flex items-center gap-2">
            Buscar brecha
            <span aria-hidden>→</span>
          </button>
        </div>
      </Card>

      {/* Result */}
      {result && (
        <ResultCard key={pulse} result={result} datasets={datasets} norms={norms} loading={loading} />
      )}

      {/* Formula footer */}
      <FormulaCard score={result?.score} sim={result?.similarity} cov={result?.coverage} />
    </div>
  );
}

function FilterGroup({ label, options, value, onChange, mono=false }){
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink/55 mb-2">{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {options.map(o=>(
          <Pill key={o.id} active={value===o.id} onClick={()=>onChange(o.id)} mono={mono}>{o.label}</Pill>
        ))}
      </div>
    </div>
  );
}

function ResultCard({ result, datasets, norms, loading }){
  return (
    <Card className="p-5 md:p-6 mb-5 fade-up">
      <SectionLabel n={2}>Resultado · brecha detectada</SectionLabel>

      <div className="grid md:grid-cols-[180px_1fr] gap-6 items-start">
        <div className="flex md:block items-center gap-4">
          <ScoreArc value={result.score} />
        </div>

        <div>
          <div className="font-serif text-[24px] leading-snug pr-4">
            {result.text}
          </div>
          <p className="mt-3 text-ink/75 text-[15px] max-w-[60ch]">
            {result.diagnosis}
          </p>

          {/* Breakdown bars */}
          <div className="mt-5">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink/55 mb-2">Desglose por agenda</div>
            <div className="space-y-2.5">
              {Object.entries(result.breakdown).map(([k,v])=>(
                <BreakdownBar key={k} label={k} value={v} />
              ))}
            </div>
          </div>

          {/* sim/cov mini metrics */}
          <div className="mt-5 grid grid-cols-2 gap-3">
            <Mini label="similitud_dataset" value={result.similarity.toFixed(2)} />
            <Mini label="cobertura_normativa" value={result.coverage.toFixed(2)} />
          </div>
        </div>
      </div>

      {/* Datasets */}
      <div className="mt-7">
        <SectionLabel n={3}>Datasets encontrados</SectionLabel>
        {datasets.length === 0 ? (
          <Empty msg="Ningún dataset coincide con los filtros aplicados." />
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
            {datasets.map(d => <DatasetCard key={d.id} d={d} />)}
          </div>
        )}
      </div>

      {/* Norms */}
      <div className="mt-7">
        <SectionLabel n={4}>Normativas relacionadas</SectionLabel>
        {norms.length === 0 ? (
          <Empty msg="No hay normativa que aplique a este alcance." />
        ) : (
          <div className="space-y-2">
            {norms.map(n => <NormRow key={n.id} n={n} />)}
          </div>
        )}
      </div>
    </Card>
  );
}

function BreakdownBar({ label, value }){
  const c = agendaColor(label);
  return (
    <div className="flex items-center gap-3">
      <div className="w-28 text-[12px] font-mono text-ink/70">{label}</div>
      <div className="flex-1 h-2 rounded-full bg-line overflow-hidden">
        <div className="h-full bar-grow rounded-full" style={{ width: value+"%", background:c }} />
      </div>
      <div className="w-10 text-right font-mono text-[12px] num" style={{ color:c }}>{value}</div>
    </div>
  );
}

function Mini({ label, value }){
  return (
    <div className="border border-line rounded-xl px-3 py-2 bg-haze/30">
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink/50">{label}</div>
      <div className="font-mono text-[18px] num text-ink mt-0.5">{value}</div>
    </div>
  );
}

function DatasetCard({ d }){
  const sigs = [
    { k:"S1 Metadatos",     v:d.s1, w:0.20 },
    { k:"S2 Frecuencia",    v:d.s2, w:0.30 },
    { k:"S3 Desagregación", v:d.s3, w:0.30 },
    { k:"S4 Acceso",        v:d.s4, w:0.20 },
  ];
  return (
    <div className="border border-line rounded-xl p-4 hover:border-plum2 transition-colors group bg-paper/40">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <div className="font-mono text-[11px] text-plum">{d.id}</div>
          <div className="font-serif text-[18px] leading-snug mt-0.5">{d.name}</div>
        </div>
        <span className="inline-flex items-center gap-1.5 font-mono text-[11px]" title={`Calidad: ${d.quality}`}>
          <span className="w-2 h-2 rounded-full" style={{ background: qualityDot(d.quality) }} />
          {d.quality}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5 mb-3">
        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-ink/5 text-ink/70">{d.country}</span>
        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-ink/5 text-ink/70">{d.year}</span>
        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-ink/5 text-ink/70">{d.format}</span>
        {d.agendas.map(a=> <AgendaBadge key={a} a={a} />)}
      </div>
      <p className="text-[13px] text-ink/70 mb-3">{d.note}</p>
      <div className="flex items-end gap-1 h-8">
        {sigs.map(s => (
          <div key={s.k} className="flex-1 flex flex-col items-center gap-0.5" title={`${s.k} · ${(s.v*100|0)}%`}>
            <div className="w-full bg-line rounded-sm overflow-hidden h-6 flex items-end">
              <div className="w-full bar-grow" style={{ height: (s.v*100)+"%", background: s.v >= .8 ? "#3F7A4E" : s.v >= .4 ? "#C77B0E" : "#C2185B" }} />
            </div>
            <div className="font-mono text-[8.5px] uppercase text-ink/50">{s.k.split(" ")[0]}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function NormRow({ n }){
  return (
    <div className="border border-line rounded-xl p-4 flex gap-4 items-start bg-paper/40">
      <div className="font-mono text-[11px] text-plum w-16 shrink-0">{n.id}</div>
      <div className="flex-1">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="font-serif text-[17px]">{n.name}</span>
          <span className="font-mono text-[10px] text-ink/55">· {n.body} · {n.scope}</span>
        </div>
        <p className="text-[13px] text-ink/75 mt-1">"{n.obligation}"</p>
      </div>
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-moss border border-moss/30 px-2 py-0.5 rounded-full whitespace-nowrap">obliga</span>
    </div>
  );
}

function Empty({ msg }){
  return (
    <div className="border border-dashed border-line rounded-xl p-5 text-center text-[13px] text-ink/55 font-mono">{msg}</div>
  );
}

function FormulaCard({ score, sim, cov }){
  return (
    <div className="mt-6 border border-line rounded-2xl p-5 bg-haze/40">
      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-plum mb-2">Cómo se calcula</div>
      <div className="font-mono text-[13px] text-ink/85 leading-relaxed">
        score = (1 − similitud_dataset) × <span className="text-plum">0.6</span> + cobertura_normativa × <span className="text-plum">0.4</span>
      </div>
      {score != null && (
        <div className="mt-2 font-mono text-[12px] text-ink/65">
          = (1 − {sim.toFixed(2)}) × 0.6 + {cov.toFixed(2)} × 0.4 ≈ <span className="text-ink">{((1-sim)*0.6 + cov*0.4).toFixed(2)}</span> →
          <span className="num" style={{ color: scoreColor(score) }}> {score}</span>
        </div>
      )}
      <div className="mt-3 grid grid-cols-3 gap-2 font-mono text-[11px]">
        <Legend color="#3F7A4E" label="Cubierta" range="< 40" />
        <Legend color="#C77B0E" label="Parcial"  range="40 – 69" />
        <Legend color="#C2185B" label="Crítica"  range="≥ 70" />
      </div>
    </div>
  );
}

function Legend({ color, label, range }){
  return (
    <div className="flex items-center gap-2 border border-line rounded-lg px-2 py-1.5 bg-white">
      <span className="w-2.5 h-2.5 rounded-full" style={{ background:color }} />
      <span className="text-ink">{label}</span>
      <span className="text-ink/50 ml-auto">{range}</span>
    </div>
  );
}

/* ============================================================
   02 · MONITOR COLECTIVO
   ============================================================ */

function MonitorColectivo(){
  const maxWeek = Math.max(...WEEKLY.map(w=>w.n));
  const maxC = Math.max(...COUNTRY_DIST.map(c=>c.n));
  return (
    <div className="max-w-[860px] mx-auto px-6 pt-10 pb-24" data-screen-label="02 Monitor Colectivo">
      <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-plum mb-3">Pantalla 02 · Lectura colectiva</div>
      <h2 className="font-serif text-[40px] leading-[1.02] tracking-tight">
        Lo que la <span className="display-italic text-plum">comunidad</span> está preguntando.
      </h2>
      <p className="mt-3 text-[16px] text-ink/70 max-w-[58ch]">
        Cada consulta deja huella. Esta pantalla agrega lo que organizaciones, periodistas y activistas
        han preguntado a Infra.Coop en las últimas semanas.
      </p>

      {/* Brechas por agenda */}
      <div className="mt-8">
        <SectionLabel n={1}>Brechas por agenda</SectionLabel>
        <div className="grid md:grid-cols-3 gap-3">
          {AGENDA_AGG.map(a => <AgendaCard key={a.key} a={a} />)}
        </div>
      </div>

      {/* Evolución temporal */}
      <Card className="mt-8 p-5 md:p-6">
        <SectionLabel n={2}>Evolución de consultas · 10 semanas</SectionLabel>
        <div className="flex items-stretch gap-2" style={{ height: "11rem" }}>
          {WEEKLY.map((w,i)=>(
            <div key={w.w} className="flex-1 flex flex-col items-center gap-1.5">
              <div className="text-[10px] font-mono text-ink/50 num">{w.n}</div>
              <div className="w-full flex-1 bg-line/60 rounded-t-md flex items-end overflow-hidden">
                <div className="w-full rounded-t-md bar-grow" style={{
                  height: (w.n/maxWeek*100)+"%",
                  background: i===WEEKLY.length-1 ? "#6C3FA0" : "#9472BC",
                  animationDelay: (i*40)+"ms"
                }} />
              </div>
              <div className="text-[10px] font-mono text-ink/50">{w.w}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between font-mono text-[11px] text-ink/55">
          <span>260 consultas en 10 semanas</span>
          <span>+24% vs. periodo anterior</span>
        </div>
      </Card>

      {/* Distribución geográfica */}
      <Card className="mt-6 p-5 md:p-6">
        <SectionLabel n={3}>Distribución de datasets por país</SectionLabel>
        <div className="space-y-2">
          {COUNTRY_DIST.map(c=>(
            <div key={c.c} className="flex items-center gap-3">
              <div className="w-12 font-mono text-[12px] text-ink/70">{c.c}</div>
              <div className="w-24 text-[13px] text-ink/85">{c.label}</div>
              <div className="flex-1 h-3 rounded-full bg-line overflow-hidden">
                <div className="h-full bar-grow rounded-full" style={{
                  width: maxC ? (c.n/maxC*100)+"%" : "0%",
                  background: c.n === 0 ? "#C2185B33" : "#6C3FA0"
                }} />
              </div>
              <div className="w-10 text-right font-mono text-[12px] num text-ink">{c.n}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 font-mono text-[11px] text-ink/55">
          Brasil, Perú y Bolivia siguen sin datasets en el corpus — gran asimetría regional.
        </div>
      </Card>

      {/* Marcos de incidencia */}
      <div className="mt-8">
        <SectionLabel n={4}>Marcos de incidencia</SectionLabel>
        <div className="grid md:grid-cols-2 gap-3">
          {FRAMES.map(f => <FrameCard key={f.code} f={f} />)}
        </div>
      </div>
    </div>
  );
}

function AgendaCard({ a }){
  return (
    <div className="border border-line rounded-2xl p-5 bg-white relative overflow-hidden">
      <div className="absolute right-0 top-0 w-24 h-24 rounded-full opacity-10" style={{ background:a.color, transform:"translate(40%,-40%)" }} />
      <div className="font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color:a.color }}>Agenda</div>
      <div className="font-serif text-[24px] mt-1">{a.key}</div>
      <div className="flex items-baseline gap-2 mt-3">
        <span className="font-serif num text-[40px]" style={{ color:scoreColor(a.score) }}>{a.score}</span>
        <span className="font-mono text-[11px]" style={{ color:scoreColor(a.score) }}>{scoreLabel(a.score)}</span>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-line overflow-hidden">
        <div className="h-full bar-grow rounded-full" style={{ width:a.score+"%", background:a.color }} />
      </div>
      <div className="mt-3 flex items-center justify-between font-mono text-[11px] text-ink/55">
        <span>{a.n} datasets</span>
        <span className={a.trend>=0 ? "text-rose" : "text-moss"}>{a.trend>=0?"+":""}{a.trend} pts</span>
      </div>
    </div>
  );
}

function FrameCard({ f }){
  return (
    <div className="border border-line rounded-xl p-4 bg-white">
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-[11px] text-plum">{f.code}</span>
        <span className="font-serif text-[18px]">{f.name}</span>
      </div>
      <div className="font-mono text-[11px] text-ink/55 mt-0.5">{f.k}</div>
      <div className="mt-3 flex items-center gap-3">
        <div className="flex-1 h-2 rounded-full bg-line overflow-hidden">
          <div className="h-full bar-grow rounded-full"
               style={{ width:f.coverage+"%", background:scoreColor(100-f.coverage) }} />
        </div>
        <div className="font-mono text-[12px] num w-10 text-right">{f.coverage}%</div>
      </div>
    </div>
  );
}

/* ============================================================
   03 · ¿QUÉ DATOS QUEREMOS?
   ============================================================ */

function QueDatosQueremos(){
  const total = TOP_QUESTIONS.reduce((a,b)=>a+b.n,0);
  const byAgenda = useMemo(()=>{
    const map = {};
    MISSING.forEach(m => { map[m.agenda] = (map[m.agenda]||0) + 1; });
    return map;
  },[]);
  return (
    <div className="max-w-[860px] mx-auto px-6 pt-10 pb-24" data-screen-label="03 Que datos queremos">
      <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-plum mb-3">Pantalla 03 · Agenda en construcción</div>
      <h2 className="font-serif text-[40px] leading-[1.02] tracking-tight">
        ¿Qué datos <span className="display-italic text-plum">queremos</span>?
      </h2>
      <p className="mt-3 text-[16px] text-ink/70 max-w-[58ch]">
        Las preguntas que más se repiten — y los datos que aún <em className="display-italic">faltan</em> —
        forman una agenda colectiva de exigibilidad.
      </p>

      {/* Top preguntas */}
      <Card className="mt-8 p-5 md:p-6">
        <SectionLabel n={1}>Preguntas más frecuentes</SectionLabel>
        <ol className="space-y-2">
          {TOP_QUESTIONS.map((q,i)=>(
            <li key={i} className="grid grid-cols-[28px_1fr_72px_90px] gap-3 items-center py-2 border-b border-line/70 last:border-b-0">
              <span className="font-mono text-[12px] text-ink/45 num">{String(i+1).padStart(2,"0")}</span>
              <span className="font-serif text-[16px] leading-snug">{q.q}</span>
              <span className="font-mono text-[11px] text-ink/65 num text-right">{q.n} consultas</span>
              <span className="font-mono text-[11px] px-2 py-0.5 rounded-full justify-self-end" style={{
                color: scoreColor(q.status==="Crítica"?80:50),
                border:"1px solid "+scoreColor(q.status==="Crítica"?80:50)+"55",
                background: scoreColor(q.status==="Crítica"?80:50)+"11"
              }}>{q.status}</span>
            </li>
          ))}
        </ol>
        <div className="mt-3 font-mono text-[11px] text-ink/55">{total} consultas únicas registradas</div>
      </Card>

      {/* Datos faltantes por agenda */}
      <div className="mt-8">
        <SectionLabel n={2}>Datos faltantes · por agenda</SectionLabel>
        <div className="grid md:grid-cols-3 gap-3 mb-4">
          {["Género","Datos","Tecnológica"].map(a=>(
            <div key={a} className="border rounded-xl p-3" style={{ borderColor: agendaColor(a)+"40", background: agendaColor(a)+"08" }}>
              <div className="flex items-center justify-between">
                <AgendaBadge a={a} />
                <span className="font-serif num text-[28px]" style={{ color: agendaColor(a) }}>{byAgenda[a]||0}</span>
              </div>
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] mt-1 text-ink/55">huecos abiertos</div>
            </div>
          ))}
        </div>
        <Card className="p-0 overflow-hidden">
          <div className="grid grid-cols-[1.4fr_120px_140px_2fr] gap-0 font-mono text-[10px] uppercase tracking-[0.18em] text-ink/55 px-4 py-2 border-b border-line bg-haze/40">
            <div>Tema</div><div>Agenda</div><div>Países</div><div>Diagnóstico</div>
          </div>
          {MISSING.map((m,i)=>(
            <div key={i} className="grid grid-cols-[1.4fr_120px_140px_2fr] gap-0 px-4 py-3 border-b border-line/60 last:border-b-0 items-start">
              <div className="font-serif text-[16px] pr-3">{m.topic}</div>
              <div><AgendaBadge a={m.agenda} /></div>
              <div className="font-mono text-[12px] text-ink/70">{m.countries}</div>
              <div className="text-[13px] text-ink/75">{m.note}</div>
            </div>
          ))}
        </Card>
      </div>

      <Card className="mt-8 p-5 bg-haze/50">
        <div className="flex items-start gap-4">
          <div className="font-serif display-italic text-[40px] leading-none text-plum">"</div>
          <div>
            <div className="font-serif text-[18px] leading-snug">
              Lo que falta no es un error técnico. Es una decisión política sobre qué cuerpos cuentan.
            </div>
            <div className="font-mono text-[11px] text-ink/55 mt-2">— Manifiesto Infra.Coop</div>
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ============================================================
   04 · LANDING / ABOUT
   ============================================================ */

function About({ setTab }){
  return (
    <div className="max-w-[860px] mx-auto px-6 pt-12 pb-24" data-screen-label="04 About">
      <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-plum mb-4">Pantalla 04 · Manifiesto</div>

      <h2 className="font-serif text-[56px] md:text-[68px] leading-[0.96] tracking-tight">
        Una <span className="display-italic text-plum">infraestructura</span><br/>
        cooperativa<br/>
        para los datos<br/>
        que <span className="display-italic">faltan</span>.
      </h2>

      <p className="mt-7 text-[18px] leading-snug text-ink/80 max-w-[58ch]">
        Infra.Coop es un motor de brechas de datos hecho por y para organizaciones latinoamericanas.
        No produce datos: <em className="display-italic">audita su ausencia</em>. Cruza la oferta real
        de datasets con lo que las normativas obligan a producir, y devuelve un score que vuelve la
        ausencia <em className="display-italic">demandable</em>.
      </p>

      {/* 3 pilares */}
      <div className="mt-10 grid md:grid-cols-3 gap-3">
        <Pillar n="01" title="Cooperativo"
          body="Gobernado por organizaciones de datos de ALyC. Sin extracción, sin scraping de comunidades." />
        <Pillar n="02" title="Feminista"
          body="La perspectiva de género no es una capa: es la raíz metodológica de qué se cuenta." />
        <Pillar n="03" title="Exigible"
          body="Cada brecha enlaza con la norma que la obliga. La ausencia deja de ser técnica: pasa a ser política." />
      </div>

      {/* Navegación */}
      <div className="mt-12">
        <SectionLabel>Explora los módulos</SectionLabel>
        <div className="grid md:grid-cols-3 gap-3">
          {NAV.filter(n=>n.id!=="about").map(n=>(
            <button key={n.id} onClick={()=>setTab(n.id)}
              className="text-left border border-line rounded-2xl p-5 bg-white hover:border-plum transition-colors group">
              <div className="font-mono text-[11px] text-plum">{n.num}</div>
              <div className="font-serif text-[22px] mt-1 leading-snug">{n.label}</div>
              <div className="mt-3 font-mono text-[11px] text-ink/55 flex items-center gap-1">
                Abrir módulo
                <span className="transition-transform group-hover:translate-x-1">→</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Stats strip */}
      <div className="mt-12 grid grid-cols-2 md:grid-cols-4 border border-line rounded-2xl divide-x divide-line bg-white">
        {[
          { k:"Datasets",   v:"42" },
          { k:"Normativas", v:"35" },
          { k:"Países",     v:"6" },
          { k:"Agendas",    v:"3" },
        ].map(s=>(
          <div key={s.k} className="p-5">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink/55">{s.k}</div>
            <div className="font-serif num text-[40px] leading-none mt-1">{s.v}</div>
          </div>
        ))}
      </div>

      {/* Credits */}
      <div className="mt-12 border-t border-line pt-6 grid md:grid-cols-2 gap-6">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-plum mb-2">Coordinación</div>
          <div className="font-serif text-[20px]">Data Cooperativas Latinas</div>
          <div className="font-mono text-[11px] text-ink/60 mt-1">
            DataCívica · Datos & Sociedad · Conocimiento Abierto · LATFEM · Fundación Karisma
          </div>
        </div>
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-plum mb-2">Licencia</div>
          <div className="text-[14px] text-ink/80">
            Código y datos publicados como CC-BY-SA 4.0. Cualquier organización puede federar su propio nodo
            siguiendo el protocolo Infra.Coop v0.4.
          </div>
        </div>
      </div>

      <div className="mt-10 font-mono text-[10px] uppercase tracking-[0.22em] text-ink/45 text-center">
        Infra<span className="text-plum">.</span>Coop · 2026 · ALyC
      </div>
    </div>
  );
}

function Pillar({ n, title, body }){
  return (
    <div className="border border-line rounded-2xl p-5 bg-white">
      <div className="font-mono text-[11px] text-plum">{n}</div>
      <div className="font-serif text-[24px] mt-1">{title}</div>
      <div className="text-[14px] text-ink/75 mt-2 leading-snug">{body}</div>
    </div>
  );
}

/* ============================================================
   ROOT
   ============================================================ */

function App(){
  const [tab, setTab] = useState("monitor");
  // remember tab across reloads (designer-friendly)
  useEffect(()=>{
    const saved = localStorage.getItem("infracoop.tab");
    if (saved && NAV.some(n=>n.id===saved)) setTab(saved);
  }, []);
  useEffect(()=>{ localStorage.setItem("infracoop.tab", tab); }, [tab]);

  return (
    <div className="min-h-screen">
      <Header tab={tab} setTab={setTab} />
      {tab==="monitor"   && <MonitorBrechas />}
      {tab==="colectivo" && <MonitorColectivo />}
      {tab==="queremos"  && <QueDatosQueremos />}
      {tab==="about"     && <About setTab={setTab} />}
      <footer className="border-t border-line py-6">
        <div className="max-w-[860px] mx-auto px-6 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.22em] text-ink/50">
          <span>Infra.Coop · v0.4</span>
          <span>Data Cooperativas Latinas · 2026</span>
        </div>
      </footer>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
