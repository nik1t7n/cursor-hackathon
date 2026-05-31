import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, VolumeX, Music, Share2, Copy, Sparkles, AlertCircle, ShoppingBag, BarChart3, X } from 'lucide-react';
import { useGame } from './useGame';
import { 
  BloodCoinSVG, 
  MosquitoSVG, 
  TouristLegSVG, 
  FinnTarget 
} from './components/SVGAssets';

// Telegram Mini App fullscreen + safe area + no swipe-close
function initTelegram() {
  const tg = window.Telegram?.WebApp;
  if (!tg) return;
  tg.ready();
  tg.expand();
  if (tg.isVersionAtLeast?.('8.0')) {
    tg.requestFullscreen?.();
    tg.disableVerticalSwipes?.();
  }
  tg.setHeaderColor?.('#fafafa');
  tg.setBackgroundColor?.('#fafafa');
  tg.setBottomBarColor?.('#fafafa');
}

export default function App() {
  const {
    bloodCoins,
    biteCount,
    biteMarks,
    floatingTexts,
    isMuted,
    isMusicMuted,
    upgrades,
    bloodPerClick,
    bloodPerSecond,
    jakeActive,
    jakeClicks,
    jakeClicksNeeded,
    jakeTimer,
    rareTarget,
    eventOutcome,
    handleBite,
    buyUpgrade,
    toggleMute,
    toggleMusicMute,
    handleJakeClick,
    getShareText,
    initAudio
  } = useGame();

  const canvasRef = useRef(null);
  const [mousePos, setMousePos] = useState({ x: 150, y: 150 });
  const [isBiting, setIsBiting] = useState(false);
  const [jakeBounceType, setJakeBounceType] = useState(null);
  const [showShareToast, setShowShareToast] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  
  // Navigation sheet management states
  const [activeSheet, setActiveSheet] = useState(null); // 'shop' or 'stats' or null

  // TG fullscreen + safe-area insets
  const [safeTop, setSafeTop] = useState(0);
  useEffect(() => {
    initTelegram();
    const tg = window.Telegram?.WebApp;
    if (!tg) return;
    const update = () => {
      const top = (tg.contentSafeAreaInset?.top ?? 0) + (tg.safeAreaInset?.top ?? 0);
      setSafeTop(top);
    };
    update();
    tg.onEvent?.('safeAreaChanged', update);
    tg.onEvent?.('contentSafeAreaChanged', update);
  }, []);

  // Track coordinates of the cursor over the bite area
  const handleMouseMove = (e) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleCanvasClick = (e) => {
    e.preventDefault();
    setHasInteracted(true);
    initAudio();
    setIsBiting(true);
    setTimeout(() => setIsBiting(false), 80);
    handleBite(e.clientX, e.clientY, canvasRef);
  };

  const handleShareClick = () => {
    setHasInteracted(true);
    initAudio();
    navigator.clipboard.writeText(getShareText());
    setShowShareToast(true);
    setTimeout(() => setShowShareToast(false), 2500);
  };

  // Generate passive pests based on Swarm Level
  const [ambientMosquitoes, setAmbientMosquitoes] = useState([]);
  const passiveSwarmLevel = upgrades.find(u => u.id === 'mosquitoes')?.level || 0;

  useEffect(() => {
    // Cap at 20 for mobile perf — 100 items at 60ms = lag on Android
    const count = 4 + passiveSwarmLevel * 2;
    const initialMosquitoes = Array.from({ length: Math.min(20, count) }).map((_, idx) => ({
      id: idx,
      x: Math.random() * 90 + 5,
      y: Math.random() * 90 + 5,
      scale: Math.random() * 0.25 + 0.35,
      angle: Math.random() * 360,
      speedX: (Math.random() - 0.5) * 1.2,
      speedY: (Math.random() - 0.5) * 1.2
    }));
    setAmbientMosquitoes(initialMosquitoes);
  }, [passiveSwarmLevel]);

  // Handle movements of passive swarm pests (organic insect flight path simulation)
  useEffect(() => {
    if (ambientMosquitoes.length === 0) return;

    const interval = setInterval(() => {
      setAmbientMosquitoes(prev => 
        prev.map(m => {
          // Organic steering force adjustments (random walking)
          let nSpeedX = m.speedX + (Math.random() - 0.5) * 0.25;
          let nSpeedY = m.speedY + (Math.random() - 0.5) * 0.25;

          // Limit peak speed to keep flights gentle and readable
          const maxSpeed = 0.7;
          const currentSpeed = Math.sqrt(nSpeedX * nSpeedX + nSpeedY * nSpeedY);
          if (currentSpeed > maxSpeed) {
            nSpeedX = (nSpeedX / currentSpeed) * maxSpeed;
            nSpeedY = (nSpeedY / currentSpeed) * maxSpeed;
          }

          // Gentle sinusoidal hovering wave drift
          const waveDriftX = Math.sin(Date.now() * 0.003 + m.id) * 0.08;
          const waveDriftY = Math.cos(Date.now() * 0.003 + m.id) * 0.08;

          let nx = m.x + nSpeedX + waveDriftX;
          let ny = m.y + nSpeedY + waveDriftY;

          // Keep in bounds with a soft bounce and force push
          if (nx < 4) { nSpeedX = Math.abs(nSpeedX) * 1.1; nx = 4; }
          if (nx > 96) { nSpeedX = -Math.abs(nSpeedX) * 1.1; nx = 96; }
          if (ny < 4) { nSpeedY = Math.abs(nSpeedY) * 1.1; ny = 4; }
          if (ny > 96) { nSpeedY = -Math.abs(nSpeedY) * 1.1; ny = 96; }

          // Calculate heading angle dynamically to align with flight vector
          const headingRad = Math.atan2(nSpeedY + waveDriftY, nSpeedX + waveDriftX);
          const headingDeg = (headingRad * 180) / Math.PI + 90; // +90 offset for vertical facing sprite

          return {
            ...m,
            x: nx,
            y: ny,
            speedX: nSpeedX,
            speedY: nSpeedY,
            angle: headingDeg
          };
        })
      );
    }, 100);

    return () => clearInterval(interval);
  }, [ambientMosquitoes.length]);



  const getPestRank = () => {
    if (biteCount < 10) return 'Larva Recruit';
    if (biteCount < 50) return 'Ankle Biter';
    if (biteCount < 150) return 'Tent Invader';
    if (biteCount < 400) return 'Vacation Ruiner';
    return 'Swarm Lord';
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-between bg-[#fafafa] overflow-hidden select-none font-sans text-zinc-900 px-4 pb-4 box-border" style={{ paddingTop: safeTop > 0 ? safeTop : 16 }}>
      


      {/* --- Elegant Top Title & Counter Header --- */}
      <header className="w-full max-w-lg flex items-center justify-between z-10 border-b border-[#18181b]/10 pb-3">
        <div>
          <h1 className="text-lg font-black tracking-widest text-[#18181b] uppercase flex items-center gap-1.5 select-none">
            MOSQUITO TYCOON
          </h1>
          <p className="text-[10px] uppercase font-bold text-zinc-500 mt-0.5 tracking-wider">
            Summer Slacking Simulator
          </p>
        </div>

        {/* Currency drop and total count */}
        <div className="flex items-center gap-2.5">
          <div className="text-right">
            <div className="text-lg font-black text-[#e11d48] tracking-tight flex items-center gap-1">
              <span>{bloodCoins.toLocaleString()}</span>
              <BloodCoinSVG className="w-5 h-5 filter drop-shadow" />
            </div>
            <p className="text-[9px] uppercase font-bold text-zinc-400">
              +{bloodPerSecond.toFixed(1)}/s
            </p>
          </div>
        </div>
      </header>

      {/* --- Center Arena: The Click Target --- */}
      <main className="w-full max-w-lg flex-grow flex items-center justify-center py-4 box-border relative overflow-hidden">
        <div 
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          className="w-full h-full max-h-[500px] relative select-none group bg-transparent"
        >
          <FinnTarget onClick={handleCanvasClick} isBiting={isBiting} biteCount={biteCount}>
            <>
              {/* Glowing Bite Spot Marks */}
              <AnimatePresence>
                {biteMarks.map(mark => (
                  <motion.div
                    key={mark.id}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: mark.opacity }}
                    exit={{ opacity: 0 }}
                    className="absolute rounded-full pointer-events-none bg-[#e11d48]/40 ring-2 ring-[#e11d48]/20 blur-[1px] border border-[#e11d48]/70"
                    style={{
                      left: `calc(${mark.x}% - ${mark.size / 2}px)`,
                      top: `calc(${mark.y}% - ${mark.size / 2}px)`,
                      width: mark.size,
                      height: mark.size,
                    }}
                  >
                    <div className="w-1 h-1 rounded-full bg-[#9f1239] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Floating Action Text Popups */}
              <AnimatePresence>
                {floatingTexts.map(item => (
                  <motion.div
                    key={item.id}
                    initial={{ scale: 0.5, y: item.y, opacity: 0, rotate: Math.random() * 20 - 10 }}
                    animate={{ scale: 1.1, y: item.y - 65, opacity: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.7, ease: "easeOut" }}
                    className="absolute pointer-events-none text-center select-none z-30"
                    style={{ left: `${item.x}%`, transform: 'translateX(-50%)' }}
                  >
                    <span className="block px-2.5 py-0.5 text-[10px] bg-[#18181b] border border-[#18181b] rounded text-white font-black tracking-widest uppercase">
                      {item.text}
                    </span>
                    <span className="block text-[10px] font-black text-[#e11d48] mt-0.5">
                      +{item.amount} BLOOD
                    </span>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Ambient pests fluttering */}
              {ambientMosquitoes.map(m => (
                <div
                  key={m.id}
                  className="absolute pointer-events-none z-10 transition-transform duration-100"
                  style={{
                    left: `${m.x}%`,
                    top: `${m.y}%`,
                    transform: `translate(-50%, -50%) scale(${m.scale}) rotate(${m.angle}deg)`
                  }}
                >
                  <img 
                    src="/mosq.webp" 
                    alt="Pixel Mosquito Swarm" 
                    className="w-8 h-8 object-contain opacity-70 select-none"
                    style={{ imageRendering: 'pixelated' }}
                  />
                </div>
              ))}

              {/* Spring Desktop Mosquito cursor follower */}
              <div
                className="absolute pointer-events-none z-40 hidden md:block transition-all ease-out duration-75"
                style={{
                  left: mousePos.x,
                  top: mousePos.y,
                  transform: `translate(-50%, -50%) scale(${isBiting ? 1.25 : 0.95}) rotate(${isBiting ? 12 : -8}deg)`,
                  filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.12))'
                }}
              >
                <img 
                  src="/mosq.webp" 
                  alt="Active Mosquito Follower" 
                  className="w-12 h-12 object-contain select-none"
                  style={{ imageRendering: 'pixelated' }}
                />
              </div>
            </>
          </FinnTarget>

          {/* --- RARE EVENT OVERLAY: Pixel Art Jake detected --- */}
          <AnimatePresence>
            {jakeActive && (
              <motion.div
                initial={{ x: "120%", y: "-50%", rotate: 25, scale: 0.7 }}
                animate={{ x: "15%", y: "-50%", rotate: -15, scale: 0.8 }} // Peeks in at 80% size, slightly rotated
                exit={{ x: "120%", y: "-50%", rotate: 25, scale: 0.7 }}
                transition={{ type: "spring", stiffness: 220, damping: 19 }}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-40 select-none cursor-pointer flex flex-col items-center justify-center gap-1.5"
                style={{ originX: 1, originY: 0.5 }}
                onClick={(e) => {
                  e.stopPropagation(); // Avoid triggering Finn target clicks
                  if (eventOutcome) return;

                  // Snappy dual-mode wobble bounce triggers
                  const isSuper = (jakeClicks + 1) % 4 === 0;
                  setJakeBounceType(isSuper ? 'super' : 'normal');

                  const timeoutDuration = isSuper ? 650 : 250;
                  setTimeout(() => setJakeBounceType(null), timeoutDuration);

                  handleJakeClick(e.clientX, e.clientY, canvasRef);
                }}
              >
                {/* Timer countdown ticker Float over Jake */}
                {!eventOutcome && (
                  <div className="bg-[#18181b] text-white px-2.5 py-0.5 rounded-lg border border-[#18181b] font-mono text-[9px] font-black uppercase tracking-widest animate-pulse shadow-md z-50">
                    ⏱️ {jakeTimer}s
                  </div>
                )}

                {/* Jake Pixel Art Sprite */}
                <div className="relative group transition-transform">
                  <motion.img 
                    src={rareTarget === 'jake' ? '/jake.png' : '/she.png'} 
                    alt={rareTarget === 'jake' ? "Jake the Dog pixel art" : "Adventure Time character pixel art"} 
                    className="w-40 h-40 md:w-48 md:h-48 object-contain filter drop-shadow(0 10px 20px rgba(0,0,0,0.18)) select-none"
                    style={{ imageRendering: 'pixelated' }}
                    animate={
                      jakeBounceType === 'super' ? {
                        y: [0, 8, -36, 6, -20, 4, -8, 0],
                        scaleY: [1, 0.7, 1.3, 0.8, 1.15, 0.9, 1.05, 1],
                        scaleX: [1, 1.3, 0.7, 1.2, 0.85, 1.1, 0.95, 1],
                        rotate: [0, -6, 6, -4, 4, -2, 0]
                      } : jakeBounceType === 'normal' ? {
                        y: [0, 4, -10, 2, 0],
                        scaleY: [1, 0.85, 1.1, 0.95, 1],
                        scaleX: [1, 1.15, 0.9, 1.05, 1],
                        rotate: [0, -3, 3, 0]
                      } : {
                        y: 0,
                        scaleY: 1,
                        scaleX: 1,
                        rotate: 0
                      }
                    }
                    transition={{
                      duration: jakeBounceType === 'super' ? 0.65 : 0.25,
                      ease: "easeInOut"
                    }}
                  />

                  {/* Tap prompt dashed spinner */}
                  {!eventOutcome && (
                    <div className="absolute inset-0 border-3 border-dashed border-amber-500 rounded-full animate-spin pointer-events-none opacity-40" />
                  )}
                </div>

                {/* Taps Progress Bar */}
                {!eventOutcome && (
                  <div className="w-24 bg-zinc-200 h-2.5 rounded-full p-0.5 border border-[#18181b] overflow-hidden relative shadow-inner shadow-black/10 z-50">
                    <motion.div 
                      className="bg-amber-500 h-full rounded-full"
                      style={{ width: `${(jakeClicks / jakeClicksNeeded) * 100}%` }}
                      transition={{ ease: "easeOut" }}
                    />
                  </div>
                )}

                {/* Success outcome pop */}
                {eventOutcome === 'ruined' && (
                  <motion.div 
                    initial={{ scale: 0 }} 
                    animate={{ scale: 1 }} 
                    className="absolute inset-0 flex flex-col items-center justify-center text-center bg-white/95 rounded-3xl p-3 border border-[#18181b] shadow-xl z-50"
                  >
                    <span className="text-3xl animate-bounce">🩸</span>
                    <h3 className="text-xs font-black bg-[#18181b] text-yellow-400 px-2 py-1 rounded-lg uppercase tracking-wider mt-1">
                      DRAINED!
                    </h3>
                  </motion.div>
                )}

                {eventOutcome === 'escaped' && (
                  <motion.div 
                    initial={{ scale: 0 }} 
                    animate={{ scale: 1 }} 
                    className="absolute inset-0 flex flex-col items-center justify-center text-center bg-white/95 rounded-3xl p-3 border border-rose-500 shadow-xl z-50"
                  >
                    <span className="text-3xl">💨</span>
                    <h3 className="text-xs font-black bg-[#18181b] text-rose-500 px-2 py-1 rounded-lg uppercase tracking-wider mt-1">
                      ESCAPED!
                    </h3>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* --- Elegant Floating Bottom Dock Navigation Menu --- */}
      <footer className="w-full max-w-lg z-30 mb-2">
        <div className="minimal-dock rounded-3xl p-2.5 flex items-center justify-between gap-2 max-w-sm mx-auto">
          
          {/* Main Bite Screen Toggle Tab */}
          <button
            onClick={() => { initAudio(); setActiveSheet(null); }}
            className={`flex-1 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider active-hover-scale flex items-center justify-center gap-1 ${
              activeSheet === null 
                ? 'bg-[#18181b] text-white border border-[#18181b]' 
                : 'text-zinc-600 border border-transparent'
            }`}
          >
            <span>🎯 BITE</span>
          </button>

          {/* Shop Bottom Sheet Toggle Tab */}
          <button
            onClick={() => { initAudio(); setActiveSheet('shop'); }}
            className={`flex-1 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider active-hover-scale flex items-center justify-center gap-1 ${
              activeSheet === 'shop' 
                ? 'bg-[#18181b] text-white border border-[#18181b]' 
                : 'text-zinc-600 border border-transparent hover:bg-zinc-100/50'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
            <span>SHOP</span>
          </button>

          {/* Stats Bottom Sheet Toggle Tab */}
          <button
            onClick={() => { initAudio(); setActiveSheet('stats'); }}
            className={`flex-1 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider active-hover-scale flex items-center justify-center gap-1 ${
              activeSheet === 'stats' 
                ? 'bg-[#18181b] text-white border border-[#18181b]' 
                : 'text-zinc-600 border border-transparent hover:bg-zinc-100/50'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 shrink-0" />
            <span>STATS</span>
          </button>

          {/* Vertical Separator */}
          <div className="w-[1.5px] h-6 bg-[#18181b]/10 self-center" />

          {/* Music Toggle Action Tab */}
          <button
            onClick={toggleMusicMute}
            className={`p-2.5 rounded-2xl transition-all active-hover-scale ${
              isMusicMuted 
                ? 'bg-amber-50 text-amber-600 border border-amber-200' 
                : 'bg-zinc-100 text-amber-500 border border-zinc-200 hover:bg-zinc-200/50'
            }`}
            title="Toggle Background Music"
          >
            <Music className="w-4 h-4" />
          </button>

          {/* Sound Toggle Action Tab */}
          <button
            onClick={toggleMute}
            className={`p-2.5 rounded-2xl transition-all active-hover-scale ${
              isMuted 
                ? 'bg-rose-50 text-rose-600 border border-rose-200' 
                : 'bg-zinc-100 text-sky-600 border border-zinc-200 hover:bg-zinc-200/50'
            }`}
            title="Toggle Sound Effects"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

        </div>
      </footer>

      {/* --- SLIDING BOTTOM SHEETS (Framer Motion) --- */}
      <AnimatePresence>
        {activeSheet && (
          <>
            {/* Sheet Backdrop dim blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveSheet(null)}
              className="fixed inset-0 bg-[#18181b]/30 backdrop-blur-[4px] z-40 cursor-pointer"
            />

            {/* Bottom Sheet Modal Panel */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              className="fixed bottom-0 left-0 right-0 z-50 bottom-sheet max-h-[85vh] flex flex-col max-w-lg mx-auto rounded-t-[32px] overflow-hidden"
            >
              {/* Grab handle indicator */}
              <div className="w-12 h-1.5 bg-zinc-200 rounded-full mx-auto my-3" />

              {/* Sheet Header block */}
              <div className="px-6 pb-4 border-b border-zinc-100 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-black uppercase tracking-wider text-[#18181b] flex items-center gap-1.5">
                    {activeSheet === 'shop' ? <ShoppingBag className="w-4.5 h-4.5 text-rose-600" /> : <BarChart3 className="w-4.5 h-4.5 text-rose-600" />}
                    <span>{activeSheet === 'shop' ? 'Tactical Swarm Shop' : 'Summer Ruin Stats'}</span>
                  </h2>
                  <p className="text-[10px] uppercase font-bold text-zinc-400 mt-0.5">
                    {activeSheet === 'shop' ? 'Upgrades & Equipment' : 'Pest ranking & achievements'}
                  </p>
                </div>
                <button
                  onClick={() => setActiveSheet(null)}
                  className="p-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-500 rounded-full transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Sheet Content Inner Scrollable container */}
              <div className="flex-grow overflow-y-auto px-6 py-4 box-border pb-16">
                
                {/* --- Tab 1 Content: Swarm Upgrades Shop --- */}
                {activeSheet === 'shop' && (
                  <div className="flex flex-col gap-3">
                    {upgrades.map(upgrade => {
                      const isAffordable = bloodCoins >= upgrade.cost;
                      return (
                        <button
                          key={upgrade.id}
                          onClick={() => buyUpgrade(upgrade.id)}
                          className={`w-full text-left rounded-2xl p-3 border-2 flex items-center justify-between relative transition-all active-hover-scale ${
                            isAffordable
                              ? 'bg-white border-[#18181b] shadow-[4px_4px_0px_#18181b] hover:bg-rose-50/20 cursor-pointer'
                              : 'bg-zinc-50 border-zinc-200 opacity-60 cursor-not-allowed'
                          }`}
                          disabled={!isAffordable}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-2xl bg-zinc-100 p-2 rounded-xl border border-zinc-200">
                              {upgrade.icon}
                            </span>
                            <div>
                              <h3 className="font-extrabold text-zinc-900 text-xs uppercase tracking-wider">
                                {upgrade.name}
                              </h3>
                              <p className="text-[10px] text-zinc-500 mt-0.5 leading-snug max-w-[200px] md:max-w-none">
                                {upgrade.desc}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[8px] uppercase font-black text-zinc-400 bg-zinc-100 px-1 py-0.5 rounded border border-zinc-200">
                                  LVL {upgrade.level}
                                </span>
                                <span className="text-[9px] font-black text-[#e11d48]">
                                  {upgrade.cps > 0 && `+${upgrade.cps} cps`}
                                  {upgrade.cpc > 0 && `+${upgrade.cpc} cpc`}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col items-end">
                            <div className="flex items-center gap-0.5 font-mono font-black text-xs text-[#e11d48]">
                              <BloodCoinSVG className="w-4 h-4" />
                              <span>{upgrade.cost.toLocaleString()}</span>
                            </div>
                            <span className={`text-[8px] uppercase font-black mt-1 px-1.5 py-0.5 rounded border ${
                              isAffordable ? 'bg-[#18181b] text-white border-[#18181b]' : 'bg-zinc-100 text-zinc-400 border-zinc-200'
                            }`}>
                              {isAffordable ? 'BUY' : 'LOCKED'}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* --- Tab 2 Content: Stats & Target Picker --- */}
                {activeSheet === 'stats' && (
                  <div className="flex flex-col gap-6">
                    {/* General metrics grid */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-zinc-50 border border-zinc-200 p-3 rounded-2xl">
                        <span className="text-[10px] uppercase font-black text-zinc-400">Total bites logged</span>
                        <p className="text-xl font-black text-zinc-900 mt-0.5">{biteCount.toLocaleString()}</p>
                      </div>
                      <div className="bg-zinc-50 border border-zinc-200 p-3 rounded-2xl">
                        <span className="text-[10px] uppercase font-black text-zinc-400">Pest class rank</span>
                        <p className="text-sm font-black text-[#e11d48] uppercase tracking-wide mt-1.5">{getPestRank()}</p>
                      </div>
                      <div className="bg-zinc-50 border border-zinc-200 p-3 rounded-2xl">
                        <span className="text-[10px] uppercase font-black text-zinc-400">Passive CPS Rate</span>
                        <p className="text-xl font-black text-zinc-900 mt-0.5">+{bloodPerSecond.toFixed(1)}</p>
                      </div>
                      <div className="bg-zinc-50 border border-zinc-200 p-3 rounded-2xl">
                        <span className="text-[10px] uppercase font-black text-zinc-400">TapCPC Strength</span>
                        <p className="text-xl font-black text-zinc-900 mt-0.5">+{bloodPerClick}</p>
                      </div>
                    </div>

                    {/* Share Button card */}
                    <button
                      onClick={handleShareClick}
                      className="w-full py-4 bg-gradient-to-r from-rose-600 to-[#e11d48] text-white rounded-2xl font-black text-xs tracking-widest shadow-md hover:brightness-110 active-hover-scale flex items-center justify-center gap-2 uppercase border border-rose-500"
                    >
                      <Share2 className="w-4 h-4" />
                      <span>COPY SHARING FLEX CARD</span>
                    </button>
                  </div>
                )}

              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* --- Flex Clipboard copy Success toast --- */}
      <AnimatePresence>
        {showShareToast && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="fixed bottom-24 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50 gallery-panel bg-white border-[#18181b] text-zinc-950 rounded-2xl p-4 flex items-center gap-3 shadow-xl justify-between"
          >
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-zinc-100 border border-zinc-200">
                <Copy className="w-4 h-4 text-rose-600" />
              </div>
              <div>
                <p className="font-black text-xs text-zinc-900 uppercase">FLEX COPY SUCCESSFUL!</p>
                <p className="text-[9px] uppercase font-bold text-zinc-400 mt-0.5">Ready to share on Twitter/Reddit</p>
              </div>
            </div>
            <Sparkles className="w-4 h-4 text-[#e11d48] animate-spin" />
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
