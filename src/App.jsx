import { useState, useEffect, useRef, useCallback } from "react";

// ─── gebioMized brand colors ──────────────────────────────────────────────────
const C = {
  bgPage:    "#0b1525", bgCard:   "#0f1e35", bgInput:  "#0c1830",
  border:    "#1a2d48", borderSub:"#132038", navy:     "#1e3054",
  textPri:   "#dce8f6", textSec:  "#4a6a8a", textMute: "#2a3f5a", textFoot: "#14202e",
  green:     "#a8cc00", greenDark:"#7a9600", greenGlow:"#a8cc0033",
  blue:      "#4a9fd4", blueDark: "#2e7ab0", blueGlow: "#4a9fd433",
  cogLine:   "#e0ecf8", cogGlow:  "#e0ecf855",
  warnOk:    "#a8cc00", warnMid:  "#f0b429", warnBad:  "#e05555",
};

// ─── translations ─────────────────────────────────────────────────────────────
const T = {
  de: {
    appSub:"Kontaktpunkt-Lastverteilung", screenInput:"Eingabe", screenResult:"Ergebnis",
    armpads:"Armpads", left:"Links", right:"Rechts", saddle:"Sattel",
    avgForce:"Mittlere Kraft", bodyweight:"Körpergewicht", weight:"Gewicht",
    analyze:"AUSWERTEN →", newMeasure:"← NEUE MESSUNG",
    padsKg:"Pads / KG", saddleKg:"Sattel / KG", totalForce:"Gesamt",
    loadDist:"Lastverteilung", symm:"SYMMETRISCH",
    front:"← VORNE", rear:"HINTEN →", supportBase:"STÜTZBASE",
    cogLabel:"CoG", cogUnit:"v. Sattel",
    install:"App installieren", installSub:"Homescreen · offline verfügbar",
    installBtn:"Installieren", later:"Später",
    footer:"© GEBIOMIZED · DYNAMISCHE DRUCKMESSUNG",
    pads:"PADS", saddleUp:"SATTEL",
    tabLoad:"LAST", tabCog:"SATTEL COG",
    cogScreen:"Sattel CoG-Analyse",
    uploadHint:"Messdatei laden",
    uploadSub:".txt Export aus gebioMized Software",
    uploadBtn:"DATEI WÄHLEN",
    cogMean:"Mittlere Position",
    cogLR:"Links / Rechts",
    cogAP:"Anterior / Posterior",
    cogStd:"Streuung (σ)",
    cogDuration:"Messdauer",
    cogPoints:"Datenpunkte",
    cogLeft:"LINKS",
    cogRight:"RECHTS",
    cogFront:"VORNE",
    cogRear:"HINTEN",
    cogCenter:"Mitte",
    cogNewFile:"NEUE DATEI",
    mmUnit:"mm", secUnit:"s",
    cogShifts:"SHIFTS", cogShiftsUp:"↑ OBEN", cogShiftsDown:"↓ UNTEN",
    cogThreshold:"Schwelle",
  },
  en: {
    appSub:"Contact Point Load Distribution", screenInput:"Input", screenResult:"Results",
    armpads:"Arm Pads", left:"Left", right:"Right", saddle:"Saddle",
    avgForce:"Mean Force", bodyweight:"Body Weight", weight:"Weight",
    analyze:"ANALYZE →", newMeasure:"← NEW MEASUREMENT",
    padsKg:"Pads / BW", saddleKg:"Saddle / BW", totalForce:"Total",
    loadDist:"Load Distribution", symm:"SYMMETRIC",
    front:"← FRONT", rear:"REAR →", supportBase:"SUPPORT BASE",
    cogLabel:"CoG", cogUnit:"from saddle",
    install:"Install App", installSub:"Add to homescreen · works offline",
    installBtn:"Install", later:"Later",
    footer:"© GEBIOMIZED · DYNAMIC PRESSURE MEASUREMENT",
    pads:"PADS", saddleUp:"SADDLE",
    tabLoad:"LOAD", tabCog:"SADDLE COG",
    cogScreen:"Saddle CoG Analysis",
    uploadHint:"Load measurement file",
    uploadSub:".txt export from gebioMized software",
    uploadBtn:"CHOOSE FILE",
    cogMean:"Mean Position",
    cogLR:"Left / Right",
    cogAP:"Anterior / Posterior",
    cogStd:"Spread (σ)",
    cogDuration:"Duration",
    cogPoints:"Data points",
    cogLeft:"LEFT",
    cogRight:"RIGHT",
    cogFront:"FRONT",
    cogRear:"REAR",
    cogCenter:"Center",
    cogNewFile:"NEW FILE",
    mmUnit:"mm", secUnit:"s",
    cogShifts:"SHIFTS", cogShiftsUp:"↑ UPWARD", cogShiftsDown:"↓ DOWNWARD",
    cogThreshold:"Threshold",
};

const FONT = "https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Bebas+Neue&family=DM+Sans:wght@300;400;500&display=swap";

// ─── hooks ────────────────────────────────────────────────────────────────────
function useAnimatedValue(target, duration = 500) {
  const [value, setValue] = useState(target);
  const animRef = useRef(null);
  const startRef = useRef({ from: target, startTime: null });
  useEffect(() => {
    const from = value;
    startRef.current = { from, startTime: null };
    if (animRef.current) cancelAnimationFrame(animRef.current);
    const animate = (ts) => {
      if (!startRef.current.startTime) startRef.current.startTime = ts;
      const p = Math.min((ts - startRef.current.startTime) / duration, 1);
      const e = 1 - Math.pow(1 - p, 3);
      setValue(startRef.current.from + (target - startRef.current.from) * e);
      if (p < 1) animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [target]);
  return value;
}

function useInstallPrompt() {
  const [prompt, setPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);
  useEffect(() => {
    const h = (e) => { e.preventDefault(); setPrompt(e); };
    window.addEventListener("beforeinstallprompt", h);
    window.addEventListener("appinstalled", () => setInstalled(true));
    return () => window.removeEventListener("beforeinstallprompt", h);
  }, []);
  const install = async () => {
    if (!prompt) return;
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") setInstalled(true);
    setPrompt(null);
  };
  return { canInstall: !!prompt && !installed, install };
}

// ─── CoG file parser ──────────────────────────────────────────────────────────
function parseCogFile(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  let dim = { w: 144, h: 210 }, date = "", time = "", dataStart = 0;
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const p = lines[i].split("\t");
    if (p[0] === "Date")    date = p[1]?.trim();
    else if (p[0] === "Time") time = p[1]?.trim();
    else if (p[0] === "Dim") { dim = { w: parseInt(p[3]), h: parseInt(p[4]) }; }
    else if (p[0] === "[ms]") { dataStart = i + 1; break; }
  }
  const points = [];
  for (let i = dataStart; i < lines.length; i++) {
    const p = lines[i].split("\t");
    const ms = parseInt(p[0]), x = parseInt(p[1]), y = parseInt(p[2]);
    if (!isNaN(ms) && !isNaN(x) && !isNaN(y)) points.push({ ms, x, y });
  }
  if (points.length === 0) return null;
  const xs = points.map(p => p.x), ys = points.map(p => p.y);
  const meanX = xs.reduce((a,b)=>a+b,0)/xs.length;
  const meanY = ys.reduce((a,b)=>a+b,0)/ys.length;
  const stdX  = Math.sqrt(xs.reduce((a,b)=>a+(b-meanX)**2,0)/xs.length);
  const stdY  = Math.sqrt(ys.reduce((a,b)=>a+(b-meanY)**2,0)/ys.length);
  const lrBias = ((meanX - dim.w/2) / (dim.w/2)) * 100; // + = right
  const apPct  = (meanY / dim.h) * 100;                  // % from front
  const duration = (points[points.length-1].ms - points[0].ms) / 1000;
  return { date, time, dim, points, meanX, meanY, stdX, stdY, lrBias, apPct, duration };
}

function buildHeatmap(points, dim, cols = 36, rows = 52) {
  const grid = Array.from({ length: rows }, () => new Array(cols).fill(0));
  const cW = dim.w / cols, cH = dim.h / rows;
  let maxCount = 0;
  for (const p of points) {
    const c = Math.min(Math.floor(p.x / cW), cols - 1);
    const r = Math.min(Math.floor(p.y / cH), rows - 1);
    grid[r][c]++;
    if (grid[r][c] > maxCount) maxCount = grid[r][c];
  }
  return { grid, cW, cH, maxCount, cols, rows };
}

function buildTimeSeries(points, nBins = 350) {
  if (points.length === 0) return [];
  const t0 = points[0].ms, t1 = points[points.length - 1].ms;
  const binSize = (t1 - t0) / nBins;
  const bins = Array.from({ length: nBins }, () => ({ sum: 0, count: 0 }));
  for (const p of points) {
    const idx = Math.min(Math.floor((p.ms - t0) / binSize), nBins - 1);
    bins[idx].sum += p.y;
    bins[idx].count++;
  }
  return bins
    .map((b, i) => ({ t: (t0 + i * binSize) / 1000, y: b.count > 0 ? b.sum / b.count : null }))
    .filter(p => p.y !== null);
}

function detectShifts(series, meanY, threshold) {
  const upper = meanY + threshold;
  const lower = meanY - threshold;
  let shiftsUp = 0, shiftsDown = 0;
  let wasAbove = series[0]?.y > upper;
  let wasBelow = series[0]?.y < lower;
  for (let i = 1; i < series.length; i++) {
    const above = series[i].y > upper;
    const below = series[i].y < lower;
    if (above && !wasAbove) shiftsUp++;
    if (below && !wasBelow) shiftsDown++;
    wasAbove = above; wasBelow = below;
  }
  return { shiftsUp, shiftsDown, total: shiftsUp + shiftsDown };
}

function CogYTimePlot({ data, threshold, t }) {
  const series = buildTimeSeries(data.points);
  if (series.length === 0) return null;

  const upper = data.meanY + threshold;
  const lower = data.meanY - threshold;
  const shifts = detectShifts(series, data.meanY, threshold);

  const PAD = { l: 28, r: 10, t: 16, b: 22 };
  const W = 360, H = 120;
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;

  const tMin = series[0].t, tMax = series[series.length - 1].t;
  const yVals = series.map(p => p.y);
  const yMin  = Math.min(...yVals, lower - 2);
  const yMax  = Math.max(...yVals, upper + 2);
  const yPad  = Math.max((yMax - yMin) * 0.12, 1);
  const yLo   = yMin - yPad, yHi = yMax + yPad;

  const sx = (tv) => PAD.l + ((tv - tMin) / (tMax - tMin)) * innerW;
  const sy = (yv) => PAD.t + (1 - (yv - yLo) / (yHi - yLo)) * innerH;

  const upperSy = sy(upper), lowerSy = sy(lower), meanSy = sy(data.meanY);

  // split series into colored segments
  const segments = [];
  let cur = null;
  for (let i = 0; i < series.length; i++) {
    const p = series[i];
    const exceeded = p.y > upper || p.y < lower;
    const col = exceeded ? C.warnBad : C.blue;
    if (!cur || col !== cur.col) {
      // carry last point for continuity
      if (cur && cur.pts.length > 0) cur.pts.push(p);
      cur = { col, pts: [] };
      segments.push(cur);
    }
    cur.pts.push(p);
  }
  const toLine = (pts) => pts.map(p => `${sx(p.t).toFixed(1)},${sy(p.y).toFixed(1)}`).join(" ");

  const tickInterval = tMax > 120 ? 30 : tMax > 60 ? 15 : 10;
  const ticks = [];
  for (let tv = Math.ceil(tMin / tickInterval) * tickInterval; tv <= tMax; tv += tickInterval) ticks.push(tv);

  const shiftColor = shifts.total === 0 ? C.warnOk : shifts.total < 5 ? C.warnMid : C.warnBad;

  return (
    <div style={{ background:C.bgCard, border:`1px solid ${C.border}`, borderRadius:14, padding:"14px 14px 10px" }}>
      {/* header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
        <span style={{ fontFamily:"'DM Mono'", fontSize:9, color:C.textMute, letterSpacing:2 }}>CoG Y · {t.cogAP.toUpperCase()}</span>
        <span style={{ fontFamily:"'DM Mono'", fontSize:8, color:C.blue }}>ø {data.meanY.toFixed(1)}</span>
      </div>

      {/* chart */}
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width:"100%", overflow:"visible" }}>
        <defs>
          <filter id="lglow">
            <feGaussianBlur stdDeviation="1.5" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="wglow">
            <feGaussianBlur stdDeviation="2" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <clipPath id="plotClip">
            <rect x={PAD.l} y={PAD.t} width={innerW} height={innerH}/>
          </clipPath>
        </defs>

        {/* threshold zone fill */}
        <rect x={PAD.l} y={upperSy} width={innerW} height={lowerSy - upperSy}
          fill={`${C.green}08`} clipPath="url(#plotClip)"/>

        {/* grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map(f => {
          const yv = yLo + f * (yHi - yLo);
          const yp = sy(yv);
          return (
            <g key={f}>
              <line x1={PAD.l} y1={yp} x2={W - PAD.r} y2={yp} stroke={C.borderSub} strokeWidth="0.5"/>
              <text x={PAD.l - 3} y={yp + 3} textAnchor="end" fontFamily="DM Mono" fontSize="7" fill={C.textMute}>{yv.toFixed(0)}</text>
            </g>
          );
        })}

        {/* x ticks */}
        {ticks.map(tv => (
          <g key={tv}>
            <line x1={sx(tv)} y1={PAD.t + innerH} x2={sx(tv)} y2={PAD.t + innerH + 3} stroke={C.navy} strokeWidth="0.8"/>
            <text x={sx(tv)} y={H - 4} textAnchor="middle" fontFamily="DM Mono" fontSize="7" fill={C.textMute}>{tv}s</text>
          </g>
        ))}

        {/* mean line */}
        <line x1={PAD.l} y1={meanSy} x2={W - PAD.r} y2={meanSy}
          stroke={`${C.cogLine}44`} strokeWidth="1" strokeDasharray="4 4"/>

        {/* threshold lines */}
        <line x1={PAD.l} y1={upperSy} x2={W - PAD.r} y2={upperSy}
          stroke={`${C.warnBad}99`} strokeWidth="1" strokeDasharray="3 4"/>
        <line x1={PAD.l} y1={lowerSy} x2={W - PAD.r} y2={lowerSy}
          stroke={`${C.warnBad}99`} strokeWidth="1" strokeDasharray="3 4"/>
        {/* threshold labels */}
        <text x={W - PAD.r + 2} y={upperSy + 3} fontFamily="DM Mono" fontSize="6.5" fill={`${C.warnBad}aa`}>+{threshold}</text>
        <text x={W - PAD.r + 2} y={lowerSy + 3} fontFamily="DM Mono" fontSize="6.5" fill={`${C.warnBad}aa`}>-{threshold}</text>

        {/* signal – colored segments */}
        {segments.map((seg, i) => (
          <polyline key={i} points={toLine(seg.pts)} fill="none"
            stroke={seg.col} strokeWidth={seg.col === C.warnBad ? 2 : 1.5}
            strokeLinejoin="round" strokeLinecap="round"
            filter={seg.col === C.warnBad ? "url(#wglow)" : "url(#lglow)"}
            clipPath="url(#plotClip)" opacity={seg.col === C.warnBad ? 0.95 : 0.85}/>
        ))}

        {/* axes */}
        <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={PAD.t + innerH} stroke={C.navy} strokeWidth="1"/>
        <line x1={PAD.l} y1={PAD.t + innerH} x2={W - PAD.r} y2={PAD.t + innerH} stroke={C.navy} strokeWidth="1"/>
      </svg>

      <div style={{ display:"flex", justifyContent:"space-between", marginTop:2, marginBottom:12 }}>
        <span style={{ fontFamily:"'DM Mono'", fontSize:7, color:C.textMute }}>{t.cogFront}</span>
        <span style={{ fontFamily:"'DM Mono'", fontSize:7, color:C.textMute }}>{t.cogRear}</span>
      </div>

      {/* shift stats */}
      <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:12, display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:8, alignItems:"center" }}>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontFamily:"'DM Mono'", fontSize:8, color:C.textMute, letterSpacing:1, marginBottom:4 }}>{t.cogThreshold}</div>
          <div style={{ fontFamily:"'Bebas Neue'", fontSize:22, color:C.textSec, lineHeight:1 }}>± {threshold}</div>
        </div>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontFamily:"'DM Mono'", fontSize:8, color:C.textMute, letterSpacing:1, marginBottom:4 }}>{t.cogShiftsUp}</div>
          <div style={{ fontFamily:"'Bebas Neue'", fontSize:28, color:C.warnBad, lineHeight:1 }}>{shifts.shiftsUp}</div>
        </div>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontFamily:"'DM Mono'", fontSize:8, color:C.textMute, letterSpacing:1, marginBottom:4 }}>{t.cogShiftsDown}</div>
          <div style={{ fontFamily:"'Bebas Neue'", fontSize:28, color:C.warnBad, lineHeight:1 }}>{shifts.shiftsDown}</div>
        </div>
        <div style={{ textAlign:"center", background:C.bgPage, borderRadius:8, padding:"8px 4px" }}>
          <div style={{ fontFamily:"'DM Mono'", fontSize:8, color:C.textMute, letterSpacing:1, marginBottom:4 }}>{t.cogShifts}</div>
          <div style={{ fontFamily:"'Bebas Neue'", fontSize:32, color:shiftColor, lineHeight:1 }}>{shifts.total}</div>
        </div>
      </div>
    </div>
  );
}
function SaddleHeatmap({ data }) {
  const { dim, points, meanX, meanY, stdX, stdY } = data;
  const hm = buildHeatmap(points, dim);
  const W = dim.w, H = dim.h;

  // color scale: transparent → green glow
  const cellColor = (count) => {
    if (count === 0) return "none";
    const t = Math.min(count / (hm.maxCount * 0.6), 1);
    const alpha = Math.round((0.08 + t * 0.92) * 255).toString(16).padStart(2,"0");
    // interpolate dark-blue → green
    const r = Math.round(10  + t * (168 - 10));
    const g = Math.round(30  + t * (204 - 30));
    const b = Math.round(50  + t * (0   - 50));
    return `rgb(${r},${g},${b})`;
  };

  return (
    <svg viewBox={`-8 -8 ${W+16} ${H+16}`} style={{ width:"100%", maxHeight:320 }}>
      <defs>
        <clipPath id="saddleClip">
          <rect x="0" y="0" width={W} height={H} rx="18" />
        </clipPath>
        <filter id="hglow">
          <feGaussianBlur stdDeviation="2.5" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="cglow">
          <feGaussianBlur stdDeviation="3" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      {/* saddle outline */}
      <rect x="0" y="0" width={W} height={H} rx="18"
        fill={C.bgCard} stroke={C.border} strokeWidth="1.5" />

      {/* center axes */}
      <line x1={W/2} y1="0" x2={W/2} y2={H} stroke={C.navy} strokeWidth="0.6" strokeDasharray="4 4"/>
      <line x1="0" y1={H/2} x2={W} y2={H/2} stroke={C.navy} strokeWidth="0.6" strokeDasharray="4 4"/>

      {/* heatmap cells */}
      <g clipPath="url(#saddleClip)">
        {hm.grid.map((row, ri) =>
          row.map((count, ci) => count > 0 ? (
            <rect key={`${ri}-${ci}`}
              x={ci * hm.cW} y={ri * hm.cH}
              width={hm.cW + 0.5} height={hm.cH + 0.5}
              fill={cellColor(count)} />
          ) : null)
        )}
      </g>

      {/* 1σ ellipse */}
      <ellipse
        cx={meanX} cy={meanY} rx={stdX} ry={stdY}
        fill="none" stroke={`${C.green}60`} strokeWidth="1.2"
        strokeDasharray="4 3" />
      {/* 2σ ellipse */}
      <ellipse
        cx={meanX} cy={meanY} rx={stdX*2} ry={stdY*2}
        fill="none" stroke={`${C.green}30`} strokeWidth="0.8"
        strokeDasharray="3 4" />

      {/* mean crosshair */}
      <g filter="url(#cglow)">
        <line x1={meanX-10} y1={meanY} x2={meanX+10} y2={meanY}
          stroke={C.cogLine} strokeWidth="1.5" strokeLinecap="round"/>
        <line x1={meanX} y1={meanY-10} x2={meanX} y2={meanY+10}
          stroke={C.cogLine} strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx={meanX} cy={meanY} r="3"
          fill={C.cogLine} opacity="0.95"/>
      </g>

      {/* corner labels */}
      <text x="4"   y="11"     fontFamily="DM Mono" fontSize="7" fill={C.textMute}>L</text>
      <text x={W-10} y="11"   fontFamily="DM Mono" fontSize="7" fill={C.textMute}>R</text>
    </svg>
  );
}

