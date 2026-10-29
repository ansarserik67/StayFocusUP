"use client";

import { useId } from "react";

import { petMood, type PetMood } from "@/lib/types";

export function PetAvatar({
  happiness,
  size = 220,
  animate = true,
}: {
  happiness: number;
  size?: number;
  animate?: boolean;
}) {
  const mood: PetMood = petMood(happiness);
  const gradientId = useId().replace(/:/g, "");
  const body =
    mood === "happy"
      ? { from: "#6EE7B7", to: "#10B981", accent: "#34D399" }
      : mood === "ok"
        ? { from: "#A7F3D0", to: "#14B8A6", accent: "#2DD4BF" }
        : { from: "#CBD5E1", to: "#64748B", accent: "#94A3B8" };

  const eyeY = 118;
  const mouth =
    mood === "happy"
      ? "M96 142 Q120 162 144 142"
      : mood === "ok"
        ? "M102 146 Q120 154 138 146"
        : "M101 150 Q120 138 139 150";

  return (
    <div
      className={`relative inline-flex items-center justify-center ${animate ? "animate-float" : ""}`}
      style={{ width: size, height: size }}
    >
      <div
        className={`absolute inset-[12%] rounded-full blur-2xl ${animate ? "animate-glow" : ""}`}
        style={{ background: `radial-gradient(circle, ${body.accent}55, transparent 70%)` }}
      />
      <svg
        viewBox="0 0 240 240"
        width={size}
        height={size}
        role="img"
        aria-label={`Pet mood: ${mood}`}
        className="relative"
      >
        <defs>
          <linearGradient id={gradientId} x1="50" y1="40" x2="190" y2="210" gradientUnits="userSpaceOnUse">
            <stop stopColor={body.from} />
            <stop offset="1" stopColor={body.to} />
          </linearGradient>
        </defs>

        {/* glow floor */}
        <ellipse cx="120" cy="214" rx="56" ry="10" fill="#0F172A" opacity="0.16" />

        {/* antenna */}
        <g className={animate ? "animate-sway" : ""} style={{ transformOrigin: "120px 66px" }}>
          <path d="M120 72 C120 50 132 46 136 34" stroke={body.to} strokeWidth="4" fill="none" strokeLinecap="round" />
          <circle cx="137" cy="31" r="7" fill={body.accent} />
          <circle cx="137" cy="31" r="3" fill="#ECFDF5" opacity="0.9" />
        </g>

        {/* ears */}
        <path d="M62 92 C48 74 50 56 68 62 C78 66 82 78 80 88 Z" fill={body.to} opacity="0.9" />
        <path d="M178 92 C192 74 190 56 172 62 C162 66 158 78 160 88 Z" fill={body.to} opacity="0.9" />

        {/* body */}
        <path
          d="M120 52 C172 52 204 88 204 138 C204 184 168 208 120 208 C72 208 36 184 36 138 C36 88 68 52 120 52 Z"
          fill={`url(#${gradientId})`}
        />

        {/* face screen */}
        <rect x="70" y="86" width="100" height="78" rx="32" fill="#06251E" opacity="0.86" />
        <rect x="70" y="86" width="100" height="78" rx="32" stroke="#A7F3D0" strokeOpacity="0.25" />

        {/* eyes */}
        <g className={animate ? "animate-blink" : ""} style={{ transformOrigin: "120px 118px" }}>
          {mood === "happy" ? (
            <>
              <path d={`M90 ${eyeY} q8 -10 16 0`} stroke="#6EE7B7" strokeWidth="4.5" fill="none" strokeLinecap="round" />
              <path d={`M134 ${eyeY} q8 -10 16 0`} stroke="#6EE7B7" strokeWidth="4.5" fill="none" strokeLinecap="round" />
            </>
          ) : (
            <>
              <circle cx="98" cy={eyeY} r="5.5" fill="#6EE7B7" />
              <circle cx="142" cy={eyeY} r="5.5" fill="#6EE7B7" />
              <circle cx="99.5" cy={eyeY - 2} r="1.8" fill="#022C22" />
              <circle cx="143.5" cy={eyeY - 2} r="1.8" fill="#022C22" />
            </>
          )}
        </g>

        {/* mouth */}
        <path d={mouth} stroke="#6EE7B7" strokeWidth="3.5" fill="none" strokeLinecap="round" opacity="0.9" />

        {/* cheeks */}
        {mood === "happy" && (
          <>
            <ellipse cx="82" cy="140" rx="7" ry="4" fill="#FB7185" opacity="0.55" />
            <ellipse cx="158" cy="140" rx="7" ry="4" fill="#FB7185" opacity="0.55" />
          </>
        )}

        {/* belly ring / cyber detail */}
        <circle cx="120" cy="184" r="9" fill="#022C22" opacity="0.35" />
        <circle cx="120" cy="184" r="4" fill="#A7F3D0" opacity="0.9" />

        {/* sparkle for happy */}
        {mood === "happy" && (
          <g fill="#FDE68A" className={animate ? "animate-pulse" : ""}>
            <path d="M196 58 l2.5 6 6 2.5 -6 2.5 -2.5 6 -2.5 -6 -6 -2.5 6 -2.5Z" opacity="0.9" />
            <path d="M44 110 l1.7 4 4 1.7 -4 1.7 -1.7 4 -1.7 -4 -4 -1.7 4 -1.7Z" opacity="0.6" />
          </g>
        )}

        {/* sleep zzz for sad */}
        {mood === "sad" && (
          <g fill="#94A3B8" fontFamily="Manrope, sans-serif" fontWeight="800">
            <text x="178" y="58" fontSize="16" opacity="0.8">z</text>
            <text x="192" y="42" fontSize="12" opacity="0.55">z</text>
          </g>
        )}
      </svg>
    </div>
  );
}
