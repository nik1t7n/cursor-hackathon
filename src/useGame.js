import { useState, useEffect, useRef } from 'react';

// Haptic — reads window.Telegram lazily, must not be module-scope
function buzz(kind = 'heavy') {
  const hf = window.Telegram?.WebApp?.HapticFeedback;
  if (hf) {
    if (kind === 'success') hf.notificationOccurred('success');
    else hf.impactOccurred(kind);
  } else {
    navigator.vibrate?.(kind === 'heavy' ? 40 : 15);
  }
}

// List of funny floating texts to pop up on bite clicks
const FLOAT_PHRASES = [
  'SLURP!', 'ITCHY!', 'OOUCH!', 'ANKLE SHOT!', 'DIRECT VEIN!', 
  'DELICIOUS!', 'SUMMER RUINED!', 'SWEET PLASMA!', 'Munch!',
  'BZZZ!', 'VEIN STRUCK!', 'HELL YEAH!', 'PIMPLE MAKER!', 'Sip!'
];

export function useGame() {
  // --- Game Core States ---
  const [bloodCoins, setBloodCoins] = useState(() => {
    const saved = localStorage.getItem('mq_bloodCoins');
    return saved ? parseInt(saved, 10) : 0;
  });
  
  const [biteCount, setBiteCount] = useState(() => {
    const saved = localStorage.getItem('mq_biteCount');
    return saved ? parseInt(saved, 10) : 0;
  });

  const [biteMarks, setBiteMarks] = useState([]);
  const [floatingTexts, setFloatingTexts] = useState([]);
  const [isMuted, setIsMuted] = useState(() => {
    const saved = localStorage.getItem('mq_isMuted');
    return saved === 'true';
  });

  const [isMusicMuted, setIsMusicMuted] = useState(() => {
    const saved = localStorage.getItem('mq_isMusicMuted');
    return saved === 'true';
  });

  // --- Upgrades State ---
  const [upgrades, setUpgrades] = useState(() => {
    const saved = localStorage.getItem('mq_upgrades');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // If it is the old list (less than 6 items or missing Adventure Time upgrades), ignore and reload!
        if (parsed.length === 6 && parsed.some(p => p.id === 'demon_sword')) {
          return parsed;
        }
      } catch(e) {}
    }
    return [
      { id: 'mosquitoes', name: 'Ooo Swarm Recruit', desc: 'Recruit wild Ooo mosquitoes to buzz and bite passively.', level: 0, cost: 15, baseCost: 15, multiplier: 1.5, cps: 1, cpc: 0, icon: '🦟' },
      { id: 'jake_needle', name: "Jake's Tooth Needle", desc: "Use Jake's shape-shifted sharp teeth to draw more blood per tap.", level: 0, cost: 50, baseCost: 50, multiplier: 1.6, cps: 0, cpc: 2, icon: '🐕' },
      { id: 'finn_backpack', name: "Finn's Backpack Kit", desc: 'Pack extra Ooo travel supplies to attract passive mosquito allies.', level: 0, cost: 120, baseCost: 120, multiplier: 1.7, cps: 5, cpc: 0, icon: '🎒' },
      { id: 'bubblegum_jelly', name: 'Royal Bubblegum Jelly', desc: "Princess Bubblegum's sweet royal jelly that increases click strength.", level: 0, cost: 350, baseCost: 350, multiplier: 1.8, cps: 0, cpc: 12, icon: '👑' },
      { id: 'marceline_bass', name: "Marceline's Bass", desc: "Play Marcy's rock bass chords to whip the swarm into a passive frenzy.", level: 0, cost: 1000, baseCost: 1000, multiplier: 1.9, cps: 35, cpc: 0, icon: '🎸' },
      { id: 'demon_sword', name: 'Demon Blood Sword', desc: "Shatter heavy defenses with Finn's red demon sword to draw massive blood.", level: 0, cost: 3000, baseCost: 3000, multiplier: 2.0, cps: 0, cpc: 75, icon: '🗡️' }
    ];
  });

  // --- Rare Event: Pixel Art Jake or She ---
  const [jakeActive, setJakeActive] = useState(false);
  const [jakeClicks, setJakeClicks] = useState(0);
  const [jakeClicksNeeded] = useState(15);
  const [jakeTimer, setJakeTimer] = useState(0);
  const [rareTarget, setRareTarget] = useState('jake'); // 'jake' or 'she'
  const [eventOutcome, setEventOutcome] = useState(null); // 'ruined' or 'escaped'

  // --- Derived Metrics ---
  const bloodPerClick = upgrades.reduce((acc, up) => acc + (up.level * up.cpc), 1);
  const bloodPerSecond = upgrades.reduce((acc, up) => acc + (up.level * up.cps), 0);

  // --- Audio Synthesis Engine (Ref-based with premium wav assets) ---
  const audioCtxRef = useRef(null);
  const bgMusicRef = useRef(null);
  const audioBuffersRef = useRef({});

  // Persist core progress in localStorage
  useEffect(() => {
    localStorage.setItem('mq_bloodCoins', bloodCoins.toString());
    localStorage.setItem('mq_biteCount', biteCount.toString());
    localStorage.setItem('mq_isMuted', isMuted.toString());
    localStorage.setItem('mq_isMusicMuted', isMusicMuted.toString());
    localStorage.setItem('mq_upgrades', JSON.stringify(upgrades));
  }, [bloodCoins, biteCount, isMuted, isMusicMuted, upgrades]);

  // Initialize background music
  useEffect(() => {
    const audio = new Audio('/sounds/bg_music.mp3');
    audio.loop = true;
    audio.volume = 0.25; // elegant volume level
    bgMusicRef.current = audio;

    return () => {
      if (bgMusicRef.current) {
        bgMusicRef.current.pause();
        bgMusicRef.current = null;
      }
    };
  }, []);

  const startMusic = () => {
    if (isMusicMuted || !bgMusicRef.current) return;
    bgMusicRef.current.play().catch(err => {
      console.log("Autoplay prevented, will play on interaction:", err);
    });
  };

  const stopMusic = () => {
    if (bgMusicRef.current) {
      bgMusicRef.current.pause();
    }
  };

  // Sync background music state when mute is toggled
  useEffect(() => {
    if (isMusicMuted) {
      stopMusic();
    } else {
      startMusic();
    }
  }, [isMusicMuted]);

  // Pre-load audio data into Web Audio API buffers for zero-latency gameplay
  const preloadSound = async (name, url) => {
    if (!audioCtxRef.current) return;
    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const decodedBuffer = await audioCtxRef.current.decodeAudioData(arrayBuffer);
      audioBuffersRef.current[name] = decodedBuffer;
    } catch (e) {
      console.warn("Failed to preload sound:", name, e);
    }
  };

  // Audio Context Lazy Initialization
  const initAudio = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      preloadSound('bite', '/sounds/bite.wav');
      preloadSound('upgrade', '/sounds/upgrade.wav');
      preloadSound('alert', '/sounds/alert.wav');
      preloadSound('slap', '/sounds/slap.wav');
      preloadSound('coin', '/sounds/coin.wav');
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    // Also trigger background music start upon first interaction if not muted
    if (!isMusicMuted && bgMusicRef.current && bgMusicRef.current.paused) {
      startMusic();
    }
  };

  // Play preloaded buffer source with HTML5 Audio fallback
  const playSound = (name, volume = 0.3) => {
    if (isMuted) return;
    initAudio();
    const buffer = audioBuffersRef.current[name];
    if (!buffer) {
      // Fallback in case decoding is in progress
      const audio = new Audio(`/sounds/${name}.wav`);
      audio.volume = volume;
      audio.play().catch(() => {});
      return;
    }
    try {
      const ctx = audioCtxRef.current;
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(volume, ctx.currentTime);
      source.connect(gainNode);
      gainNode.connect(ctx.destination);
      source.start(0);
    } catch (e) {
      console.warn("Web Audio playback failed, retrying fallback:", e);
      const audio = new Audio(`/sounds/${name}.wav`);
      audio.volume = volume;
      audio.play().catch(() => {});
    }
  };

  const playBiteSound = () => {
    playSound('bite', 0.45);
  };

  const playUpgradeSound = () => {
    playSound('upgrade', 0.3);
  };

  const playLegAlertSound = () => {
    playSound('alert', 0.45);
  };

  const playSlapSound = () => {
    playSound('slap', 0.5);
  };

  // --- Handlers & Core Action Loops ---

  // Handle biting click
  const handleBite = (clientX, clientY, containerRef) => {
    buzz('heavy');
    initAudio();
    playBiteSound();

    let percentX = 50;
    let percentY = 50;

    if (containerRef && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      percentX = ((clientX - rect.left) / rect.width) * 100;
      percentY = ((clientY - rect.top) / rect.height) * 100;
    }

    // Add unique bite mark red spot
    const newMark = {
      id: Date.now() + Math.random(),
      x: percentX,
      y: percentY,
      size: Math.random() * 4 + 5, // Size in px (subtler, cleaner micro-bites)
      opacity: 0.7
    };
    
    setBiteMarks(prev => [...prev.slice(-39), newMark]); // Limit to 40 max on screen for performance

    // Add flying text popup
    const phrase = FLOAT_PHRASES[Math.floor(Math.random() * FLOAT_PHRASES.length)];
    const newText = {
      id: Date.now() + Math.random(),
      x: percentX + (Math.random() * 12 - 6),
      y: percentY - 10,
      text: phrase,
      amount: bloodPerClick
    };
    setFloatingTexts(prev => [...prev, newText]);

    // Cleanup floating text after 1s
    setTimeout(() => {
      setFloatingTexts(prev => prev.filter(t => t.id !== newText.id));
    }, 1000);

    // Update state values
    setBloodCoins(prev => prev + bloodPerClick);
    setBiteCount(prev => prev + 1);
  };

  // Buy upgrade action
  const buyUpgrade = (upgradeId) => {
    const upIndex = upgrades.findIndex(u => u.id === upgradeId);
    if (upIndex === -1) return;
    
    const upgrade = upgrades[upIndex];
    if (bloodCoins < upgrade.cost) return;

    buzz('success');
    playUpgradeSound();

    const newLevel = upgrade.level + 1;
    const newCost = Math.round(upgrade.baseCost * Math.pow(upgrade.multiplier, newLevel));

    const updatedUpgrades = [...upgrades];
    updatedUpgrades[upIndex] = {
      ...upgrade,
      level: newLevel,
      cost: newCost
    };

    setBloodCoins(prev => prev - upgrade.cost);
    setUpgrades(updatedUpgrades);
  };

  // Mute sound effects handler
  const toggleMute = () => {
    setIsMuted(prev => !prev);
  };

  // Mute background music handler
  const toggleMusicMute = () => {
    setIsMusicMuted(prev => {
      const next = !prev;
      if (next) {
        stopMusic();
      } else {
        startMusic();
      }
      return next;
    });
  };

  // --- Passive Blood Generation Loop ---
  useEffect(() => {
    if (bloodPerSecond === 0) return;

    const interval = setInterval(() => {
      setBloodCoins(prev => prev + (bloodPerSecond / 10)); // Increment every 100ms for high fluid counter feel!
    }, 100);

    return () => clearInterval(interval);
  }, [bloodPerSecond]);

  // --- Rare Event System: Spawning Pixel Art Jake or She ---
  useEffect(() => {
    // Spawns randomly between 20 and 35 seconds
    const triggerNextJake = () => {
      const timeToWait = Math.random() * 15000 + 20000;
      
      return setTimeout(() => {
        if (!jakeActive) {
          setRareTarget(Math.random() > 0.5 ? 'jake' : 'she');
          setJakeActive(true);
          setJakeClicks(0);
          setJakeTimer(8); // 8 seconds to complete the tapping session
          setEventOutcome(null);
          playLegAlertSound();
        }
      }, timeToWait);
    };

    let timer = triggerNextJake();
    return () => clearTimeout(timer);
  }, [jakeActive]);

  // Rare event: Manage countdown timer for Jake
  useEffect(() => {
    if (!jakeActive) return;

    const interval = setInterval(() => {
      setJakeTimer(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          // Fail: Jake rolled away!
          setEventOutcome('escaped');
          playSlapSound();
          setTimeout(() => {
            setJakeActive(false);
            setEventOutcome(null);
          }, 1500);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [jakeActive]);

  // Handle click / bite on Jake the Dog (worth DOUBLE blood coins!)
  const handleJakeClick = (clientX, clientY, containerRef) => {
    if (!jakeActive || eventOutcome) return;
    
    initAudio();
    playBiteSound();

    let percentX = 85;
    let percentY = 40;

    if (containerRef && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      percentX = ((clientX - rect.left) / rect.width) * 100;
      percentY = ((clientY - rect.top) / rect.height) * 100;
    }

    // Add unique bite mark red spot on Jake
    const newMark = {
      id: Date.now() + Math.random(),
      x: percentX,
      y: percentY,
      size: Math.random() * 4 + 5, // micro bites
      opacity: 0.7
    };
    setBiteMarks(prev => [...prev.slice(-39), newMark]);

    // Add floating text
    const phrase = FLOAT_PHRASES[Math.floor(Math.random() * FLOAT_PHRASES.length)];
    const newText = {
      id: Date.now() + Math.random(),
      x: percentX + (Math.random() * 10 - 5),
      y: percentY - 8,
      text: phrase,
      amount: bloodPerClick * 2 // Jake's plasma is worth double!
    };
    setFloatingTexts(prev => [...prev, newText]);
    setTimeout(() => {
      setFloatingTexts(prev => prev.filter(t => t.id !== newText.id));
    }, 1000);

    setBloodCoins(prev => prev + bloodPerClick * 2);
    setBiteCount(prev => prev + 1);

    setJakeClicks(prev => {
      const next = prev + 1;
      if (next >= jakeClicksNeeded) {
        // Success: Jake Drained!
        setEventOutcome('ruined');
        const payout = Math.max(150, bloodPerSecond * 60 + bloodPerClick * 40);
        setBloodCoins(c => c + payout);
        playSound('coin', 0.4);
        
        setTimeout(() => {
          setJakeActive(false);
          setEventOutcome(null);
        }, 1800);
      }
      return next;
    });
  };

  // --- Copy Flex Message ---
  const getShareText = () => {
    const text = `🦟 MOSQUITO TYCOON 🩸\n` +
      `I ruined ${biteCount.toLocaleString()} summer vacations as an annoying pest!\n` +
      `💰 Wealth: ${bloodCoins.toLocaleString()} Blood Coins\n` +
      `⚡ Passive Swarm: ${bloodPerSecond.toLocaleString()} blood/sec\n` +
      `Jake's Needle Level: ${upgrades.find(u => u.id === 'jake_needle')?.level || 0}\n` +
      `Join me in slacking off and biting tourists! ⛺`;
    return text;
  };

  return {
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
  };
}