// ─── Stat tile ────────────────────────────────────────────────────────────────
function StatTile({ label, value, unit, color }) {
  return (
    <div style={{ background:C.bgPage, borderRadius:10, padding:"12px 10px", textAlign:"center" }}>
      <div style={{ fontFamily:"'DM Mono'", fontSize:8, color:C.textMute, letterSpacing:1, marginBottom:6, lineHeight:1.3 }}>{label}</div>
      <div style={{ fontFamily:"'Bebas Neue'", fontSize:28, lineHeight:1, color: color || C.textPri }}>{value}</div>
      {unit && <div style={{ fontFamily:"'DM Mono'", fontSize:9, color:C.textMute, marginTop:2 }}>{unit}</div>}
    </div>
  );
}

// ─── LR balance bar ───────────────────────────────────────────────────────────
function LRBar({ bias, t }) {
  const color = Math.abs(bias) < 3 ? C.warnOk : Math.abs(bias) < 7 ? C.warnMid : C.warnBad;
  const label = Math.abs(bias) < 2 ? t.cogCenter : bias < 0
    ? `${t.cogLeft} ${Math.abs(bias).toFixed(1)}%`
    : `${t.cogRight} ${Math.abs(bias).toFixed(1)}%`;
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:7 }}>
        <span style={{ fontFamily:"'DM Mono'", fontSize:10, color:C.textMute, letterSpacing:1 }}>{t.cogLeft}</span>
        <span style={{ fontFamily:"'DM Mono'", fontSize:10, color, letterSpacing:1 }}>{label}</span>
        <span style={{ fontFamily:"'DM Mono'", fontSize:10, color:C.textMute, letterSpacing:1 }}>{t.cogRight}</span>
      </div>
      <div style={{ height:8, borderRadius:4, background:C.bgPage, overflow:"hidden", position:"relative", border:`1px solid ${C.border}` }}>
        <div style={{ position:"absolute", left:"50%", width:1, height:"100%", background:C.border }}/>
        <div style={{
          position:"absolute", top:0, height:"100%",
          left: bias >= 0 ? "50%" : `${50 + bias/2}%`,
          width:`${Math.abs(bias)/2}%`,
          background:color, boxShadow:`0 0 6px ${color}80`,
        }}/>
      </div>
    </div>
  );
}

