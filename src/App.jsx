import { useState, useEffect, useRef } from "react";

const FONT = "https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Bebas+Neue&family=DM+Sans:wght@300;400;500&display=swap";

/* ─── animated value hook ──────────────────────────────────────────────────── */
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

/* ─── PWA install prompt hook ──────────────────────────────────────────────── */
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

  return { canInstall: !!prompt && !installed, install, installed };
}

/* ─── schematic constants ───────────────────────────────────────────────────── */
const X_PAD = 88;
const X_SAD = 316;
const BASELINE_Y = 148;
const MAX_ARROW = 90;

/* ─── schematic svg ─────────────────────────────────────────────────────────── */
function Schematic({ saddleForce, padLForce, padRForce, maxForce }) {
  const padForce = padLForce + padRForce;
  const total    = saddleForce + padForce;

  const cogX = total > 0
    ? (X_PAD * padForce + X_SAD * saddleForce) / total
    : (X_PAD + X_SAD) / 2;

  const animCogX  = useAnimatedValue(cogX);
  const animSad   = useAnimatedValue(saddleForce);
  const animPad   = useAnimatedValue(padForce);
  const animPadL  = useAnimatedValue(padLForce);
  const animPadR  = useAnimatedValue(padRForce);

  const hSad  = maxForce > 0 ? (animSad  / maxForce) * MAX_ARROW : 0;
  const hPad  = maxForce > 0 ? (animPad  / maxForce) * MAX_ARROW : 0;
  const hPadL = maxForce > 0 ? (animPadL / maxForce) * MAX_ARROW : 0;
  const hPadR = maxForce > 0 ? (animPadR / maxForce) * MAX_ARROW : 0;

  const cogPctFromRear = total > 0
    ? ((X_SAD - animCogX) / (X_SAD - X_PAD) * 100)
    : 50;

  const AW = 5;

  return (
    <svg viewBox="0 0 404 200" style={{ width: "100%", maxWidth: 404, overflow: "visible" }}>
      <defs>
        <filter id="gy" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="4" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="gt" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="3.5" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="gr" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="3.5" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* axis */}
      <line x1="48" y1={BASELINE_Y} x2="360" y2={BASELINE_Y} stroke="#1e3550" strokeWidth="1.5" />
      <line x1="48"  y1={BASELINE_Y-6} x2="48"  y2={BASELINE_Y+6} stroke="#1e3550" strokeWidth="1.5" />
      <line x1="360" y1={BASELINE_Y-6} x2="360" y2={BASELINE_Y+6} stroke="#1e3550" strokeWidth="1.5" />
      <text x="200" y={BASELINE_Y+16} textAnchor="middle" fontFamily="DM Mono" fontSize="8" fill="#1e3550" letterSpacing="2">
        ← VORNE · HINTEN →
      </text>

      {/* distance bracket */}
      <line x1={X_PAD} y1={BASELINE_Y+28} x2={X_SAD} y2={BASELINE_Y+28} stroke="#182840" strokeWidth="1" />
      <line x1={X_PAD} y1={BASELINE_Y+24} x2={X_PAD} y2={BASELINE_Y+32} stroke="#182840" strokeWidth="1" />
      <line x1={X_SAD} y1={BASELINE_Y+24} x2={X_SAD} y2={BASELINE_Y+32} stroke="#182840" strokeWidth="1" />
      <text x={(X_PAD+X_SAD)/2} y={BASELINE_Y+42} textAnchor="middle" fontFamily="DM Mono" fontSize="7.5" fill="#243c56" letterSpacing="1">
        STÜTZBASE
      </text>

      {/* pad point */}
      <line x1={X_PAD} y1={BASELINE_Y-hPad-8} x2={X_PAD} y2={BASELINE_Y} stroke="#4ecdc420" strokeWidth="1" strokeDasharray="3 3" />
      <circle cx={X_PAD} cy={BASELINE_Y} r="5" fill="#0c1824" stroke="#4ecdc4" strokeWidth="2" filter={padForce>0?"url(#gt)":""} />
      {hPad > 2 && (
        <g filter="url(#gt)">
          <line x1={X_PAD} y1={BASELINE_Y-5} x2={X_PAD} y2={BASELINE_Y-hPad+AW+2} stroke="#4ecdc4" strokeWidth="2" strokeLinecap="round" />
          <polygon points={`${X_PAD},${BASELINE_Y-5} ${X_PAD-AW},${BASELINE_Y-5-AW*1.8} ${X_PAD+AW},${BASELINE_Y-5-AW*1.8}`} fill="#4ecdc4" />
        </g>
      )}
      <text x={X_PAD} y={BASELINE_Y-hPad-14} textAnchor="middle" fontFamily="DM Mono" fontSize="11" fontWeight="500" fill="#4ecdc4">
        {Math.round(animPad)}
      </text>
      <text x={X_PAD} y={BASELINE_Y-hPad-4} textAnchor="middle" fontFamily="DM Mono" fontSize="8" fill="#4ecdc499">N</text>
      <text x={X_PAD} y={BASELINE_Y+14} textAnchor="middle" fontFamily="DM Mono" fontSize="8" fill="#4ecdc4" letterSpacing="1">PADS</text>

      {/* L/R split bars */}
      {(padLForce>0||padRForce>0) && (
        <g opacity="0.7">
          <rect x={X_PAD-22} y={BASELINE_Y-hPadL*0.3-2} width="8" height={hPadL*0.3+2} rx="2" fill="#4ecdc433" stroke="#4ecdc4" strokeWidth="0.8" />
          <text x={X_PAD-18} y={BASELINE_Y-hPadL*0.3-6} textAnchor="middle" fontFamily="DM Mono" fontSize="7" fill="#4ecdc488">L</text>
          <rect x={X_PAD+14} y={BASELINE_Y-hPadR*0.3-2} width="8" height={hPadR*0.3+2} rx="2" fill="#4ecdc433" stroke="#4ecdc4" strokeWidth="0.8" />
          <text x={X_PAD+18} y={BASELINE_Y-hPadR*0.3-6} textAnchor="middle" fontFamily="DM Mono" fontSize="7" fill="#4ecdc488">R</text>
        </g>
      )}

      {/* saddle point */}
      <line x1={X_SAD} y1={BASELINE_Y-hSad-8} x2={X_SAD} y2={BASELINE_Y} stroke="#ff6b6b20" strokeWidth="1" strokeDasharray="3 3" />
      <circle cx={X_SAD} cy={BASELINE_Y} r="5" fill="#0c1824" stroke="#ff6b6b" strokeWidth="2" filter={saddleForce>0?"url(#gr)":""} />
      {hSad > 2 && (
        <g filter="url(#gr)">
          <line x1={X_SAD} y1={BASELINE_Y-5} x2={X_SAD} y2={BASELINE_Y-hSad+AW+2} stroke="#ff6b6b" strokeWidth="2" strokeLinecap="round" />
          <polygon points={`${X_SAD},${BASELINE_Y-5} ${X_SAD-AW},${BASELINE_Y-5-AW*1.8} ${X_SAD+AW},${BASELINE_Y-5-AW*1.8}`} fill="#ff6b6b" />
        </g>
      )}
      <text x={X_SAD} y={BASELINE_Y-hSad-14} textAnchor="middle" fontFamily="DM Mono" fontSize="11" fontWeight="500" fill="#ff6b6b">
        {Math.round(animSad)}
      </text>
      <text x={X_SAD} y={BASELINE_Y-hSad-4} textAnchor="middle" fontFamily="DM Mono" fontSize="8" fill="#ff6b6b99">N</text>
      <text x={X_SAD} y={BASELINE_Y+14} textAnchor="middle" fontFamily="DM Mono" fontSize="8" fill="#ff6b6b" letterSpacing="1">SATTEL</text>

      {/* CoG */}
      <rect x={X_PAD} y={BASELINE_Y-4} width={X_SAD-X_PAD} height="8" fill="#f7c94806" />
      <line x1={animCogX} y1="8" x2={animCogX} y2={BASELINE_Y+22} stroke="#f7c948" strokeWidth="1.5" strokeDasharray="6 4" filter="url(#gy)" />
      <polygon points={`${animCogX},${BASELINE_Y+5} ${animCogX-6},${BASELINE_Y-5} ${animCogX+6},${BASELINE_Y-5}`} fill="#f7c948" opacity="0.9" filter="url(#gy)" />
      <rect x={animCogX-24} y="0" width="48" height="16" rx="4" fill="#080f18" stroke="#f7c94838" strokeWidth="1" />
      <text x={animCogX} y="11" textAnchor="middle" fontFamily="DM Mono" fontSize="8.5" fill="#f7c948" letterSpacing="2">CoG</text>
      <text x={animCogX} y={BASELINE_Y+22} textAnchor="middle" fontFamily="DM Mono" fontSize="8" fill="#f7c94880">
        {`${cogPctFromRear.toFixed(0)}% v. Sattel`}
      </text>
    </svg>
  );
}

