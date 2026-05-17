import { useState, useEffect, useRef } from "react";

// ─── gebioMized brand colors ──────────────────────────────────────────────────
const C = {
  bgPage:    "#0b1525",
  bgCard:    "#0f1e35",
  bgInput:   "#0c1830",
  border:    "#1a2d48",
  borderSub: "#132038",
  navy:      "#1e3054",
  textPri:   "#dce8f6",
  textSec:   "#4a6a8a",
  textMute:  "#2a3f5a",
  textFoot:  "#14202e",
  green:     "#a8cc00",
  greenDark: "#7a9600",
  greenGlow: "#a8cc0033",
  blue:      "#4a9fd4",
  blueDark:  "#2e7ab0",
  blueGlow:  "#4a9fd433",
  cogLine:   "#e0ecf8",
  cogGlow:   "#e0ecf855",
  warnOk:    "#a8cc00",
  warnMid:   "#f0b429",
  warnBad:   "#e05555",
};

// ─── translations ─────────────────────────────────────────────────────────────
const T = {
  de: {
    appSub:        "Kontaktpunkt-Lastverteilung",
    screenInput:   "Eingabe",
    screenResult:  "Ergebnis",
    armpads:       "Armpads",
    left:          "Links",
    right:         "Rechts",
    saddle:        "Sattel",
    avgForce:      "Mittlere Kraft",
    bodyweight:    "Körpergewicht",
    weight:        "Gewicht",
    analyze:       "AUSWERTEN →",
    newMeasure:    "← NEUE MESSUNG",
    padsKg:        "Pads / KG",
    saddleKg:      "Sattel / KG",
    totalForce:    "Gesamtkraft",
    loadDist:      "Lastverteilung",
    symm:          "SYMMETRISCH",
    front:         "← VORNE",
    rear:          "HINTEN →",
    supportBase:   "STÜTZBASE",
    cogLabel:      "CoG",
    cogUnit:       "v. Sattel",
    install:       "App installieren",
    installSub:    "Homescreen · offline verfügbar",
    installBtn:    "Installieren",
    later:         "Später",
    footer:        "© GEBIOMIZED · DYNAMISCHE DRUCKMESSUNG",
    pads:          "PADS",
    saddleUp:      "SATTEL",
  },
  en: {
    appSub:        "Contact Point Load Distribution",
    screenInput:   "Input",
    screenResult:  "Results",
    armpads:       "Arm Pads",
    left:          "Left",
    right:         "Right",
    saddle:        "Saddle",
    avgForce:      "Mean Force",
    bodyweight:    "Body Weight",
    weight:        "Weight",
    analyze:       "ANALYZE →",
    newMeasure:    "← NEW MEASUREMENT",
    padsKg:        "Pads / BW",
    saddleKg:      "Saddle / BW",
    totalForce:    "Total Force",
    loadDist:      "Load Distribution",
    symm:          "SYMMETRIC",
    front:         "← FRONT",
    rear:          "REAR →",
    supportBase:   "SUPPORT BASE",
    cogLabel:      "CoG",
    cogUnit:       "from saddle",
    install:       "Install App",
    installSub:    "Add to homescreen · works offline",
    installBtn:    "Install",
    later:         "Later",
    footer:        "© GEBIOMIZED · DYNAMIC PRESSURE MEASUREMENT",
    pads:          "PADS",
    saddleUp:      "SADDLE",
  },
};

const FONT = "https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Bebas+Neue&family=DM+Sans:wght@300;400;500&display=swap";

// ─── animated value ───────────────────────────────────────────────────────────
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

// ─── PWA install prompt ───────────────────────────────────────────────────────
function useInstallPrompt() {
  const [prompt, setPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);
  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setPrompt(e); };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setInstalled(true));
    return () => window.removeEventListener("beforeinstallprompt", handler);
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