// ─── CoG Screen ───────────────────────────────────────────────────────────────
function CogScreen({ t }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [threshold, setThreshold] = useState(20);
  const inputRef = useRef(null);

  const handleFile = useCallback((file) => {
    if (!file) return;
    setLoading(true); setError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = parseCogFile(e.target.result);
      if (!result) { setError("Datei konnte nicht gelesen werden."); }
      else { setData(result); }
      setLoading(false);
    };
    reader.onerror = () => { setError("Lesefehler."); setLoading(false); };
    reader.readAsText(file);
  }, []);

  const onFileChange = (e) => handleFile(e.target.files[0]);

  const onDrop = (e) => {
    e.preventDefault();
    handleFile(e.dataTransfer.files[0]);
  };

  if (!data) return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      {/* drop zone */}
      <div
        onDrop={onDrop}
        onDragOver={e => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        style={{
          background:C.bgCard, border:`2px dashed ${C.border}`, borderRadius:16,
          padding:"40px 24px", textAlign:"center", cursor:"pointer",
          display:"flex", flexDirection:"column", alignItems:"center", gap:12,
        }}>
        <input ref={inputRef} type="file" accept=".txt,.csv" onChange={onFileChange} style={{ display:"none" }}/>
        {/* icon */}
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <rect x="8" y="6" width="32" height="36" rx="4" stroke={C.border} strokeWidth="2"/>
          <path d="M16 18h16M16 24h16M16 30h10" stroke={C.navy} strokeWidth="2" strokeLinecap="round"/>
          <path d="M30 32l6 6M36 32l-6 6" stroke={C.green} strokeWidth="2.5" strokeLinecap="round"/>
        </svg>
        <div>
          <div style={{ fontFamily:"'DM Sans'", fontSize:15, fontWeight:500, color:C.textPri, marginBottom:4 }}>{t.uploadHint}</div>
          <div style={{ fontFamily:"'DM Mono'", fontSize:9, color:C.textMute, letterSpacing:1 }}>{t.uploadSub}</div>
        </div>
        <div style={{ background:C.green, borderRadius:8, padding:"10px 20px", fontFamily:"'Bebas Neue'", fontSize:14, letterSpacing:3, color:C.bgPage }}>
          {loading ? "..." : t.uploadBtn}
        </div>
        {error && <div style={{ fontFamily:"'DM Mono'", fontSize:10, color:C.warnBad }}>{error}</div>}
      </div>
    </div>
  );

  const lrColor = Math.abs(data.lrBias) < 3 ? C.warnOk : Math.abs(data.lrBias) < 7 ? C.warnMid : C.warnBad;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      {/* file info */}
      <div style={{ background:C.bgCard, border:`1px solid ${C.border}`, borderRadius:10, padding:"10px 14px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div>
          <div style={{ fontFamily:"'DM Mono'", fontSize:9, color:C.green, letterSpacing:2 }}>BIKE_CoG.txt</div>
          <div style={{ fontFamily:"'DM Mono'", fontSize:8, color:C.textMute, marginTop:2 }}>{data.date} {data.time} · {data.points.length.toLocaleString()} {t.cogPoints}</div>
        </div>
        <button onClick={() => setData(null)} style={{ background:"none", border:`1px solid ${C.border}`, borderRadius:6, padding:"6px 10px", fontFamily:"'DM Mono'", fontSize:9, color:C.textSec, cursor:"pointer", letterSpacing:1 }}>
          {t.cogNewFile}
        </button>
      </div>

      {/* heatmap */}
      <div style={{ background:C.bgCard, border:`1px solid ${C.border}`, borderRadius:14, padding:"16px" }}>
        <div style={{ fontFamily:"'DM Mono'", fontSize:9, color:C.textMute, letterSpacing:2, marginBottom:12, display:"flex", justifyContent:"space-between" }}>
          <span>CoG BEWEGUNG</span>
          <span style={{ color:C.green }}>1σ · 2σ</span>
        </div>
        <SaddleHeatmap data={data}/>
        {/* axis labels */}
        <div style={{ display:"flex", justifyContent:"space-between", marginTop:6 }}>
          <span style={{ fontFamily:"'DM Mono'", fontSize:8, color:C.textMute }}>← {t.cogFront}</span>
          <span style={{ fontFamily:"'DM Mono'", fontSize:8, color:C.cogLine, opacity:0.6 }}>
            x̄ {data.meanX.toFixed(1)} / {data.meanY.toFixed(1)}
          </span>
          <span style={{ fontFamily:"'DM Mono'", fontSize:8, color:C.textMute }}>{t.cogRear} →</span>
        </div>
      </div>

      {/* stats grid */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
        <StatTile
          label={t.cogLR}
          value={Math.abs(data.lrBias).toFixed(1)}
          unit={data.lrBias >= 0 ? `% ${t.cogRight}` : `% ${t.cogLeft}`}
          color={lrColor}/>
        <StatTile
          label="σ X / Y"
          value={`${data.stdX.toFixed(1)}/${data.stdY.toFixed(1)}`}
          unit={t.mmUnit}
          color={C.textPri}/>
        <StatTile
          label={t.cogDuration}
          value={data.duration.toFixed(0)}
          unit={t.secUnit}
          color={C.blue}/>
      </div>

      {/* LR balance bar */}
      <div style={{ background:C.bgCard, border:`1px solid ${C.border}`, borderRadius:14, padding:"14px 16px" }}>
        <LRBar bias={data.lrBias} t={t}/>
      </div>

      {/* Y over time */}
      <CogYTimePlot data={data} threshold={threshold} t={t}/>

      {/* threshold control */}
      <div style={{ background:C.bgCard, border:`1px solid ${C.border}`, borderRadius:14, padding:"14px 16px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:12 }}>
        <span style={{ fontFamily:"'DM Mono'", fontSize:9, color:C.textMute, letterSpacing:2 }}>{t.cogThreshold.toUpperCase()}</span>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <button onClick={() => setThreshold(v => Math.max(1, v - 1))}
            style={{ background:C.bgPage, border:`1px solid ${C.border}`, borderRadius:6, width:32, height:32, fontFamily:"'DM Mono'", fontSize:16, color:C.textSec, cursor:"pointer" }}>−</button>
          <span style={{ fontFamily:"'Bebas Neue'", fontSize:28, color:C.textPri, minWidth:40, textAlign:"center" }}>± {threshold}</span>
          <button onClick={() => setThreshold(v => Math.min(50, v + 1))}
            style={{ background:C.bgPage, border:`1px solid ${C.border}`, borderRadius:6, width:32, height:32, fontFamily:"'DM Mono'", fontSize:16, color:C.textSec, cursor:"pointer" }}>+</button>
        </div>
      </div>
    </div>
  );
}

// ─── shared UI components ─────────────────────────────────────────────────────
function LangToggle({ lang, setLang }) {
  return (
    <div style={{ display:"flex", background:C.bgPage, border:`1px solid ${C.border}`, borderRadius:8, overflow:"hidden", flexShrink:0 }}>
      {["de","en"].map(l => (
        <button key={l} onClick={() => setLang(l)}
          style={{ padding:"6px 12px", fontFamily:"'DM Mono'", fontSize:11, fontWeight:500, letterSpacing:1, textTransform:"uppercase", border:"none", cursor:"pointer", background: lang===l ? C.green : "transparent", color: lang===l ? C.bgPage : C.textSec, transition:"all 0.15s" }}>
          {l}
        </button>
      ))}
    </div>
  );
}

function TabBar({ tab, setTab, t }) {
  const tabs = [{ id:"load", label:t.tabLoad }, { id:"cog", label:t.tabCog }];
  return (
    <div style={{ display:"flex", background:C.bgPage, border:`1px solid ${C.border}`, borderRadius:10, overflow:"hidden", marginBottom:16 }}>
      {tabs.map(tb => (
        <button key={tb.id} onClick={() => setTab(tb.id)}
          style={{ flex:1, padding:"11px 8px", fontFamily:"'Bebas Neue'", fontSize:14, letterSpacing:3, border:"none", cursor:"pointer", background: tab===tb.id ? C.green : "transparent", color: tab===tb.id ? C.bgPage : C.textSec, transition:"all 0.18s" }}>
          {tb.label}
        </button>
      ))}
    </div>
  );
}

const X_PAD = 88, X_SAD = 316, BASELINE_Y = 148, MAX_ARROW = 90;

function Schematic({ saddleForce, padLForce, padRForce, maxForce, t }) {
  const padForce = padLForce + padRForce;
  const total    = saddleForce + padForce;
  const cogX     = total > 0 ? (X_PAD * padForce + X_SAD * saddleForce) / total : (X_PAD + X_SAD) / 2;
  const animCogX = useAnimatedValue(cogX);
  const animSad  = useAnimatedValue(saddleForce);
  const animPad  = useAnimatedValue(padForce);
  const animPadL = useAnimatedValue(padLForce);
  const animPadR = useAnimatedValue(padRForce);
  const hSad     = maxForce > 0 ? (animSad  / maxForce) * MAX_ARROW : 0;
  const hPad     = maxForce > 0 ? (animPad  / maxForce) * MAX_ARROW : 0;
  const hPadL    = maxForce > 0 ? (animPadL / maxForce) * MAX_ARROW : 0;
  const hPadR    = maxForce > 0 ? (animPadR / maxForce) * MAX_ARROW : 0;
  const cogPct   = total > 0 ? ((X_SAD - animCogX) / (X_SAD - X_PAD) * 100) : 50;
  const AW = 5;
  return (
    <svg viewBox="0 0 404 200" style={{ width:"100%", maxWidth:404, overflow:"visible" }}>
      <defs>
        <filter id="gy" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <filter id="gg" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="3.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <filter id="gb" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="3.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <line x1="48" y1={BASELINE_Y} x2="360" y2={BASELINE_Y} stroke={C.navy} strokeWidth="1.5"/>
      <line x1="48"  y1={BASELINE_Y-6} x2="48"  y2={BASELINE_Y+6} stroke={C.navy} strokeWidth="1.5"/>
      <line x1="360" y1={BASELINE_Y-6} x2="360" y2={BASELINE_Y+6} stroke={C.navy} strokeWidth="1.5"/>
      <text x="200" y={BASELINE_Y+16} textAnchor="middle" fontFamily="DM Mono" fontSize="8" fill={C.navy} letterSpacing="2">{t.front} · {t.rear}</text>
      <line x1={X_PAD} y1={BASELINE_Y+28} x2={X_SAD} y2={BASELINE_Y+28} stroke={C.borderSub} strokeWidth="1"/>
      <line x1={X_PAD} y1={BASELINE_Y+24} x2={X_PAD} y2={BASELINE_Y+32} stroke={C.borderSub} strokeWidth="1"/>
      <line x1={X_SAD} y1={BASELINE_Y+24} x2={X_SAD} y2={BASELINE_Y+32} stroke={C.borderSub} strokeWidth="1"/>
      <text x={(X_PAD+X_SAD)/2} y={BASELINE_Y+42} textAnchor="middle" fontFamily="DM Mono" fontSize="7.5" fill={C.textMute} letterSpacing="1">{t.supportBase}</text>
      <line x1={X_PAD} y1={BASELINE_Y-hPad-8} x2={X_PAD} y2={BASELINE_Y} stroke={C.greenGlow} strokeWidth="1" strokeDasharray="3 3"/>
      <circle cx={X_PAD} cy={BASELINE_Y} r="5" fill={C.bgCard} stroke={C.green} strokeWidth="2" filter={padForce>0?"url(#gg)":""}/>
      {hPad > 2 && (<g filter="url(#gg)"><line x1={X_PAD} y1={BASELINE_Y-5} x2={X_PAD} y2={BASELINE_Y-hPad+AW+2} stroke={C.green} strokeWidth="2" strokeLinecap="round"/><polygon points={`${X_PAD},${BASELINE_Y-5} ${X_PAD-AW},${BASELINE_Y-5-AW*1.8} ${X_PAD+AW},${BASELINE_Y-5-AW*1.8}`} fill={C.green}/></g>)}
      <text x={X_PAD} y={BASELINE_Y-hPad-14} textAnchor="middle" fontFamily="DM Mono" fontSize="11" fontWeight="500" fill={C.green}>{Math.round(animPad)}</text>
      <text x={X_PAD} y={BASELINE_Y-hPad-4}  textAnchor="middle" fontFamily="DM Mono" fontSize="8"  fill={C.greenDark}>N</text>
      <text x={X_PAD} y={BASELINE_Y+14}       textAnchor="middle" fontFamily="DM Mono" fontSize="8"  fill={C.green} letterSpacing="1">{t.pads}</text>
      {(padLForce>0||padRForce>0) && (<g opacity="0.65"><rect x={X_PAD-22} y={BASELINE_Y-hPadL*0.3-2} width="8" height={hPadL*0.3+2} rx="2" fill={C.greenGlow} stroke={C.green} strokeWidth="0.8"/><text x={X_PAD-18} y={BASELINE_Y-hPadL*0.3-6} textAnchor="middle" fontFamily="DM Mono" fontSize="7" fill={C.greenDark}>L</text><rect x={X_PAD+14} y={BASELINE_Y-hPadR*0.3-2} width="8" height={hPadR*0.3+2} rx="2" fill={C.greenGlow} stroke={C.green} strokeWidth="0.8"/><text x={X_PAD+18} y={BASELINE_Y-hPadR*0.3-6} textAnchor="middle" fontFamily="DM Mono" fontSize="7" fill={C.greenDark}>R</text></g>)}
      <line x1={X_SAD} y1={BASELINE_Y-hSad-8} x2={X_SAD} y2={BASELINE_Y} stroke={C.blueGlow} strokeWidth="1" strokeDasharray="3 3"/>
      <circle cx={X_SAD} cy={BASELINE_Y} r="5" fill={C.bgCard} stroke={C.blue} strokeWidth="2" filter={saddleForce>0?"url(#gb)":""}/>
      {hSad > 2 && (<g filter="url(#gb)"><line x1={X_SAD} y1={BASELINE_Y-5} x2={X_SAD} y2={BASELINE_Y-hSad+AW+2} stroke={C.blue} strokeWidth="2" strokeLinecap="round"/><polygon points={`${X_SAD},${BASELINE_Y-5} ${X_SAD-AW},${BASELINE_Y-5-AW*1.8} ${X_SAD+AW},${BASELINE_Y-5-AW*1.8}`} fill={C.blue}/></g>)}
      <text x={X_SAD} y={BASELINE_Y-hSad-14} textAnchor="middle" fontFamily="DM Mono" fontSize="11" fontWeight="500" fill={C.blue}>{Math.round(animSad)}</text>
      <text x={X_SAD} y={BASELINE_Y-hSad-4}  textAnchor="middle" fontFamily="DM Mono" fontSize="8"  fill={C.blueDark}>N</text>
      <text x={X_SAD} y={BASELINE_Y+14}       textAnchor="middle" fontFamily="DM Mono" fontSize="8"  fill={C.blue} letterSpacing="1">{t.saddleUp}</text>
      <rect x={X_PAD} y={BASELINE_Y-4} width={X_SAD-X_PAD} height="8" fill="#e0ecf808"/>
      <line x1={animCogX} y1="8" x2={animCogX} y2={BASELINE_Y+22} stroke={C.cogLine} strokeWidth="1.5" strokeDasharray="6 4" filter="url(#gy)"/>
      <polygon points={`${animCogX},${BASELINE_Y+5} ${animCogX-6},${BASELINE_Y-5} ${animCogX+6},${BASELINE_Y-5}`} fill={C.cogLine} opacity="0.9" filter="url(#gy)"/>
      <rect x={animCogX-24} y="0" width="48" height="16" rx="4" fill={C.bgPage} stroke={C.cogGlow} strokeWidth="1"/>
      <text x={animCogX} y="11" textAnchor="middle" fontFamily="DM Mono" fontSize="8.5" fill={C.cogLine} letterSpacing="2">{t.cogLabel}</text>
      <text x={animCogX} y={BASELINE_Y+22} textAnchor="middle" fontFamily="DM Mono" fontSize="8" fill={`${C.cogLine}88`}>{`${cogPct.toFixed(0)}% ${t.cogUnit}`}</text>
    </svg>
  );
}

function DistributionBar({ saddle, padL, padR, t }) {
  const total = saddle + padL + padR;
  const sP = useAnimatedValue(total > 0 ? (saddle / total) * 100 : 50);
  const pP = useAnimatedValue(total > 0 ? ((padL + padR) / total) * 100 : 50);
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:7 }}>
        <span style={{ fontFamily:"'DM Mono'", fontSize:10, color:C.green,    letterSpacing:1 }}>{t.pads} {pP.toFixed(1)}%</span>
        <span style={{ fontFamily:"'DM Mono'", fontSize:10, color:C.textMute, letterSpacing:1 }}>{t.loadDist.toUpperCase()}</span>
        <span style={{ fontFamily:"'DM Mono'", fontSize:10, color:C.blue,     letterSpacing:1 }}>{t.saddleUp} {sP.toFixed(1)}%</span>
      </div>
      <div style={{ height:10, borderRadius:5, background:C.bgPage, overflow:"hidden", display:"flex", border:`1px solid ${C.border}` }}>
        <div style={{ width:`${pP}%`, background:`linear-gradient(90deg,${C.greenDark},${C.green})`, transition:"width 0.05s" }}/>
        <div style={{ flex:1, background:`linear-gradient(90deg,${C.blueDark},${C.blue})` }}/>
      </div>
    </div>
  );
}

