// components/Mithu.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";

export type MithuMood = "sunny" | "rainy" | "windy" | "hot" | "cloudy" | "default";
export type MithuExpression = "idle" | "happy" | "thinking" | "surprised" | "alert" | "sleepy";

export default function Mithu({
  mood = "default",
  loop = true,
  onClick,
  advice,
  showAdvice = false,
  glide = false,
  size = 144,
}: {
  mood?: MithuMood;
  loop?: boolean;
  onClick?: () => void;
  advice?: string | null;
  showAdvice?: boolean;
  glide?: boolean;
  size?: number;
}) {
  const [blink, setBlink] = useState(false);
  const [flap, setFlap] = useState(false);
  const [expr, setExpr] = useState<MithuExpression>("idle");
  const flapTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!loop) return;
    const id = window.setInterval(() => {
      setBlink(true);
      window.setTimeout(() => setBlink(false), 140);
    }, 3800 + Math.random() * 2600);
    return () => clearInterval(id);
  }, [loop]);

  useEffect(() => {
    return () => {
      if (flapTimer.current) window.clearTimeout(flapTimer.current);
    };
  }, []);

  function handleClick() {
    setFlap(true);
    if (flapTimer.current) window.clearTimeout(flapTimer.current);
    flapTimer.current = window.setTimeout(() => setFlap(false), 480);

    setExpr("happy");
    window.setTimeout(() => setExpr("thinking"), 700);
    window.setTimeout(() => setExpr("idle"), 2200);

    if (onClick) onClick();
  }

  const glideClass = glide ? "mithu-glide" : "";

  const moodOverlay: Record<MithuMood, React.ReactNode> = {
    sunny: (
      <g transform={`translate(${size * 0.65}, ${size * 0.14})`} className="overlay-sunglasses">
        <rect x="-18" y="-4" width="36" height="12" rx="3" fill="#0f172a" />
        <rect x="0" y="-4" width="10" height="4" rx="1.5" fill="#0f172a" />
      </g>
    ),
    rainy: (
      <g transform={`translate(${size * 0.52}, ${size * 0.05})`} className="overlay-umbrella">
        <path d="M0 8 C8 -6 56 -6 64 8 Z" fill="#2563eb" stroke="#1e40af" strokeWidth="1" />
        <rect x={size * 0.33} y={size * 0.18} width="2" height="16" rx="1" fill="#6b7280" />
      </g>
    ),
    windy: (
      <g transform={`translate(${size * 0.06}, ${size * 0.12})`} className="overlay-wind" opacity="0.95">
        <path d="M4 22 C20 18 36 22 52 18" stroke="#7dd3fc" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M2 30 C16 26 32 30 44 26" stroke="#67e8f9" strokeWidth="2" fill="none" strokeLinecap="round" />
      </g>
    ),
    hot: (
      <g transform={`translate(${size * 0.7}, ${size * 0.05})`} className="overlay-heat">
        <circle cx="0" cy="0" r="8" fill="#fecaca" opacity="0.9" />
        <path d="M-2 -6 C2 -2 6 -2 8 2" stroke="#fb923c" strokeWidth="2" fill="none" strokeLinecap="round" />
      </g>
    ),
    cloudy: (
      <g transform={`translate(${size * 0.6}, ${size * 0.08})`} className="overlay-cloud">
        <ellipse cx="0" cy="8" rx="12" ry="8" fill="#cbd5e1" />
        <ellipse cx="16" cy="2" rx="8" ry="6" fill="#cbd5e1" />
      </g>
    ),
    default: null,
  };

  const W = size;
  const H = size;

  return (
    <div className={`mithu-root relative inline-block ${glideClass}`} style={{ width: W, height: H }} onClick={handleClick}>
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="block" role="img" aria-label="Mithu animated bird">
        <defs>
          <linearGradient id="mithu-body" x1="0" x2="1">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#fff7ed" />
          </linearGradient>
          <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#000" floodOpacity="0.08" />
          </filter>
        </defs>

        <ellipse cx={W / 2} cy={H * 0.84} rx={W * 0.22} ry={H * 0.06} fill="#000" opacity={0.06} />

        <g transform={`translate(${W * 0.18}, ${H * 0.12})`}>
          <g filter="url(#shadow)">
            <ellipse cx={W * 0.32} cy={H * 0.36} rx={W * 0.25} ry={H * 0.33} fill="url(#mithu-body)" stroke="#f3e6d8" strokeWidth="1.2" />
          </g>

          <g transform={`translate(${W * 0.24}, ${H * 0.44})`} className={`beak-group ${expr === "surprised" ? "beak-surprise" : ""}`}>
            <path d={`M${W * 0.12} ${H * 0.02} C ${W * 0.18} ${H * 0.05} ${W * 0.22} ${H * 0.10} ${W * 0.18} ${H * 0.12} C ${W * 0.12} ${H * 0.14} ${W * 0.06} ${H * 0.12} ${W * 0.04} ${H * 0.10} C ${W * 0.06} ${H * 0.08} ${W * 0.10} ${H * 0.04} ${W * 0.12} ${H * 0.02} Z`} fill="#f59e0b" />
          </g>

          <g transform={`translate(${W * 0.16}, ${H * 0.26})`}>
            <g transform={`translate(0, 0)`}>
              {blink ? (
                <rect x={W * 0.01} y={H * 0.04} width={W * 0.06} height={H * 0.015} rx={W * 0.004} fill="#0f172a" />
              ) : expr === "happy" ? (
                <path d={`M0 ${H * 0.04} q ${W * 0.03} ${H * 0.03} ${W * 0.06} 0`} stroke="#0f172a" strokeWidth={1.6} strokeLinecap="round" fill="none" />
              ) : expr === "thinking" ? (
                <circle cx={W * 0.03} cy={H * 0.03} r={W * 0.015} fill="#0f172a" />
              ) : expr === "alert" ? (
                <circle cx={W * 0.03} cy={H * 0.03} r={W * 0.02} fill="#0f172a" />
              ) : (
                <circle cx={W * 0.03} cy={H * 0.03} r={W * 0.017} fill="#0f172a" />
              )}
            </g>

            <g transform={`translate(${W * 0.09}, 0)`}>
              {blink ? (
                <rect x={W * 0.01} y={H * 0.04} width={W * 0.06} height={H * 0.015} rx={W * 0.004} fill="#0f172a" />
              ) : expr === "happy" ? (
                <path d={`M0 ${H * 0.04} q ${W * 0.03} ${H * 0.03} ${W * 0.06} 0`} stroke="#0f172a" strokeWidth={1.6} strokeLinecap="round" fill="none" />
              ) : expr === "thinking" ? (
                <circle cx={W * 0.03} cy={H * 0.03} r={W * 0.015} fill="#0f172a" />
              ) : expr === "alert" ? (
                <circle cx={W * 0.03} cy={H * 0.03} r={W * 0.02} fill="#0f172a" />
              ) : (
                <circle cx={W * 0.03} cy={H * 0.03} r={W * 0.017} fill="#0f172a" />
              )}
            </g>
          </g>

          <g transform={`translate(${W * 0.02}, ${H * -0.02})`} className={`feathers ${flap ? "fe-flap" : ""}`}>
            <path className="f1" d={`M${W * 0.12} ${H * 0.42} C ${W * 0.08} ${H * 0.22} ${W * 0.20} ${H * 0.16} ${W * 0.28} ${H * 0.22}`} stroke="#f97316" strokeWidth={2} strokeLinecap="round" fill="none" />
            <path className="f2" d={`M${W * 0.06} ${H * 0.48} C ${W * 0.10} ${H * 0.30} ${W * 0.22} ${H * 0.20} ${W * 0.30} ${H * 0.26}`} stroke="#fb923c" strokeWidth={1.6} strokeLinecap="round" fill="none" />
            <path className="f3" d={`M${W * 0.02} ${H * 0.54} C ${W * 0.10} ${H * 0.36} ${W * 0.20} ${H * 0.28} ${W * 0.26} ${H * 0.32}`} stroke="#f59e0b" strokeWidth={1.4} strokeLinecap="round" fill="none" />
          </g>

          <g transform={`translate(${W * 0.26}, ${H * 0.32})`} className={`wing ${flap ? "wing-flap" : ""}`}>
            <path d={`M${W * 0.06} ${H * 0.36} C ${W * 0.28} ${H * 0.30} ${W * 0.34} ${H * 0.42} ${W * 0.24} ${H * 0.46}`} fill="#fff7f0" stroke="#f3d7b4" strokeWidth={0.8} />
          </g>

          <g transform={`translate(${W * 0.06}, ${H * 0.02})`} className="hat">
            <ellipse cx={W * 0.36} cy={H * -0.02} rx={W * 0.12} ry={H * 0.06} fill="#b9844a" />
            <rect x={W * 0.22} y={H * -0.02} width={W * 0.28} height={H * 0.06} rx={W * 0.02} fill="#8b5a2b" />
          </g>

          {moodOverlay[mood]}
        </g>
      </svg>

      {showAdvice && advice ? (
        <div
          className="absolute left-full top-1/4 ml-3 w-64"
          role="status"
          aria-live="polite"
          style={{ transform: "translateY(-8%)" }}
        >
          <div className="bg-white p-3 rounded-2xl shadow border" style={{ fontSize: 14 }}>
            <div style={{ color: "#0f172a", lineHeight: 1.25 }}>{advice}</div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
              <button
                className="px-2 py-1 rounded bg-emerald-600 text-white text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  setExpr("happy");
                  setTimeout(() => setExpr("idle"), 1500);
                }}
              >
                Thanks
              </button>
              <button
                className="px-2 py-1 rounded bg-gray-100 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <style jsx>{`
        .mithu-root { user-select: none; }
        .feathers .f1 { transform-origin: 8px 8px; animation: sway 2.8s ease-in-out infinite; }
        .feathers .f2 { transform-origin: 8px 8px; animation: sway2 2.4s ease-in-out infinite; }
        .feathers .f3 { transform-origin: 8px 8px; animation: sway3 2s ease-in-out infinite; }

        .fe-flap .f1 { animation: flap1 0.42s ease-in-out 1; }
        .fe-flap .f2 { animation: flap2 0.42s ease-in-out 1; }
        .fe-flap .f3 { animation: flap3 0.42s ease-in-out 1; }

        .wing { transform-origin: 20% 50%; transition: transform 220ms ease; }
        .wing-flap { transform: rotate(-12deg) translateY(-2px) scale(1.02); }

        .beak-group { transform-origin: center; transition: transform 220ms ease; }
        .beak-surprise { transform: rotate(6deg) translateY(-1px) scale(1.02); }

        @keyframes sway { 0% { transform: rotate(0deg) } 50% { transform: rotate(-6deg) } 100% { transform: rotate(0deg) } }
        @keyframes sway2 { 0% { transform: rotate(0deg) } 50% { transform: rotate(-4deg) } 100% { transform: rotate(0deg) } }
        @keyframes sway3 { 0% { transform: rotate(0deg) } 50% { transform: rotate(-3deg) } 100% { transform: rotate(0deg) } }

        @keyframes flap1 { 0% { transform: rotate(0) } 50% { transform: rotate(-18deg) scale(1.05) } 100% { transform: rotate(0) } }
        @keyframes flap2 { 0% { transform: rotate(0) } 50% { transform: rotate(-14deg) scale(1.03) } 100% { transform: rotate(0) } }
        @keyframes flap3 { 0% { transform: rotate(0) } 50% { transform: rotate(-10deg) scale(1.02) } 100% { transform: rotate(0) } }

        .mithu-glide { animation: glideX 0.9s cubic-bezier(.2,.9,.2,1) forwards; }
        @keyframes glideX { 0% { transform: translateX(0) scale(1) } 60% { transform: translateX(120px) scale(1.02) } 100% { transform: translateX(180px) scale(0.96) } }

        .overlay-umbrella { animation: umbrella 2.2s ease-in-out infinite; transform-origin: center; }
        @keyframes umbrella { 0% { transform: translateY(0) rotate(-3deg)} 50% { transform: translateY(0) rotate(3deg)} 100% { transform: translateY(0) rotate(-3deg)} }

        .overlay-wind { animation: windShift 1.6s linear infinite; }
        @keyframes windShift { 0% { transform: translateX(0) } 50% { transform: translateX(6px) } 100% { transform: translateX(0) } }

        .overlay-heat { animation: heatPulse 3.6s ease-in-out infinite; }
        @keyframes heatPulse { 0% { transform: scale(1) } 50% { transform: scale(1.02) } 100% { transform: scale(1) } }
      `}</style>
    </div>
  );
}
