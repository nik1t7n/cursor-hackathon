import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

// --- Blood Coin SVG (Glossy drop coin with wings) ---
export function BloodCoinSVG({ className = "w-6 h-6" }) {
  return (
    <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* wings on the sides */}
      <path d="M10 40 C 20 28, 32 35, 36 45 C 30 48, 18 46, 10 40 Z" fill="rgba(244, 63, 94, 0.2)" stroke="#18181b" strokeWidth="2.5" />
      <path d="M90 40 C 80 28, 68 35, 64 45 C 70 48, 82 46, 90 40 Z" fill="rgba(244, 63, 94, 0.2)" stroke="#18181b" strokeWidth="2.5" />
      
      {/* Outer black stroke of the coin */}
      <circle cx="50" cy="50" r="30" fill="#e11d48" stroke="#18181b" strokeWidth="4.5" />
      {/* Inner lighter red accent */}
      <circle cx="50" cy="50" r="23" fill="#f43f5e" />
      {/* Highlight/gloss reflection */}
      <path d="M35 40 A 15 15 0 0 1 65 40" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
      {/* Drop center droplet */}
      <path d="M50 36 C42 46, 42 59, 50 59 C58 59, 58 46, 50 36 Z" fill="#fff" opacity="0.9" />
    </svg>
  );
}

// --- Cartoon Mosquito SVG (Highly polished) ---
export function MosquitoSVG({ className = "w-16 h-16", wingFlap = false }) {
  return (
    <svg className={className} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Jointed legs */}
      <path d="M40 72 L25 87 L18 100" stroke="#18181b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M55 72 L55 92 L50 106" stroke="#18181b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M70 72 L85 87 L92 100" stroke="#18181b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

      {/* Abdomen */}
      <path d="M45 55 C35 30, 20 30, 15 45 C12 60, 25 75, 45 65 Z" fill="#e11d48" stroke="#18181b" strokeWidth="3.5" />
      <path d="M28 39 C24 43, 23 48, 26 53" stroke="#9f1239" strokeWidth="2" strokeLinecap="round" />
      <path d="M36 45 C32 49, 31 54, 34 59" stroke="#9f1239" strokeWidth="2" strokeLinecap="round" />

      {/* Thorax */}
      <circle cx="55" cy="55" r="14" fill="#3f3f46" stroke="#18181b" strokeWidth="3.5" />

      {/* Head */}
      <circle cx="70" cy="57" r="10" fill="#18181b" stroke="#18181b" strokeWidth="3.5" />

      {/* Googly eyes */}
      <circle cx="73" cy="49" r="7" fill="#fff" stroke="#18181b" strokeWidth="2" />
      <circle cx="74" cy="50" r="3" fill="#000" />
      <circle cx="72" cy="48" r="1.5" fill="#fff" />

      <circle cx="81" cy="55" r="7" fill="#fff" stroke="#18181b" strokeWidth="2" />
      <circle cx="82" cy="56" r="3" fill="#000" />
      <circle cx="80" cy="54" r="1.5" fill="#fff" />

      {/* Needle proboscis */}
      <path d="M80 62 L106 73" stroke="#18181b" strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="106" cy="73" r="3" fill="#ef4444" />

      {/* Flapping wings */}
      <g style={{
        transformOrigin: "55px 45px",
        animation: wingFlap ? "flap 0.05s infinite alternate ease-in-out" : "none"
      }}>
        <path d="M55 45 C 50 15, 30 10, 38 40 C 42 45, 52 48, 55 45 Z" fill="rgba(255,255,255,0.8)" stroke="#18181b" strokeWidth="2.5" />
        <path d="M57 45 C 72 15, 92 10, 84 40 C 80 45, 60 48, 57 45 Z" fill="rgba(255,255,255,0.75)" stroke="#18181b" strokeWidth="2.5" />
      </g>

      <style>{`
        @keyframes flap {
          0% { transform: scaleY(1.0) rotate(0deg); }
          100% { transform: scaleY(0.4) rotate(15deg); }
        }
      `}</style>
    </svg>
  );
}

