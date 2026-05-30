"use client";

import { cn } from "@/lib/utils";

type NmButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "icon";

interface NmButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: NmButtonVariant;
  size?: "sm" | "md" | "lg";
}

const VARIANT_CLASSES: Record<NmButtonVariant, string> = {
  primary:
    "bg-nm-blue text-white shadow-nm-btn-blue hover:brightness-105 active:shadow-nm-btn-press active:scale-[0.98]",
  secondary:
    "bg-nm-base text-nm-text-primary shadow-nm-card hover:shadow-nm-card-hover active:shadow-nm-inset active:scale-[0.98]",
  ghost:
    "text-nm-text-secondary hover:bg-nm-surface hover:text-nm-text-primary rounded-nm-md",
  danger:
    "bg-nm-red-soft text-nm-red-dark shadow-nm-card hover:brightness-95 active:scale-[0.98]",
  icon:
    "w-9 h-9 bg-nm-base shadow-nm-card hover:shadow-nm-card-hover active:shadow-nm-inset flex items-center justify-center rounded-nm-md",
};

const SIZE_CLASSES = {
  sm: "px-3 py-1.5 text-nm-xs",
  md: "px-5 py-2.5 text-nm-sm",
  lg: "px-6 py-3 text-nm-base",
};

export function NmButton({
  children,
  className,
  variant = "secondary",
  size = "md",
  disabled,
  ...props
}: NmButtonProps) {
  return (
    <button
      className={cn(
        "font-medium rounded-nm-md transition-all duration-150",
        "inline-flex items-center gap-2 justify-center",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none",
        variant !== "icon" && SIZE_CLASSES[size],
        VARIANT_CLASSES[variant],
        className
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
