"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type AgentStatus = "active" | "beta" | "coming_soon";

export interface AgentConfig {
  id: string;
  name: string;
  tagline: string;
  description: string;
  icon: LucideIcon;
  gradient: string;         // Tailwind gradient classes for avatar bg
  accentColor: string;      // Tailwind text-* for active accents
  borderColor: string;      // Tailwind border-* for selected state
  status: AgentStatus;
  stats?: { label: string; value: string }[];
  ctaLabel: string;
  href?: string;            // If set, CTA in detail panel links here instead of a button
}

interface AgentBubbleProps {
  agent: AgentConfig;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

const STATUS_CONFIG: Record<
  AgentStatus,
  { label: string; className: string }
> = {
  active:      { label: "Activo",        className: "bg-emerald-100 text-emerald-700" },
  beta:        { label: "Beta",          className: "bg-amber-100 text-amber-700" },
  coming_soon: { label: "Próximamente",  className: "bg-slate-100 text-slate-500" },
};

export function AgentBubble({ agent, isSelected, onSelect }: AgentBubbleProps) {
  const [hovered, setHovered] = useState(false);
  const Icon = agent.icon;
  const status = STATUS_CONFIG[agent.status];

  return (
    <button
      onClick={() => onSelect(agent.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        "group relative flex flex-col items-center text-center p-6 rounded-2xl border bg-medical-card",
        "transition-all duration-200 cursor-pointer w-full",
        "hover:shadow-lg hover:-translate-y-1",
        isSelected
          ? cn("shadow-lg -translate-y-1 border-2", agent.borderColor)
          : "border-medical-border shadow-sm"
      )}
    >
      {/* Animated glow ring when selected */}
      {isSelected && (
        <span
          className={cn(
            "absolute inset-0 rounded-2xl opacity-10 pointer-events-none",
            agent.gradient
          )}
        />
      )}

      {/* Avatar bubble */}
      <div className="relative mb-4">
        <div
          className={cn(
            "w-20 h-20 rounded-full flex items-center justify-center",
            "transition-transform duration-200",
            agent.gradient,
            hovered || isSelected ? "scale-110" : "scale-100"
          )}
        >
          <Icon className="w-9 h-9 text-white" strokeWidth={1.5} />
        </div>

        {/* Sparkle badge for active agents */}
        {agent.status === "active" && (
          <span className="absolute -top-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-sm border border-medical-border">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          </span>
        )}
      </div>

      {/* Status pill */}
      <span
        className={cn(
          "text-[10px] font-semibold px-2 py-0.5 rounded-full mb-2",
          status.className
        )}
      >
        {status.label}
      </span>

      {/* Name */}
      <h3 className="text-base font-bold text-gray-900 leading-tight mb-1">
        {agent.name}
      </h3>

      {/* Tagline */}
      <p className={cn("text-xs font-medium mb-2", agent.accentColor)}>
        {agent.tagline}
      </p>

      {/* Description */}
      <p className="text-xs text-gray-500 leading-relaxed mb-4">
        {agent.description}
      </p>

      {/* Stats */}
      {agent.stats && (
        <div className="flex gap-4 mb-4 w-full justify-center">
          {agent.stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className={cn("text-lg font-bold", agent.accentColor)}>
                {stat.value}
              </p>
              <p className="text-[10px] text-gray-400">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* CTA */}
      <div
        className={cn(
          "w-full py-2 px-4 rounded-xl text-xs font-semibold transition-colors duration-150",
          agent.status === "coming_soon"
            ? "bg-slate-100 text-slate-400 cursor-not-allowed"
            : isSelected
            ? cn("text-white", agent.gradient)
            : "bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100"
        )}
      >
        {agent.ctaLabel}
      </div>
    </button>
  );
}
