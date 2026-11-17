"use client";

import React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padded?: boolean;
}

export function Card({
  children,
  className = "",
  padded = false,
  ...props
}: CardProps) {
  return (
    <div
      className={`rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] shadow-[0_2px_10px_rgba(16,15,17,0.04)] transition-colors ${
        padded ? "p-5" : ""
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export type SaasButtonVariant =
  | "primary"
  | "secondary"
  | "green"
  | "yellow"
  | "danger"
  | "ghost";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: SaasButtonVariant;
  size?: "sm" | "md" | "lg";
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  type = "button",
  ...props
}: ButtonProps) {
  const variantClasses: Record<SaasButtonVariant, string> = {
    primary:
      "bg-[var(--accent)] hover:bg-[var(--accent-strong)] text-white border border-transparent shadow-xs",
    secondary:
      "bg-[var(--surface-soft)] hover:bg-[var(--surface-muted)] text-[var(--text)] border border-[var(--border)]",
    green:
      "bg-[#10B981] hover:bg-[#059669] text-white border border-transparent shadow-xs",
    yellow:
      "bg-[#F59E0B] hover:bg-[#D97706] text-white border border-transparent shadow-xs",
    danger:
      "bg-[var(--danger-soft)] hover:bg-[#FEE2E2] text-[var(--danger-text)] border border-[var(--danger-text)]/20",
    ghost:
      "bg-transparent hover:bg-[var(--surface-muted)] text-[var(--muted)] hover:text-[var(--text)] border border-transparent",
  };

  const sizeClasses: Record<"sm" | "md" | "lg", string> = {
    sm: "px-2.5 py-1.5 text-xs rounded-xl",
    md: "px-3.5 py-2 text-xs rounded-xl",
    lg: "px-4 py-2.5 text-sm rounded-xl",
  };

  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-1.5 font-semibold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Input({
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full rounded-xl bg-[var(--surface-soft)] px-3.5 py-2 text-xs text-[var(--text)] placeholder:text-[var(--muted)] border border-[var(--border)] focus:border-[var(--accent)] focus:bg-[var(--surface)] focus:outline-none transition-all ${className}`}
      {...props}
    />
  );
}

export function Textarea({
  className = "",
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`w-full rounded-xl bg-[var(--surface-soft)] px-3.5 py-2.5 text-xs text-[var(--text)] placeholder:text-[var(--muted)] border border-[var(--border)] focus:border-[var(--accent)] focus:bg-[var(--surface)] focus:outline-none transition-all ${className}`}
      {...props}
    />
  );
}

export type SaasBadgeVariant =
  | "default"
  | "accent"
  | "success"
  | "danger"
  | "warning";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: SaasBadgeVariant;
}

export function Badge({
  children,
  variant = "default",
  className = "",
  ...props
}: BadgeProps) {
  const styles: Record<SaasBadgeVariant, string> = {
    default:
      "bg-[var(--surface-muted)] text-[var(--muted)] border border-[var(--border)]",
    accent:
      "bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent)]/25",
    success:
      "bg-[var(--success-soft)] text-[var(--success-text)] border border-[var(--success-text)]/25",
    danger:
      "bg-[var(--danger-soft)] text-[var(--danger-text)] border border-[var(--danger-text)]/25",
    warning:
      "bg-[#FEF3C7] text-[#B45309] border border-[#F59E0B]/30",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-semibold ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