/* ─── distribution bar ──────────────────────────────────────────────────────── */
function DistributionBar({ saddle, padL, padR }) {
  const total = saddle + padL + padR;
  const sP = useAnimatedValue(total > 0 ? (saddle / total) * 100 : 50);
  const pP = useAnimatedValue(total > 0 ? ((padL + padR) / total) * 100 : 50);
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:7 }}>
        <span style={{ fontFamily:"'DM Mono'", fontSize:10, color:"#4ecdc4", letterSpacing:1 }}>PADS {pP.toFixed(1)}%</span>
        <span style={{ fontFamily:"'DM Mono'", fontSize:10, color:"#2a4060", letterSpacing:1 }}>LASTVERTEILUNG</span>
        <span style={{ fontFamily:"'DM Mono'", fontSize:10, color:"#ff6b6b", letterSpacing:1 }}>SATTEL {sP.toFixed(1)}%</span>
      </div>
      <div style={{ height:10, borderRadius:5, background:"#060c14", overflow:"hidden", display:"flex", border:"1px solid #0d1c2c" }}>
        <div style={{ width:`${pP}%`, background:"linear-gradient(90deg,#1a7a74,#4ecdc4)", transition:"width 0.05s" }} />
        <div style={{ flex:1, background:"linear-gradient(90deg,#bb2c2c,#ff6b6b)" }} />
      </div>
    </div>
  );
}