// ─── language toggle ──────────────────────────────────────────────────────────
function LangToggle({ lang, setLang }) {
  return (
    <div style={{ display:"flex", background:C.bgPage, border:`1px solid ${C.border}`, borderRadius:8, overflow:"hidden", flexShrink:0 }}>
      {["de","en"].map(l => (
        <button key={l} onClick={() => setLang(l)}
          style={{
            padding:"6px 12px",
            fontFamily:"'DM Mono'", fontSize:11, fontWeight:500,
            letterSpacing:1, textTransform:"uppercase",
            border:"none", cursor:"pointer",
            background: lang === l ? C.green : "transparent",
            color:      lang === l ? C.bgPage : C.textSec,
            transition: "all 0.15s",
          }}>
          {l}
        </button>
      ))}
    </div>
  );
}

// ─── schematic ────────────────────────────────────────────────────────────────
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

  const hSad  = maxForce > 0 ? (animSad  / maxForce) * MAX_ARROW : 0;
  const hPad  = maxForce > 0 ? (animPad  / maxForce) * MAX_ARROW : 0;
  const hPadL = maxForce > 0 ? (animPadL / maxForce) * MAX_ARROW : 0;
  const hPadR = maxForce > 0 ? (animPadR / maxForce) * MAX_ARROW : 0;
  const cogPct = total > 0 ? ((X_SAD - animCogX) / (X_SAD - X_PAD) * 100) : 50;
  const AW = 5;

  return (
    <svg viewBox="0 0 404 200" style={{ width:"100%", maxWidth:404, overflow:"visible" }}>
      <defs>
        <filter id="gy" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="gg" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="3.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="gb" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="3.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      {/* axis */}
      <line x1="48" y1={BASELINE_Y} x2="360" y2={BASELINE_Y} stroke={C.navy} strokeWidth="1.5"/>
      <line x1="48"  y1={BASELINE_Y-6} x2="48"  y2={BASELINE_Y+6} stroke={C.navy} strokeWidth="1.5"/>
      <line x1="360" y1={BASELINE_Y-6} x2="360" y2={BASELINE_Y+6} stroke={C.navy} strokeWidth="1.5"/>
      <text x="200" y={BASELINE_Y+16} textAnchor="middle" fontFamily="DM Mono" fontSize="8" fill={C.navy} letterSpacing="2">
        {t.front} · {t.rear}
      </text>

      {/* bracket */}
      <line x1={X_PAD} y1={BASELINE_Y+28} x2={X_SAD} y2={BASELINE_Y+28} stroke={C.borderSub} strokeWidth="1"/>
      <line x1={X_PAD} y1={BASELINE_Y+24} x2={X_PAD} y2={BASELINE_Y+32} stroke={C.borderSub} strokeWidth="1"/>
      <line x1={X_SAD} y1={BASELINE_Y+24} x2={X_SAD} y2={BASELINE_Y+32} stroke={C.borderSub} strokeWidth="1"/>
      <text x={(X_PAD+X_SAD)/2} y={BASELINE_Y+42} textAnchor="middle" fontFamily="DM Mono" fontSize="7.5" fill={C.textMute} letterSpacing="1">
        {t.supportBase}
      </text>

      {/* pads */}
      <line x1={X_PAD} y1={BASELINE_Y-hPad-8} x2={X_PAD} y2={BASELINE_Y} stroke={C.greenGlow} strokeWidth="1" strokeDasharray="3 3"/>
      <circle cx={X_PAD} cy={BASELINE_Y} r="5" fill={C.bgCard} stroke={C.green} strokeWidth="2" filter={padForce>0?"url(#gg)":""}/>
      {hPad > 2 && (
        <g filter="url(#gg)">
          <line x1={X_PAD} y1={BASELINE_Y-5} x2={X_PAD} y2={BASELINE_Y-hPad+AW+2} stroke={C.green} strokeWidth="2" strokeLinecap="round"/>
          <polygon points={`${X_PAD},${BASELINE_Y-5} ${X_PAD-AW},${BASELINE_Y-5-AW*1.8} ${X_PAD+AW},${BASELINE_Y-5-AW*1.8}`} fill={C.green}/>
        </g>
      )}
      <text x={X_PAD} y={BASELINE_Y-hPad-14} textAnchor="middle" fontFamily="DM Mono" fontSize="11" fontWeight="500" fill={C.green}>{Math.round(animPad)}</text>
      <text x={X_PAD} y={BASELINE_Y-hPad-4}  textAnchor="middle" fontFamily="DM Mono" fontSize="8"  fill={C.greenDark}>N</text>
      <text x={X_PAD} y={BASELINE_Y+14}       textAnchor="middle" fontFamily="DM Mono" fontSize="8"  fill={C.green} letterSpacing="1">{t.pads}</text>

      {/* L/R split */}
      {(padLForce>0||padRForce>0) && (
        <g opacity="0.65">
          <rect x={X_PAD-22} y={BASELINE_Y-hPadL*0.3-2} width="8" height={hPadL*0.3+2} rx="2" fill={C.greenGlow} stroke={C.green} strokeWidth="0.8"/>
          <text x={X_PAD-18} y={BASELINE_Y-hPadL*0.3-6} textAnchor="middle" fontFamily="DM Mono" fontSize="7" fill={C.greenDark}>L</text>
          <rect x={X_PAD+14} y={BASELINE_Y-hPadR*0.3-2} width="8" height={hPadR*0.3+2} rx="2" fill={C.greenGlow} stroke={C.green} strokeWidth="0.8"/>
          <text x={X_PAD+18} y={BASELINE_Y-hPadR*0.3-6} textAnchor="middle" fontFamily="DM Mono" fontSize="7" fill={C.greenDark}>R</text>
        </g>
      )}

      {/* saddle */}
      <line x1={X_SAD} y1={BASELINE_Y-hSad-8} x2={X_SAD} y2={BASELINE_Y} stroke={C.blueGlow} strokeWidth="1" strokeDasharray="3 3"/>
      <circle cx={X_SAD} cy={BASELINE_Y} r="5" fill={C.bgCard} stroke={C.blue} strokeWidth="2" filter={saddleForce>0?"url(#gb)":""}/>
      {hSad > 2 && (
        <g filter="url(#gb)">
          <line x1={X_SAD} y1={BASELINE_Y-5} x2={X_SAD} y2={BASELINE_Y-hSad+AW+2} stroke={C.blue} strokeWidth="2" strokeLinecap="round"/>
          <polygon points={`${X_SAD},${BASELINE_Y-5} ${X_SAD-AW},${BASELINE_Y-5-AW*1.8} ${X_SAD+AW},${BASELINE_Y-5-AW*1.8}`} fill={C.blue}/>
        </g>
      )}
      <text x={X_SAD} y={BASELINE_Y-hSad-14} textAnchor="middle" fontFamily="DM Mono" fontSize="11" fontWeight="500" fill={C.blue}>{Math.round(animSad)}</text>
      <text x={X_SAD} y={BASELINE_Y-hSad-4}  textAnchor="middle" fontFamily="DM Mono" fontSize="8"  fill={C.blueDark}>N</text>
      <text x={X_SAD} y={BASELINE_Y+14}       textAnchor="middle" fontFamily="DM Mono" fontSize="8"  fill={C.blue} letterSpacing="1">{t.saddleUp}</text>

      {/* CoG */}
      <rect x={X_PAD} y={BASELINE_Y-4} width={X_SAD-X_PAD} height="8" fill="#e0ecf808"/>
      <line x1={animCogX} y1="8" x2={animCogX} y2={BASELINE_Y+22} stroke={C.cogLine} strokeWidth="1.5" strokeDasharray="6 4" filter="url(#gy)"/>
      <polygon points={`${animCogX},${BASELINE_Y+5} ${animCogX-6},${BASELINE_Y-5} ${animCogX+6},${BASELINE_Y-5}`} fill={C.cogLine} opacity="0.9" filter="url(#gy)"/>
      <rect x={animCogX-24} y="0" width="48" height="16" rx="4" fill={C.bgPage} stroke={C.cogGlow} strokeWidth="1"/>
      <text x={animCogX} y="11" textAnchor="middle" fontFamily="DM Mono" fontSize="8.5" fill={C.cogLine} letterSpacing="2">{t.cogLabel}</text>
      <text x={animCogX} y={BASELINE_Y+22} textAnchor="middle" fontFamily="DM Mono" fontSize="8" fill={`${C.cogLine}88`}>
        {`${cogPct.toFixed(0)}% ${t.cogUnit}`}
      </text>
    </svg>
  );
}

