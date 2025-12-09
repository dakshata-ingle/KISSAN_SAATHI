// components/Mithu.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";

export type MithuMood = "sunny" | "rainy" | "windy" | "hot" | "cloudy" | "default";
export type MithuExpression = "idle" | "happy" | "thinking" | "surprised" | "alert" | "sleepy";

export default function Mithu({
  mood = "default",
  loop = true,
  onClick,
  onSpeak,
  advice,
  showAdvice = false,
  glide = false,
  size = 144,
  transcript,
  listening: listeningProp,
  imageSrc = "/images/mithu.jpg", // default path: put your image in public/mithu.jpg
}: {
  mood?: MithuMood;
  loop?: boolean;
  onClick?: () => void;
  onSpeak?: (start: boolean) => void;
  advice?: string | null;
  showAdvice?: boolean;
  glide?: boolean;
  size?: number;
  transcript?: string | null;
  listening?: boolean | undefined;
  imageSrc?: string;
}) {
  const [blink, setBlink] = useState(false);
  const [flap, setFlap] = useState(false);
  const [expr, setExpr] = useState<MithuExpression>("idle");
  const [listening, setListening] = useState<boolean>(!!listeningProp);
  const flapTimer = useRef<number | null>(null);

  useEffect(() => {
    if (typeof listeningProp === "boolean") setListening(listeningProp);
  }, [listeningProp]);

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
    // little flap + expression sequence
    setFlap(true);
    if (flapTimer.current) window.clearTimeout(flapTimer.current);
    flapTimer.current = window.setTimeout(() => setFlap(false), 480);

    setExpr("happy");
    window.setTimeout(() => setExpr("thinking"), 700);
    window.setTimeout(() => setExpr("idle"), 2200);

    if (onClick) onClick();
  }

  function toggleListening(e?: React.MouseEvent | React.KeyboardEvent) {
    if (e && "stopPropagation" in e) e.stopPropagation();
    const next = !listening;
    setListening(next);
    if (onSpeak) onSpeak(next);
    setExpr(next ? "alert" : "happy");
    if (!next) setTimeout(() => setExpr("idle"), 700);
  }

  function onMicKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleListening(e);
    }
  }

  const glideClass = glide ? "mithu-glide" : "";
  const W = size;
  const H = size;

  return (
    <div
      className={`mithu-root relative inline-block ${glideClass} group`}
      style={{ width: W, height: H, cursor: "pointer" }}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
      aria-label="Mithu AI copilot — click to interact"
    >
      {/* Image container */}
      <div
        className={`mithu-image-wrap ${flap ? "flap" : ""} ${expr === "surprised" ? "surprise" : ""}`}
        style={{
          width: W,
          height: H,
          borderRadius: Math.min(16, W * 0.12),
          overflow: "visible",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        {/* the parrot image */}
        <img
          src={imageSrc}
          alt="Mithu parrot copilot"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
            transformOrigin: "50% 40%",
            transition: "transform 220ms ease",
            boxShadow: "0 8px 22px rgba(2,6,23,0.08)",
            borderRadius: "12px",
          }}
          draggable={false}
        />

        {/* subtle crest blink / eye indicator (simple circle that fades when blink true) */}
        <div
          aria-hidden
          className="mithu-eye"
          style={{
            position: "absolute",
            left: `${W * 0.58}px`,
            top: `${H * 0.28}px`,
            width: Math.max(6, W * 0.06),
            height: Math.max(6, W * 0.06),
            borderRadius: "999px",
            background: "#0f172a",
            opacity: blink ? 0.05 : 1,
            transition: "opacity 120ms linear, transform 220ms ease",
            transform: blink ? "scaleY(0.2)" : "scaleY(1)",
            pointerEvents: "none",
          }}
        />
      </div>

      {/* microphone / copilot control */}
      <div
        className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 flex items-center gap-2"
        style={{ width: Math.max(92, W * 0.8), justifyContent: "center", pointerEvents: "auto" }}
      >
        <div
          role="button"
          tabIndex={0}
          aria-pressed={listening}
          onClick={(e) => {
            e.stopPropagation();
            toggleListening(e);
          }}
          onKeyDown={onMicKey}
          title={listening ? "Stop listening" : "Start listening"}
          className={`mithu-mic inline-flex items-center justify-center p-2 rounded-full shadow cursor-pointer select-none ${
            listening ? "listening" : "not-listening"
          }`}
          style={{
            background: listening ? "linear-gradient(180deg,#ef4444,#dc2626)" : "white",
            border: "1px solid rgba(15,23,42,0.06)",
            boxShadow: "0 6px 18px rgba(2,6,23,0.06)",
            width: 40,
            height: 40,
          }}
        >
          {/* mic icon */}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3z" stroke={listening ? "#fff" : "#0f172a"} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M19 11v1a7 7 0 0 1-14 0v-1" stroke={listening ? "#fff" : "#0f172a"} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M12 21v-3" stroke={listening ? "#fff" : "#0f172a"} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <div style={{ fontSize: 12, color: "#0f172a", opacity: 0.85 }}>{listening ? "Listening..." : "Tap to talk"}</div>
      </div>

      {/* speech / advice bubble */}
      {(showAdvice && advice) || transcript ? (
        <div
          className="absolute left-full top-1/3 ml-3 w-64"
          role="status"
          aria-live="polite"
          style={{ transform: "translateY(-8%)", pointerEvents: "auto" }}
        >
          <div className="bg-white p-3 rounded-2xl shadow border" style={{ fontSize: 14 }}>
            <div style={{ color: "#0f172a", lineHeight: 1.25, minHeight: 22 }}>{transcript ?? advice}</div>
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
        .mithu-root {
          user-select: none;
          -webkit-tap-highlight-color: transparent;
        }

        /* small transform on image when flap/expr changes to give life */
        .mithu-image-wrap.flap img {
          transform: translateY(-4px) rotate(-3deg) scale(1.02);
        }
        .mithu-image-wrap.surprise img {
          transform: translateY(-2px) scale(1.03);
        }

        .mithu-glide {
          animation: glideX 0.9s cubic-bezier(.2, .9, .2, 1) forwards;
        }
        @keyframes glideX {
          0% {
            transform: translateX(0) scale(1);
          }
          60% {
            transform: translateX(120px) scale(1.02);
          }
          100% {
            transform: translateX(180px) scale(0.96);
          }
        }

        /* mic listening pulse */
        .mithu-mic.listening {
          animation: micPulse 1s infinite;
        }
        @keyframes micPulse {
          0% {
            transform: scale(1);
            box-shadow: 0 6px 18px rgba(220, 38, 38, 0.15);
          }
          50% {
            transform: scale(1.06);
            box-shadow: 0 10px 28px rgba(220, 38, 38, 0.22);
          }
          100% {
            transform: scale(1);
            box-shadow: 0 6px 18px rgba(220, 38, 38, 0.15);
          }
        }

        .group:focus,
        .group:focus-within {
          outline: 2px solid rgba(59, 130, 246, 0.12);
          border-radius: 8px;
        }
      `}</style>
    </div>
  );
}
