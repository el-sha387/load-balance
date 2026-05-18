import { useState, useEffect, useRef, useCallback, createContext, useContext } from "react";

// ─── Light theme – gebioMized brand ──────────────────────────────────────────
const C = {
  bgPage:     "#eef2f7",
  bgCard:     "#ffffff",
  bgInput:    "#f4f7fb",
  border:     "#d0dcea",
  borderSub:  "#e4ecf4",
  navy:       "#1a2d48",
  navyMid:    "#2e4a6a",
  textPri:    "#1a2d48",
  textSec:    "#4a6a8a",
  textMute:   "#8aaac0",
  green:      "#a8cc00",
  greenDark:  "#7a9600",
  greenLight: "#eef7c8",
  blue:       "#2878b8",
  blueLight:  "#deedf8",
  blueMid:    "#4a9fd4",
  cogLine:    "#1a2d48",
  warnOk:     "#7a9600",
  warnMid:    "#c07820",
  warnBad:    "#c03030",
  shadow:     "0 1px 3px rgba(26,45,72,0.07), 0 4px 14px rgba(26,45,72,0.05)",
  shadowMd:   "0 2px 8px rgba(26,45,72,0.1), 0 8px 24px rgba(26,45,72,0.07)",
};

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
    tabLoad:"LASTVERTEILUNG", tabCog:"SATTEL COG",
    cogScreen:"Sattel CoG-Analyse",
    uploadHint:"Messdatei laden", uploadSub:".txt Export aus gebioMized Software", uploadBtn:"DATEI WÄHLEN",
    cogLR:"Links / Rechts", cogAP:"Anterior / Posterior",
    cogDuration:"Messdauer", cogPoints:"Datenpunkte",
    cogLeft:"LINKS", cogRight:"RECHTS", cogFront:"VORNE", cogRear:"HINTEN", cogCenter:"Mitte",
    cogNewFile:"Neue Datei", mmUnit:"mm", secUnit:"s",
    cogShifts:"SHIFTS", cogShiftsUp:"↑ OBEN", cogShiftsDown:"↓ UNTEN", cogThreshold:"Schwelle",
    compareLoad:"VERGLEICH LADEN", compareA:"MESSUNG A", compareB:"MESSUNG B",
    compareTitle:"Vergleich A vs B", close:"Schliessen",
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
    tabLoad:"LOAD BALANCE", tabCog:"SADDLE COG",
    cogScreen:"Saddle CoG Analysis",
    uploadHint:"Load measurement file", uploadSub:".txt export from gebioMized software", uploadBtn:"CHOOSE FILE",
    cogLR:"Left / Right", cogAP:"Anterior / Posterior",
    cogDuration:"Duration", cogPoints:"Data points",
    cogLeft:"LEFT", cogRight:"RIGHT", cogFront:"FRONT", cogRear:"REAR", cogCenter:"Center",
    cogNewFile:"New file", mmUnit:"mm", secUnit:"s",
    cogShifts:"SHIFTS", cogShiftsUp:"↑ UPWARD", cogShiftsDown:"↓ DOWNWARD", cogThreshold:"Threshold",
    compareLoad:"LOAD COMPARISON", compareA:"MEASUREMENT A", compareB:"MEASUREMENT B",
    compareTitle:"Compare A vs B", close:"Close",
  },
};

const FONT = "https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Bebas+Neue&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,400&display=swap";
const ZoomCtx = createContext(false);

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