// ─── distribution bar ─────────────────────────────────────────────────────────
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

// ─── asymmetry bar ────────────────────────────────────────────────────────────
function AsymmetryBar({ padL, padR, t }) {
  const total = padL + padR;
  const asym  = useAnimatedValue(total > 0 ? ((padL - padR) / total) * 100 : 0);
  const abs   = Math.abs(asym);
  const color = abs < 5 ? C.warnOk : abs < 10 ? C.warnMid : C.warnBad;
  const label = abs < 3
    ? t.symm
    : asym > 0
      ? `${t.left.toUpperCase()} +${abs.toFixed(1)}%`
      : `${t.right.toUpperCase()} +${abs.toFixed(1)}%`;
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

// ─── force bar chart ──────────────────────────────────────────────────────────
function ForceBarChart({ padL, padR, saddle, mode, bodyWeightN, t }) {
  const aPadL   = useAnimatedValue(padL);
  const aPadR   = useAnimatedValue(padR);
  const aSaddle = useAnimatedValue(saddle);

  const toVal = (v) => mode === "percent"
    ? (bodyWeightN > 0 ? (v / bodyWeightN) * 100 : 0)
    : v;

  const padForce = aPadL + aPadR;
  const vals   = [toVal(padForce), toVal(aSaddle)];
  const maxVal = Math.max(...vals, 1);
  const H      = 90;
  const labels = [t.pads, t.saddleUp];
  const colors = [C.green, C.blue];
  const unit   = mode === "percent" ? "%" : "N";
  const title  = mode === "percent" ? `% ${t.weight.toUpperCase()}` : "NEWTON";

  return (
    <div style={{ background:C.bgCard, border:`1px solid ${C.border}`, borderRadius:14, padding:"14px 12px 10px" }}>
      <div style={{ fontFamily:"'DM Mono'", fontSize:8, color:C.textMute, letterSpacing:2, marginBottom:12, textAlign:"center" }}>
        {title}
      </div>
      <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-around", height:H, gap:6 }}>
        {vals.map((val, i) => {
          const h = maxVal > 0 ? Math.max((val / maxVal) * H, 2) : 2;
          return (
            <div key={i} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4, flex:1 }}>
              {/* value label */}
              <span style={{ fontFamily:"'DM Mono'", fontSize:9, color:colors[i], lineHeight:1 }}>
                {mode === "percent" ? val.toFixed(0) : Math.round(val)}
              </span>
              {/* bar */}
              <div style={{
                width:"100%", height:h,
                background:`linear-gradient(180deg, ${colors[i]}, ${colors[i]}88)`,
                borderRadius:"4px 4px 2px 2px",
                boxShadow:`0 0 8px ${colors[i]}44`,
                transition:"height 0.05s",
                minHeight:2,
              }}/>
            </div>
          );
        })}
      </div>
      {/* x-axis labels */}
      <div style={{ display:"flex", justifyContent:"space-around", marginTop:6, gap:6 }}>
        {labels.map((l, i) => (
          <span key={i} style={{ fontFamily:"'DM Mono'", fontSize:8, color:colors[i], textAlign:"center", flex:1, letterSpacing:1 }}>
            {l}
          </span>
        ))}
      </div>
      {/* unit */}
      <div style={{ textAlign:"center", marginTop:4 }}>
        <span style={{ fontFamily:"'DM Mono'", fontSize:7, color:C.textMute, letterSpacing:1 }}>{unit}</span>
      </div>
    </div>
  );
}

