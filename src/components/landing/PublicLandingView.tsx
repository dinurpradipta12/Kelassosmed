"use client";

import React, { useState } from "react";
import { ArrowRight, LogIn } from "lucide-react";
import type {
  LandingBlock,
  LandingPageData,
  PricingTierItem,
} from "@/types/landing";
import {
  DEFAULT_HEADER_CONFIG,
  DEFAULT_PAYMENT_CONFIG,
  DEFAULT_FOOTER_CONFIG,
} from "@/types/landing";
import { LandingBlockRenderer } from "./LandingBlockRenderer";
import {
  PaymentCheckoutModal,
  type CheckoutItem,
} from "./PaymentCheckoutModal";

interface PublicLandingViewProps {
  blocks?: LandingBlock[];
  config?: LandingPageData;
  onOpenAuth: (initialTab?: "login" | "register") => void;
  onEnterDevMode?: () => void;
}

export function PublicLandingView({
  blocks,
  config,
  onOpenAuth,
  onEnterDevMode,
}: PublicLandingViewProps) {
  const [checkoutItem, setCheckoutItem] = useState<
    CheckoutItem | PricingTierItem | null
  >(null);

  const activeBlocks =
    config?.blocks && config.blocks.length > 0 ? config.blocks : blocks || [];

  const headerCfg = {
    ...DEFAULT_HEADER_CONFIG,
    ...(config?.headerConfig || {}),
  };
  const paymentCfg = {
    ...DEFAULT_PAYMENT_CONFIG,
    ...(config?.paymentConfig || {}),
  };
  const footerCfg = {
    ...DEFAULT_FOOTER_CONFIG,
    ...(config?.footerConfig || {}),
  };

  const primaryColor = headerCfg.primaryButtonColor || "#4F39F6";

  const handleActionClick = (action: string) => {
    if (action === "scroll_payment") {
      const target =
        document.getElementById("payment-section") ||
        document.getElementById("pricing-section");
      if (target) {
        target.scrollIntoView({ behavior: "smooth" });
        return;
      }
    }
    if (action === "upgrade" || action === "register") {
      onOpenAuth("register");
    } else {
      onOpenAuth("login");
    }
  };

  return (
    <div
      className="min-h-screen bg-[#FFFFFF] text-[#121215] flex flex-col justify-between"
      style={{ ["--accent-color" as any]: primaryColor }}
    >
      {/* Top Floating Notification / Announcement Bar */}
      {headerCfg.showAnnouncement !== false && (
        <div
          className="text-white text-[11px] py-2 px-4 text-center flex items-center justify-center gap-2"
          style={{ backgroundColor: headerCfg.announcementBgColor || "#121215" }}
        >
          <span
            className="inline-flex items-center gap-1.5 font-semibold"
            style={{
              color: headerCfg.announcementBadgeColor || "#10B981",
            }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full animate-pulse"
              style={{
                backgroundColor: headerCfg.announcementBadgeColor || "#10B981",
              }}
            />
            {headerCfg.announcementBadge || "Pendaftaran Batch 2026 Dibuka"}
          </span>
          {headerCfg.announcementText && (
            <>
              <span className="text-white/60 hidden sm:inline">•</span>
              <span className="text-white/80 hidden sm:inline">
                {headerCfg.announcementText}
              </span>
            </>
          )}
        </div>
      )}

      {/* Main Sticky Landing Header */}
      {headerCfg.showNavbar !== false && (
        <header
          className="sticky top-0 z-40 w-full backdrop-blur-md bg-white/95 border-b border-[#EAECEF] transition-colors"
          style={
            headerCfg.navbarBgColor &&
            headerCfg.navbarBgColor.toUpperCase() !== "#FFFFFF"
              ? { backgroundColor: `${headerCfg.navbarBgColor}EB` }
              : undefined
          }
        >
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
            {/* Left Logo / Brand */}
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src={headerCfg.logoUrl || "/logo1.png"}
                alt={headerCfg.brandTitle || "Ruang Sosmed 2.0"}
                className="h-9 w-auto max-w-[150px] rounded-lg object-contain shrink-0"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/favicon.png";
                }}
              />
              {headerCfg.brandTitle && (
                <span className="hidden sm:block text-sm font-bold tracking-tight text-[#121215] truncate">
                  {headerCfg.brandTitle}
                </span>
              )}
            </div>

            {/* Center Navigation Links (Hidden on small mobile) */}
            <nav
              aria-label="Landing Page Navigation"
              className="hidden md:flex items-center gap-6 text-xs font-semibold text-[#5E5E5E]"
            >
              {(headerCfg.navLinks || []).map((link) => (
                <a
                  key={link.id}
                  href={link.href || "#"}
                  className="hover:text-[#121215] transition-colors whitespace-nowrap"
                >
                  {link.label}
                </a>
              ))}
            </nav>

            {/* Right Auth Buttons */}
            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => onOpenAuth("login")}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold text-[#121215] hover:bg-[#F8F9FB] border border-[#EAECEF] hover:border-[#D1D5DB] transition-all cursor-pointer"
              >
                <LogIn size={13} />
                <span>{headerCfg.loginLabel || "Masuk"}</span>
              </button>

              <button
                type="button"
                onClick={() => onOpenAuth("register")}
                className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold text-white shadow-sm hover:opacity-95 transition-all cursor-pointer"
                style={{ backgroundColor: primaryColor }}
              >
                <span>{headerCfg.registerLabel || "Daftar Akun"}</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </header>
      )}

      {/* Optional Global Header Cover Visual (if set in General Settings) */}
      {config?.headerImageUrl && (
        <div className="w-full border-b border-[#EAECEF] bg-slate-50">
          <div className="max-w-6xl mx-auto">
            <img
              src={config.headerImageUrl}
              alt={config.title || "Header Visual"}
              className="w-full max-h-[340px] object-cover"
            />
          </div>
        </div>
      )}

      {/* Render Dynamic Landing Blocks */}
      <main className="flex-1">
        {activeBlocks.map((block) => (
          <LandingBlockRenderer
            key={block.id}
            block={block}
            primaryColor={primaryColor}
            onSelectPackage={(item) => setCheckoutItem(item)}
            onActionClick={handleActionClick}
          />
        ))}
      </main>

      {/* Dynamic Footer */}
      {footerCfg.showFooter !== false && (
        <footer
          className="py-12 border-t border-white/10"
          style={{
            backgroundColor: footerCfg.bgColor || "#121215",
            color: footerCfg.textColor || "#FFFFFF",
          }}
        >
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-white/10 text-center md:text-left">
              <div className="flex items-center gap-2.5">
                <img
                  src={footerCfg.logoUrl || headerCfg.logoUrl || "/favicon.png"}
                  alt={footerCfg.brandTitle || "Ruang Sosmed 2.0"}
                  className="h-8 w-8 rounded-lg object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/favicon.png";
                  }}
                />
                <span className="text-sm font-bold tracking-tight">
                  {footerCfg.brandTitle || "Ruang Sosmed 2.0"}
                </span>
              </div>

              <p className="text-xs opacity-65 max-w-md">
                {footerCfg.description ||
                  "Platform LMS & Social Media Studio terintegrasi untuk akselerasi kemampuan praktis digital marketing."}
              </p>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => onOpenAuth("login")}
                  className="inline-flex items-center gap-1 text-xs opacity-80 hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <span>Masuk Akun</span>
                </button>
                {onEnterDevMode && (
                  <button
                    type="button"
                    onClick={onEnterDevMode}
                    className="text-[11px] opacity-30 hover:opacity-70 transition-opacity cursor-pointer"
                    title="Developer Studio Preview"
                  >
                    Studio
                  </button>
                )}
              </div>
            </div>

            <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] opacity-50">
              <p>
                © {new Date().getFullYear()}{" "}
                {footerCfg.copyrightText ||
                  `${footerCfg.brandTitle || "Ruang Sosmed 2.0"}. All rights reserved.`}
              </p>
              <p>Built with Next.js &amp; Supabase</p>
            </div>
          </div>
        </footer>
      )}

      {/* Checkout / Payment Popup Modal (QRIS & Bank Transfer) */}
      <PaymentCheckoutModal
        open={Boolean(checkoutItem)}
        item={checkoutItem}
        paymentConfig={paymentCfg}
        onClose={() => setCheckoutItem(null)}
        onProceedAuth={(mode) => {
          setCheckoutItem(null);
          onOpenAuth(mode || "register");
        }}
      />
    </div>
  );
}