function AsymmetryBar({ padL, padR, t }) {
  const total = padL + padR;
  const asym  = useAnimatedValue(total > 0 ? ((padL - padR) / total) * 100 : 0);
  const abs   = Math.abs(asym);
  const color = abs < 5 ? C.warnOk : abs < 10 ? C.warnMid : C.warnBad;
  const label = abs < 3 ? t.symm : asym > 0 ? `${t.left.toUpperCase()} +${abs.toFixed(1)}%` : `${t.right.toUpperCase()} +${abs.toFixed(1)}%`;
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:7 }}>
        <span style={{ fontFamily:"'DM Mono'", fontSize:10, color:C.textMute, letterSpacing:1 }}>{t.left.toUpperCase()}</span>
        <span style={{ fontFamily:"'DM Mono'", fontSize:10, color, letterSpacing:1 }}>{label}</span>
        <span style={{ fontFamily:"'DM Mono'", fontSize:10, color:C.textMute, letterSpacing:1 }}>{t.right.toUpperCase()}</span>
      </div>
      <div style={{ height:6, borderRadius:3, background:C.bgPage, overflow:"hidden", position:"relative", border:`1px solid ${C.border}` }}>
        <div style={{ position:"absolute", left:"50%", width:1, height:"100%", background:C.border }}/>
        <div style={{ position:"absolute", top:0, height:"100%", left:asym>=0?"50%":`${50+asym/2}%`, width:`${abs/2}%`, background:color, boxShadow:`0 0 6px ${color}80`, transition:"all 0.05s" }}/>
      </div>
    </div>
  );
}