// ─── total force ──────────────────────────────────────────────────────────────
function TotalForce({ total, bodyWeightN }) {
  const aT  = useAnimatedValue(total);
  const pct = bodyWeightN > 0 ? (aT / bodyWeightN) * 100 : null;
  return (
    <div style={{ display:"flex", alignItems:"baseline", gap:8 }}>
      <span style={{ fontFamily:"'Bebas Neue'", fontSize:40, lineHeight:1, color:C.textPri, letterSpacing:2 }}>{Math.round(aT)}</span>
      <span style={{ fontFamily:"'DM Mono'", fontSize:12, color:C.textMute }}>N</span>
      {pct !== null && <>
        <span style={{ fontFamily:"'DM Mono'", fontSize:11, color:C.textMute, marginLeft:4 }}>·</span>
        <span style={{ fontFamily:"'DM Mono'", fontSize:12, color:`${C.green}99` }}>{pct.toFixed(0)}%</span>
      </>}
    </div>
  );
}

// ─── install banner ───────────────────────────────────────────────────────────
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
        <button onClick={() => setV(false)} style={{ background:"none", border:`1px solid ${C.border}`, borderRadius:8, padding:"8px 12px", fontFamily:"'DM Mono'", fontSize:11, color:C.textSec, cursor:"pointer" }}>{t.later}</button>
        <button onClick={onInstall} style={{ background:C.green, border:"none", borderRadius:8, padding:"8px 14px", fontFamily:"'DM Mono'", fontSize:11, color:C.bgPage, fontWeight:500, cursor:"pointer" }}>{t.installBtn}</button>
      </div>
    </div>
  );
}

