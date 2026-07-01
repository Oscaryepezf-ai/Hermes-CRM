"use client"

import { useState } from "react"
import Link from "next/link"
import { Check, Star, Stethoscope } from "lucide-react"
import { cn } from "@/lib/utils"

type Period = "monthly" | "3m" | "6m" | "annual"

const PERIODS: { key: Period; label: string; badge?: string }[] = [
  { key: "monthly", label: "Mensual" },
  { key: "3m",      label: "3 meses",  badge: "-5%"          },
  { key: "6m",      label: "6 meses",  badge: "-10%"         },
  { key: "annual",  label: "Anual",    badge: "2 meses gratis" },
]

const PLANS = [
  {
    id: "esencial",
    name: "Esencial",
    tagline: "Clínica de 1 sede",
    monthlyPrice: 99,
    isPopular: false,
    implementationFee: 1000,
    implementationBeta: null as number | null,
    features: [
      "Pipeline + Bandeja unificada",
      "Hermes Captador 24/7",
      "Hermes Agendador",
      "Usuarios ilimitados",
      "Soporte por ticket",
    ],
    ctaText: "Agendar demo — Esencial",
    ctaHref: "mailto:hola@hermescrm.app?subject=Demo Esencial",
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "Clínica con redes sociales activas",
    monthlyPrice: 197,
    isPopular: true,
    implementationFee: 1000,
    implementationBeta: 700 as number | null,
    features: [
      "Todo lo de Esencial",
      "Hermes Analítico semanal",
      "Dr. Clinic con dictado por voz",
      "Facebook + Instagram DM",
      "Soporte por chat 24h",
    ],
    ctaText: "Agendar demo — Pro",
    ctaHref: "mailto:hola@hermescrm.app?subject=Demo Pro",
  },
  {
    id: "multisede",
    name: "Multi-sede",
    tagline: "Red dental o franquicia",
    monthlyPrice: 297,
    isPopular: false,
    implementationFee: 1000,
    implementationBeta: null as number | null,
    features: [
      "Todo lo de Pro",
      "Hermes Reactivador automático",
      "Dashboard multi-sede",
      "Reportes por sucursal",
      "Soporte prioritario",
    ],
    ctaText: "Agendar demo — Multi-sede",
    ctaHref: "mailto:hola@hermescrm.app?subject=Demo Multi-sede",
  },
]

function calcPrice(base: number, period: Period) {
  if (period === "monthly") return { perMonth: base, total: base, savings: 0, months: 1 }
  if (period === "3m") {
    const perMonth = Math.round(base * 0.95)
    return { perMonth, total: perMonth * 3, savings: base * 3 - perMonth * 3, months: 3 }
  }
  if (period === "6m") {
    const perMonth = Math.round(base * 0.9)
    return { perMonth, total: perMonth * 6, savings: base * 6 - perMonth * 6, months: 6 }
  }
  // annual: paga 10 meses, obtiene 12
  const total = base * 10
  const perMonth = Math.round(total / 12)
  return { perMonth, total, savings: base * 2, months: 12 }
}

export default function PricingPage() {
  const [period, setPeriod] = useState<Period>("monthly")

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Stethoscope className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900">Hermes CRM</span>
          </Link>
          <Link
            href="/login"
            className="text-sm font-medium text-gray-700 border border-gray-200 rounded-lg px-4 py-2 hover:bg-gray-50 transition-colors"
          >
            Iniciar sesión
          </Link>
        </div>
      </header>

      {/* Hero */}
      <div className="text-center py-14 px-4">
        <h1 className="text-4xl font-bold text-gray-900 mb-3">
          Un plan para cada etapa de tu clínica
        </h1>
        <p className="text-lg text-gray-500 max-w-xl mx-auto mb-8">
          Sin contratos. Sin sorpresas. Cancela cuando quieras.
        </p>

        {/* Period toggle */}
        <div className="inline-flex items-center gap-1 bg-white border border-gray-200 rounded-full px-1.5 py-1.5 shadow-sm">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
                period === p.key
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              {p.label}
              {p.badge && (
                <span className={cn(
                  "text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none",
                  period === p.key
                    ? "bg-white/20 text-white"
                    : p.key === "annual"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-indigo-100 text-indigo-700"
                )}>
                  {p.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Plans */}
      <div className="max-w-5xl mx-auto px-4 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map((plan) => {
            const { perMonth, total, savings } = calcPrice(plan.monthlyPrice, period)
            const isMultiPeriod = period !== "monthly"

            return (
              <div
                key={plan.id}
                className={cn(
                  "bg-white rounded-2xl border flex flex-col overflow-hidden",
                  plan.isPopular
                    ? "border-indigo-400 shadow-xl shadow-indigo-100 ring-1 ring-indigo-400"
                    : "border-gray-200 shadow-sm"
                )}
              >
                {/* Popular badge */}
                {plan.isPopular && (
                  <div className="flex items-center justify-center gap-1.5 bg-gray-50 border-b border-indigo-100 px-4 py-2">
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    <span className="text-xs font-bold text-gray-700">Más vendido</span>
                  </div>
                )}

                <div className="p-6 flex-1 flex flex-col">
                  {/* Name + tagline */}
                  <div className="mb-5">
                    <h3 className="text-2xl font-bold text-gray-900 mb-0.5">{plan.name}</h3>
                    <p className="text-sm text-gray-500">{plan.tagline}</p>
                  </div>

                  {/* Price */}
                  <div className="mb-1">
                    <div className="flex items-end gap-1">
                      <span className="text-4xl font-bold text-gray-900">${perMonth}</span>
                      <span className="text-gray-400 text-sm mb-1.5">/mes</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {isMultiPeriod
                        ? `facturado ${period === "annual" ? "anualmente" : `cada ${period === "3m" ? "3" : "6"} meses`} · total $${total.toLocaleString()}`
                        : "facturado mensualmente"}
                    </p>
                  </div>

                  {/* Savings badge */}
                  {savings > 0 && (
                    <div className="mt-2 mb-3">
                      <span className="inline-block text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-0.5">
                        Ahorras ${savings}
                      </span>
                    </div>
                  )}

                  <div className="border-t border-gray-100 my-4" />

                  {/* Implementation block */}
                  <div className="bg-gray-50 rounded-xl px-4 py-3 mb-5">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-0.5">
                      Implementación (único)
                    </p>
                    <p className="text-xl font-bold text-gray-900">
                      ${plan.implementationFee.toLocaleString()}
                    </p>
                    {plan.implementationBeta && (
                      <p className="text-xs font-semibold text-indigo-600 mt-0.5">
                        Beta: ${plan.implementationBeta.toLocaleString()} (30% off)
                      </p>
                    )}
                  </div>

                  {/* Features */}
                  <ul className="flex flex-col gap-2.5 flex-1 mb-8">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5">
                        <Check className="w-4 h-4 mt-0.5 shrink-0 text-emerald-500" />
                        <span className="text-sm text-gray-700 leading-snug">{f}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <a
                    href={plan.ctaHref}
                    className={cn(
                      "w-full text-center font-semibold text-sm py-3 px-4 rounded-xl transition-colors duration-150",
                      plan.isPopular
                        ? "bg-indigo-600 hover:bg-indigo-500 text-white"
                        : "bg-white hover:bg-gray-50 text-gray-900 border border-gray-200"
                    )}
                  >
                    {plan.ctaText}
                  </a>
                </div>
              </div>
            )
          })}
        </div>

        <p className="text-center text-xs text-gray-400 mt-8">
          Precio en USD · Sin permanencia · Cancela cuando quieras
        </p>
      </div>
    </div>
  )
}