function useIsWide() {
  const [wide, setWide] = useState(() => window.innerWidth >= 720);
  useEffect(() => {
    const h = () => setWide(window.innerWidth >= 720);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return wide;
}

// ─── ZoomCard ─────────────────────────────────────────────────────────────────
function ZoomCard({ children, label }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div style={{ position: "relative" }}>
        {children}
        <button onClick={() => setOpen(true)} title="Vergrößern" style={{
          position: "absolute", top: 10, right: 10,
          background: C.bgPage, border: `1px solid ${C.border}`, borderRadius: 6,
          width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", color: C.textSec, fontSize: 18, lineHeight: 1, boxShadow: C.shadow,
        }}>+</button>
      </div>
      {open && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(26,45,72,0.55)", zIndex: 200, overflowY: "auto", backdropFilter: "blur(4px)" }}
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
          <ZoomCtx.Provider value={true}>
            <div style={{ maxWidth: 900, margin: "24px auto", padding: "0 16px 48px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                {label && <span style={{ fontFamily: "'DM Sans'", fontSize: 11, fontWeight: 600, color: C.textMute, letterSpacing: 2, textTransform: "uppercase" }}>{label}</span>}
                <button onClick={() => setOpen(false)} style={{
                  marginLeft: "auto", background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 8,
                  padding: "8px 18px", fontFamily: "'DM Sans'", fontSize: 13, fontWeight: 500,
                  color: C.textSec, cursor: "pointer", boxShadow: C.shadow,
                }}>✕ Schliessen</button>
              </div>
              {children}
            </div>
          </ZoomCtx.Provider>
        </div>
      )}
    </>
  );
}

// ─── file parser ──────────────────────────────────────────────────────────────
function parseCogFile(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  let dim = { w: 144, h: 210 }, date = "", time = "", dataStart = 0;
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const p = lines[i].split("\t");
    if (p[0] === "Date") date = p[1]?.trim();
    else if (p[0] === "Time") time = p[1]?.trim();
    else if (p[0] === "Dim") dim = { w: parseInt(p[3]), h: parseInt(p[4]) };
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
  const meanX = xs.reduce((a, b) => a + b, 0) / xs.length;
  const meanY = ys.reduce((a, b) => a + b, 0) / ys.length;
  const stdX = Math.sqrt(xs.reduce((a, b) => a + (b - meanX) ** 2, 0) / xs.length);
  const stdY = Math.sqrt(ys.reduce((a, b) => a + (b - meanY) ** 2, 0) / ys.length);
  const lrBias = ((meanX - dim.w / 2) / (dim.w / 2)) * 100;
  const duration = (points[points.length - 1].ms - points[0].ms) / 1000;
  return { date, time, dim, points, meanX, meanY, stdX, stdY, lrBias, duration };
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
    bins[idx].sum += p.y; bins[idx].count++;
  }
  return bins.map((b, i) => ({ t: (t0 + i * binSize) / 1000, y: b.count > 0 ? b.sum / b.count : null })).filter(p => p.y !== null);
}

function detectShifts(series, meanY, threshold) {
  const upper = meanY + threshold, lower = meanY - threshold;
  let shiftsUp = 0, shiftsDown = 0;
  let wasAbove = series[0]?.y > upper, wasBelow = series[0]?.y < lower;
  for (let i = 1; i < series.length; i++) {
    const above = series[i].y > upper, below = series[i].y < lower;
    if (above && !wasAbove) shiftsUp++;
    if (below && !wasBelow) shiftsDown++;
    wasAbove = above; wasBelow = below;
  }
  return { shiftsUp, shiftsDown, total: shiftsUp + shiftsDown };
}

// ─── SaddleHeatmap ────────────────────────────────────────────────────────────
function SaddleHeatmap({ data, accentColor = "blue" }) {
  const isZoomed = useContext(ZoomCtx);
  const { dim, points, meanX, meanY, stdX, stdY } = data;
  const hm = buildHeatmap(points, dim);
  const W = dim.w, H = dim.h;
  const accent = accentColor === "green" ? C.green : C.blue;

  const cellColor = (count) => {
    if (count === 0) return "none";
    const t = Math.min(count / (hm.maxCount * 0.6), 1);
    if (accentColor === "green") {
      const r = Math.round(240 - t * (240 - 90));
      const g = Math.round(248 - t * (248 - 160));
      const b = Math.round(220 - t * 220);
      return `rgb(${r},${g},${b})`;
    }
    const r = Math.round(240 - t * (240 - 30));
    const g = Math.round(248 - t * (248 - 120));
    const b = Math.round(252 - t * (252 - 200));
    return `rgb(${r},${g},${b})`;
  };

  return (
    <svg viewBox={`-6 -6 ${W + 12} ${H + 12}`} style={{ width: "100%", maxHeight: isZoomed ? "none" : 300 }}>
      <defs>
        <clipPath id={`sc${accentColor}`}><rect x="0" y="0" width={W} height={H} rx="10" /></clipPath>
        <filter id={`drop${accentColor}`}><feDropShadow dx="0" dy="1" stdDeviation="2" floodColor={C.navy} floodOpacity="0.08"/></filter>
      </defs>
      <rect x="0" y="0" width={W} height={H} rx="10" fill={C.bgInput} stroke={C.border} strokeWidth="1" filter={`url(#drop${accentColor})`}/>
      <line x1={W/2} y1="0" x2={W/2} y2={H} stroke={C.border} strokeWidth="0.8" strokeDasharray="3 3"/>
      <line x1="0" y1={H/2} x2={W} y2={H/2} stroke={C.border} strokeWidth="0.8" strokeDasharray="3 3"/>
      <g clipPath={`url(#sc${accentColor})`}>
        {hm.grid.map((row, ri) => row.map((count, ci) => count > 0 ? (
          <rect key={`${ri}-${ci}`} x={ci * hm.cW} y={ri * hm.cH} width={hm.cW + 0.5} height={hm.cH + 0.5} fill={cellColor(count)} />
        ) : null))}
      </g>
      <ellipse cx={meanX} cy={meanY} rx={stdX} ry={stdY} fill="none" stroke={`${accent}99`} strokeWidth="1.2" strokeDasharray="4 3"/>
      <ellipse cx={meanX} cy={meanY} rx={stdX * 2} ry={stdY * 2} fill="none" stroke={`${accent}44`} strokeWidth="0.8" strokeDasharray="3 4"/>
      <line x1={meanX - 9} y1={meanY} x2={meanX + 9} y2={meanY} stroke={C.navy} strokeWidth="1.5" strokeLinecap="round"/>
      <line x1={meanX} y1={meanY - 9} x2={meanX} y2={meanY + 9} stroke={C.navy} strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx={meanX} cy={meanY} r="3" fill={C.navy} opacity="0.8"/>
      <text x="3" y="10" fontFamily="DM Mono" fontSize="7" fill={C.textMute}>L</text>
      <text x={W - 9} y="10" fontFamily="DM Mono" fontSize="7" fill={C.textMute}>R</text>
    </svg>
  );
}

// ─── Time Plot ────────────────────────────────────────────────────────────────
function CogYTimePlot({ dataA, dataB = null, threshold, t }) {
  const isZoomed = useContext(ZoomCtx);
  const seriesA = buildTimeSeries(dataA.points);
  const seriesB = dataB ? buildTimeSeries(dataB.points) : null;
  if (seriesA.length === 0) return null;

  const upper = dataA.meanY + threshold, lower = dataA.meanY - threshold;
  const shifts = detectShifts(seriesA, dataA.meanY, threshold);
  const shiftsB = seriesB ? detectShifts(seriesB, dataB.meanY, threshold) : null;

  const PAD = { l: 32, r: 20, t: 14, b: 24 };
  const W = 380, H = isZoomed ? 180 : 130;
  const innerW = W - PAD.l - PAD.r, innerH = H - PAD.t - PAD.b;

  const allY = [...seriesA.map(p => p.y), ...(seriesB || []).map(p => p.y)];
  const yMin = Math.min(...allY, lower - 2), yMax = Math.max(...allY, upper + 2);
  const yPad = Math.max((yMax - yMin) * 0.12, 1);
  const yLo = yMin - yPad, yHi = yMax + yPad;
  const tMinA = seriesA[0].t, tRange = seriesA[seriesA.length - 1].t - tMinA;

  const sx = (tv) => PAD.l + ((tv - tMinA) / tRange) * innerW;
  const sy = (yv) => PAD.t + (1 - (yv - yLo) / (yHi - yLo)) * innerH;
  const upperSy = sy(upper), lowerSy = sy(lower), meanSy = sy(dataA.meanY);

  const segments = [];
  let cur = null;
  for (let i = 0; i < seriesA.length; i++) {
    const p = seriesA[i];
    const col = (p.y > upper || p.y < lower) ? C.warnBad : C.blue;
    if (!cur || col !== cur.col) { if (cur?.pts.length) cur.pts.push(p); cur = { col, pts: [] }; segments.push(cur); }
    cur.pts.push(p);
  }
  const toLine = (pts, tMin = tMinA) => pts.map(p => `${(PAD.l + ((p.t - tMin) / tRange) * innerW).toFixed(1)},${sy(p.y).toFixed(1)}`).join(" ");
  const lineB = seriesB ? seriesB.map(p => `${(PAD.l + ((p.t - seriesB[0].t) / tRange) * innerW).toFixed(1)},${sy(p.y).toFixed(1)}`).join(" ") : null;

  const tickInterval = tRange > 120 ? 30 : tRange > 60 ? 15 : 10;
  const ticks = [];
  for (let tv = Math.ceil(tMinA / tickInterval) * tickInterval; tv <= tMinA + tRange; tv += tickInterval) ticks.push(tv);

  const shiftColor = shifts.total === 0 ? C.warnOk : shifts.total < 5 ? C.warnMid : C.warnBad;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontFamily: "'DM Sans'", fontSize: 12, fontWeight: 600, color: C.textPri }}>CoG Y — {t.cogAP}</span>
        <div style={{ display: "flex", gap: 12 }}>
          {dataB && <span style={{ fontFamily: "'DM Mono'", fontSize: 10, color: C.green }}>B ø{dataB.meanY.toFixed(1)}</span>}
          <span style={{ fontFamily: "'DM Mono'", fontSize: 10, color: C.blue }}>A ø{dataA.meanY.toFixed(1)}</span>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", overflow: "visible" }}>
        <defs>
          <clipPath id="pClip"><rect x={PAD.l} y={PAD.t} width={innerW} height={innerH} /></clipPath>
        </defs>
        {/* threshold zone */}
        <rect x={PAD.l} y={upperSy} width={innerW} height={lowerSy - upperSy} fill={`${C.green}18`} clipPath="url(#pClip)"/>
        {/* grid */}
        {[0, 0.25, 0.5, 0.75, 1].map(f => {
          const yv = yLo + f * (yHi - yLo), yp = sy(yv);
          return (<g key={f}>
            <line x1={PAD.l} y1={yp} x2={W - PAD.r} y2={yp} stroke={C.borderSub} strokeWidth="0.8"/>
            <text x={PAD.l - 4} y={yp + 3.5} textAnchor="end" fontFamily="DM Mono" fontSize="8" fill={C.textMute}>{yv.toFixed(0)}</text>
          </g>);
        })}
        {ticks.map(tv => (
          <g key={tv}>
            <line x1={sx(tv)} y1={PAD.t + innerH} x2={sx(tv)} y2={PAD.t + innerH + 3} stroke={C.border} strokeWidth="0.8"/>
            <text x={sx(tv)} y={H - 5} textAnchor="middle" fontFamily="DM Mono" fontSize="8" fill={C.textMute}>{(tv - tMinA).toFixed(0)}s</text>
          </g>
        ))}
        {/* mean */}
        <line x1={PAD.l} y1={meanSy} x2={W - PAD.r} y2={meanSy} stroke={`${C.navy}40`} strokeWidth="1" strokeDasharray="5 4"/>
        {/* thresholds */}
        <line x1={PAD.l} y1={upperSy} x2={W - PAD.r} y2={upperSy} stroke={`${C.warnBad}80`} strokeWidth="1" strokeDasharray="3 4"/>
        <line x1={PAD.l} y1={lowerSy} x2={W - PAD.r} y2={lowerSy} stroke={`${C.warnBad}80`} strokeWidth="1" strokeDasharray="3 4"/>
        <text x={W - PAD.r + 3} y={upperSy + 3.5} fontFamily="DM Mono" fontSize="7.5" fill={C.warnBad}>+{threshold}</text>
        <text x={W - PAD.r + 3} y={lowerSy + 3.5} fontFamily="DM Mono" fontSize="7.5" fill={C.warnBad}>-{threshold}</text>
        {/* series B */}
        {lineB && <polyline points={lineB} fill="none" stroke={C.green} strokeWidth="1.5" strokeLinejoin="round" clipPath="url(#pClip)" opacity="0.7"/>}
        {/* series A */}
        {segments.map((seg, i) => (
          <polyline key={i} points={toLine(seg.pts)} fill="none" stroke={seg.col} strokeWidth={seg.col === C.warnBad ? 2 : 1.5} strokeLinejoin="round" clipPath="url(#pClip)"/>
        ))}
        {/* axes */}
        <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={PAD.t + innerH} stroke={C.border} strokeWidth="1"/>
        <line x1={PAD.l} y1={PAD.t + innerH} x2={W - PAD.r} y2={PAD.t + innerH} stroke={C.border} strokeWidth="1"/>
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2, marginBottom: 14 }}>
        <span style={{ fontFamily: "'DM Mono'", fontSize: 8, color: C.textMute }}>{t.cogFront}</span>
        <span style={{ fontFamily: "'DM Mono'", fontSize: 8, color: C.textMute }}>{t.cogRear}</span>
      </div>
      {/* shift stats */}
      <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 12, display: "grid", gridTemplateColumns: dataB ? "1fr 1fr 1fr 1fr 1fr" : "1fr 1fr 1fr 1fr", gap: 8 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: "'DM Mono'", fontSize: 8, color: C.textMute, marginBottom: 4 }}>{t.cogThreshold}</div>
          <div style={{ fontFamily: "'Bebas Neue'", fontSize: 22, color: C.textSec }}>±{threshold}</div>
        </div>
        {[{ label: t.cogShiftsUp, val: shifts.shiftsUp }, { label: t.cogShiftsDown, val: shifts.shiftsDown }].map(({ label, val }) => (
          <div key={label} style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "'DM Mono'", fontSize: 8, color: C.textMute, marginBottom: 4 }}>{label}</div>
            <div style={{ fontFamily: "'Bebas Neue'", fontSize: 26, color: val > 0 ? C.warnBad : C.warnOk }}>{val}</div>
          </div>
        ))}
        <div style={{ textAlign: "center", background: C.bgInput, borderRadius: 8, padding: "6px 4px" }}>
          <div style={{ fontFamily: "'DM Mono'", fontSize: 8, color: C.textMute, marginBottom: 4 }}>A {t.cogShifts}</div>
          <div style={{ fontFamily: "'Bebas Neue'", fontSize: 30, color: shiftColor }}>{shifts.total}</div>
        </div>
        {dataB && (
          <div style={{ textAlign: "center", background: C.greenLight, borderRadius: 8, padding: "6px 4px" }}>
            <div style={{ fontFamily: "'DM Mono'", fontSize: 8, color: C.greenDark, marginBottom: 4 }}>B {t.cogShifts}</div>
            <div style={{ fontFamily: "'Bebas Neue'", fontSize: 30, color: C.greenDark }}>{shiftsB.total}</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Compare stats table ──────────────────────────────────────────────────────
function CompareStats({ dataA, dataB, t }) {
  const rows = [
    { label: "ø CoG X", a: dataA.meanX.toFixed(1), b: dataB.meanX.toFixed(1), diff: (dataB.meanX - dataA.meanX).toFixed(1) },
    { label: "ø CoG Y", a: dataA.meanY.toFixed(1), b: dataB.meanY.toFixed(1), diff: (dataB.meanY - dataA.meanY).toFixed(1) },
    { label: "σ X", a: dataA.stdX.toFixed(1), b: dataB.stdX.toFixed(1), diff: (dataB.stdX - dataA.stdX).toFixed(1) },
    { label: "σ Y", a: dataA.stdY.toFixed(1), b: dataB.stdY.toFixed(1), diff: (dataB.stdY - dataA.stdY).toFixed(1) },
    { label: "L/R", a: `${dataA.lrBias.toFixed(1)}%`, b: `${dataB.lrBias.toFixed(1)}%`, diff: `${(dataB.lrBias - dataA.lrBias).toFixed(1)}%` },
  ];
  return (
    <div>
      <div style={{ fontFamily: "'DM Sans'", fontSize: 12, fontWeight: 600, color: C.textPri, marginBottom: 10 }}>{t.compareTitle}</div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>{["", "A", "B", "Δ"].map((h, i) => (
            <th key={i} style={{ fontFamily: "'DM Mono'", fontSize: 9, fontWeight: 500, color: [C.textMute, C.blue, C.green, C.warnMid][i], textAlign: i === 0 ? "left" : "center", padding: "4px 6px", borderBottom: `1px solid ${C.border}`, letterSpacing: 1 }}>{h}</th>
          ))}</tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <td style={{ fontFamily: "'DM Sans'", fontSize: 12, color: C.textSec, padding: "6px 6px" }}>{row.label}</td>
              <td style={{ fontFamily: "'DM Mono'", fontSize: 13, color: C.blue, textAlign: "center", padding: "6px" }}>{row.a}</td>
              <td style={{ fontFamily: "'DM Mono'", fontSize: 13, color: C.green, textAlign: "center", padding: "6px" }}>{row.b}</td>
              <td style={{ fontFamily: "'DM Mono'", fontSize: 13, color: parseFloat(row.diff) === 0 ? C.textMute : C.warnMid, textAlign: "center", padding: "6px" }}>{parseFloat(row.diff) > 0 ? "+" : ""}{row.diff}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Upload zone ──────────────────────────────────────────────────────────────
function UploadZone({ label, onData, color, t }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);
  const handle = useCallback((file) => {
    if (!file) return;
    setLoading(true); setError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const r = parseCogFile(e.target.result);
      if (!r) setError("Lesefehler"); else onData(r);
      setLoading(false);
    };
    reader.onerror = () => { setError("Fehler"); setLoading(false); };
    reader.readAsText(file);
  }, [onData]);

  return (
    <div onDrop={e => { e.preventDefault(); handle(e.dataTransfer.files[0]); }}
      onDragOver={e => e.preventDefault()} onClick={() => inputRef.current?.click()}
      style={{ background: C.bgCard, border: `2px dashed ${color}66`, borderRadius: 12, padding: "28px 20px", textAlign: "center", cursor: "pointer", transition: "border-color 0.15s", boxShadow: C.shadow }}>
      <input ref={inputRef} type="file" accept=".txt,.csv" onChange={e => handle(e.target.files[0])} style={{ display: "none" }}/>
      <div style={{ fontFamily: "'DM Mono'", fontSize: 10, color, letterSpacing: 2, marginBottom: 8, fontWeight: 500 }}>{label}</div>
      <div style={{ fontFamily: "'DM Sans'", fontSize: 14, color: C.textPri, fontWeight: 500, marginBottom: 4 }}>{t.uploadHint}</div>
      <div style={{ fontFamily: "'DM Sans'", fontSize: 11, color: C.textMute, marginBottom: 14 }}>{t.uploadSub}</div>
      <div style={{ display: "inline-block", background: color, borderRadius: 8, padding: "9px 20px", fontFamily: "'DM Sans'", fontSize: 12, fontWeight: 600, color: "#fff", letterSpacing: 1 }}>
        {loading ? "..." : t.uploadBtn}
      </div>
      {error && <div style={{ marginTop: 8, fontFamily: "'DM Mono'", fontSize: 10, color: C.warnBad }}>{error}</div>}
    </div>
  );
}

// ─── CoG Screen ───────────────────────────────────────────────────────────────
function CogScreen({ t, isWide }) {
  const [dataA, setDataA] = useState(null);
  const [dataB, setDataB] = useState(null);
  const [threshold, setThreshold] = useState(20);

  if (!dataA) return (
    <div style={{ maxWidth: 520, margin: "0 auto" }}>
      <UploadZone label={t.compareA} onData={setDataA} color={C.blue} t={t}/>
    </div>
  );

  const lrColor = (b) => Math.abs(b) < 3 ? C.warnOk : Math.abs(b) < 7 ? C.warnMid : C.warnBad;

  const FileTag = ({ data, label, color, onClear }) => (
    <div style={{ background: C.bgCard, border: `1px solid ${color}55`, borderRadius: 10, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: C.shadow }}>
      <div>
        <div style={{ fontFamily: "'DM Mono'", fontSize: 9, color, fontWeight: 500, letterSpacing: 2, marginBottom: 2 }}>{label}</div>
        <div style={{ fontFamily: "'DM Sans'", fontSize: 12, color: C.textSec }}>{data.date} {data.time} · {data.points.length.toLocaleString()} pts · {data.duration.toFixed(0)}s</div>
      </div>
      <button onClick={onClear} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 6, padding: "5px 10px", fontFamily: "'DM Sans'", fontSize: 11, color: C.textSec, cursor: "pointer" }}>{t.cogNewFile}</button>
    </div>
  );

  const HeatmapCard = ({ data, label, color }) => (
    <div>
      <div style={{ fontFamily: "'DM Mono'", fontSize: 9, color, fontWeight: 500, letterSpacing: 2, marginBottom: 8 }}>{label}</div>
      <SaddleHeatmap data={data} accentColor={color}/>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
        <span style={{ fontFamily: "'DM Mono'", fontSize: 8, color: C.textMute }}>← {t.cogFront}</span>
        <span style={{ fontFamily: "'DM Mono'", fontSize: 9, color: C.navy, fontWeight: 500 }}>ø {data.meanX.toFixed(1)} / {data.meanY.toFixed(1)}</span>
        <span style={{ fontFamily: "'DM Mono'", fontSize: 8, color: C.textMute }}>{t.cogRear} →</span>
      </div>
      {/* LR bar */}
      <div style={{ marginTop: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
          <span style={{ fontFamily: "'DM Mono'", fontSize: 9, color: C.textMute }}>{t.cogLeft}</span>
          <span style={{ fontFamily: "'DM Mono'", fontSize: 9, color: lrColor(data.lrBias), fontWeight: 500 }}>{Math.abs(data.lrBias) < 2 ? t.cogCenter : `${data.lrBias > 0 ? t.cogRight : t.cogLeft} ${Math.abs(data.lrBias).toFixed(1)}%`}</span>
          <span style={{ fontFamily: "'DM Mono'", fontSize: 9, color: C.textMute }}>{t.cogRight}</span>
        </div>
        <div style={{ height: 7, borderRadius: 4, background: C.bgInput, overflow: "hidden", position: "relative", border: `1px solid ${C.border}` }}>
          <div style={{ position: "absolute", left: "50%", width: 1, height: "100%", background: C.border }}/>
          <div style={{ position: "absolute", top: 0, height: "100%", left: data.lrBias >= 0 ? "50%" : `${50 + data.lrBias / 2}%`, width: `${Math.abs(data.lrBias) / 2}%`, background: lrColor(data.lrBias), borderRadius: 2 }}/>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* file tags */}
      <div style={{ display: "grid", gridTemplateColumns: dataB ? "1fr 1fr" : "1fr auto", gap: 10, alignItems: "stretch" }}>
        <FileTag data={dataA} label={t.compareA} color={C.blue} onClear={() => { setDataA(null); setDataB(null); }}/>
        {dataB
          ? <FileTag data={dataB} label={t.compareB} color={C.green} onClear={() => setDataB(null)}/>
          : <UploadZone label={t.compareB} onData={setDataB} color={C.green} t={t}/>
        }
      </div>

      {/* heatmaps */}
      <ZoomCard label="HEATMAP">
        <Card title="CoG Bewegung" subtitle={dataB ? "1σ · 2σ Ellipsen" : ""}>
          <div style={{ display: "grid", gridTemplateColumns: dataB ? "1fr 1fr" : "1fr", gap: 16 }}>
            <HeatmapCard data={dataA} label={t.compareA} color="blue"/>
            {dataB && <HeatmapCard data={dataB} label={t.compareB} color="green"/>}
          </div>
        </Card>
      </ZoomCard>

      {/* compare stats */}
      {dataB && <Card title={t.compareTitle}><CompareStats dataA={dataA} dataB={dataB} t={t}/></Card>}

      {/* time plot */}
      <ZoomCard label="CoG Y / TIME">
        <Card title={`CoG Y — ${t.cogAP}`} subtitle={dataB ? `A=${C.blue} B=${C.green}` : ""}>
          <CogYTimePlot dataA={dataA} dataB={dataB} threshold={threshold} t={t}/>
        </Card>
      </ZoomCard>

      {/* threshold */}
      <Card>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontFamily: "'DM Sans'", fontSize: 13, fontWeight: 600, color: C.textPri }}>{t.cogThreshold}</div>
            <div style={{ fontFamily: "'DM Sans'", fontSize: 11, color: C.textMute, marginTop: 2 }}>Abweichung von Mittelwert</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => setThreshold(v => Math.max(1, v - 1))} style={{ background: C.bgInput, border: `1px solid ${C.border}`, borderRadius: 8, width: 36, height: 36, fontFamily: "'DM Mono'", fontSize: 20, color: C.textSec, cursor: "pointer" }}>−</button>
            <span style={{ fontFamily: "'Bebas Neue'", fontSize: 30, color: C.textPri, minWidth: 52, textAlign: "center" }}>± {threshold}</span>
            <button onClick={() => setThreshold(v => Math.min(50, v + 1))} style={{ background: C.bgInput, border: `1px solid ${C.border}`, borderRadius: 8, width: 36, height: 36, fontFamily: "'DM Mono'", fontSize: 20, color: C.textSec, cursor: "pointer" }}>+</button>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ─── Shared layout components ─────────────────────────────────────────────────