// ─── big input ────────────────────────────────────────────────────────────────
function BigInputField({ label, value, onChange, color, unit = "N", sublabel }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline" }}>
        <label style={{ fontFamily:"'DM Sans'", fontSize:11, fontWeight:500, color:C.textSec, letterSpacing:"2px", textTransform:"uppercase" }}>{label}</label>
        {sublabel && <span style={{ fontFamily:"'DM Mono'", fontSize:9, color:C.textMute, letterSpacing:1 }}>{sublabel}</span>}
      </div>
      <div style={{ position:"relative" }}>
        <input
          type="number" value={value}
          onChange={e => onChange(Number(e.target.value) || 0)}
          inputMode="numeric" min={0} max={unit==="kg"?200:999}
          style={{ width:"100%", background:C.bgInput, border:`1.5px solid ${color}55`, borderRadius:10, padding:"16px 44px 16px 16px", fontFamily:"'DM Mono'", fontSize:28, fontWeight:500, color:C.textPri, outline:"none", boxSizing:"border-box" }}
          onFocus={e => e.target.style.borderColor = color}
          onBlur={e  => e.target.style.borderColor = `${color}55`}
        />
        <span style={{ position:"absolute", right:14, top:"50%", transform:"translateY(-50%)", fontFamily:"'DM Mono'", fontSize:13, color:`${color}88` }}>{unit}</span>
      </div>
    </div>
  );
}

