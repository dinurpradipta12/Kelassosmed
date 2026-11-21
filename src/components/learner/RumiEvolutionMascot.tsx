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

export interface RumiMascotIllustrationProps {
  stage?: RumiEvolutionStage;
  variant?: "learner" | "admin-superior";
  paused?: boolean;
  sizeClass?: string;
}

/**
 * 5-Stage Animated Frameless Mascot ("Rumi") growing from Baby Rumi to Superior Rumi,
 * plus the exclusive Obsidian-Emerald "Superior Admin Rumi" Studio Sovereign form.
 */
export function RumiMascotIllustration({
  stage = 1,
  variant = "learner",
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
  const adminBodyGradId = `rumiAdminBody-${uid}`;
  const adminEmeraldGradId = `rumiAdminEmerald-${uid}`;
  const adminCapeGradId = `rumiAdminCape-${uid}`;
  const adminPrismWingGradId = `rumiAdminPrismWing-${uid}`;
  const adminVisorGradId = `rumiAdminVisor-${uid}`;

  return (
    <svg
      viewBox="0 0 148 148"
      className={`${sizeClass} shrink-0 select-none overflow-visible drop-shadow-[0_6px_14px_rgba(79,57,246,0.2)] ${
        paused ? "rs-rumi-paused" : ""
      }`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={bodyGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          {stage === 5 ? (
            <>
              <stop offset="0%" stopColor="#6366F1" />
              <stop offset="50%" stopColor="#312E81" />
              <stop offset="100%" stopColor="#1E1B4B" />
            </>
          ) : stage === 4 ? (
            <>
              <stop offset="0%" stopColor="#7C3AED" />
              <stop offset="55%" stopColor="#4F39F6" />
              <stop offset="100%" stopColor="#312E81" />
            </>
          ) : (
            <>
              <stop offset="0%" stopColor="#A5B4FC" />
              <stop offset="52%" stopColor="#6366F1" />
              <stop offset="100%" stopColor="#4F39F6" />
            </>
          )}
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
        <linearGradient id={adminBodyGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#334155" />
          <stop offset="50%" stopColor="#0F172A" />
          <stop offset="100%" stopColor="#020617" />
        </linearGradient>
        <linearGradient id={adminEmeraldGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#A7F3D0" />
          <stop offset="50%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>
        <linearGradient id={adminCapeGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#581C87" />
          <stop offset="55%" stopColor="#881337" />
          <stop offset="100%" stopColor="#BE123C" />
        </linearGradient>
        <linearGradient id={adminPrismWingGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="48%" stopColor="#34D399" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>
        <linearGradient id={adminVisorGradId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#34D399" stopOpacity="0.48" />
          <stop offset="50%" stopColor="#A7F3D0" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#10B981" stopOpacity="0.48" />
        </linearGradient>
      </defs>

      {/* Synced Soft Ground Shadow */}
      <ellipse
        className="rs-rumi-shadow"
        cx="74"
        cy="134"
        rx={isAdminSuperior || stage >= 4 ? 30 : 24}
        ry="4.8"
        fill={isAdminSuperior ? "#0F172A" : stage === 5 ? "#D97706" : "#4F39F6"}
        fillOpacity={isAdminSuperior ? "0.28" : stage === 5 ? "0.26" : "0.2"}
      />

      {/* Ambient Sparkles */}
      <g className="rs-sparkle-bob" style={{ transformOrigin: "22px 32px" }}>
        <path
          d="M22 22 L24.5 29.5 L32 32 L24.5 34.5 L22 42 L19.5 34.5 L12 32 L19.5 29.5 Z"
          fill={isAdminSuperior || stage === 5 ? "#FBBF24" : "#F59E0B"}
        />
      </g>
      <g
        className="rs-sparkle-bob-delayed"
        style={{ transformOrigin: "126px 30px" }}
      >
        <path
          d="M126 22 L128 28 L134 30 L128 32 L126 38 L124 32 L118 30 L124 28 Z"
          fill={isAdminSuperior ? "#10B981" : stage >= 4 ? "#22D3EE" : "#EC4899"}
        />
      </g>
      <circle
        className="rs-dot-float-a"
        cx="124"
        cy="108"
        r="4"
        fill={isAdminSuperior ? "#F43F5E" : "#10B981"}
        fillOpacity="0.82"
      />
      <circle
        className="rs-dot-float-b"
        cx="22"
        cy="104"
        r="3.5"
        fill={isAdminSuperior ? "#FBBF24" : "#0EA5E9"}
        fillOpacity="0.82"
      />

      {/* STAGE 1: BABY RUMI */}
      {!isAdminSuperior && stage === 1 && (
        <g className="rs-rumi-character">
          {/* Small Cute Sprout */}
          <g className="rs-rumi-antenna">
            <path
              d="M74 58 L74 46"
              stroke="#4F39F6"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            <circle
              className="rs-rumi-orb-glow"
              cx="74"
              cy="41"
              r="9"
              fill="#FBBF24"
            />
            <circle cx="74" cy="41" r="5.5" fill={`url(#${goldGradId})`} />
            <circle cx="72.5" cy="39.5" r="1.8" fill="#FFFFFF" />
          </g>

          {/* Soft Baby Headband */}
          <path
            d="M44 79 C44 55, 104 55, 104 79"
            fill="none"
            stroke="#1E293B"
            strokeWidth="5.5"
            strokeLinecap="round"
          />

          {/* Plump Baby Round Body */}
          <rect
            x="45"
            y="58"
            width="58"
            height="56"
            rx="28"
            fill={`url(#${bodyGradId})`}
          />
          <ellipse
            cx="64"
            cy="69"
            rx="11"
            ry="4.5"
            fill="#FFFFFF"
            fillOpacity="0.24"
            transform="rotate(-14 64 69)"
          />

          {/* Tiny Earmuffs */}
          <rect
            x="36"
            y="74"
            width="11"
            height="20"
            rx="5.5"
            fill={`url(#${goldGradId})`}
            stroke="#FFFFFF"
            strokeWidth="2"
          />
          <rect
            x="101"
            y="74"
            width="11"
            height="20"
            rx="5.5"
            fill={`url(#${goldGradId})`}
            stroke="#FFFFFF"
            strokeWidth="2"
          />

          {/* Baby Cheeks & Blinking Eyes */}
          <ellipse cx="57" cy="92" rx="5.8" ry="3.4" fill="#FDA4AF" fillOpacity="0.88" />
          <ellipse cx="91" cy="92" rx="5.8" ry="3.4" fill="#FDA4AF" fillOpacity="0.88" />
          <g className="rs-rumi-eyes">
            <circle cx="62" cy="83" r="4.8" fill="#121215" />
            <circle cx="86" cy="83" r="4.8" fill="#121215" />
            <circle cx="63.5" cy="81.3" r="1.8" fill="#FFFFFF" />
            <circle cx="87.5" cy="81.3" r="1.8" fill="#FFFFFF" />
          </g>
          <path
            d="M68 92 Q74 98 80 92"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Tiny Waving Hand */}
          <g className="rs-rumi-arm">
            <path
              d="M101 94 Q114 88 112 77"
              fill="none"
              stroke="#6366F1"
              strokeWidth="6.5"
              strokeLinecap="round"
            />
            <circle cx="112" cy="76" r="4.3" fill="#FDE68A" />
          </g>
        </g>
      )}

      {/* STAGE 2: JUNIOR RUMI */}
      {!isAdminSuperior && stage === 2 && (
        <g className="rs-rumi-character">
          {/* Dual Leaf + Glowing Star Sprout */}
          <g className="rs-rumi-antenna">
            <path
              d="M74 49 L74 34"
              stroke="#4F39F6"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            <path d="M74 42 Q64 36 62 43 Q68 46 74 42 Z" fill="#10B981" />
            <circle
              className="rs-rumi-orb-glow"
              cx="74"
              cy="30"
              r="9.5"
              fill="#22D3EE"
            />
            <circle cx="74" cy="30" r="5.8" fill={`url(#${goldGradId})`} />
          </g>

          {/* Sleek Cyan-Trim Headphones */}
          <path
            d="M39 74 C39 45, 109 45, 109 74"
            fill="none"
            stroke="#0F172A"
            strokeWidth="6.5"
            strokeLinecap="round"
          />

          {/* Slightly Taller Energetic Body + Little Sneakers/Feet */}
          <ellipse cx="61" cy="116" rx="8" ry="5" fill="#312E81" />
          <ellipse cx="87" cy="116" rx="8" ry="5" fill="#312E81" />
          <rect
            x="41"
            y="49"
            width="66"
            height="66"
            rx="31"
            fill={`url(#${bodyGradId})`}
          />

          {/* Junior Creator Star-Lens Goggles on Forehead */}
          <rect
            x="48"
            y="54"
            width="23"
            height="13"
            rx="6.5"
            fill={`url(#${cyanGradId})`}
            stroke="#FFFFFF"
            strokeWidth="2"
          />
          <rect
            x="77"
            y="54"
            width="23"
            height="13"
            rx="6.5"
            fill={`url(#${cyanGradId})`}
            stroke="#FFFFFF"
            strokeWidth="2"
          />
          <line x1="71" y1="60" x2="77" y2="60" stroke="#FFFFFF" strokeWidth="2.5" />

          {/* Glowing Cyan Headphones */}
          <rect
            x="31"
            y="67"
            width="13"
            height="25"
            rx="6.5"
            fill={`url(#${cyanGradId})`}
            stroke="#FFFFFF"
            strokeWidth="2"
          />
          <rect
            x="104"
            y="67"
            width="13"
            height="25"
            rx="6.5"
            fill={`url(#${cyanGradId})`}
            stroke="#FFFFFF"
            strokeWidth="2"
          />

          {/* Blinking Eyes & Confident Smile */}
          <ellipse cx="55" cy="90" rx="5.5" ry="3.2" fill="#FDA4AF" fillOpacity="0.85" />
          <ellipse cx="93" cy="90" rx="5.5" ry="3.2" fill="#FDA4AF" fillOpacity="0.85" />
          <g className="rs-rumi-eyes">
            <circle cx="62" cy="81" r="4.8" fill="#121215" />
            <circle cx="86" cy="81" r="4.8" fill="#121215" />
            <circle cx="63.6" cy="79.2" r="1.9" fill="#FFFFFF" />
            <circle cx="87.6" cy="79.2" r="1.9" fill="#FFFFFF" />
          </g>
          <path
            d="M66 91 Q74 99 82 91"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="3.2"
            strokeLinecap="round"
          />

          {/* Energetic Wave */}
          <g className="rs-rumi-arm">
            <path
              d="M105 90 Q120 82 119 68"
              fill="none"
              stroke="#6366F1"
              strokeWidth="7"
              strokeLinecap="round"
            />
            <circle cx="119" cy="67" r="4.6" fill="#FDE68A" />
          </g>
        </g>
      )}

      {/* STAGE 3: TEEN RUMI (Hoodie Creator + Hologram Card) */}
      {!isAdminSuperior && stage === 3 && (
        <g className="rs-rumi-character">
          {/* Hologram Content Card Floating Left */}
          <g className="rs-rumi-holo">
            <rect
              x="12"
              y="66"
              width="24"
              height="30"
              rx="6"
              fill="#FFFFFF"
              fillOpacity="0.92"
              stroke="#22D3EE"
              strokeWidth="2"
            />
            <rect x="17" y="72" width="14" height="4" rx="2" fill="#4F39F6" />
            <rect x="17" y="79" width="10" height="3" rx="1.5" fill="#EC4899" />
            <rect x="17" y="85" width="14" height="3" rx="1.5" fill="#10B981" />
          </g>

          {/* Creator Jacket Torso */}
          <path
            d="M46 92 C42 114, 48 122, 74 122 C100 122, 106 114, 102 92 Z"
            fill="#312E81"
          />
          <path
            d="M57 93 L74 106 L91 93"
            fill="none"
            stroke="#22D3EE"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="74" cy="112" r="4" fill={`url(#${goldGradId})`} />

          {/* Studio Headset */}
          <path
            d="M39 67 C39 36, 109 36, 109 67"
            fill="none"
            stroke="#0F172A"
            strokeWidth="6.5"
            strokeLinecap="round"
          />
          <g className="rs-rumi-antenna">
            <path d="M74 42 L74 30" stroke="#22D3EE" strokeWidth="3.2" strokeLinecap="round" />
            <path
              d="M74 18 L77 25 L84 26 L77 28 L74 35 L71 28 L64 26 L71 25 Z"
              fill={`url(#${goldGradId})`}
            />
          </g>

          {/* Distinct Teen Head */}
          <rect
            x="43"
            y="41"
            width="62"
            height="56"
            rx="27"
            fill={`url(#${bodyGradId})`}
          />
          <rect
            x="33"
            y="59"
            width="12"
            height="22"
            rx="6"
            fill={`url(#${cyanGradId})`}
            stroke="#FFFFFF"
            strokeWidth="2"
          />
          <rect
            x="103"
            y="59"
            width="12"
            height="22"
            rx="6"
            fill={`url(#${cyanGradId})`}
            stroke="#FFFFFF"
            strokeWidth="2"
          />
          {/* Mic Boom */}
          <path
            d="M39 78 Q46 88 61 86"
            fill="none"
            stroke="#0F172A"
            strokeWidth="2.8"
            strokeLinecap="round"
          />
          <circle cx="62" cy="86" r="3" fill="#22D3EE" />

          {/* Face */}
          <g className="rs-rumi-eyes">
            <circle cx="63" cy="69" r="4.6" fill="#121215" />
            <circle cx="85" cy="69" r="4.6" fill="#121215" />
            <circle cx="64.5" cy="67.2" r="1.8" fill="#FFFFFF" />
            <circle cx="86.5" cy="67.2" r="1.8" fill="#FFFFFF" />
          </g>
          <path
            d="M66 79 Q74 86 83 78"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Right Waving Arm */}
          <g className="rs-rumi-arm">
            <path
              d="M100 100 Q120 92 121 76"
              fill="none"
              stroke="#4F39F6"
              strokeWidth="7"
              strokeLinecap="round"
            />
            <circle cx="121" cy="74" r="4.8" fill="#FDE68A" />
          </g>
        </g>
      )}

      {/* STAGE 4: PRO RUMI (Royal Cape + Floating Crown) */}
      {!isAdminSuperior && stage === 4 && (
        <g className="rs-rumi-character">
          {/* Flowing Hero Cape Behind Body */}
          <g className="rs-rumi-cape">
            <path
              d="M52 76 L26 121 Q74 128 122 121 L96 76 Z"
              fill={`url(#${capeGradId})`}
              fillOpacity="0.9"
            />
          </g>

          {/* Hovering Star Orb on Left */}
          <g className="rs-rumi-holo">
            <circle cx="24" cy="78" r="10" fill="#FBBF24" fillOpacity="0.22" />
            <path
              d="M24 68 L26.6 75.4 L34 78 L26.6 80.6 L24 88 L21.4 80.6 L14 78 L21.4 75.4 Z"
              fill={`url(#${goldGradId})`}
            />
          </g>

          {/* Floating Golden Crown */}
          <g className="rs-rumi-crown">
            <path
              d="M54 34 L58 21 L67 28 L74 17 L81 28 L90 21 L94 34 Z"
              fill={`url(#${goldGradId})`}
              stroke="#FFFFFF"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </g>

          {/* Mature Armored Torso */}
          <path
            d="M44 88 C40 116, 50 124, 74 124 C98 124, 108 116, 104 88 Z"
            fill="#1E1B4B"
            stroke="#6366F1"
            strokeWidth="2"
          />
          {/* Shoulder Pauldrons */}
          <ellipse cx="45" cy="92" rx="10" ry="6" fill={`url(#${goldGradId})`} />
          <ellipse cx="103" cy="92" rx="10" ry="6" fill={`url(#${goldGradId})`} />
          {/* Chest Crest */}
          <polygon
            points="74,97 81,105 74,113 67,105"
            fill={`url(#${cyanGradId})`}
            stroke="#FFFFFF"
            strokeWidth="1.5"
          />

          {/* Pro Head + Golden Crest Visor */}
          <rect
            x="44"
            y="38"
            width="60"
            height="54"
            rx="25"
            fill={`url(#${bodyGradId})`}
          />
          <rect
            x="35"
            y="55"
            width="11"
            height="21"
            rx="5.5"
            fill={`url(#${goldGradId})`}
            stroke="#FFFFFF"
            strokeWidth="1.8"
          />
          <rect
            x="102"
            y="55"
            width="11"
            height="21"
            rx="5.5"
            fill={`url(#${goldGradId})`}
            stroke="#FFFFFF"
            strokeWidth="1.8"
          />

          <g className="rs-rumi-eyes">
            <circle cx="63" cy="64" r="4.8" fill="#0F172A" />
            <circle cx="85" cy="64" r="4.8" fill="#0F172A" />
            <circle cx="64.5" cy="62" r="2" fill="#22D3EE" />
            <circle cx="86.5" cy="62" r="2" fill="#22D3EE" />
          </g>
          <path
            d="M66 75 Q74 82 82 75"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Right Commanding Wave */}
          <g className="rs-rumi-arm">
            <path
              d="M102 98 Q121 90 123 73"
              fill="none"
              stroke="#4F39F6"
              strokeWidth="7"
              strokeLinecap="round"
            />
            <circle cx="123" cy="72" r="5" fill={`url(#${goldGradId})`} />
          </g>
        </g>
      )}

      {/* STAGE 5: SUPERIOR RUMI (Ascended Golden Wings + Sacred Halo + Diamond Crown) */}
      {!isAdminSuperior && stage === 5 && (
        <g className="rs-rumi-character">
          {/* Sacred Cosmic Halo Behind Head */}
          <g className="rs-rumi-halo" style={{ transformOrigin: "74px 63px" }}>
            <circle
              cx="74"
              cy="63"
              r="42"
              fill="none"
              stroke="#FBBF24"
              strokeWidth="2.5"
              strokeDasharray="10 6"
              strokeOpacity="0.85"
            />
            <circle
              cx="74"
              cy="63"
              r="36"
              fill="none"
              stroke="#22D3EE"
              strokeWidth="1.5"
              strokeDasharray="4 8"
              strokeOpacity="0.7"
            />
            <circle cx="74" cy="21" r="3" fill="#FEF08A" />
            <circle cx="116" cy="63" r="3" fill="#22D3EE" />
            <circle cx="74" cy="105" r="3" fill="#FEF08A" />
            <circle cx="32" cy="63" r="3" fill="#22D3EE" />
          </g>

          {/* Majestic Left & Right Luminous Energy Wings */}
          <g className="rs-rumi-wing-l">
            <path
              d="M46 84 C20 66, 8 76, 12 96 C18 92, 24 94, 18 108 C28 102, 36 104, 46 102 Z"
              fill={`url(#${wingGradId})`}
              fillOpacity="0.92"
              stroke="#FFFFFF"
              strokeWidth="1.5"
            />
            <path
              d="M45 92 C28 84, 20 92, 24 103"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeOpacity="0.8"
            />
          </g>
          <g className="rs-rumi-wing-r">
            <path
              d="M102 84 C128 66, 140 76, 136 96 C130 92, 124 94, 130 108 C120 102, 112 104, 102 102 Z"
              fill={`url(#${wingGradId})`}
              fillOpacity="0.92"
              stroke="#FFFFFF"
              strokeWidth="1.5"
            />
            <path
              d="M103 92 C120 84, 128 92, 124 103"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeOpacity="0.8"
            />
          </g>

          {/* Sovereign Diamond-Gold Crown */}
          <g className="rs-rumi-crown">
            <path
              d="M52 33 L56 17 L66 25 L74 11 L82 25 L92 17 L96 33 Z"
              fill={`url(#${goldGradId})`}
              stroke="#FFFFFF"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <polygon
              points="74,17 78,24 74,30 70,24"
              fill={`url(#${cyanGradId})`}
            />
          </g>

          {/* Ascended Sovereign Armor Torso */}
          <path
            d="M44 86 C38 118, 52 127, 74 127 C96 127, 110 118, 104 86 Z"
            fill={`url(#${bodyGradId})`}
            stroke={`url(#${goldGradId})`}
            strokeWidth="2.5"
          />
          {/* Golden Shoulder Wings/Trim */}
          <path d="M40 88 Q49 81 58 92 L46 97 Z" fill={`url(#${goldGradId})`} />
          <path d="M108 88 Q99 81 90 92 L102 97 Z" fill={`url(#${goldGradId})`} />
          {/* Radiant Core Gem */}
          <polygon
            points="74,95 83,106 74,117 65,106"
            fill={`url(#${cyanGradId})`}
            stroke="#FEF08A"
            strokeWidth="2"
          />

          {/* Ascended Head */}
          <rect
            x="45"
            y="36"
            width="58"
            height="53"
            rx="24"
            fill={`url(#${bodyGradId})`}
            stroke={`url(#${goldGradId})`}
            strokeWidth="2"
          />
          <rect
            x="35"
            y="53"
            width="11"
            height="22"
            rx="5.5"
            fill={`url(#${goldGradId})`}
            stroke="#FFFFFF"
            strokeWidth="1.8"
          />
          <rect
            x="102"
            y="53"
            width="11"
            height="22"
            rx="5.5"
            fill={`url(#${goldGradId})`}
            stroke="#FFFFFF"
            strokeWidth="1.8"
          />

          {/* Luminous Sovereign Eyes */}
          <g className="rs-rumi-eyes">
            <circle cx="63" cy="62" r="5" fill="#0F172A" />
            <circle cx="85" cy="62" r="5" fill="#0F172A" />
            <circle cx="64.6" cy="60.2" r="2.2" fill="#FEF08A" />
            <circle cx="86.6" cy="60.2" r="2.2" fill="#FEF08A" />
          </g>
          <path
            d="M66 73 Q74 80 82 73"
            fill="none"
            stroke="#FEF08A"
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Waving Golden-Gauntlet Hand */}
          <g className="rs-rumi-arm">
            <path
              d="M102 98 Q121 90 124 72"
              fill="none"
              stroke="#6366F1"
              strokeWidth="7"
              strokeLinecap="round"
            />
            <circle
              cx="124"
              cy="71"
              r="5.2"
              fill={`url(#${goldGradId})`}
              stroke="#FFFFFF"
              strokeWidth="1.4"
            />
          </g>
        </g>
      )}

      {/* EXCLUSIVE ADMIN FORM: SUPERIOR ADMIN RUMI (Obsidian-Gold Armor + Hexagonal Mandala + Prismatic Emerald Cyber-Wings + Command Scepter) */}
      {isAdminSuperior && (
        <g className="rs-rumi-character">
          {/* Hexagonal Starlight Command Mandala Halo */}
          <g className="rs-rumi-halo" style={{ transformOrigin: "74px 63px" }}>
            <polygon
              points="74,17 114,40 114,86 74,109 34,86 34,40"
              fill="none"
              stroke="#10B981"
              strokeWidth="2"
              strokeOpacity="0.82"
              strokeLinejoin="round"
            />
            <polygon
              points="74,23 108,43 108,83 74,103 40,83 40,43"
              fill="none"
              stroke="#FBBF24"
              strokeWidth="1.4"
              strokeDasharray="6 4"
              strokeOpacity="0.88"
            />
            <circle cx="74" cy="17" r="3" fill="#34D399" />
            <circle cx="114" cy="40" r="2.6" fill="#FEF08A" />
            <circle cx="114" cy="86" r="3" fill="#34D399" />
            <circle cx="74" cy="109" r="2.6" fill="#FEF08A" />
            <circle cx="34" cy="86" r="3" fill="#34D399" />
            <circle cx="34" cy="40" r="2.6" fill="#FEF08A" />
          </g>

          {/* Royal Crimson-Violet Command Cape */}
          <path
            className="rs-rumi-cape"
            d="M46 84 Q31 106 37 126 Q74 134 111 126 Q117 106 102 84 Z"
            fill={`url(#${adminCapeGradId})`}
            stroke="#FBBF24"
            strokeWidth="1.5"
          />

          {/* Twin Prismatic Emerald-Gold Cyber Wings */}
          <g className="rs-rumi-wing-l">
            <polygon
              points="46,85 11,64 18,86 6,96 24,102 15,113 46,101"
              fill={`url(#${adminPrismWingGradId})`}
              fillOpacity="0.95"
              stroke="#FFFFFF"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
            <line
              x1="44"
              y1="91"
              x2="17"
              y2="78"
              stroke="#FEF08A"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
            <line
              x1="44"
              y1="97"
              x2="18"
              y2="98"
              stroke="#FFFFFF"
              strokeWidth="1.3"
              strokeLinecap="round"
            />
          </g>
          <g className="rs-rumi-wing-r">
            <polygon
              points="102,85 137,64 130,86 142,96 124,102 133,113 102,101"
              fill={`url(#${adminPrismWingGradId})`}
              fillOpacity="0.95"
              stroke="#FFFFFF"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
            <line
              x1="104"
              y1="91"
              x2="131"
              y2="78"
              stroke="#FEF08A"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
            <line
              x1="104"
              y1="97"
              x2="130"
              y2="98"
              stroke="#FFFFFF"
              strokeWidth="1.3"
              strokeLinecap="round"
            />
          </g>

          {/* 5-Point Imperial Studio Crown with Emerald Sovereign Star */}
          <g className="rs-rumi-crown">
            <path
              d="M49 34 L51 18 L61 25 L67 12 L74 22 L81 12 L87 25 L97 18 L99 34 Z"
              fill={`url(#${goldGradId})`}
              stroke="#FFFFFF"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <polygon
              points="74,7 77.5,14 74,20 70.5,14"
              fill={`url(#${adminEmeraldGradId})`}
              stroke="#FFFFFF"
              strokeWidth="1"
            />
            <circle cx="58" cy="28" r="2.1" fill="#F43F5E" />
            <circle cx="90" cy="28" r="2.1" fill="#F43F5E" />
          </g>

          {/* Obsidian-Platinum Sovereign Armor Torso */}
          <path
            d="M44 86 C38 118, 52 127, 74 127 C96 127, 110 118, 104 86 Z"
            fill={`url(#${adminBodyGradId})`}
            stroke={`url(#${goldGradId})`}
            strokeWidth="2.4"
          />
          {/* Imperial Shoulder Epaulettes */}
          <path d="M39 89 Q49 80 59 92 L46 98 Z" fill={`url(#${goldGradId})`} />
          <path d="M109 89 Q99 80 89 92 L102 98 Z" fill={`url(#${goldGradId})`} />
          {/* Emerald Studio Sovereign Core Crest */}
          <polygon
            points="74,94 84,106 74,118 64,106"
            fill={`url(#${adminEmeraldGradId})`}
            stroke="#FEF08A"
            strokeWidth="1.9"
          />
          <polygon points="74,99 78,106 74,113 70,106" fill="#ECFDF5" fillOpacity="0.7" />

          {/* Obsidian Armored Head + Imperial Gold Rim */}
          <rect
            x="45"
            y="36"
            width="58"
            height="53"
            rx="24"
            fill={`url(#${adminBodyGradId})`}
            stroke={`url(#${goldGradId})`}
            strokeWidth="2.2"
          />
          {/* Glowing Emerald Executive HUD Visor */}
          <rect
            x="51"
            y="53"
            width="46"
            height="19"
            rx="9.5"
            fill={`url(#${adminVisorGradId})`}
            stroke="#34D399"
            strokeWidth="1.4"
          />

          {/* Imperial Gold Ear-Comms with Emerald Telemetry LEDs */}
          <rect
            x="35"
            y="52"
            width="11"
            height="23"
            rx="5.5"
            fill={`url(#${goldGradId})`}
            stroke="#FFFFFF"
            strokeWidth="1.6"
          />
          <circle cx="40.5" cy="63.5" r="2.2" fill="#10B981" />
          <rect
            x="102"
            y="52"
            width="11"
            height="23"
            rx="5.5"
            fill={`url(#${goldGradId})`}
            stroke="#FFFFFF"
            strokeWidth="1.6"
          />
          <circle cx="107.5" cy="63.5" r="2.2" fill="#10B981" />

          {/* Luminous Emerald-Gold Studio Eyes & Executive Smile */}
          <g className="rs-rumi-eyes">
            <circle cx="63" cy="62.5" r="4.8" fill="#020617" />
            <circle cx="85" cy="62.5" r="4.8" fill="#020617" />
            <circle cx="64.5" cy="60.6" r="2.1" fill="#34D399" />
            <circle cx="86.5" cy="60.6" r="2.1" fill="#34D399" />
          </g>
          <path
            d="M66 75 Q74 82 82 75"
            fill="none"
            stroke="#FEF08A"
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Floating Holographic Studio Analytics Card (Left) */}
          <g className="rs-rumi-holo">
            <rect
              x="14"
              y="72"
              width="25"
              height="18"
              rx="4"
              fill="#0F172A"
              fillOpacity="0.92"
              stroke="#34D399"
              strokeWidth="1.5"
            />
            <rect x="18" y="82" width="3.5" height="5" rx="1" fill="#34D399" />
            <rect x="23" y="79" width="3.5" height="8" rx="1" fill="#FBBF24" />
            <rect x="28" y="76" width="3.5" height="11" rx="1" fill="#34D399" />
          </g>

          {/* Commanding Right Arm with Glowing Emerald Command Scepter Orb */}
          <g className="rs-rumi-arm">
            <path
              d="M102 98 Q120 90 124 72"
              fill="none"
              stroke="#334155"
              strokeWidth="7"
              strokeLinecap="round"
            />
            <line
              x1="124"
              y1="72"
              x2="127"
              y2="52"
              stroke={`url(#${goldGradId})`}
              strokeWidth="2.8"
              strokeLinecap="round"
            />
            <circle
              className="rs-rumi-orb-glow"
              cx="127"
              cy="47"
              r="7.2"
              fill="#34D399"
              fillOpacity="0.38"
            />
            <circle
              cx="127"
              cy="47"
              r="4.8"
              fill={`url(#${adminEmeraldGradId})`}
              stroke="#FEF08A"
              strokeWidth="1.5"
            />
            <circle
              cx="124"
              cy="71"
              r="4.8"
              fill={`url(#${goldGradId})`}
              stroke="#FFFFFF"
              strokeWidth="1.3"
            />
          </g>
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