function ForceBarChart({ padL, padR, saddle, mode, bodyWeightN, t }) {
  const aPadL   = useAnimatedValue(padL);
  const aPadR   = useAnimatedValue(padR);
  const aSaddle = useAnimatedValue(saddle);
  const toVal   = (v) => mode === "percent" ? (bodyWeightN > 0 ? (v / bodyWeightN) * 100 : 0) : v;
  const padForce = aPadL + aPadR;
  const vals   = [toVal(padForce), toVal(aSaddle)];
  const maxVal = Math.max(...vals, 1);
  const H = 90;
  const labels = [t.pads, t.saddleUp];
  const colors = [C.green, C.blue];
  const unit  = mode === "percent" ? "%" : "N";
  const title = mode === "percent" ? `% ${t.weight.toUpperCase()}` : "NEWTON";
  return (
    <div style={{ background:C.bgCard, border:`1px solid ${C.border}`, borderRadius:14, padding:"14px 12px 10px" }}>
      <div style={{ fontFamily:"'DM Mono'", fontSize:8, color:C.textMute, letterSpacing:2, marginBottom:12, textAlign:"center" }}>{title}</div>
      <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-around", height:H, gap:6 }}>
        {vals.map((val, i) => {
          const h = maxVal > 0 ? Math.max((val / maxVal) * H, 2) : 2;
          return (
            <div key={i} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4, flex:1 }}>
              <span style={{ fontFamily:"'DM Mono'", fontSize:9, color:colors[i], lineHeight:1 }}>
                {mode === "percent" ? val.toFixed(0) : Math.round(val)}
              </span>
              <div style={{ width:"100%", height:h, background:`linear-gradient(180deg,${colors[i]},${colors[i]}88)`, borderRadius:"4px 4px 2px 2px", boxShadow:`0 0 8px ${colors[i]}44`, transition:"height 0.05s", minHeight:2 }}/>
            </div>
          );
        })}
      </div>
      <div style={{ display:"flex", justifyContent:"space-around", marginTop:6, gap:6 }}>
        {labels.map((l, i) => (<span key={i} style={{ fontFamily:"'DM Mono'", fontSize:8, color:colors[i], textAlign:"center", flex:1, letterSpacing:1 }}>{l}</span>))}
      </div>
      <div style={{ textAlign:"center", marginTop:4 }}>
        <span style={{ fontFamily:"'DM Mono'", fontSize:7, color:C.textMute, letterSpacing:1 }}>{unit}</span>
      </div>
    </div>
  );
}