/* ─── asymmetry bar ─────────────────────────────────────────────────────────── */
function AsymmetryBar({ padL, padR }) {
  const total = padL + padR;
  const asym = useAnimatedValue(total > 0 ? ((padL - padR) / total) * 100 : 0);
  const abs = Math.abs(asym);
  const color = abs < 5 ? "#4ecdc4" : abs < 10 ? "#f7c948" : "#ff6b6b";
  const label = abs < 3 ? "SYMMETRISCH" : asym > 0 ? `L +${abs.toFixed(1)}%` : `R +${abs.toFixed(1)}%`;
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:7 }}>
        <span style={{ fontFamily:"'DM Mono'", fontSize:10, color:"#2a4060", letterSpacing:1 }}>LINKS</span>
        <span style={{ fontFamily:"'DM Mono'", fontSize:10, color, letterSpacing:1 }}>{label}</span>
        <span style={{ fontFamily:"'DM Mono'", fontSize:10, color:"#2a4060", letterSpacing:1 }}>RECHTS</span>
      </div>
      <div style={{ height:6, borderRadius:3, background:"#060c14", overflow:"hidden", position:"relative", border:"1px solid #0d1c2c" }}>
        <div style={{ position:"absolute", left:"50%", width:1, height:"100%", background:"#182840" }} />
        <div style={{ position:"absolute", top:0, height:"100%", left:asym>=0?"50%":`${50+asym/2}%`, width:`${Math.abs(asym)/2}%`, background:color, boxShadow:`0 0 6px ${color}80`, transition:"all 0.05s" }} />
      </div>
    </div>
  );
}

/* ─── input field ───────────────────────────────────────────────────────────── */
function InputField({ label, value, onChange, color, unit = "N" }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
      <label style={{ fontFamily:"'DM Sans'", fontSize:9, fontWeight:500, color:"#2a4060", letterSpacing:"2px", textTransform:"uppercase" }}>
        {label}
      </label>
      <div style={{ position:"relative" }}>
        <input
          type="number" value={value}
          onChange={e => onChange(Number(e.target.value) || 0)}
          min={0} max={unit==="kg"?200:999}
          style={{ width:"100%", background:"#060c14", border:`1px solid ${color}44`, borderRadius:6, padding:"9px 28px 9px 10px", fontFamily:"'DM Mono'", fontSize:15, fontWeight:500, color:"#c8d8e8", outline:"none", boxSizing:"border-box" }}
          onFocus={e => e.target.style.borderColor = color}
          onBlur={e  => e.target.style.borderColor = `${color}44`}
        />
        <span style={{ position:"absolute", right:8, top:"50%", transform:"translateY(-50%)", fontFamily:"'DM Mono'", fontSize:9.5, color:"#2a4060" }}>{unit}</span>
      </div>
    </div>
  );
}

