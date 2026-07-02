"use client";

import { useState } from "react";
import { Check, Minus, Zap, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

// ─── Plan data ────────────────────────────────────────────────────────────────

type PlanKey = "ESENCIAL" | "PRO" | "MULTISEDE";

const PLAN_CONFIG = {
  ESENCIAL: {
    label:    "Esencial",
    price:    "$99 USD/mes",
    icon:     null,
    features: [
      "Pipeline + Bandeja unificada",
      "Hermes Captador 24/7",
      "Hermes Agendador",
      "Usuarios ilimitados",
      "Soporte por ticket",
    ],
    checkColor: "text-ink-disabled",
    cta:        null,
  },
  PRO: {
    label:    "Pro",
    price:    "$197 USD/mes",
    icon:     "zap" as const,
    features: [
      "Todo lo de Esencial",
      "Hermes Analítico semanal",
      "Dr. Clinic con dictado por voz",
      "Facebook + Instagram DM",
      "Soporte por chat 24h",
    ],
    checkColor: "text-indigo-500",
    cta:        "Agendar demo — Pro",
  },
  MULTISEDE: {
    label:    "Multi-sede",
    price:    "$297 USD/mes",
    sub:      "Red dental o franquicia",
    icon:     "star" as const,
    features: [
      "Todo lo de Pro",
      "Hermes Reactivador automático",
      "Dashboard multi-sede",
      "Reportes por sucursal",
      "Soporte prioritario",
    ],
    checkColor: "text-amber-400",
    cta:        "Contactar para Multi-sede",
  },
} as const;

const PLAN_KEYS: PlanKey[] = ["ESENCIAL", "PRO", "MULTISEDE"];

// ─── Props ────────────────────────────────────────────────────────────────────

interface SettingsViewProps {
  clinicName:  string;
  currentPlan: string;
  apiKeyMasked: string;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PlanCard({
  planKey,
  isActive,
  isDemo,
}: {
  planKey: PlanKey;
  isActive: boolean;
  isDemo?: boolean;
}) {
  const cfg = PLAN_CONFIG[planKey];

  return (
    <div className={cn(
      "relative flex flex-col rounded-2xl border bg-surface p-5 transition-shadow",
      isActive
        ? "border-line-soft shadow-sm"
        : "border-line-subtle shadow-sm hover:shadow-md"
    )}>
      {/* Active badge */}
      {isActive && (
        <span className="absolute top-4 right-4 bg-emerald-50 text-emerald-600 text-[11px] font-semibold px-2 py-0.5 rounded-full border border-emerald-200">
          Activo
        </span>
      )}

      {/* Title row */}
      <div className="flex items-center gap-1.5 mb-1">
        <h3 className="text-base font-semibold text-ink-primary">{cfg.label}</h3>
        {cfg.icon === "zap"  && <Zap  className="w-3.5 h-3.5 text-indigo-400 fill-indigo-100" />}
        {cfg.icon === "star" && <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-100" />}
      </div>

      {/* Price */}
      <p className="text-sm text-ink-tertiary mb-0.5">{cfg.price}</p>
      {"sub" in cfg && cfg.sub && (
        <p className="text-xs text-ink-tertiary mb-3">{cfg.sub}</p>
      )}
      {!("sub" in cfg && cfg.sub) && <div className="mb-3" />}

      {/* Features */}
      <ul className="space-y-2 flex-1">
        {cfg.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-ink-secondary">
            <Check className={cn("w-4 h-4 flex-shrink-0 mt-0.5", cfg.checkColor)} />
            {f}
          </li>
        ))}
      </ul>

      {/* CTA */}
      {cfg.cta && (
        <button
          className={cn(
            "mt-5 w-full py-2 rounded-xl text-sm font-medium transition-colors",
            planKey === "MULTISEDE"
              ? "border border-line-soft text-ink-secondary hover:bg-canvas"
              : "bg-indigo-600 text-white hover:bg-indigo-700"
          )}
        >
          {cfg.cta}
        </button>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function SettingsView({ clinicName, currentPlan, apiKeyMasked }: SettingsViewProps) {
  const [tab, setTab] = useState<"subscription" | "security">("subscription");

  const plan = (PLAN_KEYS.includes(currentPlan as PlanKey)
    ? currentPlan
    : "ESENCIAL") as PlanKey;

  return (
    <div className="max-w-4xl space-y-6">
      {/* Page title */}
      <h1 className="text-xl font-bold text-ink-primary">Ajustes</h1>

      {/* Tabs */}
      <div className="flex items-center gap-6 border-b border-line-subtle">
        {(["subscription", "security"] as const).map((t) => {
          const label = t === "subscription" ? "Plan de suscripción" : "Seguridad";
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "pb-2.5 text-sm font-medium transition-colors",
                tab === t
                  ? "text-indigo-600 border-b-2 border-indigo-600 -mb-px"
                  : "text-ink-tertiary hover:text-ink-secondary"
              )}
            >
              {label}
            </button>
          );
        })}
      </div>

      {tab === "subscription" && (
        <>
          {/* Plan selector pills + demo label */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-inset rounded-lg p-1">
              {PLAN_KEYS.map((k) => (
                <span
                  key={k}
                  className={cn(
                    "px-3 py-1 rounded-md text-sm font-medium transition-colors",
                    k === plan
                      ? "bg-surface text-ink-primary shadow-sm"
                      : "text-ink-tertiary"
                  )}
                >
                  {PLAN_CONFIG[k].label}
                </span>
              ))}
            </div>
            <span className="text-sm text-ink-tertiary">
              Demo activo: <span className="font-medium text-ink-secondary">{PLAN_CONFIG[plan].label}</span>
            </span>
          </div>

          {/* Plan cards */}
          <div className="grid grid-cols-3 gap-4">
            {PLAN_KEYS.map((k) => (
              <PlanCard key={k} planKey={k} isActive={k === plan} />
            ))}
          </div>

          {/* Clinic config */}
          <div>
            <h2 className="text-sm font-semibold text-ink-secondary mb-3">
              Configuración del consultorio
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-line-subtle bg-surface p-4 shadow-sm">
                <p className="text-xs text-ink-tertiary mb-1.5">Consultorio</p>
                <p className="font-mono text-sm font-medium text-ink-primary">{clinicName}</p>
                <p className="text-[11px] text-ink-disabled mt-1 uppercase tracking-wide">
                  CLINIC_NAME
                </p>
              </div>
              <div className="rounded-xl border border-line-subtle bg-surface p-4 shadow-sm">
                <p className="text-xs text-ink-tertiary mb-1.5">API Key OpenAI</p>
                <p className="font-mono text-sm text-ink-secondary tracking-widest">
                  {apiKeyMasked}
                </p>
                <p className="text-[11px] text-ink-disabled mt-1 uppercase tracking-wide">
                  OPENAI_API_KEY
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {tab === "security" && (
        <div className="rounded-2xl border border-line-subtle bg-surface p-6 shadow-sm">
          <p className="text-sm text-ink-tertiary text-center py-8">
            Opciones de seguridad próximamente disponibles.
          </p>
        </div>
      )}
    </div>
  );
}