function BigInputField({ label, value, onChange, color, unit = "N", sublabel }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline" }}>
        <label style={{ fontFamily:"'DM Sans'", fontSize:11, fontWeight:500, color:C.textSec, letterSpacing:"2px", textTransform:"uppercase" }}>{label}</label>
        {sublabel && <span style={{ fontFamily:"'DM Mono'", fontSize:9, color:C.textMute, letterSpacing:1 }}>{sublabel}</span>}
      </div>
      <div style={{ position:"relative" }}>
        <input type="number" value={value} onChange={e => onChange(Number(e.target.value)||0)}
          inputMode="numeric" min={0} max={unit==="kg"?200:999}
          style={{ width:"100%", background:C.bgInput, border:`1.5px solid ${color}55`, borderRadius:10, padding:"16px 44px 16px 16px", fontFamily:"'DM Mono'", fontSize:28, fontWeight:500, color:C.textPri, outline:"none", boxSizing:"border-box" }}
          onFocus={e => e.target.style.borderColor=color}
          onBlur={e  => e.target.style.borderColor=`${color}55`}/>
        <span style={{ position:"absolute", right:14, top:"50%", transform:"translateY(-50%)", fontFamily:"'DM Mono'", fontSize:13, color:`${color}88` }}>{unit}</span>
      </div>
    </div>
  );
}