/* ─── total force ───────────────────────────────────────────────────────────── */
function TotalForce({ total, bodyWeightN }) {
  const aT = useAnimatedValue(total);
  const pct = bodyWeightN > 0 ? (aT / bodyWeightN) * 100 : null;
  return (
    <div style={{ display:"flex", alignItems:"baseline", gap:8 }}>
      <span style={{ fontFamily:"'Bebas Neue'", fontSize:40, lineHeight:1, color:"#c8d8e8", letterSpacing:2 }}>{Math.round(aT)}</span>
      <span style={{ fontFamily:"'DM Mono'", fontSize:12, color:"#2a4060" }}>N</span>
      {pct !== null && (
        <>
          <span style={{ fontFamily:"'DM Mono'", fontSize:11, color:"#2a4060", marginLeft:4 }}>·</span>
          <span style={{ fontFamily:"'DM Mono'", fontSize:12, color:"#f7c94880" }}>{pct.toFixed(0)}% KG</span>
        </>
      )}
    </div>
  );
}

/* ─── install banner ────────────────────────────────────────────────────────── */
function InstallBanner({ onInstall }) {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;
  return (
    <div style={{ background:"#0d1c2c", border:"1px solid #1e3550", borderRadius:10, padding:"10px 14px", marginBottom:12, display:"flex", alignItems:"center", justifyContent:"space-between", gap:10 }}>
      <div>
        <div style={{ fontFamily:"'DM Sans'", fontSize:12, color:"#c8d8e8", fontWeight:500 }}>App installieren</div>
        <div style={{ fontFamily:"'DM Mono'", fontSize:9, color:"#2a4060", marginTop:2, letterSpacing:1 }}>Zum Homescreen hinzufügen · offline verfügbar</div>
      </div>
      <div style={{ display:"flex", gap:8, flexShrink:0 }}>
        <button onClick={() => setVisible(false)}
          style={{ background:"none", border:"1px solid #1e3550", borderRadius:6, padding:"5px 10px", fontFamily:"'DM Mono'", fontSize:10, color:"#2a4060", cursor:"pointer" }}>
          Später
        </button>
        <button onClick={onInstall}
          style={{ background:"#f7c948", border:"none", borderRadius:6, padding:"5px 12px", fontFamily:"'DM Mono'", fontSize:10, color:"#060c14", fontWeight:500, cursor:"pointer" }}>
          Installieren
        </button>
      </div>
    </div>
  );
}