// ─── header ───────────────────────────────────────────────────────────────────
function Header({ onBack, lang, setLang, screenLabel }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20, paddingBottom:14, borderBottom:`1px solid ${C.border}` }}>
      {onBack && (
        <button onClick={onBack} style={{ background:"none", border:`1px solid ${C.border}`, borderRadius:8, width:36, height:36, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", flexShrink:0 }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8L10 13" stroke={C.textSec} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      )}
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:"flex", alignItems:"baseline", gap:8 }}>
          <span style={{ fontFamily:"'Bebas Neue'", fontSize:24, letterSpacing:4, color:C.textPri }}>GEBIOMIZED</span>
          <span style={{ fontFamily:"'DM Mono'", fontSize:8, color:C.textMute, letterSpacing:2 }}>LOAD BALANCE</span>
        </div>
        <div style={{ fontFamily:"'DM Sans'", fontSize:10, color:C.textMute, letterSpacing:1, marginTop:1 }}>
          {screenLabel}
        </div>
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
  const [lang,   setLang]   = useState(() => {
    const nav = navigator.language || "de";
    return nav.startsWith("de") ? "de" : "en";
  });

  const { canInstall, install } = useInstallPrompt();
  const t = T[lang];

  const bodyWeightN = bw * 9.81;
  const total       = saddle + padL + padR;
  const maxForce    = Math.max(saddle, padL + padR, 1);
  const pctBWSad    = bodyWeightN > 0 ? ((saddle        / bodyWeightN) * 100).toFixed(0) : "—";
  const pctBWPads   = bodyWeightN > 0 ? (((padL + padR) / bodyWeightN) * 100).toFixed(0) : "—";

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
    background:`radial-gradient(ellipse at 15% 12%, #0e2040 0%, ${C.bgPage} 55%)`,
    display:"flex", alignItems:"flex-start", justifyContent:"center",
    padding:"max(env(safe-area-inset-top),20px) 20px max(env(safe-area-inset-bottom),24px)",
    overflowY:"auto",
  };

  /* INPUT */
  if (screen === "input") return (
    <>
      <link rel="stylesheet" href={FONT}/>
      <style>{css}</style>
      <div style={wrap}>
        <div style={{ width:"100%", maxWidth:420 }} className="so">
          {canInstall && <InstallBanner onInstall={install} t={t}/>}
          <Header lang={lang} setLang={setLang} screenLabel={t.appSub}/>

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

          <div style={{ marginTop:20, textAlign:"center" }}>
            <span style={{ fontFamily:"'DM Mono'", fontSize:8, color:C.textFoot, letterSpacing:2 }}>{t.footer}</span>
          </div>
        </div>
      </div>
    </>
  );

  /* RESULTS */
  return (
    <>
      <link rel="stylesheet" href={FONT}/>
      <style>{css}</style>
      <div style={wrap}>
        <div style={{ width:"100%", maxWidth:420 }} className="si">
          <Header onBack={() => setScreen("input")} lang={lang} setLang={setLang} screenLabel={t.screenResult}/>

          {/* ── Schematic ── */}
          <div style={{ background:C.bgCard, border:`1px solid ${C.border}`, borderRadius:14, padding:"20px 14px 14px", marginBottom:12 }}>
            <Schematic saddleForce={saddle} padLForce={padL} padRForce={padR} maxForce={maxForce} t={t}/>

            {/* Key metrics row */}
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

          {/* ── Distribution + Asymmetry ── */}
          <div style={{ background:C.bgCard, border:`1px solid ${C.border}`, borderRadius:14, padding:"16px 18px", marginBottom:12, display:"flex", flexDirection:"column", gap:18 }}>
            <DistributionBar saddle={saddle} padL={padL} padR={padR} t={t}/>
            <AsymmetryBar padL={padL} padR={padR} t={t}/>
          </div>

          {/* ── Bar Charts ── */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
            {/* Chart 1: Absolute forces */}
            <ForceBarChart
              padL={padL} padR={padR} saddle={saddle}
              mode="absolute" t={t}
            />
            {/* Chart 2: % body weight */}
            <ForceBarChart
              padL={padL} padR={padR} saddle={saddle}
              mode="percent" bodyWeightN={bodyWeightN} t={t}
            />
          </div>

          <button onClick={() => setScreen("input")}
            style={{ width:"100%", background:"none", border:`1px solid ${C.border}`, borderRadius:12, padding:"16px", fontFamily:"'Bebas Neue'", fontSize:18, letterSpacing:4, color:C.textSec, cursor:"pointer" }}>
            {t.newMeasure}
          </button>

          <div style={{ marginTop:16, textAlign:"center" }}>
            <span style={{ fontFamily:"'DM Mono'", fontSize:8, color:C.textFoot, letterSpacing:2 }}>{t.footer}</span>
          </div>
        </div>
      </div>
    </>
  );
}