function InstallBanner({ onInstall, t }) {
  const [v, setV] = useState(true);
  if (!v) return null;
  return (
    <div style={{ background:C.bgCard, border:`1px solid ${C.border}`, borderRadius:12, padding:"12px 16px", marginBottom:16, display:"flex", alignItems:"center", justifyContent:"space-between", gap:10 }}>
      <div>
        <div style={{ fontFamily:"'DM Sans'", fontSize:13, color:C.textPri, fontWeight:500 }}>{t.install}</div>
        <div style={{ fontFamily:"'DM Mono'", fontSize:9, color:C.textMute, marginTop:2, letterSpacing:1 }}>{t.installSub}</div>
      </div>
      <div style={{ display:"flex", gap:8, flexShrink:0 }}>
        <button onClick={()=>setV(false)} style={{ background:"none", border:`1px solid ${C.border}`, borderRadius:8, padding:"8px 12px", fontFamily:"'DM Mono'", fontSize:11, color:C.textSec, cursor:"pointer" }}>{t.later}</button>
        <button onClick={onInstall} style={{ background:C.green, border:"none", borderRadius:8, padding:"8px 14px", fontFamily:"'DM Mono'", fontSize:11, color:C.bgPage, fontWeight:500, cursor:"pointer" }}>{t.installBtn}</button>
      </div>
    </div>
  );
}

function Header({ onBack, lang, setLang, screenLabel }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16, paddingBottom:14, borderBottom:`1px solid ${C.border}` }}>
      {onBack && (
        <button onClick={onBack} style={{ background:"none", border:`1px solid ${C.border}`, borderRadius:8, width:36, height:36, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", flexShrink:0 }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8L10 13" stroke={C.textSec} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      )}
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:"flex", alignItems:"baseline", gap:8 }}>
          <span style={{ fontFamily:"'Bebas Neue'", fontSize:24, letterSpacing:4, color:C.textPri }}>GEBIOMIZED</span>
          <span style={{ fontFamily:"'DM Mono'", fontSize:8, color:C.textMute, letterSpacing:2 }}>LOAD BALANCE</span>
        </div>
        <div style={{ fontFamily:"'DM Sans'", fontSize:10, color:C.textMute, letterSpacing:1, marginTop:1 }}>{screenLabel}</div>
      </div>
      <LangToggle lang={lang} setLang={setLang}/>
    </div>
  );
}

