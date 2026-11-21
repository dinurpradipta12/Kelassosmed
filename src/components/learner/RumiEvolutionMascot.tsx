"use client";

import React, { useEffect, useId, useState } from "react";
import {
  CheckCircle2,
  Flame,
  History,
  Lock,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";
import type { PackageTierKind } from "@/lib/entitlements";
import {
  RUMI_LEVEL_TIERS,
  XP_ACTIVITY_CONFIG,
  computeAwardedXp,
  getTierXpMultiplier,
  resolveRumiLevelInfo,
  type RumiEvolutionStage,
  type RumiXpProfileState,
  type XpActivityType,
} from "@/lib/rumi-xp";
import { ModalDialog } from "@/components/ui/ModalDialog";

export type RumiMascotMood =
  | "happy"
  | "sleepy"
  | "excited"
  | "focused"
  | "reminder"
  | "peeking";

export interface RumiMascotIllustrationProps {
  stage?: RumiEvolutionStage;
  variant?: "learner" | "admin-superior";
  mood?: RumiMascotMood;
  paused?: boolean;
  sizeClass?: string;
}

interface RumiVisorFaceProps {
  mood: RumiMascotMood;
  leftEyeX: number;
  rightEyeX: number;
  eyeY: number;
  mouthY: number;
  eyeGlow: string;
  eyeFill: string;
  mouthStroke: string;
  eyeRx?: number;
  eyeRy?: number;
  glowR?: number;
  catchColor?: string;
  sparkColor?: string;
}

function RumiVisorFace({
  mood,
  leftEyeX,
  rightEyeX,
  eyeY,
  mouthY,
  eyeGlow,
  eyeFill,
  mouthStroke,
  eyeRx = 4.3,
  eyeRy = 5,
  glowR = 6,
  catchColor = "#FFFFFF",
  sparkColor = "#FDE047",
}: RumiVisorFaceProps) {
  const midX = (leftEyeX + rightEyeX) / 2;

  if (mood === "sleepy") {
    return (
      <>
        {/* Soft Half-Closed Cozy Eyelids */}
        <path
          d={`M${leftEyeX - 4.5} ${eyeY + 0.4} Q${leftEyeX} ${eyeY + 4.4} ${leftEyeX + 4.5} ${eyeY + 0.4}`}
          fill="none"
          stroke={eyeFill}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d={`M${rightEyeX - 4.5} ${eyeY + 0.4} Q${rightEyeX} ${eyeY + 4.4} ${rightEyeX + 4.5} ${eyeY + 0.4}`}
          fill="none"
          stroke={eyeFill}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        {/* Tiny Calm Smile */}
        <path
          d={`M${midX - 3.6} ${mouthY + 1} Q${midX} ${mouthY + 3.4} ${midX + 3.6} ${mouthY + 1}`}
          fill="none"
          stroke={mouthStroke}
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        {/* Drifting Sleep Zzz */}
        <g className="rs-rumi-zzz">
          <path
            d={`M${rightEyeX + 7} ${eyeY - 12} H${rightEyeX + 12} L${rightEyeX + 7} ${eyeY - 7} H${rightEyeX + 12}`}
            fill="none"
            stroke={sparkColor}
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d={`M${rightEyeX + 14} ${eyeY - 18} H${rightEyeX + 17.5} L${rightEyeX + 14} ${eyeY - 14.5} H${rightEyeX + 17.5}`}
            fill="none"
            stroke={sparkColor}
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      </>
    );
  }

  if (mood === "excited") {
    return (
      <>
        {/* Joyful Smiling Crescent Eyes (^ ^) */}
        <path
          d={`M${leftEyeX - 4.6} ${eyeY + 1.6} Q${leftEyeX} ${eyeY - 5.2} ${leftEyeX + 4.6} ${eyeY + 1.6}`}
          fill="none"
          stroke={eyeFill}
          strokeWidth="2.8"
          strokeLinecap="round"
        />
        <path
          d={`M${rightEyeX - 4.6} ${eyeY + 1.6} Q${rightEyeX} ${eyeY - 5.2} ${rightEyeX + 4.6} ${eyeY + 1.6}`}
          fill="none"
          stroke={eyeFill}
          strokeWidth="2.8"
          strokeLinecap="round"
        />
        {/* Big Cheerful Beam Smile */}
        <path
          d={`M${midX - 6.4} ${mouthY - 0.4} Q${midX} ${mouthY + 6.8} ${midX + 6.4} ${mouthY - 0.4} Z`}
          fill={eyeFill}
          fillOpacity="0.28"
          stroke={mouthStroke}
          strokeWidth="2.6"
          strokeLinejoin="round"
        />
        <path
          d={`M${rightEyeX + 8} ${eyeY - 11} L${rightEyeX + 9.2} ${eyeY - 8.2} L${rightEyeX + 12} ${eyeY - 7} L${rightEyeX + 9.2} ${eyeY - 5.8} L${rightEyeX + 8} ${eyeY - 3} L${rightEyeX + 6.8} ${eyeY - 5.8} L${rightEyeX + 4} ${eyeY - 7} L${rightEyeX + 6.8} ${eyeY - 8.2} Z`}
          fill={sparkColor}
        />
      </>
    );
  }

  const eyeShiftX = mood === "peeking" ? -2.2 : mood === "focused" ? -1.2 : 0;
  const peekLeftOffset = mood === "peeking" ? -2.0 : 0;
  const peekRightOffset = mood === "peeking" ? -1.4 : 0;
  const peekMouthShift = mood === "peeking" ? -3.0 : 0;

  return (
    <>
      <g className="rs-rumi-eyes">
        <circle
          cx={leftEyeX + peekLeftOffset}
          cy={eyeY}
          r={glowR}
          fill={eyeGlow}
          fillOpacity="0.25"
        />
        <circle
          cx={rightEyeX + peekRightOffset}
          cy={eyeY}
          r={glowR}
          fill={eyeGlow}
          fillOpacity="0.25"
        />
        <ellipse
          cx={leftEyeX + peekLeftOffset}
          cy={eyeY}
          rx={mood === "peeking" ? eyeRx * 1.05 : eyeRx}
          ry={mood === "peeking" ? eyeRy * 1.04 : eyeRy}
          fill={eyeFill}
        />
        <ellipse
          cx={rightEyeX + peekRightOffset}
          cy={eyeY}
          rx={mood === "peeking" ? eyeRx * 1.05 : eyeRx}
          ry={mood === "peeking" ? eyeRy * 1.04 : eyeRy}
          fill={eyeFill}
        />
        <circle
          cx={leftEyeX + peekLeftOffset + 1.5 + eyeShiftX}
          cy={eyeY - 1.9}
          r="1.75"
          fill={catchColor}
        />
        <circle
          cx={rightEyeX + peekRightOffset + 1.5 + eyeShiftX}
          cy={eyeY - 1.9}
          r="1.75"
          fill={catchColor}
        />
        <circle
          cx={leftEyeX + peekLeftOffset - 1.5 + eyeShiftX}
          cy={eyeY + 2}
          r="0.88"
          fill="#FFFFFF"
          fillOpacity="0.9"
        />
        <circle
          cx={rightEyeX + peekRightOffset - 1.5 + eyeShiftX}
          cy={eyeY + 2}
          r="0.88"
          fill="#FFFFFF"
          fillOpacity="0.9"
        />
      </g>

      {mood === "peeking" ? (
        <path
          d={`M${midX + peekMouthShift - 5.2} ${mouthY + 0.4} Q${midX + peekMouthShift - 2.4} ${mouthY + 3.8} ${midX + peekMouthShift} ${mouthY + 1} Q${midX + peekMouthShift + 2.4} ${mouthY + 3.8} ${midX + peekMouthShift + 5.2} ${mouthY + 0.4}`}
          fill="none"
          stroke={mouthStroke}
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : mood === "focused" ? (
        <path
          d={`M${midX - 4.8} ${mouthY + 0.2} Q${midX} ${mouthY + 3.8} ${midX + 4.8} ${mouthY + 0.2}`}
          fill="none"
          stroke={mouthStroke}
          strokeWidth="2.6"
          strokeLinecap="round"
        />
      ) : (
        <path
          d={`M${midX - 6} ${mouthY} Q${midX} ${mouthY + 5.3} ${midX + 6} ${mouthY}`}
          fill="none"
          stroke={mouthStroke}
          strokeWidth="2.7"
          strokeLinecap="round"
        />
      )}

      {mood === "reminder" && (
        <g className="rs-rumi-reminder-dot">
          <circle
            cx={rightEyeX + 8.5}
            cy={eyeY - 10}
            r="4.2"
            fill="#F59E0B"
            stroke="#FFFFFF"
            strokeWidth="1.4"
          />
          <circle cx={rightEyeX + 8.5} cy={eyeY - 10} r="1.4" fill="#FFFFFF" />
        </g>
      )}
    </>
  );
}

/**
 * 5-Stage Animated Frameless Mascot ("Rumi") growing from Baby Rumi to Superior Rumi,
 * plus the exclusive Ceramic Pearl & Glacial Sapphire "Superior Admin Rumi" Studio Sovereign form.
 */
export function RumiMascotIllustration({
  stage = 1,
  variant = "learner",
  mood = "happy",
  paused = false,
  sizeClass = "w-28 h-28 sm:w-32 sm:h-32",
}: RumiMascotIllustrationProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const isAdminSuperior = variant === "admin-superior";
  const bodyGradId = `rumiBody-${variant}-${stage}-${uid}`;
  const goldGradId = `rumiGold-${variant}-${stage}-${uid}`;
  const cyanGradId = `rumiCyan-${variant}-${stage}-${uid}`;
  const capeGradId = `rumiCape-${variant}-${stage}-${uid}`;
  const wingGradId = `rumiWing-${variant}-${stage}-${uid}`;
  const learnerVisorGradId = `rumiLearnerVisor-${stage}-${uid}`;
  const learnerDarkTrimGradId = `rumiLearnerTrim-${stage}-${uid}`;
  const adminCeramicGradId = `rumiAdminCeramic-${uid}`;
  const adminFaceScreenGradId = `rumiAdminFaceScreen-${uid}`;
  const adminIceGlowGradId = `rumiAdminIceGlow-${uid}`;
  const adminGoldGradId = `rumiAdminGold-${uid}`;
  const adminHeadbandGradId = `rumiAdminHeadband-${uid}`;
  const adminBodyTrimGradId = `rumiAdminBodyTrim-${uid}`;

  return (
    <svg
      viewBox="0 0 148 148"
      className={`${sizeClass} shrink-0 select-none overflow-visible ${
        isAdminSuperior
          ? "drop-shadow-[0_8px_16px_rgba(30,58,138,0.14)]"
          : "drop-shadow-[0_8px_16px_rgba(79,57,246,0.18)]"
      } ${paused ? "rs-rumi-paused" : ""}`}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id={bodyGradId} cx="34%" cy="26%" r="74%">
          {stage === 5 ? (
            <>
              <stop offset="0%" stopColor="#A5B4FC" />
              <stop offset="44%" stopColor="#4F39F6" />
              <stop offset="82%" stopColor="#312E81" />
              <stop offset="100%" stopColor="#1E1B4B" />
            </>
          ) : stage === 4 ? (
            <>
              <stop offset="0%" stopColor="#DDD6FE" />
              <stop offset="46%" stopColor="#7C3AED" />
              <stop offset="84%" stopColor="#4F39F6" />
              <stop offset="100%" stopColor="#2E1065" />
            </>
          ) : stage === 3 ? (
            <>
              <stop offset="0%" stopColor="#C4B5FD" />
              <stop offset="46%" stopColor="#6366F1" />
              <stop offset="84%" stopColor="#4F39F6" />
              <stop offset="100%" stopColor="#312E81" />
            </>
          ) : stage === 2 ? (
            <>
              <stop offset="0%" stopColor="#C7D2FE" />
              <stop offset="44%" stopColor="#818CF8" />
              <stop offset="84%" stopColor="#4F39F6" />
              <stop offset="100%" stopColor="#3730A3" />
            </>
          ) : (
            <>
              <stop offset="0%" stopColor="#E0E7FF" />
              <stop offset="42%" stopColor="#A5B4FC" />
              <stop offset="82%" stopColor="#6366F1" />
              <stop offset="100%" stopColor="#4338CA" />
            </>
          )}
        </radialGradient>
        <linearGradient id={learnerVisorGradId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#2E1065" />
          <stop offset="56%" stopColor="#1E1B4B" />
          <stop offset="100%" stopColor="#0F172A" />
        </linearGradient>
        <linearGradient id={learnerDarkTrimGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4338CA" />
          <stop offset="100%" stopColor="#1E1B4B" />
        </linearGradient>
        <linearGradient id={goldGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="48%" stopColor="#FBBF24" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
        <linearGradient id={cyanGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#A5F3FC" />
          <stop offset="55%" stopColor="#22D3EE" />
          <stop offset="100%" stopColor="#0284C7" />
        </linearGradient>
        <linearGradient id={capeGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4338CA" />
          <stop offset="60%" stopColor="#312E81" />
          <stop offset="100%" stopColor="#EC4899" />
        </linearGradient>
        <linearGradient id={wingGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FEF9C3" />
          <stop offset="55%" stopColor="#FDE047" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
        <radialGradient id={adminCeramicGradId} cx="35%" cy="28%" r="72%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="52%" stopColor="#F1F5F9" />
          <stop offset="88%" stopColor="#CBD5E1" />
          <stop offset="100%" stopColor="#94A3B8" />
        </radialGradient>
        <linearGradient id={adminFaceScreenGradId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#312E81" />
          <stop offset="55%" stopColor="#1E3A8A" />
          <stop offset="100%" stopColor="#172554" />
        </linearGradient>
        <linearGradient id={adminIceGlowGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#E0F2FE" />
          <stop offset="55%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#6366F1" />
        </linearGradient>
        <linearGradient id={adminGoldGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FEF9C3" />
          <stop offset="52%" stopColor="#FBBF24" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
        <linearGradient id={adminHeadbandGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#64748B" />
          <stop offset="100%" stopColor="#334155" />
        </linearGradient>
        <linearGradient id={adminBodyTrimGradId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#0EA5E9" />
        </linearGradient>
      </defs>

      {/* Synced Soft Ground Shadow */}
      <ellipse
        className="rs-rumi-shadow"
        cx="74"
        cy="134"
        rx={isAdminSuperior ? 24 : stage >= 4 ? 26 : 22}
        ry="4.8"
        fill={isAdminSuperior ? "#64748B" : stage === 5 ? "#D97706" : "#4F39F6"}
        fillOpacity={isAdminSuperior ? "0.18" : "0.2"}
      />

      {/* Ambient Sparkles */}
      <g className="rs-sparkle-bob" style={{ transformOrigin: "24px 31.5px" }}>
        <path
          d="M24 25 L25.6 29.8 L30.5 31.5 L25.6 33.2 L24 38 L22.4 33.2 L17.5 31.5 L22.4 29.8 Z"
          fill={isAdminSuperior || stage === 5 ? "#FBBF24" : "#F59E0B"}
          fillOpacity="0.85"
        />
      </g>
      <g
        className="rs-sparkle-bob-delayed"
        style={{ transformOrigin: "123px 30px" }}
      >
        <path
          d="M123 25 L124.3 28.7 L128 30 L124.3 31.3 L123 35 L121.7 31.3 L118 30 L121.7 28.7 Z"
          fill={
            isAdminSuperior
              ? "#38BDF8"
              : stage === 5
              ? "#FDE047"
              : stage === 4
              ? "#C084FC"
              : stage >= 2
              ? "#38BDF8"
              : "#EC4899"
          }
          fillOpacity="0.85"
        />
      </g>

      {/* STAGE 1: BABY RUMI (Glossy Periwinkle Ceramic Pod + Sprout + Glass Visor) */}
      {!isAdminSuperior && stage === 1 && (
        <g className="rs-rumi-character">
          {/* Cute Mint Leaf & Glowing Gold Seed Sprout */}
          <g className="rs-rumi-antenna">
            <path
              d="M74 58 L74 44"
              stroke="#4F39F6"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            <path d="M74 51 Q65 45 63 51 Q68 54 74 51 Z" fill="#34D399" />
            <circle
              className="rs-rumi-orb-glow"
              cx="74"
              cy="40"
              r="8.2"
              fill="#FBBF24"
              fillOpacity="0.35"
            />
            <circle cx="74" cy="40" r="5.2" fill={`url(#${goldGradId})`} stroke="#FFFFFF" strokeWidth="1.2" />
            <circle cx="72.5" cy="38.5" r="1.6" fill="#FFFFFF" />
          </g>

          {/* Soft Dark-Indigo Baby Headband */}
          <path
            d="M43 79 C43 44, 105 44, 105 79"
            fill="none"
            stroke={`url(#${learnerDarkTrimGradId})`}
            strokeWidth="5"
            strokeLinecap="round"
          />

          {/* Plump 3D Ceramic Baby Pod Body */}
          <rect
            x="44"
            y="57"
            width="60"
            height="58"
            rx="29"
            fill={`url(#${bodyGradId})`}
            stroke="#C7D2FE"
            strokeWidth="1.1"
          />
          <ellipse
            cx="62"
            cy="67"
            rx="12"
            ry="4.5"
            fill="#FFFFFF"
            fillOpacity="0.58"
            transform="rotate(-14 62 67)"
          />

          {/* Compact Glossy Violet-Indigo Glass Visor */}
          <rect
            x="52"
            y="70"
            width="44"
            height="31"
            rx="15.5"
            fill={`url(#${learnerVisorGradId})`}
            stroke="#A5B4FC"
            strokeOpacity="0.6"
            strokeWidth="1.2"
          />
          <path
            d="M59 74 Q74 70.5 89 74"
            fill="none"
            stroke="#FFFFFF"
            strokeOpacity="0.2"
            strokeWidth="1.8"
            strokeLinecap="round"
          />

          {/* Rosy Blush Cheeks */}
          <ellipse cx="59.5" cy="91.5" rx="4" ry="2.1" fill="#FB7185" fillOpacity="0.72" />
          <ellipse cx="88.5" cy="91.5" rx="4" ry="2.1" fill="#FB7185" fillOpacity="0.72" />

          {/* Oversized Cute Luminous Kawaii Eyes + Dynamic Expression */}
          <RumiVisorFace
            mood={mood}
            leftEyeX={63.5}
            rightEyeX={84.5}
            eyeY={83.5}
            mouthY={92.5}
            eyeGlow="#A5B4FC"
            eyeFill="#EEF2FF"
            mouthStroke="#E0E7FF"
            eyeRx={4.2}
            eyeRy={4.9}
            glowR={5.8}
            sparkColor="#FDE047"
          />

          {/* Cozy Champagne-Gold Earmuffs */}
          <rect
            x="36"
            y="73"
            width="11"
            height="20"
            rx="5.5"
            fill={`url(#${goldGradId})`}
            stroke="#FFFFFF"
            strokeWidth="1.6"
          />
          <rect
            x="101"
            y="73"
            width="11"
            height="20"
            rx="5.5"
            fill={`url(#${goldGradId})`}
            stroke="#FFFFFF"
            strokeWidth="1.6"
          />

          {/* Tiny Glossy Waving Hand */}
          <g className="rs-rumi-arm">
            <path
              d="M101 94 Q114 88 113 76"
              fill="none"
              stroke="#6366F1"
              strokeWidth="6.5"
              strokeLinecap="round"
            />
            <circle
              cx="113"
              cy="75"
              r="4.4"
              fill="#E0E7FF"
              stroke="#A5B4FC"
              strokeWidth="1.1"
            />
          </g>
        </g>
      )}

      {/* STAGE 2: JUNIOR RUMI (Sky-Indigo Glossy Pod + Translucent Forehead Goggles + Cyan Visor) */}
      {!isAdminSuperior && stage === 2 && (
        <g className="rs-rumi-character">
          {/* Dual Leaf + Glowing Star Sprout */}
          <g className="rs-rumi-antenna">
            <path
              d="M74 50 L74 35"
              stroke="#4F39F6"
              strokeWidth="3.2"
              strokeLinecap="round"
            />
            <path d="M74 43 Q64 37 62 43.5 Q68 46.5 74 43 Z" fill="#34D399" />
            <path d="M74 41 Q84 35 86 41.5 Q80 44.5 74 41 Z" fill="#10B981" />
            <circle
              className="rs-rumi-orb-glow"
              cx="74"
              cy="31"
              r="8.8"
              fill="#38BDF8"
              fillOpacity="0.3"
            />
            <circle cx="74" cy="31" r="5.3" fill={`url(#${goldGradId})`} stroke="#FFFFFF" strokeWidth="1.2" />
          </g>

          {/* Little Floating Ceramic Feet */}
          <ellipse cx="61" cy="121" rx="7.5" ry="4.5" fill="#3730A3" />
          <ellipse cx="61" cy="120" rx="5" ry="2" fill="#A5B4FC" fillOpacity="0.55" />
          <ellipse cx="87" cy="121" rx="7.5" ry="4.5" fill="#3730A3" />
          <ellipse cx="87" cy="120" rx="5" ry="2" fill="#A5B4FC" fillOpacity="0.55" />

          {/* Sleek Dark Headband */}
          <path
            d="M39 74 C39 36, 109 36, 109 74"
            fill="none"
            stroke={`url(#${learnerDarkTrimGradId})`}
            strokeWidth="5.5"
            strokeLinecap="round"
          />

          {/* Energetic Glossy 3D Ceramic Body */}
          <rect
            x="42"
            y="49"
            width="64"
            height="68"
            rx="31"
            fill={`url(#${bodyGradId})`}
            stroke="#A5B4FC"
            strokeWidth="1.2"
          />
          <ellipse
            cx="60"
            cy="55.5"
            rx="11"
            ry="3.6"
            fill="#FFFFFF"
            fillOpacity="0.52"
            transform="rotate(-12 60 55.5)"
          />

          {/* Sculpted Aqua Star-Lens Goggles on Forehead */}
          <rect
            x="49"
            y="55"
            width="22"
            height="11.5"
            rx="5.75"
            fill={`url(#${cyanGradId})`}
            stroke="#FFFFFF"
            strokeWidth="1.6"
          />
          <rect
            x="77"
            y="55"
            width="22"
            height="11.5"
            rx="5.75"
            fill={`url(#${cyanGradId})`}
            stroke="#FFFFFF"
            strokeWidth="1.6"
          />
          <line x1="71" y1="60.5" x2="77" y2="60.5" stroke="#FFFFFF" strokeWidth="2.2" />
          <path d="M53 58.5 Q60 56.5 66 58.5" fill="none" stroke="#FFFFFF" strokeOpacity="0.55" strokeWidth="1.4" strokeLinecap="round" />
          <path d="M81 58.5 Q87 56.5 94 58.5" fill="none" stroke="#FFFFFF" strokeOpacity="0.55" strokeWidth="1.4" strokeLinecap="round" />

          {/* Glossy Sapphire-Indigo Face Screen */}
          <rect
            x="50"
            y="71"
            width="48"
            height="31"
            rx="15.5"
            fill={`url(#${learnerVisorGradId})`}
            stroke="#7DD3FC"
            strokeOpacity="0.6"
            strokeWidth="1.2"
          />

          {/* Rosy Blush + Luminous Sky-Cyan Kawaii Eyes */}
          <ellipse cx="59" cy="92.5" rx="4" ry="2.1" fill="#FB7185" fillOpacity="0.72" />
          <ellipse cx="89" cy="92.5" rx="4" ry="2.1" fill="#FB7185" fillOpacity="0.72" />
          {/* Luminous Sky-Cyan Kawaii Eyes + Dynamic Expression */}
          <RumiVisorFace
            mood={mood}
            leftEyeX={63}
            rightEyeX={85}
            eyeY={84.5}
            mouthY={93.5}
            eyeGlow="#38BDF8"
            eyeFill="#E0F2FE"
            mouthStroke="#7DD3FC"
            eyeRx={4.2}
            eyeRy={4.9}
            glowR={5.8}
            sparkColor="#FEF08A"
          />

          {/* Glowing Aqua Studio Headphones */}
          <rect
            x="32"
            y="67"
            width="11"
            height="23"
            rx="5.5"
            fill={`url(#${cyanGradId})`}
            stroke="#FFFFFF"
            strokeWidth="1.6"
          />
          <rect x="36.2" y="74.5" width="2.5" height="8" rx="1.25" fill="#FEF08A" />
          <rect
            x="105"
            y="67"
            width="11"
            height="23"
            rx="5.5"
            fill={`url(#${cyanGradId})`}
            stroke="#FFFFFF"
            strokeWidth="1.6"
          />
          <rect x="109.3" y="74.5" width="2.5" height="8" rx="1.25" fill="#FEF08A" />

          {/* Energetic Wave */}
          <g className="rs-rumi-arm">
            <path
              d="M104 90 Q118 82 117 69"
              fill="none"
              stroke="#6366F1"
              strokeWidth="6.8"
              strokeLinecap="round"
            />
            <circle
              cx="117"
              cy="68"
              r="4.6"
              fill="#C7D2FE"
              stroke="#FFFFFF"
              strokeWidth="1.2"
            />
          </g>
        </g>
      )}

      {/* STAGE 3: TEEN RUMI (2-Part Chibi Creator Hoodie + Studio Headset & Mini Content Card) */}
      {!isAdminSuperior && stage === 3 && (
        <g className="rs-rumi-character">
          {/* Sleek Translucent Mini Content Card Floating Left */}
          <g className="rs-rumi-holo">
            <rect
              x="13"
              y="70"
              width="23"
              height="27"
              rx="6"
              fill="#FFFFFF"
              fillOpacity="0.95"
              stroke="#38BDF8"
              strokeWidth="1.5"
            />
            <rect x="17.5" y="76" width="14" height="3.5" rx="1.75" fill="#4F39F6" />
            <rect x="17.5" y="82.5" width="10" height="3" rx="1.5" fill="#EC4899" />
            <rect x="17.5" y="88" width="14" height="3" rx="1.5" fill="#10B981" />
          </g>

          {/* Floating Ceramic Sneakers */}
          <ellipse cx="61" cy="125" rx="7.5" ry="4.5" fill="#312E81" />
          <ellipse cx="61" cy="124" rx="5" ry="2" fill="#A5B4FC" fillOpacity="0.6" />
          <ellipse cx="87" cy="125" rx="7.5" ry="4.5" fill="#312E81" />
          <ellipse cx="87" cy="124" rx="5" ry="2" fill="#A5B4FC" fillOpacity="0.6" />

          {/* Plump Creator Hoodie Torso */}
          <rect
            x="49"
            y="88"
            width="50"
            height="37"
            rx="19"
            fill={`url(#${learnerDarkTrimGradId})`}
            stroke="#6366F1"
            strokeWidth="1.2"
          />
          <path
            d="M58 91 L74 103 L90 91"
            fill="none"
            stroke="#38BDF8"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M74 106 L75.7 110.2 L80 112 L75.7 113.8 L74 118 L72.3 113.8 L68 112 L72.3 110.2 Z"
            fill={`url(#${goldGradId})`}
          />

          {/* Resting Left Hoodie Arm */}
          <path
            d="M50 97 Q40 103 43 111"
            fill="none"
            stroke="#312E81"
            strokeWidth="7"
            strokeLinecap="round"
          />
          <circle cx="43.5" cy="111.5" r="2.2" fill="#38BDF8" />

          {/* Waving Right Hoodie Arm */}
          <g className="rs-rumi-arm">
            <path
              d="M98 96 Q114 89 117 75"
              fill="none"
              stroke="#4F39F6"
              strokeWidth="7"
              strokeLinecap="round"
            />
            <circle
              cx="117"
              cy="74"
              r="4.7"
              fill="#E0E7FF"
              stroke="#A5B4FC"
              strokeWidth="1.2"
            />
          </g>

          {/* Compact Glowing 4-Point Creator Star Antenna */}
          <g className="rs-rumi-antenna">
            <path d="M74 39 L74 28" stroke="#38BDF8" strokeWidth="3" strokeLinecap="round" />
            <path
              d="M74 16 L76.6 22.8 L83.5 25 L76.6 27.2 L74 34 L71.4 27.2 L64.5 25 L71.4 22.8 Z"
              fill={`url(#${goldGradId})`}
              stroke="#FFFFFF"
              strokeWidth="0.9"
              strokeLinejoin="round"
            />
          </g>

          {/* Sculpted Studio Headband */}
          <path
            d="M39 65 C39 27, 109 27, 109 65"
            fill="none"
            stroke={`url(#${learnerDarkTrimGradId})`}
            strokeWidth="5.5"
            strokeLinecap="round"
          />

          {/* Chubby Glossy 3D Head */}
          <rect
            x="43"
            y="38"
            width="62"
            height="54"
            rx="27"
            fill={`url(#${bodyGradId})`}
            stroke="#A5B4FC"
            strokeWidth="1.2"
          />
          <ellipse
            cx="61"
            cy="46.5"
            rx="12.5"
            ry="4.5"
            fill="#FFFFFF"
            fillOpacity="0.56"
            transform="rotate(-14 61 46.5)"
          />

          {/* Glossy Glass Visor */}
          <rect
            x="50"
            y="49"
            width="48"
            height="33"
            rx="16.5"
            fill={`url(#${learnerVisorGradId})`}
            stroke="#7DD3FC"
            strokeOpacity="0.6"
            strokeWidth="1.2"
          />
          <path
            d="M58 53.5 Q74 49.5 90 53.5"
            fill="none"
            stroke="#FFFFFF"
            strokeOpacity="0.2"
            strokeWidth="1.8"
            strokeLinecap="round"
          />

          {/* Rosy Cheeks & Luminous Mint-Aqua Kawaii Eyes */}
          <ellipse cx="59" cy="72" rx="4" ry="2.1" fill="#FB7185" fillOpacity="0.72" />
          <ellipse cx="89" cy="72" rx="4" ry="2.1" fill="#FB7185" fillOpacity="0.72" />
          {/* Luminous Mint-Aqua Kawaii Eyes + Dynamic Expression */}
          <RumiVisorFace
            mood={mood}
            leftEyeX={63}
            rightEyeX={85}
            eyeY={63}
            mouthY={73}
            eyeGlow="#22D3EE"
            eyeFill="#ECFEFF"
            mouthStroke="#67E8F9"
            eyeRx={4.3}
            eyeRy={5}
            glowR={6}
            sparkColor="#67E8F9"
          />

          {/* Glossy Cyan Studio Headphones + Sleek Creator Mic Boom */}
          <rect
            x="34"
            y="53"
            width="11"
            height="22"
            rx="5.5"
            fill={`url(#${cyanGradId})`}
            stroke="#FFFFFF"
            strokeWidth="1.5"
          />
          <rect
            x="103"
            y="53"
            width="11"
            height="22"
            rx="5.5"
            fill={`url(#${cyanGradId})`}
            stroke="#FFFFFF"
            strokeWidth="1.5"
          />
          <path
            d="M39 73 Q46 84 61 83"
            fill="none"
            stroke="#1E1B4B"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <circle cx="62" cy="83" r="2.6" fill="#22D3EE" stroke="#FFFFFF" strokeWidth="0.9" />
        </g>
      )}

      {/* STAGE 4: PRO RUMI (Cosmic Amethyst Chibi + Royal Velvet Cape + Magenta-Gold Crown) */}
      {!isAdminSuperior && stage === 4 && (
        <g className="rs-rumi-character">
          {/* Compact Royal Velvet Cape */}
          <path
            className="rs-rumi-cape"
            d="M48 86 Q34 108 40 125 Q74 132 108 125 Q114 108 100 86 Z"
            fill={`url(#${capeGradId})`}
            fillOpacity="0.92"
            stroke="#FBBF24"
            strokeOpacity="0.65"
            strokeWidth="1.2"
          />

          {/* Compact Hovering Golden Star Orb Left */}
          <g className="rs-rumi-holo">
            <circle cx="24" cy="79" r="8.5" fill="#FBBF24" fillOpacity="0.22" />
            <path
              d="M24 70 L26.2 76.8 L33 79 L26.2 81.2 L24 88 L21.8 81.2 L15 79 L21.8 76.8 Z"
              fill={`url(#${goldGradId})`}
              stroke="#FFFFFF"
              strokeWidth="0.9"
            />
          </g>

          {/* Floating Dark-Violet Feet */}
          <ellipse cx="61" cy="125" rx="7.5" ry="4.5" fill="#2E1065" />
          <ellipse cx="61" cy="124" rx="5" ry="2" fill="#C4B5FD" fillOpacity="0.5" />
          <ellipse cx="87" cy="125" rx="7.5" ry="4.5" fill="#2E1065" />
          <ellipse cx="87" cy="124" rx="5" ry="2" fill="#C4B5FD" fillOpacity="0.5" />

          {/* Plump Glossy Royal Amethyst Ceramic Torso */}
          <rect
            x="49"
            y="88"
            width="50"
            height="37"
            rx="19"
            fill={`url(#${learnerDarkTrimGradId})`}
            stroke="#A78BFA"
            strokeWidth="1.3"
          />
          <path
            d="M54 92 Q74 100 94 92"
            fill="none"
            stroke={`url(#${goldGradId})`}
            strokeWidth="3.8"
            strokeLinecap="round"
          />
          <polygon
            points="74,102 80,109 74,116 68,109"
            fill={`url(#${cyanGradId})`}
            stroke="#FEF08A"
            strokeWidth="1.3"
          />

          {/* Resting Left Arm & Commanding Waving Right Arm */}
          <path
            d="M50 97 Q40 103 43 111"
            fill="none"
            stroke="#312E81"
            strokeWidth="7"
            strokeLinecap="round"
          />
          <circle cx="43.5" cy="111.5" r="2.2" fill="#FBBF24" />
          <g className="rs-rumi-arm">
            <path
              d="M98 96 Q114 89 117 75"
              fill="none"
              stroke="#6366F1"
              strokeWidth="7.2"
              strokeLinecap="round"
            />
            <circle
              cx="117"
              cy="74"
              r="4.8"
              fill={`url(#${goldGradId})`}
              stroke="#FFFFFF"
              strokeWidth="1.2"
            />
          </g>

          {/* Sculpted Dark Headband + Floating Royal Gold Tiara */}
          <path
            d="M39 65 C39 26, 109 26, 109 65"
            fill="none"
            stroke={`url(#${learnerDarkTrimGradId})`}
            strokeWidth="5.5"
            strokeLinecap="round"
          />
          <g className="rs-rumi-crown">
            <path
              d="M55 30 L58 18 Q64 23 69 22 L74 13 L79 22 Q84 23 90 18 L93 30 Q74 33 55 30 Z"
              fill={`url(#${goldGradId})`}
              stroke="#FFFFFF"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
            <circle cx="74" cy="24.5" r="2.7" fill="#F472B6" stroke="#FFFFFF" strokeWidth="0.9" />
          </g>

          {/* Chubby Glossy 3D Cosmic Amethyst Head */}
          <rect
            x="43"
            y="37"
            width="62"
            height="55"
            rx="27.5"
            fill={`url(#${bodyGradId})`}
            stroke="#C4B5FD"
            strokeWidth="1.2"
          />
          <ellipse
            cx="61"
            cy="46"
            rx="13"
            ry="4.8"
            fill="#FFFFFF"
            fillOpacity="0.58"
            transform="rotate(-14 61 46)"
          />

          {/* Glossy Sapphire-Violet Glass Visor */}
          <rect
            x="50"
            y="48"
            width="48"
            height="34"
            rx="17"
            fill={`url(#${learnerVisorGradId})`}
            stroke="#C4B5FD"
            strokeOpacity="0.65"
            strokeWidth="1.3"
          />
          <path
            d="M58 53 Q74 49 90 53"
            fill="none"
            stroke="#FFFFFF"
            strokeOpacity="0.22"
            strokeWidth="2"
            strokeLinecap="round"
          />

          {/* Rosy Blush + Electric Cyan & Gold-Sparkle Kawaii Eyes */}
          <ellipse cx="59" cy="71.5" rx="4.2" ry="2.2" fill="#FB7185" fillOpacity="0.72" />
          <ellipse cx="89" cy="71.5" rx="4.2" ry="2.2" fill="#FB7185" fillOpacity="0.72" />
          {/* Electric Cyan & Gold-Sparkle Kawaii Eyes + Dynamic Expression */}
          <RumiVisorFace
            mood={mood}
            leftEyeX={63}
            rightEyeX={85}
            eyeY={62.5}
            mouthY={72.5}
            eyeGlow="#38BDF8"
            eyeFill="#E0F2FE"
            mouthStroke="#FDE68A"
            eyeRx={4.4}
            eyeRy={5.1}
            glowR={6.2}
            catchColor="#FEF08A"
            sparkColor="#FDE047"
          />

          {/* Gold Studio Headphones with Glowing Violet LEDs */}
          <rect
            x="34"
            y="53"
            width="11"
            height="23"
            rx="5.5"
            fill={`url(#${goldGradId})`}
            stroke="#FFFFFF"
            strokeWidth="1.5"
          />
          <rect x="38.2" y="61" width="2.6" height="7" rx="1.3" fill="#C084FC" />
          <rect
            x="103"
            y="53"
            width="11"
            height="23"
            rx="5.5"
            fill={`url(#${goldGradId})`}
            stroke="#FFFFFF"
            strokeWidth="1.5"
          />
          <rect x="107.2" y="61" width="2.6" height="7" rx="1.3" fill="#C084FC" />
        </g>
      )}

      {/* STAGE 5: SUPERIOR LEARNER RUMI (Cosmic Royal-Indigo & Solar-Gold Chibi Angelic Sovereign) */}
      {!isAdminSuperior && stage === 5 && (
        <g className="rs-rumi-character">
          {/* Radiant Sculpted Solar-Gold Angelic Wings */}
          <g className="rs-rumi-wing-l">
            <path
              d="M48 87 C26 73, 15 80, 19 95 C15 101, 21 110, 34 106 C39 109, 44 107, 49 103 Z"
              fill={`url(#${wingGradId})`}
              fillOpacity="0.92"
              stroke="#FFFFFF"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
            <path
              d="M46 94 C33 88, 25 94, 28 102"
              fill="none"
              stroke="#FFFFFF"
              strokeOpacity="0.65"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </g>
          <g className="rs-rumi-wing-r">
            <path
              d="M100 87 C122 73, 133 80, 129 95 C133 101, 127 110, 114 106 C109 109, 104 107, 99 103 Z"
              fill={`url(#${wingGradId})`}
              fillOpacity="0.92"
              stroke="#FFFFFF"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
            <path
              d="M102 94 C115 88, 123 94, 120 102"
              fill="none"
              stroke="#FFFFFF"
              strokeOpacity="0.65"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </g>

          {/* Floating Gold-Trimmed Indigo Feet */}
          <ellipse cx="61" cy="125" rx="7.5" ry="4.5" fill="#1E1B4B" stroke="#FBBF24" strokeOpacity="0.65" strokeWidth="1" />
          <ellipse cx="61" cy="124" rx="5" ry="2" fill="#A5B4FC" fillOpacity="0.55" />
          <ellipse cx="87" cy="125" rx="7.5" ry="4.5" fill="#1E1B4B" stroke="#FBBF24" strokeOpacity="0.65" strokeWidth="1" />
          <ellipse cx="87" cy="124" rx="5" ry="2" fill="#A5B4FC" fillOpacity="0.55" />

          {/* Plump Glossy Cosmic Royal-Indigo Sovereign Torso */}
          <rect
            x="48"
            y="88"
            width="52"
            height="37"
            rx="20"
            fill={`url(#${bodyGradId})`}
            stroke={`url(#${goldGradId})`}
            strokeWidth="1.6"
          />
          {/* Radiant Solar-Gold Collar Curve */}
          <path
            d="M54 92 Q74 100 94 92"
            fill="none"
            stroke={`url(#${goldGradId})`}
            strokeWidth="4"
            strokeLinecap="round"
          />
          {/* Gold-Framed Sovereign Chest Diamond Crest */}
          <polygon
            points="74,101.5 81,109 74,116.5 67,109"
            fill={`url(#${cyanGradId})`}
            stroke="#FEF08A"
            strokeWidth="1.5"
          />
          <polygon points="74,105 76.8,109 74,113 71.2,109" fill="#FFFFFF" fillOpacity="0.7" />

          {/* Resting Left Arm & Waving Solar-Gold Gauntlet Arm */}
          <path
            d="M49 97 Q39 103 42 111"
            fill="none"
            stroke="#312E81"
            strokeWidth="7"
            strokeLinecap="round"
          />
          <circle cx="42.5" cy="111.5" r="2.2" fill="#FDE047" />
          <g className="rs-rumi-arm">
            <path
              d="M99 96 Q115 89 118 75"
              fill="none"
              stroke="#4F39F6"
              strokeWidth="7.4"
              strokeLinecap="round"
            />
            <path
              d="M113 83 Q116.5 80.5 118 77"
              fill="none"
              stroke={`url(#${goldGradId})`}
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <circle
              cx="118"
              cy="74"
              r="4.9"
              fill={`url(#${goldGradId})`}
              stroke="#FFFFFF"
              strokeWidth="1.3"
            />
          </g>

          {/* Sculpted Indigo-Gold Headband */}
          <path
            d="M39 65 C39 25, 109 25, 109 65"
            fill="none"
            stroke={`url(#${learnerDarkTrimGradId})`}
            strokeWidth="5.5"
            strokeLinecap="round"
          />

          {/* Floating Sovereign 5-Peak Solar-Gold Crown with Amethyst Diamond */}
          <g className="rs-rumi-crown">
            <path
              d="M52 31 L54 18 L63 23.5 L68 14 L74 21.5 L80 14 L85 23.5 L94 18 L96 31 Q74 34 52 31 Z"
              fill={`url(#${goldGradId})`}
              stroke="#FFFFFF"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
            <polygon
              points="74,9.5 77.2,15 74,20.5 70.8,15"
              fill="#E879F9"
              stroke="#FFFFFF"
              strokeWidth="0.9"
            />
          </g>

          {/* Chubby Glossy 3D Cosmic Royal-Indigo Sovereign Head */}
          <rect
            x="43"
            y="37"
            width="62"
            height="55"
            rx="27.5"
            fill={`url(#${bodyGradId})`}
            stroke={`url(#${goldGradId})`}
            strokeWidth="1.5"
          />
          <ellipse
            cx="61"
            cy="46"
            rx="13"
            ry="4.8"
            fill="#FFFFFF"
            fillOpacity="0.62"
            transform="rotate(-14 61 46)"
          />

          {/* Glossy Deep-Indigo Glass Visor */}
          <rect
            x="50"
            y="48"
            width="48"
            height="34"
            rx="17"
            fill={`url(#${learnerVisorGradId})`}
            stroke="#FDE68A"
            strokeOpacity="0.68"
            strokeWidth="1.4"
          />
          <path
            d="M58 53 Q74 49 90 53"
            fill="none"
            stroke="#FFFFFF"
            strokeOpacity="0.24"
            strokeWidth="2"
            strokeLinecap="round"
          />

          {/* Soft Coral Blush Cheeks */}
          <ellipse cx="59" cy="71.5" rx="4.2" ry="2.2" fill="#FB7185" fillOpacity="0.76" />
          <ellipse cx="89" cy="71.5" rx="4.2" ry="2.2" fill="#FB7185" fillOpacity="0.76" />

          {/* Luminous Warm Solar-Gold Kawaii Eyes + Dynamic Expression */}
          <RumiVisorFace
            mood={mood}
            leftEyeX={63}
            rightEyeX={85}
            eyeY={62.5}
            mouthY={72.5}
            eyeGlow="#FBBF24"
            eyeFill="#FEF9C3"
            mouthStroke="#FDE68A"
            eyeRx={4.4}
            eyeRy={5.1}
            glowR={6.3}
            sparkColor="#FDE047"
          />

          {/* Sculpted Solar-Gold Studio Headphones with Warm Amber LEDs */}
          <rect
            x="34"
            y="53"
            width="11"
            height="23"
            rx="5.5"
            fill={`url(#${goldGradId})`}
            stroke="#FFFFFF"
            strokeWidth="1.5"
          />
          <rect x="38.2" y="61" width="2.6" height="7" rx="1.3" fill="#FEF08A" />
          <rect
            x="103"
            y="53"
            width="11"
            height="23"
            rx="5.5"
            fill={`url(#${goldGradId})`}
            stroke="#FFFFFF"
            strokeWidth="1.5"
          />
          <rect x="107.2" y="61" width="2.6" height="7" rx="1.3" fill="#FEF08A" />
        </g>
      )}

      {/* EXCLUSIVE ADMIN FORM: SUPERIOR ADMIN RUMI (Ceramic Pearl & Glacial Sapphire — Cool, Premium, Chibi) */}
      {isAdminSuperior && (
        <g className="rs-rumi-character">
          {/* Sleek Translucent Ice-Pearl Mini Wing-Fins */}
          <g className="rs-rumi-wing-l">
            <path
              d="M49 91 C36 83, 27 86, 30 96 C28 102, 34 108, 49 104 Z"
              fill={`url(#${adminIceGlowGradId})`}
              fillOpacity="0.28"
              stroke="#7DD3FC"
              strokeOpacity="0.7"
              strokeWidth="1.3"
              strokeLinejoin="round"
            />
          </g>
          <g className="rs-rumi-wing-r">
            <path
              d="M99 91 C112 83, 121 86, 118 96 C120 102, 114 108, 99 104 Z"
              fill={`url(#${adminIceGlowGradId})`}
              fillOpacity="0.28"
              stroke="#7DD3FC"
              strokeOpacity="0.7"
              strokeWidth="1.3"
              strokeLinejoin="round"
            />
          </g>

          {/* Chubby Floating Ceramic Feet */}
          <ellipse cx="61" cy="125" rx="7.5" ry="4.5" fill="#CBD5E1" />
          <ellipse cx="61" cy="124" rx="5.2" ry="2.2" fill="#FFFFFF" fillOpacity="0.7" />
          <ellipse cx="87" cy="125" rx="7.5" ry="4.5" fill="#CBD5E1" />
          <ellipse cx="87" cy="124" rx="5.2" ry="2.2" fill="#FFFFFF" fillOpacity="0.7" />

          {/* Plump Chibi Ceramic Pearl Torso */}
          <rect
            x="49"
            y="88"
            width="50"
            height="37"
            rx="20"
            fill={`url(#${adminCeramicGradId})`}
            stroke="#CBD5E1"
            strokeWidth="1.2"
          />
          {/* Cool Indigo-Sky Collar Accent */}
          <path
            d="M54 92 Q74 100 94 92"
            fill="none"
            stroke={`url(#${adminBodyTrimGradId})`}
            strokeWidth="4.2"
            strokeLinecap="round"
          />
          {/* Minimal Brushed Gold 4-Point Star Chest Crest */}
          <path
            d="M74 102.5 L75.9 107.1 L80.5 109 L75.9 110.9 L74 115.5 L72.1 110.9 L67.5 109 L72.1 107.1 Z"
            fill={`url(#${adminGoldGradId})`}
            stroke="#FFFFFF"
            strokeWidth="0.9"
            strokeLinejoin="round"
          />
          <circle cx="74" cy="109" r="1.5" fill="#38BDF8" />

          {/* Chubby Resting Left Ceramic Arm */}
          <path
            d="M50 97 Q40 103 43 111"
            fill="none"
            stroke="#94A3B8"
            strokeWidth="8.2"
            strokeLinecap="round"
            strokeOpacity="0.35"
          />
          <path
            d="M50 97 Q40 103 43 111"
            fill="none"
            stroke={`url(#${adminCeramicGradId})`}
            strokeWidth="7"
            strokeLinecap="round"
          />
          <circle cx="43.5" cy="111.5" r="1.8" fill="#38BDF8" />

          {/* Chubby Warmly Waving Right Ceramic Arm */}
          <g className="rs-rumi-arm">
            <path
              d="M98 96 Q113 89 116 76"
              fill="none"
              stroke="#E2E8F0"
              strokeWidth="7.5"
              strokeLinecap="round"
            />
            <path
              d="M111.5 83.5 Q114.8 81 116 77.5"
              fill="none"
              stroke={`url(#${adminGoldGradId})`}
              strokeWidth="2.4"
              strokeLinecap="round"
            />
            <circle
              cx="116"
              cy="75"
              r="4.8"
              fill={`url(#${adminCeramicGradId})`}
              stroke="#CBD5E1"
              strokeWidth="1.2"
            />
          </g>

          {/* Sculpted Cool Brushed-Titanium Headband */}
          <path
            d="M39 65 C39 25, 109 25, 109 65"
            fill="none"
            stroke={`url(#${adminHeadbandGradId})`}
            strokeWidth="5.5"
            strokeLinecap="round"
          />

          {/* Adorable Floating Compact Champagne Mini-Crown */}
          <g className="rs-rumi-crown">
            <path
              d="M55 30 L58 18 Q64 23 69 22 L74 13 L79 22 Q84 23 90 18 L93 30 Q74 33 55 30 Z"
              fill={`url(#${adminGoldGradId})`}
              stroke="#FFFFFF"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
            <circle
              cx="74"
              cy="24.5"
              r="2.8"
              fill={`url(#${adminIceGlowGradId})`}
              stroke="#FFFFFF"
              strokeWidth="0.9"
            />
          </g>

          {/* Chubby Glossy 3D Ceramic Pearl Head */}
          <rect
            x="43"
            y="37"
            width="62"
            height="55"
            rx="27.5"
            fill={`url(#${adminCeramicGradId})`}
            stroke="#CBD5E1"
            strokeWidth="1.2"
          />
          <ellipse
            cx="61"
            cy="46"
            rx="13"
            ry="4.8"
            fill="#FFFFFF"
            fillOpacity="0.88"
            transform="rotate(-14 61 46)"
          />

          {/* Premium Glossy Sapphire-Glass Face Visor */}
          <rect
            x="50"
            y="48"
            width="48"
            height="34"
            rx="17"
            fill={`url(#${adminFaceScreenGradId})`}
            stroke="#7DD3FC"
            strokeOpacity="0.6"
            strokeWidth="1.3"
          />
          <path
            d="M58 53 Q74 49 90 53"
            fill="none"
            stroke="#FFFFFF"
            strokeOpacity="0.22"
            strokeWidth="2"
            strokeLinecap="round"
          />

          {/* Digital Rosy Blush Cheeks */}
          <ellipse cx="59" cy="71.5" rx="4.2" ry="2.2" fill="#FB7185" fillOpacity="0.72" />
          <ellipse cx="89" cy="71.5" rx="4.2" ry="2.2" fill="#FB7185" fillOpacity="0.72" />

          {/* Luminous Ice-Cyan Kawaii Eyes + Dynamic Expression */}
          <RumiVisorFace
            mood={mood}
            leftEyeX={63}
            rightEyeX={85}
            eyeY={62.5}
            mouthY={72.5}
            eyeGlow="#38BDF8"
            eyeFill="#E0F2FE"
            mouthStroke="#7DD3FC"
            eyeRx={4.4}
            eyeRy={5.1}
            glowR={6.2}
            sparkColor="#67E8F9"
          />

          {/* Sleek Brushed-Champagne Studio Headphones with Ice-Cyan LEDs */}
          <rect
            x="34"
            y="53"
            width="11"
            height="23"
            rx="5.5"
            fill={`url(#${adminGoldGradId})`}
            stroke="#FFFFFF"
            strokeWidth="1.5"
          />
          <rect x="38.2" y="61" width="2.6" height="7" rx="1.3" fill="#38BDF8" />
          <rect
            x="103"
            y="53"
            width="11"
            height="23"
            rx="5.5"
            fill={`url(#${adminGoldGradId})`}
            stroke="#FFFFFF"
            strokeWidth="1.5"
          />
          <rect x="107.2" y="61" width="2.6" height="7" rx="1.3" fill="#38BDF8" />
        </g>
      )}
    </svg>
  );
}

interface RumiEvolutionModalProps {
  open: boolean;
  onClose: () => void;
  xpState: RumiXpProfileState;
  activeTierKind: PackageTierKind;
  onOpenUpgradeModal?: () => void;
}

const MODAL_XP_ACTIVITIES: XpActivityType[] = [
  "daily_login",
  "chapter_complete",
  "course_complete",
  "quiz_submit",
  "lesson_note",
  "lesson_review",
  "reward_claim",
  "streak_7",
];

export function RumiEvolutionModal({
  open,
  onClose,
  xpState,
  activeTierKind,
  onOpenUpgradeModal,
}: RumiEvolutionModalProps) {
  const levelInfo = resolveRumiLevelInfo(xpState.totalXp);
  const [selectedStage, setSelectedStage] = useState<RumiEvolutionStage>(
    levelInfo.stage
  );
  useEffect(() => {
    if (open) {
      setSelectedStage(levelInfo.stage);
    }
  }, [open, levelInfo.stage]);
  const multiplier = getTierXpMultiplier(activeTierKind);
  const previewTier =
    RUMI_LEVEL_TIERS.find((t) => t.stage === selectedStage) || levelInfo;
  const previewUnlocked = xpState.totalXp >= previewTier.minXp;

  return (
    <ModalDialog
      open={open}
      onClose={onClose}
      titleId="rumi-evolution-modal-title"
      title="Evolusi Rumi & Panduan XP Belajar"
      subtitle="Kumpulkan XP nyata dari login harian, belajar kelas, hingga upgrade paket agar Rumi bertumbuh menjadi wujud Superior!"
      maxWidthClass="max-w-2xl"
    >
      <div className="space-y-5 max-h-[75vh] overflow-y-auto pr-1 scrollable-region">
        {/* Live Stage Preview Card */}
        <div className="rs-hero-pastel rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center gap-4">
          <div className="shrink-0">
            <RumiMascotIllustration
              stage={selectedStage}
              sizeClass="w-32 h-32 sm:w-36 sm:h-36"
            />
          </div>

          <div className="min-w-0 flex-1 space-y-2 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-0.5 text-[11px] font-extrabold text-[#4F39F6] border border-[#EAECEF]">
                <span>{previewTier.emoji}</span>
                <span>
                  Lv.{previewTier.level} • {previewTier.formName}
                </span>
              </span>
              {selectedStage === levelInfo.stage ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#ECFDF5] px-2.5 py-0.5 text-[11px] font-bold text-[#059669] border border-[#10B981]/30">
                  <CheckCircle2 size={11} />
                  <span>Wujud Aktifmu</span>
                </span>
              ) : previewUnlocked ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#EEF2FF] px-2.5 py-0.5 text-[11px] font-bold text-[#4F39F6]">
                  Sudah Terbuka
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#FFFBEB] px-2.5 py-0.5 text-[11px] font-bold text-[#92400E] border border-[#F59E0B]/30">
                  <Lock size={10} />
                  <span>
                    Butuh {previewTier.minXp - xpState.totalXp} XP lagi
                  </span>
                </span>
              )}
            </div>

            <div>
              <h3 className="text-base font-extrabold text-[#121215]">
                {previewTier.title} ({previewTier.badge})
              </h3>
              <p className="text-xs text-[#475569] leading-relaxed mt-0.5">
                {previewTier.tagline}
              </p>
            </div>

            <div className="pt-1 space-y-1">
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className="text-[#4F39F6] tabular-nums">
                  XP Kamu: {xpState.totalXp.toLocaleString()} XP
                </span>
                <span className="text-[#64748B] tabular-nums">
                  {levelInfo.isMax
                    ? "Wujud Tertinggi Tercapai! 🏆"
                    : `Target Lv.${levelInfo.level + 1}: ${levelInfo.nextXp} XP`}
                </span>
              </div>
              <progress
                className="rs-progress-bar"
                value={levelInfo.levelProgressPct}
                max={100}
                aria-label="Progress evolusi Rumi"
                style={
                  {
                    "--bar-height": "8px",
                    "--progress-bar-fill": "#4F39F6",
                    "--progress-bar-track": "rgba(255,255,255,0.85)",
                  } as React.CSSProperties
                }
              />
            </div>
          </div>
        </div>

        {/* 5 Evolution Stage Selector Grid */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
              5 Tahap Pertumbuhan Rumi (Klik untuk Preview)
            </h4>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#EA580C]">
              <Flame size={12} />
              Streak Login: {xpState.loginStreak} hari
            </span>
          </div>

          <div className="grid grid-cols-5 gap-2">
            {RUMI_LEVEL_TIERS.map((tier) => {
              const unlocked = xpState.totalXp >= tier.minXp;
              const isSelected = selectedStage === tier.stage;
              return (
                <button
                  key={tier.stage}
                  type="button"
                  onClick={() => setSelectedStage(tier.stage)}
                  className={`rounded-xl border p-2 text-center transition-all cursor-pointer space-y-1 ${
                    isSelected
                      ? "bg-[#EEF2FF] border-[#4F39F6] ring-2 ring-[#4F39F6]/20"
                      : unlocked
                      ? "bg-white border-[#EAECEF] hover:border-[#4F39F6]/50"
                      : "bg-[#F8FAFC] border-[#EAECEF] opacity-75 hover:opacity-100"
                  }`}
                >
                  <div className="flex justify-center">
                    <RumiMascotIllustration
                      stage={tier.stage}
                      paused={!isSelected}
                      sizeClass="w-12 h-12"
                    />
                  </div>
                  <p className="text-[10px] font-extrabold text-[#121215] truncate">
                    Lv.{tier.level}
                  </p>
                  <p className="text-[9px] font-semibold text-[#4F39F6] tabular-nums">
                    {tier.minXp} XP
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* How to Earn XP & Package Booster */}
        <div className="rounded-2xl bg-[#F8F9FB] border border-[#EAECEF] p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <TrendingUp size={15} className="text-[#4F39F6]" />
              <h4 className="text-xs font-bold text-[#121215]">
                Cara Mengumpulkan XP &amp; Booster Paket
              </h4>
            </div>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${
                activeTierKind === "pro"
                  ? "bg-[#ECFDF5] text-[#059669] border border-[#10B981]/30"
                  : activeTierKind === "basic" || activeTierKind === "custom"
                  ? "bg-[#EEF2FF] text-[#4F39F6] border border-[#4F39F6]/30"
                  : "bg-white text-[#475569] border border-[#EAECEF]"
              }`}
            >
              <Zap size={10} fill="currentColor" />
              <span>Booster Kamu: {multiplier}× XP</span>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {MODAL_XP_ACTIVITIES.map((actType) => {
              const def = XP_ACTIVITY_CONFIG[actType];
              const freeXp = computeAwardedXp(actType, "free").xp;
              const proXp = computeAwardedXp(actType, "pro").xp;
              const currentXp = computeAwardedXp(actType, activeTierKind).xp;
              return (
                <div
                  key={actType}
                  className="flex items-center justify-between gap-2 rounded-xl bg-white border border-[#EAECEF] px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-[#121215] truncate">
                      {def.label}
                    </p>
                    <p className="text-[10px] text-[#64748B] truncate">
                      FREE +{freeXp} XP • PRO +{proXp} XP
                    </p>
                  </div>
                  <span className="shrink-0 rounded-lg bg-[#EEF2FF] px-2 py-1 text-[11px] font-extrabold text-[#4F39F6] tabular-nums">
                    +{currentXp} XP
                  </span>
                </div>
              );
            })}
          </div>

          {/* Package Bonus Callout */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] px-3 py-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles size={15} className="text-[#D97706] shrink-0" />
              <p className="text-[11px] font-semibold text-[#92400E]">
                Paket <strong>Basic</strong> dapat <strong>1.5× XP + Bonus 15 XP</strong> •{" "}
                <strong>PRO</strong> dapat <strong>2× XP + Bonus 35 XP</strong>!
              </p>
            </div>
            {activeTierKind !== "pro" && onOpenUpgradeModal && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenUpgradeModal();
                }}
                className="shrink-0 rounded-lg bg-[#4F39F6] hover:bg-[#3B28CC] px-3 py-1.5 text-[11px] font-bold text-white cursor-pointer"
              >
                Aktifkan 2× XP
              </button>
            )}
          </div>
        </div>

        {/* Recent Real XP History Ledger */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#121215]">
            <History size={14} className="text-[#4F39F6]" />
            <span>Riwayat XP Terbaru ({xpState.events.length})</span>
          </div>
          {xpState.events.length === 0 ? (
            <p className="rounded-xl bg-[#F8F9FB] border border-[#EAECEF] px-3 py-3 text-xs text-[#64748B] text-center">
              Belum ada aktivitas XP tercatat. Selesaikan bab atau tulis catatan untuk mulai mengumpulkan XP!
            </p>
          ) : (
            <ul className="space-y-1.5">
              {xpState.events.slice(0, 8).map((ev) => (
                <li
                  key={ev.id}
                  className="flex items-center justify-between gap-2 rounded-xl bg-white border border-[#EAECEF] px-3 py-2 text-xs"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-[#121215] truncate">
                      {ev.label}
                    </p>
                    {ev.detail && (
                      <p className="text-[10px] text-[#64748B] truncate">
                        {ev.detail}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {ev.multiplier > 1 && (
                      <span className="rounded bg-[#FEF3C7] px-1.5 py-0.5 text-[9px] font-extrabold text-[#B45309]">
                        {ev.multiplier}×
                      </span>
                    )}
                    <span className="rounded-md bg-[#ECFDF5] px-2 py-0.5 text-[11px] font-extrabold text-[#059669] tabular-nums">
                      +{ev.xp} XP
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </ModalDialog>
  );
}
