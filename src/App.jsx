import { useEffect, useRef, useState, useCallback } from "react";

// ── Telegram Mini App helpers ──────────────────────────────────────────────
// Read lazily — TG SDK sets window.Telegram AFTER the module executes
function getTG() {
  return typeof window !== "undefined" ? window.Telegram?.WebApp : null;
}

function initTelegram() {
  const tg = getTG();
  if (!tg) return;
  tg.ready();
  tg.expand();
  if (tg.isVersionAtLeast?.("8.0")) {
    tg.requestFullscreen?.();
    tg.disableVerticalSwipes?.();
  }
  tg.setHeaderColor?.("#ffd23f");
  tg.setBackgroundColor?.("#ffd23f");
  tg.setBottomBarColor?.("#ffd23f");
}

function buzz(kind = "heavy") {
  const tg = getTG();
  const hf = tg?.HapticFeedback;
  if (hf) {
    if (kind === "success") hf.notificationOccurred("success");
    else if (kind === "warning") hf.notificationOccurred("warning");
    else if (kind === "selection") hf.selectionChanged();
    // "light"|"medium"|"heavy"|"rigid"|"soft" all valid per Bot API 6.1+
    else hf.impactOccurred(kind);
  } else {
    navigator.vibrate?.(kind === "heavy" || kind === "rigid" ? 40 : 15);
  }
}

function getSafeInsets() {
  const tg = getTG();
  if (tg?.contentSafeAreaInset) return tg.contentSafeAreaInset;
  return { top: 0, right: 0, bottom: 0, left: 0 };
}

// ── WebAudio ───────────────────────────────────────────────────────────────
let audioCtx = null;
let droneGain = null;
let droneStarted = false;

function getAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function startDrone(muted) {
  if (droneStarted) return;
  droneStarted = true;
  const ctx = getAudio();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();

  osc.type = "sawtooth";
  osc.frequency.value = 320;
  lfo.frequency.value = 8;
  lfoGain.gain.value = 18;
  lfo.connect(lfoGain);
  lfoGain.connect(osc.frequency);

  gain.gain.value = muted ? 0 : 0.04;
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  lfo.start();
  droneGain = gain;
}

function setDroneMute(muted) {
  if (!droneGain) return;
  droneGain.gain.value = muted ? 0 : 0.04;
}

function playBite() {
  if (!audioCtx) return;
  const ctx = audioCtx;
  // pop
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = 900;
  g.gain.setValueAtTime(0.3, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
  osc.connect(g); g.connect(ctx.destination);
  osc.start(); osc.stop(ctx.currentTime + 0.08);

  // slurp noise
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.12, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filt = ctx.createBiquadFilter();
  filt.type = "bandpass"; filt.frequency.value = 1200; filt.Q.value = 0.8;
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(0.15, ctx.currentTime);
  ng.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
  src.connect(filt); filt.connect(ng); ng.connect(ctx.destination);
  src.start();
}

function playUpgrade() {
  if (!audioCtx) return;
  const ctx = audioCtx;
  [440, 550, 660].forEach((f, i) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "square"; o.frequency.value = f;
    g.gain.setValueAtTime(0, ctx.currentTime + i * 0.06);
    g.gain.linearRampToValueAtTime(0.2, ctx.currentTime + i * 0.06 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.06 + 0.15);
    o.connect(g); g.connect(ctx.destination);
    o.start(ctx.currentTime + i * 0.06);
    o.stop(ctx.currentTime + i * 0.06 + 0.15);
  });
}

// ── Upgrade definitions ────────────────────────────────────────────────────
const UPGRADES_DEF = [
  { id: "more_mozzies", name: "More Mosquitoes", emoji: "🦟", baseCost: 50,  kind: "passive", amount: 1 },
  { id: "louder_buzz",  name: "Louder Buzz",     emoji: "📢", baseCost: 80,  kind: "click",   amount: 2 },
  { id: "ankle_bite",   name: "Ankle Bite",      emoji: "🦵", baseCost: 200, kind: "click",   amount: 5 },
  { id: "open_window",  name: "Open Window",     emoji: "🪟", baseCost: 500, kind: "passive", amount: 4 },
];