// ─── app ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [saddle, setSaddle] = useState(280);
  const [padL,   setPadL]   = useState(120);
  const [padR,   setPadR]   = useState(115);
  const [bw,     setBw]     = useState(75);
  const [screen, setScreen] = useState("input");
  const [tab,    setTab]    = useState("load");
  const [lang,   setLang]   = useState(() => (navigator.language||"de").startsWith("de") ? "de" : "en");

  const { canInstall, install } = useInstallPrompt();
  const t = T[lang];

  const bodyWeightN = bw * 9.81;
  const total       = saddle + padL + padR;
  const maxForce    = Math.max(saddle, padL + padR, 1);
  const pctBWSad    = bodyWeightN > 0 ? ((saddle        / bodyWeightN)*100).toFixed(0) : "—";
  const pctBWPads   = bodyWeightN > 0 ? (((padL+padR)   / bodyWeightN)*100).toFixed(0) : "—";

  const css = `
    * { box-sizing:border-box; margin:0; padding:0; }
    html,body { height:100%; background:${C.bgPage}; }
    @keyframes slideIn  { from{opacity:0;transform:translateX(28px)} to{opacity:1;transform:translateX(0)} }
    @keyframes slideOut { from{opacity:0;transform:translateX(-28px)} to{opacity:1;transform:translateX(0)} }
    .si { animation:slideIn  0.28s ease; }
    .so { animation:slideOut 0.28s ease; }
    input[type=number]::-webkit-inner-spin-button,
    input[type=number]::-webkit-outer-spin-button { -webkit-appearance:none; }
    input[type=number] { -moz-appearance:textfield; appearance:textfield; }
  `;
  const wrap = {
    minHeight:"100dvh",
    background:`radial-gradient(ellipse at 15% 12%,#0e2040 0%,${C.bgPage} 55%)`,
    display:"flex", alignItems:"flex-start", justifyContent:"center",
    padding:"max(env(safe-area-inset-top),20px) 20px max(env(safe-area-inset-bottom),24px)",
    overflowY:"auto",
  };

  /* INPUT */
  if (tab === "load" && screen === "input") return (
    <>
      <link rel="stylesheet" href={FONT}/><style>{css}</style>
      <div style={wrap}>
        <div style={{ width:"100%", maxWidth:420 }} className="so">
          {canInstall && <InstallBanner onInstall={install} t={t}/>}
          <Header lang={lang} setLang={setLang} screenLabel={t.appSub}/>
          <TabBar tab={tab} setTab={(id) => { setTab(id); setScreen("input"); }} t={t}/>
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <div style={{ background:C.bgCard, border:`1px solid ${C.border}`, borderRadius:14, padding:"18px 16px" }}>
              <div style={{ fontFamily:"'DM Mono'", fontSize:9, color:C.green, letterSpacing:3, marginBottom:14 }}>{t.armpads.toUpperCase()}</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <BigInputField label={t.left}  value={padL} onChange={setPadL} color={C.green}/>
                <BigInputField label={t.right} value={padR} onChange={setPadR} color={C.green}/>
              </div>
            </div>
            <div style={{ background:C.bgCard, border:`1px solid ${C.border}`, borderRadius:14, padding:"18px 16px" }}>
              <div style={{ fontFamily:"'DM Mono'", fontSize:9, color:C.blue, letterSpacing:3, marginBottom:14 }}>{t.saddle.toUpperCase()}</div>
              <BigInputField label={t.avgForce} value={saddle} onChange={setSaddle} color={C.blue}/>
            </div>
            <div style={{ background:C.bgCard, border:`1px solid ${C.border}`, borderRadius:14, padding:"18px 16px" }}>
              <div style={{ fontFamily:"'DM Mono'", fontSize:9, color:C.textSec, letterSpacing:3, marginBottom:14 }}>{t.bodyweight.toUpperCase()}</div>
              <BigInputField label={t.weight} value={bw} onChange={setBw} color={C.textSec} unit="kg" sublabel={`= ${bodyWeightN.toFixed(0)} N`}/>
            </div>
            <button onClick={() => setScreen("results")}
              style={{ width:"100%", background:C.green, border:"none", borderRadius:12, padding:"18px", fontFamily:"'Bebas Neue'", fontSize:20, letterSpacing:4, color:C.bgPage, cursor:"pointer", marginTop:4 }}>
              {t.analyze}
            </button>
          </div>
          <div style={{ marginTop:20, textAlign:"center" }}><span style={{ fontFamily:"'DM Mono'", fontSize:8, color:C.textFoot, letterSpacing:2 }}>{t.footer}</span></div>
        </div>
      </div>
    </>
  );

  /* RESULTS */
  if (tab === "load" && screen === "results") return (
    <>
      <link rel="stylesheet" href={FONT}/><style>{css}</style>
      <div style={wrap}>
        <div style={{ width:"100%", maxWidth:420 }} className="si">
          <Header onBack={() => setScreen("input")} lang={lang} setLang={setLang} screenLabel={t.screenResult}/>
          <TabBar tab={tab} setTab={(id) => { setTab(id); setScreen("input"); }} t={t}/>
          <div style={{ background:C.bgCard, border:`1px solid ${C.border}`, borderRadius:14, padding:"20px 14px 14px", marginBottom:12 }}>
            <Schematic saddleForce={saddle} padLForce={padL} padRForce={padR} maxForce={maxForce} t={t}/>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginTop:10, padding:"14px 8px 0", borderTop:`1px solid ${C.border}` }}>
              <div style={{ textAlign:"center", background:C.bgPage, borderRadius:10, padding:"12px 6px" }}>
                <div style={{ fontFamily:"'DM Mono'", fontSize:9, color:C.textMute, letterSpacing:1, marginBottom:6 }}>{t.padsKg}</div>
                <div style={{ fontFamily:"'Bebas Neue'", fontSize:32, lineHeight:1, color:C.green }}>{pctBWPads}</div>
                <div style={{ fontFamily:"'DM Mono'", fontSize:10, color:C.greenDark, marginTop:2 }}>%</div>
              </div>
              <div style={{ textAlign:"center", background:C.bgPage, borderRadius:10, padding:"12px 6px" }}>
                <div style={{ fontFamily:"'DM Mono'", fontSize:9, color:C.textMute, letterSpacing:1, marginBottom:6 }}>{t.totalForce}</div>
                <div style={{ fontFamily:"'Bebas Neue'", fontSize:32, lineHeight:1, color:C.textPri }}>{Math.round(total)}</div>
                <div style={{ fontFamily:"'DM Mono'", fontSize:10, color:C.textMute, marginTop:2 }}>N</div>
              </div>
              <div style={{ textAlign:"center", background:C.bgPage, borderRadius:10, padding:"12px 6px" }}>
                <div style={{ fontFamily:"'DM Mono'", fontSize:9, color:C.textMute, letterSpacing:1, marginBottom:6 }}>{t.saddleKg}</div>
                <div style={{ fontFamily:"'Bebas Neue'", fontSize:32, lineHeight:1, color:C.blue }}>{pctBWSad}</div>
                <div style={{ fontFamily:"'DM Mono'", fontSize:10, color:C.blueDark, marginTop:2 }}>%</div>
              </div>
            </div>
          </div>
          <div style={{ background:C.bgCard, border:`1px solid ${C.border}`, borderRadius:14, padding:"16px 18px", marginBottom:12, display:"flex", flexDirection:"column", gap:18 }}>
            <DistributionBar saddle={saddle} padL={padL} padR={padR} t={t}/>
            <AsymmetryBar padL={padL} padR={padR} t={t}/>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
            <ForceBarChart padL={padL} padR={padR} saddle={saddle} mode="absolute" t={t}/>
            <ForceBarChart padL={padL} padR={padR} saddle={saddle} mode="percent" bodyWeightN={bodyWeightN} t={t}/>
          </div>
          <button onClick={() => setScreen("input")}
            style={{ width:"100%", background:"none", border:`1px solid ${C.border}`, borderRadius:12, padding:"16px", fontFamily:"'Bebas Neue'", fontSize:18, letterSpacing:4, color:C.textSec, cursor:"pointer" }}>
            {t.newMeasure}
          </button>
          <div style={{ marginTop:16, textAlign:"center" }}><span style={{ fontFamily:"'DM Mono'", fontSize:8, color:C.textFoot, letterSpacing:2 }}>{t.footer}</span></div>
        </div>
      </div>
    </>
  );

  /* COG TAB */
  return (
    <>
      <link rel="stylesheet" href={FONT}/><style>{css}</style>
      <div style={wrap}>
        <div style={{ width:"100%", maxWidth:420 }} className="si">
          <Header lang={lang} setLang={setLang} screenLabel={t.cogScreen}/>
          <TabBar tab={tab} setTab={(id) => { setTab(id); setScreen("input"); }} t={t}/>
          <CogScreen t={t}/>
          <div style={{ marginTop:20, textAlign:"center" }}><span style={{ fontFamily:"'DM Mono'", fontSize:8, color:C.textFoot, letterSpacing:2 }}>{t.footer}</span></div>
        </div>
      </div>
    </>
  );
}