/* ─── app ───────────────────────────────────────────────────────────────────── */
export default function App() {
  const [saddle, setSaddle] = useState(280);
  const [padL,   setPadL]   = useState(120);
  const [padR,   setPadR]   = useState(115);
  const [bw,     setBw]     = useState(75);

  const { canInstall, install } = useInstallPrompt();

  const bodyWeightN = bw * 9.81;
  const total       = saddle + padL + padR;
  const maxForce    = Math.max(saddle, padL + padR, 1);
  const pctBWSad    = bodyWeightN > 0 ? ((saddle        / bodyWeightN) * 100).toFixed(0) : "—";
  const pctBWPads   = bodyWeightN > 0 ? (((padL + padR) / bodyWeightN) * 100).toFixed(0) : "—";

  return (
    <>
      <link rel="stylesheet" href={FONT} />
      <style>{`
        * { box-sizing:border-box; margin:0; padding:0; }
        html, body { height:100%; background:#060c14; }
        @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance:none; }
        input[type=number] { -moz-appearance:textfield; appearance:textfield; }
      `}</style>

      <div style={{ minHeight:"100vh", minHeight:"100dvh", background:"radial-gradient(ellipse at 15% 15%,#0c1e34 0%,#060c14 55%)", display:"flex", alignItems:"center", justifyContent:"center", padding:"env(safe-area-inset-top, 16px) 16px env(safe-area-inset-bottom, 16px)" }}>
        <div style={{ width:"100%", maxWidth:420, animation:"fadeIn 0.4s ease" }}>

          {/* install banner */}
          {canInstall && <InstallBanner onInstall={install} />}

          {/* header */}
          <div style={{ marginBottom:18, paddingBottom:13, borderBottom:"1px solid #0d1c2c" }}>
            <div style={{ display:"flex", alignItems:"baseline", gap:10 }}>
              <span style={{ fontFamily:"'Bebas Neue'", fontSize:26, letterSpacing:5, color:"#c8d8e8" }}>LOAD BALANCE</span>
              <span style={{ fontFamily:"'DM Mono'", fontSize:8, color:"#2a4060", letterSpacing:3 }}>TRIATHLON</span>
            </div>
            <div style={{ fontFamily:"'DM Sans'", fontSize:10, color:"#2a4060", letterSpacing:1, marginTop:1 }}>
              Kontaktpunkt-Lastverteilung · gebioMized
            </div>
          </div>

          {/* schematic */}
          <div style={{ background:"#080f18", border:"1px solid #0d1c2c", borderRadius:14, padding:"20px 14px 14px", marginBottom:12 }}>
            <Schematic saddleForce={saddle} padLForce={padL} padRForce={padR} maxForce={maxForce} />
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:6, padding:"10px 12px 0", borderTop:"1px solid #0d1c2c" }}>
              <div style={{ textAlign:"center" }}>
                <div style={{ fontFamily:"'DM Mono'", fontSize:18, fontWeight:500, color:"#4ecdc4", lineHeight:1 }}>{pctBWPads}%</div>
                <div style={{ fontFamily:"'DM Mono'", fontSize:8, color:"#2a4060", marginTop:3, letterSpacing:1 }}>Pads / KG</div>
              </div>
              <TotalForce total={total} bodyWeightN={bodyWeightN} />
              <div style={{ textAlign:"center" }}>
                <div style={{ fontFamily:"'DM Mono'", fontSize:18, fontWeight:500, color:"#ff6b6b", lineHeight:1 }}>{pctBWSad}%</div>
                <div style={{ fontFamily:"'DM Mono'", fontSize:8, color:"#2a4060", marginTop:3, letterSpacing:1 }}>Sattel / KG</div>
              </div>
            </div>
          </div>

          {/* bars */}
          <div style={{ background:"#080f18", border:"1px solid #0d1c2c", borderRadius:14, padding:"14px 16px", marginBottom:12, display:"flex", flexDirection:"column", gap:14 }}>
            <DistributionBar saddle={saddle} padL={padL} padR={padR} />
            <AsymmetryBar padL={padL} padR={padR} />
          </div>

          {/* inputs */}
          <div style={{ background:"#080f18", border:"1px solid #0d1c2c", borderRadius:14, padding:"14px" }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:10 }}>
              <InputField label="Pad L" value={padL} onChange={setPadL} color="#4ecdc4" />
              <InputField label="Sattel" value={saddle} onChange={setSaddle} color="#ff6b6b" />
              <InputField label="Pad R" value={padR} onChange={setPadR} color="#38b8b0" />
              <InputField label="KG" value={bw} onChange={setBw} color="#f7c948" unit="kg" />
            </div>
            <div style={{ marginTop:10, paddingTop:10, borderTop:"1px solid #0d1c2c", display:"flex", justifyContent:"space-between" }}>
              <span style={{ fontFamily:"'DM Mono'", fontSize:9, color:"#1e3050", letterSpacing:1 }}>KÖRPERGEWICHT</span>
              <span style={{ fontFamily:"'DM Mono'", fontSize:9, color:"#f7c94860", letterSpacing:1 }}>{bw} kg · {bodyWeightN.toFixed(0)} N</span>
            </div>
          </div>

          <div style={{ marginTop:12, textAlign:"center" }}>
            <span style={{ fontFamily:"'DM Mono'", fontSize:8, color:"#182030", letterSpacing:2 }}>© GEBIOMIZED · DYNAMISCHE DRUCKMESSUNG</span>
          </div>
        </div>
      </div>
    </>
  );
}