const POPUP_MSGS = ["ITCHY! 😤", "ANKLE HIT! 🦵", "DIRECT VEIN! 🩸", "SUMMER RUINED! ☀️💀", "BULL'S-EYE! 🎯", "SWEET BLOOD! 😋"];
const TARGETS = ["🦵", "🦶", "💪", "😴"];

function upgradeCost(def, owned) {
  return Math.ceil(def.baseCost * Math.pow(1.5, owned));
}

function fmt(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "k";
  return Math.floor(n).toLocaleString();
}

// ── Component ──────────────────────────────────────────────────────────────
export default function App() {
  const [blood, setBlood] = useState(0);
  const [totalBites, setTotalBites] = useState(0);
  const [totalBlood, setTotalBlood] = useState(0);
  const [upgrades, setUpgrades] = useState(() =>
    UPGRADES_DEF.map(d => ({ ...d, owned: 0 }))
  );
  const [muted, setMuted] = useState(false);
  const [biteMarks, setBiteMarks] = useState([]);
  const [floats, setFloats] = useState([]);
  const [shaking, setShaking] = useState(false);
  const [popup, setPopup] = useState(null);
  const [tourist, setTourist] = useState(null);
  const [touristMsg, setTouristMsg] = useState(null);
  const [copied, setCopied] = useState(false);
  const [safeInsets, setSafeInsets] = useState({ top: 0, right: 0, bottom: 0, left: 0 });
  const [targetIdx] = useState(() => Math.floor(Math.random() * TARGETS.length));
  const [audioReady, setAudioReady] = useState(false);

  const bloodRef = useRef(0);
  const upgradesRef = useRef(upgrades);
  const mutedRef = useRef(muted);
  const touristTimerRef = useRef(null);
  const touristExpireRef = useRef(null);
  const popupTimerRef = useRef(null);

  bloodRef.current = blood;
  upgradesRef.current = upgrades;
  mutedRef.current = muted;

  // Init TG + safe insets
  useEffect(() => {
    initTelegram();
    setSafeInsets(getSafeInsets());
    const _tg = getTG();
    if (_tg) {
      _tg.onEvent?.("safeAreaChanged", () => setSafeInsets(getSafeInsets()));
      _tg.onEvent?.("contentSafeAreaChanged", () => setSafeInsets(getSafeInsets()));
    }
  }, []);

  // Passive income tick (100ms)
  useEffect(() => {
    const id = setInterval(() => {
      const bps = upgradesRef.current
        .filter(u => u.kind === "passive")
        .reduce((s, u) => s + u.amount * u.owned, 0);
      if (bps > 0) {
        const gain = bps / 10;
        setBlood(b => b + gain);
        setTotalBlood(t => t + gain);
      }
    }, 100);
    return () => clearInterval(id);
  }, []);

  // Tourist leg scheduler
  useEffect(() => {
    function scheduleNext() {
      const delay = 25000 + Math.random() * 15000;
      touristTimerRef.current = setTimeout(() => {
        setTourist({ deadline: Date.now() + 6000 });
        touristExpireRef.current = setTimeout(() => {
          setTourist(t => {
            if (t) setTouristMsg("The tourist used repellent. 🧴");
            return null;
          });
          setTimeout(() => setTouristMsg(null), 3000);
          scheduleNext();
        }, 6000);
      }, delay);
    }
    scheduleNext();
    return () => {
      clearTimeout(touristTimerRef.current);
      clearTimeout(touristExpireRef.current);
    };
  }, []);

  const bloodPerClick = upgrades
    .filter(u => u.kind === "click")
    .reduce((s, u) => s + u.amount * u.owned, 1);

  const bloodPerSec = upgrades
    .filter(u => u.kind === "passive")
    .reduce((s, u) => s + u.amount * u.owned, 0);

  const passiveOwned = upgrades
    .filter(u => u.kind === "passive")
    .reduce((s, u) => s + u.owned, 0);

  function ensureAudio() {
    if (!audioReady) {
      getAudio().resume();
      setAudioReady(true);
    }
  }

  const handleTap = useCallback((e) => {
    ensureAudio();
    if (!droneStarted) startDrone(mutedRef.current);

    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.touches?.[0]?.clientX ?? e.clientX ?? rect.left + rect.width / 2;
    const clientY = e.touches?.[0]?.clientY ?? e.clientY ?? rect.top + rect.height / 2;
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;

    const bpc = upgradesRef.current
      .filter(u => u.kind === "click")
      .reduce((s, u) => s + u.amount * u.owned, 1);

    setBlood(b => b + bpc);
    setTotalBlood(t => t + bpc);
    setTotalBites(t => t + 1);

    // Bite mark
    const bmId = Date.now() + Math.random();
    setBiteMarks(m => [...m.slice(-20), { id: bmId, x, y }]);

    // Float
    const fId = bmId + 1;
    setFloats(f => [...f, { id: fId, x, y, val: bpc }]);
    setTimeout(() => setFloats(f => f.filter(i => i.id !== fId)), 900);

    // Screen shake
    setShaking(true);
    setTimeout(() => setShaking(false), 150);

    // Popup (20% chance)
    if (Math.random() < 0.2) {
      const msg = POPUP_MSGS[Math.floor(Math.random() * POPUP_MSGS.length)];
      setPopup(msg);
      clearTimeout(popupTimerRef.current);
      popupTimerRef.current = setTimeout(() => setPopup(null), 800);
    }

    playBite();
    buzz("heavy");
  }, []);

  function handleTouristTap() {
    clearTimeout(touristExpireRef.current);
    setTourist(null);
    const bonus = Math.ceil(bloodPerClick * 80 + 200);
    setBlood(b => b + bonus);
    setTotalBlood(t => t + bonus);
    setTouristMsg(`You destroyed a vacation! +${fmt(bonus)} 🩸`);
    setTimeout(() => setTouristMsg(null), 3000);
    buzz("heavy");
    playUpgrade();
    // reschedule
    const delay = 25000 + Math.random() * 15000;
    touristTimerRef.current = setTimeout(() => {
      setTourist({ deadline: Date.now() + 6000 });
    }, delay);
  }

  function buyUpgrade(id) {
    ensureAudio();
    const idx = upgrades.findIndex(u => u.id === id);
    if (idx === -1) return;
    const u = upgrades[idx];
    const cost = upgradeCost(u, u.owned);
    if (bloodRef.current < cost) return;
    setBlood(b => b - cost);
    setUpgrades(prev => prev.map((u2, i) => i === idx ? { ...u2, owned: u2.owned + 1 } : u2));
    buzz("success");
    playUpgrade();
  }

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    mutedRef.current = next;
    setDroneMute(next);
  }

  function copyFlex() {
    const templates = [
      `I ruined ${fmt(totalBlood)} summers as a mosquito 🦟`,
      `I bit ${fmt(totalBites)} ankles today 🦵`,
      `My mosquito army makes ${fmt(bloodPerSec)} blood/sec 🩸`,
    ];
    const text = templates[Math.floor(totalBlood / 100) % templates.length] ||
      `I ruined ${fmt(totalBlood)} summers as a mosquito 🦟`;
    navigator.clipboard.writeText(text).catch(() => {
      const ta = document.createElement("textarea");
      ta.value = text; document.body.appendChild(ta);
      ta.select(); document.execCommand("copy"); ta.remove();
    });
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);

    // Post score to server (non-blocking)
    fetch("/api/score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        initData: getTG()?.initData || "",
        score: Math.floor(totalBlood),
        name: getTG()?.initDataUnsafe?.user?.first_name || "Mosquito",
      }),
    }).catch(() => {});
  }

  const insets = safeInsets;

  return (
    <div style={{ ...S.app, paddingTop: Math.max(insets.top, 12), paddingBottom: Math.max(insets.bottom, 12), transform: shaking ? `translate(${(Math.random()-0.5)*6}px, ${(Math.random()-0.5)*6}px)` : "none" }}>

      {/* Header */}
      <div style={S.header}>
        <span style={S.title}>🦟 Mosquito Tycoon</span>
        <button style={S.muteBtn} onPointerDown={toggleMute}>{muted ? "🔇" : "🔊"}</button>
      </div>

      {/* Blood counter */}
      <div style={S.bloodCounter}>
        <span style={S.bloodNum}>{fmt(blood)}</span>
        <span style={S.bloodLabel}> 🩸 blood coins</span>
        {bloodPerSec > 0 && <div style={S.bps}>+{fmt(bloodPerSec)}/sec</div>}
      </div>

      {/* Main tap target */}
      <div style={S.targetWrap}
        onPointerDown={handleTap}
      >
        {/* Bite marks */}
        {biteMarks.map(m => (
          <div key={m.id} style={{ ...S.biteMark, left: `${m.x}%`, top: `${m.y}%` }} />
        ))}

        {/* Float +N */}
        {floats.map(f => (
          <div key={f.id} style={{ ...S.float, left: `${f.x}%`, top: `${f.y}%` }}>
            +{f.val}
          </div>
        ))}

        {/* Main emoji */}
        <div style={S.mainTarget}>{TARGETS[targetIdx]}</div>
        <div style={S.mainMosquito}>🦟</div>

        {/* Popup */}
        {popup && <div style={S.popup}>{popup}</div>}
      </div>

      {/* Mini mosquito army */}
      {passiveOwned > 0 && (
        <div style={S.armyRow}>
          {Array.from({ length: Math.min(passiveOwned * 2, 8) }).map((_, i) => (
            <span key={i} style={{ ...S.armyBug, animationDelay: `${i * 0.3}s` }}>🦟</span>
          ))}
        </div>
      )}

      {/* Tourist leg event */}
      {tourist && (
        <button style={S.touristBtn} onPointerDown={handleTouristTap}>
          <div style={S.touristInner}>
            <div style={{ fontSize: 56 }}>🦵🩴</div>
            <div style={S.touristLabel}>TOURIST LEG! TAP FAST!</div>
          </div>
        </button>
      )}

      {touristMsg && <div style={S.touristMsg}>{touristMsg}</div>}

      {/* Upgrades */}
      <div style={S.upgradesWrap}>
        <div style={S.upgradesLabel}>UPGRADES</div>
        <div style={S.upgradesRow}>
          {upgrades.map(u => {
            const cost = upgradeCost(u, u.owned);
            const canBuy = blood >= cost;
            return (
              <button
                key={u.id}
                style={{ ...S.upgradeBtn, opacity: canBuy ? 1 : 0.45 }}
                onPointerDown={() => buyUpgrade(u.id)}
                disabled={!canBuy}
              >
                <div style={S.upgradeEmoji}>{u.emoji}</div>
                <div style={S.upgradeName}>{u.name}</div>
                <div style={S.upgradeCost}>🩸 {fmt(cost)}</div>
                {u.owned > 0 && <div style={S.ownedBadge}>x{u.owned}</div>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Share */}
      <button style={S.shareBtn} onPointerDown={copyFlex}>
        {copied ? "✅ Copied!" : "📋 Copy Flex"}
      </button>

      <style>{`
        @keyframes floatUp { 0%{opacity:1;transform:translateY(0) scale(1)} 100%{opacity:0;transform:translateY(-60px) scale(1.3)} }
        @keyframes buzzDrift { 0%,100%{transform:translateX(0)} 50%{transform:translateX(8px)} }
        @keyframes touristPulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.05)} }
      `}</style>
    </div>
  );
}

const S = {
  app: {
    minHeight: "100dvh",
    background: "linear-gradient(160deg, #ffd23f 0%, #ffb347 60%, #ff8c42 100%)",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    paddingLeft: 16,
    paddingRight: 16,
    overflowX: "hidden",
    transition: "transform 0.05s",
    userSelect: "none",
    WebkitUserSelect: "none",
  },
  header: {
    width: "100%",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  title: { fontSize: 20, fontWeight: 900, color: "#7d2d00", letterSpacing: -0.5 },
  muteBtn: {
    background: "rgba(255,255,255,0.35)",
    border: "none",
    borderRadius: 20,
    fontSize: 22,
    padding: "4px 10px",
    cursor: "pointer",
    touchAction: "manipulation",
  },
  bloodCounter: { textAlign: "center", marginBottom: 12 },
  bloodNum: { fontSize: 48, fontWeight: 900, color: "#c0020a", textShadow: "0 2px 8px rgba(192,2,10,0.3)" },
  bloodLabel: { fontSize: 18, color: "#7d2d00", fontWeight: 700 },
  bps: { fontSize: 14, color: "#a03d00", marginTop: 2 },
  targetWrap: {
    position: "relative",
    width: "min(320px, 88vw)",
    height: "min(320px, 88vw)",
    borderRadius: "50%",
    background: "radial-gradient(circle, #ffe0a3 40%, #ffb347 100%)",
    boxShadow: "0 8px 32px rgba(200,80,0,0.25), inset 0 0 20px rgba(255,200,100,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    touchAction: "manipulation",
    userSelect: "none",
    WebkitUserSelect: "none",
    marginBottom: 12,
    overflow: "hidden",
  },
  mainTarget: { fontSize: 100, filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.2))", pointerEvents: "none" },
  mainMosquito: { position: "absolute", top: "20%", right: "22%", fontSize: 36, pointerEvents: "none", animation: "buzzDrift 0.4s infinite" },
  biteMark: {
    position: "absolute",
    width: 14,
    height: 14,
    borderRadius: "50%",
    background: "radial-gradient(circle, #e00 0%, #900 100%)",
    transform: "translate(-50%, -50%)",
    opacity: 0.8,
    pointerEvents: "none",
  },
  float: {
    position: "absolute",
    transform: "translate(-50%, -50%)",
    color: "#c0020a",
    fontWeight: 900,
    fontSize: 20,
    pointerEvents: "none",
    animation: "floatUp 0.9s ease-out forwards",
    textShadow: "0 1px 4px rgba(255,255,255,0.8)",
  },
  popup: {
    position: "absolute",
    bottom: "10%",
    left: "50%",
    transform: "translateX(-50%)",
    background: "rgba(192,2,10,0.9)",
    color: "#fff",
    padding: "6px 16px",
    borderRadius: 20,
    fontWeight: 900,
    fontSize: 15,
    whiteSpace: "nowrap",
    pointerEvents: "none",
  },
  armyRow: { display: "flex", gap: 4, marginBottom: 8, flexWrap: "wrap", justifyContent: "center", maxWidth: 320 },
  armyBug: { fontSize: 20, animation: "buzzDrift 0.6s infinite alternate" },
  touristBtn: {
    position: "fixed",
    bottom: 120,
    left: "50%",
    transform: "translateX(-50%)",
    background: "rgba(255,220,80,0.95)",
    border: "3px solid #c0020a",
    borderRadius: 20,
    padding: "12px 24px",
    cursor: "pointer",
    touchAction: "manipulation",
    zIndex: 100,
    animation: "touristPulse 0.5s infinite",
    boxShadow: "0 4px 24px rgba(192,2,10,0.4)",
  },
  touristInner: { textAlign: "center" },
  touristLabel: { fontWeight: 900, fontSize: 16, color: "#c0020a", marginTop: 4 },
  touristMsg: {
    position: "fixed",
    top: "40%",
    left: "50%",
    transform: "translateX(-50%)",
    background: "rgba(192,2,10,0.92)",
    color: "#fff",
    padding: "14px 24px",
    borderRadius: 20,
    fontWeight: 900,
    fontSize: 18,
    zIndex: 200,
    textAlign: "center",
    maxWidth: "80vw",
  },
  upgradesWrap: { width: "100%", maxWidth: 400, marginBottom: 12 },
  upgradesLabel: { fontSize: 12, fontWeight: 900, color: "#7d2d00", letterSpacing: 2, marginBottom: 6, textAlign: "center" },
  upgradesRow: { display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 },
  upgradeBtn: {
    flex: "0 0 auto",
    background: "rgba(255,255,255,0.7)",
    border: "2px solid rgba(192,2,10,0.4)",
    borderRadius: 16,
    padding: "10px 14px",
    cursor: "pointer",
    touchAction: "manipulation",
    textAlign: "center",
    minWidth: 80,
    position: "relative",
  },
  upgradeEmoji: { fontSize: 28 },
  upgradeName: { fontSize: 11, fontWeight: 700, color: "#5a1a00", marginTop: 2 },
  upgradeCost: { fontSize: 12, fontWeight: 900, color: "#c0020a", marginTop: 2 },
  ownedBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    background: "#c0020a",
    color: "#fff",
    borderRadius: 10,
    fontSize: 11,
    fontWeight: 900,
    padding: "1px 5px",
  },
  shareBtn: {
    background: "#c0020a",
    color: "#fff",
    border: "none",
    borderRadius: 20,
    padding: "12px 32px",
    fontSize: 16,
    fontWeight: 900,
    cursor: "pointer",
    touchAction: "manipulation",
    marginBottom: 16,
    boxShadow: "0 4px 16px rgba(192,2,10,0.35)",
  },
};