// --- Rare Event: Sunburned Hawaii Tourist Leg SVG ---
export function TouristLegSVG({ className = "w-full h-full", clicks = 0, total = 15 }) {
  const scale = 1 - (clicks / total) * 0.12;
  const isBattered = clicks > 5;

  return (
    <svg 
      className={className} 
      style={{ transform: `scale(${scale})`, transition: "transform 0.1s" }}
      viewBox="0 0 200 400" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="touristLegGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={isBattered ? "#be123c" : "#fda4af"} />
          <stop offset="60%" stopColor={isBattered ? "#e11d48" : "#f43f5e"} />
          <stop offset="100%" stopColor={isBattered ? "#9f1239" : "#fda4af"} />
        </linearGradient>
      </defs>

      {/* Sloped leg silhouette */}
      <path 
        d="M75 0 C75 120, 88 230, 82 285 C78 305, 58 312, 38 332 C15 352, 22 368, 48 372 C80 375, 110 378, 142 372 C155 369, 168 358, 164 340 C154 300, 138 270, 138 190 C138 120, 140 0, 140 0 Z" 
        fill="url(#touristLegGrad)"
        stroke="#18181b" 
        strokeWidth="4.5" 
        strokeLinejoin="round" 
      />

      <path d="M125 315 C132 322, 138 322, 142 320" stroke="#18181b" strokeWidth="2.5" opacity="0.3" strokeLinecap="round" />
      <path d="M78 315 C72 322, 66 322, 62 320" stroke="#18181b" strokeWidth="2.5" opacity="0.3" strokeLinecap="round" />

      <path d="M73 80 L69 78" stroke="#18181b" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M76 150 L72 148" stroke="#18181b" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M75 220 L71 218" stroke="#18181b" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M136 100 L140 102" stroke="#18181b" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M135 170 L139 172" stroke="#18181b" strokeWidth="1.5" strokeLinecap="round" />

      <g transform="translate(25, 335)">
        <path d="M0 25 C10 12, 100 5, 145 20 C155 24, 155 33, 145 38 C105 45, 10 43, 0 33 Z" fill="#0284c7" stroke="#18181b" strokeWidth="4.5" strokeLinejoin="round" />
        <path d="M3 25 C13 15, 95 8, 140 22 C146 25, 146 31, 140 35 C102 41, 13 39, 3 31 Z" fill="#38bdf8" />
        <path d="M50 8 C60 0, 110 5, 115 15 C105 25, 80 25, 50 8 Z" fill="#ea580c" stroke="#18181b" strokeWidth="3" />
        <path d="M54 9 C62 2, 105 7, 110 15" stroke="#ffedd5" strokeWidth="1.5" strokeLinecap="round" />
      </g>
    </svg>
  );
}

// --- THE FINN CLICK TARGET: Floating Adventure Time Finn with drop-shadow and no borders ---
export function FinnTarget({ children, onClick, isBiting, biteCount }) {
  const [bounceType, setBounceType] = useState(null); // 'normal', 'super', or null

  useEffect(() => {
    if (isBiting) {
      // Every 4th bite is a massive super bounce!
      const isSuper = biteCount > 0 && biteCount % 4 === 0;
      setBounceType(isSuper ? 'super' : 'normal');

      const duration = isSuper ? 650 : 250;
      const timer = setTimeout(() => setBounceType(null), duration);
      return () => clearTimeout(timer);
    }
  }, [isBiting, biteCount]);

  return (
    <div 
      className="relative w-full h-full flex items-center justify-center cursor-crosshair overflow-hidden rounded-3xl"
      onPointerDown={onClick}
      style={{
        backgroundColor: "transparent", // Clean borderless layout
        border: "none"
      }}
    >
      {/* Floating pixel art Finn with soft drop shadow */}
      <motion.img 
        src="/finn_pixel-removebg-preview.png"
        alt="Finn from Adventure Time"
        className="w-72 h-72 md:w-80 md:h-80 object-contain select-none"
        style={{ filter: "drop-shadow(0 15px 30px rgba(24, 24, 27, 0.18))" }}
        animate={
          bounceType === 'super' ? {
            y: [0, 8, -36, 6, -20, 4, -8, 0],
            scaleY: [1, 0.7, 1.3, 0.8, 1.15, 0.9, 1.05, 1],
            scaleX: [1, 1.3, 0.7, 1.2, 0.85, 1.1, 0.95, 1],
            rotate: [0, -6, 6, -4, 4, -2, 0]
          } : bounceType === 'normal' ? {
            y: [0, 4, -10, 2, 0],
            scaleY: [1, 0.85, 1.1, 0.95, 1],
            scaleX: [1, 1.15, 0.9, 1.05, 1],
            rotate: [0, -3, 3, 0]
          } : {
            y: [0, -12, 0],
            scaleY: 1,
            scaleX: 1,
            rotate: 0
          }
        }
        transition={
          bounceType ? {
            duration: bounceType === 'super' ? 0.65 : 0.25,
            ease: "easeInOut"
          } : {
            y: {
              repeat: Infinity,
              duration: 2.2,
              ease: "easeInOut"
            }
          }
        }
      />

      {/* Bite markings and floating texts overlay */}
      {children}
    </div>
  );
}