function Card({ children, title, subtitle, noPad }) {
  return (
    <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 14, padding: noPad ? 0 : "18px 20px", boxShadow: C.shadow }}>
      {(title || subtitle) && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
          {title && <span style={{ fontFamily: "'DM Sans'", fontSize: 13, fontWeight: 600, color: C.textPri }}>{title}</span>}
          {subtitle && <span style={{ fontFamily: "'DM Mono'", fontSize: 9, color: C.textMute, letterSpacing: 1 }}>{subtitle}</span>}
        </div>
      )}
      {children}
    </div>
  );
}

function MetricTile({ label, value, unit, color, large }) {
  return (
    <div style={{ textAlign: "center", background: C.bgInput, borderRadius: 10, padding: large ? "16px 10px" : "12px 8px" }}>
      <div style={{ fontFamily: "'DM Sans'", fontSize: 10, fontWeight: 500, color: C.textMute, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: "'Bebas Neue'", fontSize: large ? 42 : 32, lineHeight: 1, color }}>{value}</div>
      <div style={{ fontFamily: "'DM Mono'", fontSize: 10, color: C.textMute, marginTop: 3 }}>{unit}</div>
    </div>
  );
}

function LangToggle({ lang, setLang }) {
  return (
    <div style={{ display: "flex", background: C.bgInput, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
      {["de", "en"].map(l => (
        <button key={l} onClick={() => setLang(l)} style={{ padding: "6px 14px", fontFamily: "'DM Sans'", fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer", background: lang === l ? C.green : "transparent", color: lang === l ? "#fff" : C.textSec, transition: "all 0.15s", letterSpacing: 0.5 }}>{l.toUpperCase()}</button>
      ))}
    </div>
  );
}

function TabBar({ tab, setTab, t }) {
  return (
    <div style={{ display: "flex", background: C.bgInput, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden", marginBottom: 20 }}>
      {[{ id: "load", label: t.tabLoad }, { id: "cog", label: t.tabCog }].map(tb => (
        <button key={tb.id} onClick={() => setTab(tb.id)} style={{ flex: 1, padding: "11px 12px", fontFamily: "'DM Sans'", fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer", background: tab === tb.id ? C.navy : "transparent", color: tab === tb.id ? "#fff" : C.textSec, transition: "all 0.18s" }}>{tb.label}</button>
      ))}
    </div>
  );
}

// ─── Schematic (light theme) ──────────────────────────────────────────────────
const X_PAD = 88, X_SAD = 316, BASELINE_Y = 148, MAX_ARROW = 90;

function Schematic({ saddleForce, padLForce, padRForce, maxForce, t }) {
  const padForce = padLForce + padRForce, total = saddleForce + padForce;
  const cogX = total > 0 ? (X_PAD * padForce + X_SAD * saddleForce) / total : (X_PAD + X_SAD) / 2;
  const animCogX = useAnimatedValue(cogX), animSad = useAnimatedValue(saddleForce);
  const animPad = useAnimatedValue(padForce), animPadL = useAnimatedValue(padLForce), animPadR = useAnimatedValue(padRForce);
  const hSad = maxForce > 0 ? (animSad / maxForce) * MAX_ARROW : 0;
  const hPad = maxForce > 0 ? (animPad / maxForce) * MAX_ARROW : 0;
  const hPadL = maxForce > 0 ? (animPadL / maxForce) * MAX_ARROW : 0;
  const hPadR = maxForce > 0 ? (animPadR / maxForce) * MAX_ARROW : 0;
  const cogPct = total > 0 ? ((X_SAD - animCogX) / (X_SAD - X_PAD) * 100) : 50;
  const AW = 5;

  return (
    <svg viewBox="0 0 404 200" style={{ width: "100%", overflow: "visible" }}>
      {/* axis */}
      <line x1="48" y1={BASELINE_Y} x2="360" y2={BASELINE_Y} stroke={C.border} strokeWidth="1.5"/>
      <line x1="48" y1={BASELINE_Y-6} x2="48" y2={BASELINE_Y+6} stroke={C.border} strokeWidth="1.5"/>
      <line x1="360" y1={BASELINE_Y-6} x2="360" y2={BASELINE_Y+6} stroke={C.border} strokeWidth="1.5"/>
      <text x="200" y={BASELINE_Y+16} textAnchor="middle" fontFamily="DM Mono" fontSize="8.5" fill={C.textMute} letterSpacing="2">{t.front} · {t.rear}</text>
      {/* bracket */}
      <line x1={X_PAD} y1={BASELINE_Y+28} x2={X_SAD} y2={BASELINE_Y+28} stroke={C.border} strokeWidth="1"/>
      <line x1={X_PAD} y1={BASELINE_Y+24} x2={X_PAD} y2={BASELINE_Y+32} stroke={C.border} strokeWidth="1"/>
      <line x1={X_SAD} y1={BASELINE_Y+24} x2={X_SAD} y2={BASELINE_Y+32} stroke={C.border} strokeWidth="1"/>
      <text x={(X_PAD+X_SAD)/2} y={BASELINE_Y+42} textAnchor="middle" fontFamily="DM Mono" fontSize="8" fill={C.textMute} letterSpacing="1">{t.supportBase}</text>
      {/* pad guide */}
      <line x1={X_PAD} y1={BASELINE_Y-hPad-8} x2={X_PAD} y2={BASELINE_Y} stroke={`${C.green}50`} strokeWidth="1" strokeDasharray="3 3"/>
      <circle cx={X_PAD} cy={BASELINE_Y} r="6" fill={C.bgCard} stroke={C.green} strokeWidth="2.5"/>
      {hPad > 2 && (
        <g>
          <line x1={X_PAD} y1={BASELINE_Y-6} x2={X_PAD} y2={BASELINE_Y-hPad+AW+2} stroke={C.green} strokeWidth="2.5" strokeLinecap="round"/>
          <polygon points={`${X_PAD},${BASELINE_Y-6} ${X_PAD-AW},${BASELINE_Y-6-AW*1.8} ${X_PAD+AW},${BASELINE_Y-6-AW*1.8}`} fill={C.green}/>
        </g>
      )}
      <text x={X_PAD} y={BASELINE_Y-hPad-15} textAnchor="middle" fontFamily="DM Mono" fontSize="13" fontWeight="500" fill={C.greenDark}>{Math.round(animPad)}</text>
      <text x={X_PAD} y={BASELINE_Y-hPad-4} textAnchor="middle" fontFamily="DM Mono" fontSize="9" fill={C.textMute}>N</text>
      <text x={X_PAD} y={BASELINE_Y+15} textAnchor="middle" fontFamily="DM Sans" fontSize="9" fontWeight="600" fill={C.greenDark} letterSpacing="1">{t.pads}</text>
      {/* L/R splits */}
      {(padLForce>0||padRForce>0)&&(<g opacity="0.7">
        <rect x={X_PAD-22} y={BASELINE_Y-hPadL*0.28-2} width="8" height={hPadL*0.28+2} rx="2" fill={C.greenLight} stroke={C.green} strokeWidth="0.8"/>
        <text x={X_PAD-18} y={BASELINE_Y-hPadL*0.28-6} textAnchor="middle" fontFamily="DM Mono" fontSize="7" fill={C.greenDark}>L</text>
        <rect x={X_PAD+14} y={BASELINE_Y-hPadR*0.28-2} width="8" height={hPadR*0.28+2} rx="2" fill={C.greenLight} stroke={C.green} strokeWidth="0.8"/>
        <text x={X_PAD+18} y={BASELINE_Y-hPadR*0.28-6} textAnchor="middle" fontFamily="DM Mono" fontSize="7" fill={C.greenDark}>R</text>
      </g>)}
      {/* saddle guide */}
      <line x1={X_SAD} y1={BASELINE_Y-hSad-8} x2={X_SAD} y2={BASELINE_Y} stroke={`${C.blue}50`} strokeWidth="1" strokeDasharray="3 3"/>
      <circle cx={X_SAD} cy={BASELINE_Y} r="6" fill={C.bgCard} stroke={C.blue} strokeWidth="2.5"/>
      {hSad > 2 && (
        <g>
          <line x1={X_SAD} y1={BASELINE_Y-6} x2={X_SAD} y2={BASELINE_Y-hSad+AW+2} stroke={C.blue} strokeWidth="2.5" strokeLinecap="round"/>
          <polygon points={`${X_SAD},${BASELINE_Y-6} ${X_SAD-AW},${BASELINE_Y-6-AW*1.8} ${X_SAD+AW},${BASELINE_Y-6-AW*1.8}`} fill={C.blue}/>
        </g>
      )}
      <text x={X_SAD} y={BASELINE_Y-hSad-15} textAnchor="middle" fontFamily="DM Mono" fontSize="13" fontWeight="500" fill={C.blue}>{Math.round(animSad)}</text>
      <text x={X_SAD} y={BASELINE_Y-hSad-4} textAnchor="middle" fontFamily="DM Mono" fontSize="9" fill={C.textMute}>N</text>
      <text x={X_SAD} y={BASELINE_Y+15} textAnchor="middle" fontFamily="DM Sans" fontSize="9" fontWeight="600" fill={C.blue} letterSpacing="1">{t.saddleUp}</text>
      {/* CoG zone */}
      <rect x={X_PAD} y={BASELINE_Y-3} width={X_SAD-X_PAD} height="6" fill={`${C.navy}08`} rx="3"/>
      <line x1={animCogX} y1="8" x2={animCogX} y2={BASELINE_Y+22} stroke={C.navy} strokeWidth="1.5" strokeDasharray="5 4" opacity="0.6"/>
      <polygon points={`${animCogX},${BASELINE_Y+5} ${animCogX-6},${BASELINE_Y-5} ${animCogX+6},${BASELINE_Y-5}`} fill={C.navy} opacity="0.7"/>
      <rect x={animCogX-22} y="1" width="44" height="15" rx="4" fill={C.bgCard} stroke={C.border} strokeWidth="1"/>
      <text x={animCogX} y="11.5" textAnchor="middle" fontFamily="DM Mono" fontSize="8" fill={C.navy} fontWeight="500" letterSpacing="1.5">{t.cogLabel}</text>
      <text x={animCogX} y={BASELINE_Y+22} textAnchor="middle" fontFamily="DM Mono" fontSize="8" fill={C.textMute}>{`${cogPct.toFixed(0)}% ${t.cogUnit}`}</text>
    </svg>
  );
}

function DistributionBar({ saddle, padL, padR, t }) {
  const total = saddle + padL + padR;
  const sP = useAnimatedValue(total > 0 ? (saddle / total) * 100 : 50);
  const pP = useAnimatedValue(total > 0 ? ((padL + padR) / total) * 100 : 50);
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontFamily: "'DM Sans'", fontSize: 13, fontWeight: 600, color: C.greenDark }}>{t.pads} {pP.toFixed(1)}%</span>
        <span style={{ fontFamily: "'DM Sans'", fontSize: 12, color: C.textMute }}>{t.loadDist}</span>
        <span style={{ fontFamily: "'DM Sans'", fontSize: 13, fontWeight: 600, color: C.blue }}>{t.saddleUp} {sP.toFixed(1)}%</span>
      </div>
      <div style={{ height: 12, borderRadius: 6, background: C.bgInput, overflow: "hidden", display: "flex", border: `1px solid ${C.border}` }}>
        <div style={{ width: `${pP}%`, background: `linear-gradient(90deg,${C.greenDark},${C.green})`, transition: "width 0.05s", borderRadius: "6px 0 0 6px" }}/>
        <div style={{ flex: 1, background: `linear-gradient(90deg,${C.blue},${C.blueMid})`, borderRadius: "0 6px 6px 0" }}/>
      </div>
    </div>
  );
}

function AsymmetryBar({ padL, padR, t }) {
  const total = padL + padR;
  const asym = useAnimatedValue(total > 0 ? ((padL - padR) / total) * 100 : 0);
  const abs = Math.abs(asym), color = abs < 5 ? C.warnOk : abs < 10 ? C.warnMid : C.warnBad;
  const label = abs < 3 ? t.symm : asym > 0 ? `${t.left} +${abs.toFixed(1)}%` : `${t.right} +${abs.toFixed(1)}%`;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontFamily: "'DM Sans'", fontSize: 12, color: C.textSec }}>{t.left}</span>
        <span style={{ fontFamily: "'DM Sans'", fontSize: 12, fontWeight: 600, color }}>{label}</span>
        <span style={{ fontFamily: "'DM Sans'", fontSize: 12, color: C.textSec }}>{t.right}</span>
      </div>
      <div style={{ height: 8, borderRadius: 4, background: C.bgInput, overflow: "hidden", position: "relative", border: `1px solid ${C.border}` }}>
        <div style={{ position: "absolute", left: "50%", width: 1, height: "100%", background: C.border }}/>
        <div style={{ position: "absolute", top: 0, height: "100%", left: asym >= 0 ? "50%" : `${50 + asym / 2}%`, width: `${abs / 2}%`, background: color, borderRadius: 2 }}/>
      </div>
    </div>
  );
}

function ForceBarChart({ padL, padR, saddle, mode, bodyWeightN, t }) {
  const aPadL = useAnimatedValue(padL), aPadR = useAnimatedValue(padR), aSaddle = useAnimatedValue(saddle);
  const toVal = (v) => mode === "percent" ? (bodyWeightN > 0 ? (v / bodyWeightN) * 100 : 0) : v;
  const vals = [toVal(aPadL + aPadR), toVal(aSaddle)], maxVal = Math.max(...vals, 1), H = 100;
  const labels = [t.pads, t.saddleUp], colors = [C.green, C.blue];
  const unit = mode === "percent" ? "%" : "N";
  return (
    <div>
      <div style={{ fontFamily: "'DM Sans'", fontSize: 12, fontWeight: 600, color: C.textPri, marginBottom: 12 }}>{mode === "percent" ? `% ${t.weight}` : "Newton"}</div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-around", height: H, gap: 16, padding: "0 16px" }}>
        {vals.map((val, i) => {
          const h = maxVal > 0 ? Math.max((val / maxVal) * H, 3) : 3;
          return (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, flex: 1 }}>
              <span style={{ fontFamily: "'DM Sans'", fontSize: 14, fontWeight: 600, color: colors[i] }}>{mode === "percent" ? val.toFixed(0) : Math.round(val)}<span style={{ fontSize: 10, fontWeight: 400, color: C.textMute, marginLeft: 2 }}>{unit}</span></span>
              <div style={{ width: "100%", maxWidth: 60, height: h, background: `linear-gradient(180deg,${colors[i]},${colors[i]}aa)`, borderRadius: "6px 6px 3px 3px", minHeight: 3 }}/>
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", justifyContent: "space-around", marginTop: 8, padding: "0 16px" }}>
        {labels.map((l, i) => (<span key={i} style={{ fontFamily: "'DM Sans'", fontSize: 11, fontWeight: 600, color: colors[i], textAlign: "center", flex: 1 }}>{l}</span>))}
      </div>
    </div>
  );
}

function BigInputField({ label, value, onChange, color, unit = "N", sublabel }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <label style={{ fontFamily: "'DM Sans'", fontSize: 11, fontWeight: 600, color: C.textSec, letterSpacing: "1px", textTransform: "uppercase" }}>{label}</label>
        {sublabel && <span style={{ fontFamily: "'DM Mono'", fontSize: 10, color: C.textMute }}>{sublabel}</span>}
      </div>
      <div style={{ position: "relative" }}>
        <input type="number" value={value} onChange={e => onChange(Number(e.target.value) || 0)} inputMode="numeric" min={0} max={unit === "kg" ? 200 : 999}
          style={{ width: "100%", background: C.bgInput, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "14px 44px 14px 16px", fontFamily: "'DM Mono'", fontSize: 30, fontWeight: 500, color: C.textPri, outline: "none", boxSizing: "border-box", transition: "border-color 0.15s" }}
          onFocus={e => e.target.style.borderColor = color}
          onBlur={e => e.target.style.borderColor = C.border}/>
        <span style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", fontFamily: "'DM Sans'", fontSize: 13, fontWeight: 600, color: C.textMute }}>{unit}</span>
      </div>
    </div>
  );
}

function InstallBanner({ onInstall, t }) {
  const [v, setV] = useState(true);
  if (!v) return null;
  return (
    <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, boxShadow: C.shadow }}>
      <div>
        <div style={{ fontFamily: "'DM Sans'", fontSize: 13, color: C.textPri, fontWeight: 600 }}>{t.install}</div>
        <div style={{ fontFamily: "'DM Sans'", fontSize: 11, color: C.textMute, marginTop: 2 }}>{t.installSub}</div>
      </div>
      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
        <button onClick={() => setV(false)} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", fontFamily: "'DM Sans'", fontSize: 12, color: C.textSec, cursor: "pointer" }}>{t.later}</button>
        <button onClick={onInstall} style={{ background: C.green, border: "none", borderRadius: 8, padding: "8px 16px", fontFamily: "'DM Sans'", fontSize: 12, color: "#fff", fontWeight: 600, cursor: "pointer" }}>{t.installBtn}</button>
      </div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [saddle, setSaddle] = useState(280), [padL, setPadL] = useState(120), [padR, setPadR] = useState(115), [bw, setBw] = useState(75);
  const [screen, setScreen] = useState("input"), [tab, setTab] = useState("load");
  const [lang, setLang] = useState(() => (navigator.language || "de").startsWith("de") ? "de" : "en");
  const { canInstall, install } = useInstallPrompt();
  const isWide = useIsWide();
  const t = T[lang];
  const bodyWeightN = bw * 9.81, total = saddle + padL + padR, maxForce = Math.max(saddle, padL + padR, 1);
  const pctBWSad = bodyWeightN > 0 ? ((saddle / bodyWeightN) * 100).toFixed(0) : "—";
  const pctBWPads = bodyWeightN > 0 ? (((padL + padR) / bodyWeightN) * 100).toFixed(0) : "—";

  const css = `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { height: 100%; background: ${C.bgPage}; }
    @keyframes fadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
    .fade { animation: fadeIn 0.25s ease; }
    input[type=number]::-webkit-inner-spin-button, input[type=number]::-webkit-outer-spin-button { -webkit-appearance:none; }
    input[type=number] { -moz-appearance:textfield; appearance:textfield; }
    button:hover { opacity: 0.85; }
  `;

  const pageWrap = {
    minHeight: "100dvh",
    background: C.bgPage,
    fontFamily: "'DM Sans', sans-serif",
  };

  const Header = () => (
    <div style={{ background: C.bgCard, borderBottom: `1px solid ${C.border}`, padding: isWide ? "14px 32px" : "12px 20px", display: "flex", alignItems: "center", gap: 16, boxShadow: "0 1px 3px rgba(26,45,72,0.06)" }}>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <span style={{ fontFamily: "'Bebas Neue'", fontSize: isWide ? 28 : 22, letterSpacing: 4, color: C.navy }}>GEBIOMIZED</span>
          <span style={{ fontFamily: "'DM Sans'", fontSize: 11, fontWeight: 600, color: C.textMute, letterSpacing: 2 }}>LOAD BALANCE</span>
        </div>
        <div style={{ fontFamily: "'DM Sans'", fontSize: 11, color: C.textMute, marginTop: 1 }}>{t.appSub}</div>
      </div>
      <LangToggle lang={lang} setLang={setLang}/>
    </div>
  );

  const content = {
    maxWidth: isWide ? 1100 : 480,
    margin: "0 auto",
    padding: isWide ? "28px 32px" : "20px 16px",
  };

  /* ── INPUT ── */
  if (tab === "load" && screen === "input") return (
    <><link rel="stylesheet" href={FONT}/><style>{css}</style>
    <div style={pageWrap}>
      <Header/>
      <div style={content} className="fade">
        {canInstall && <InstallBanner onInstall={install} t={t}/>}
        <TabBar tab={tab} setTab={id => { setTab(id); setScreen("input"); }} t={t}/>
        <div style={{ display: "grid", gridTemplateColumns: isWide ? "1fr 1fr 1fr 1fr" : "1fr 1fr", gap: 14, marginBottom: 14 }}>
          <Card title={t.armpads}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <BigInputField label={t.left} value={padL} onChange={setPadL} color={C.green}/>
              <BigInputField label={t.right} value={padR} onChange={setPadR} color={C.green}/>
            </div>
          </Card>
          <Card title={t.saddle}>
            <BigInputField label={t.avgForce} value={saddle} onChange={setSaddle} color={C.blue}/>
          </Card>
          <Card title={t.bodyweight}>
            <BigInputField label={t.weight} value={bw} onChange={setBw} color={C.textSec} unit="kg" sublabel={`= ${bodyWeightN.toFixed(0)} N`}/>
          </Card>
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
            <button onClick={() => setScreen("results")} style={{ width: "100%", background: C.green, border: "none", borderRadius: 12, padding: "18px", fontFamily: "'DM Sans'", fontSize: 16, fontWeight: 700, letterSpacing: 2, color: "#fff", cursor: "pointer", boxShadow: `0 4px 14px ${C.green}55` }}>
              {t.analyze}
            </button>
          </div>
        </div>
      </div>
      <div style={{ textAlign: "center", padding: "16px 0 24px" }}><span style={{ fontFamily: "'DM Mono'", fontSize: 9, color: C.textMute, letterSpacing: 2 }}>{t.footer}</span></div>
    </div></>
  );

  /* ── RESULTS ── */
  if (tab === "load" && screen === "results") return (
    <><link rel="stylesheet" href={FONT}/><style>{css}</style>
    <div style={pageWrap}>
      <Header/>
      <div style={content} className="fade">
        <TabBar tab={tab} setTab={id => { setTab(id); setScreen("input"); }} t={t}/>
        <div style={{ display: "grid", gridTemplateColumns: isWide ? "1.4fr 1fr" : "1fr", gap: 16, marginBottom: 16 }}>
          {/* Left: schematic */}
          <ZoomCard label="SCHEMATIC">
            <Card title="Lastverteilung">
              <Schematic saddleForce={saddle} padLForce={padL} padRForce={padR} maxForce={maxForce} t={t}/>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
                <MetricTile label={t.padsKg} value={pctBWPads} unit="%" color={C.greenDark} large/>
                <MetricTile label={t.totalForce} value={Math.round(total)} unit="N" color={C.navy} large/>
                <MetricTile label={t.saddleKg} value={pctBWSad} unit="%" color={C.blue} large/>
              </div>
            </Card>
          </ZoomCard>
          {/* Right: stats */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <ZoomCard label="VERTEILUNG">
              <Card title={t.loadDist}>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <DistributionBar saddle={saddle} padL={padL} padR={padR} t={t}/>
                  <AsymmetryBar padL={padL} padR={padR} t={t}/>
                </div>
              </Card>
            </ZoomCard>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <ZoomCard label="NEWTON"><Card><ForceBarChart padL={padL} padR={padR} saddle={saddle} mode="absolute" t={t}/></Card></ZoomCard>
              <ZoomCard label="% KG"><Card><ForceBarChart padL={padL} padR={padR} saddle={saddle} mode="percent" bodyWeightN={bodyWeightN} t={t}/></Card></ZoomCard>
            </div>
          </div>
        </div>
        <button onClick={() => setScreen("input")} style={{ background: "none", border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "13px 28px", fontFamily: "'DM Sans'", fontSize: 14, fontWeight: 600, color: C.textSec, cursor: "pointer" }}>{t.newMeasure}</button>
      </div>
      <div style={{ textAlign: "center", padding: "16px 0 24px" }}><span style={{ fontFamily: "'DM Mono'", fontSize: 9, color: C.textMute, letterSpacing: 2 }}>{t.footer}</span></div>
    </div></>
  );

  /* ── COG TAB ── */
  return (
    <><link rel="stylesheet" href={FONT}/><style>{css}</style>
    <div style={pageWrap}>
      <Header/>
      <div style={content} className="fade">
        <TabBar tab={tab} setTab={id => { setTab(id); setScreen("input"); }} t={t}/>
        <CogScreen t={t} isWide={isWide}/>
      </div>
      <div style={{ textAlign: "center", padding: "16px 0 24px" }}><span style={{ fontFamily: "'DM Mono'", fontSize: 9, color: C.textMute, letterSpacing: 2 }}>{t.footer}</span></div>
    </div></>
  );
}
