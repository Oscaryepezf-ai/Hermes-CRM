"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Stethoscope, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const plans = [
  {
    id: "STARTER",
    name: "Básico",
    price: 49,
    description: "Para consultorios independientes",
    features: [
      "1 canal (WhatsApp o Facebook Messenger)",
      "Hasta 2 usuarios",
      "Pipeline Kanban con leads ilimitados",
      "Bandeja de entrada",
      "Agenda de citas",
      "Gestión básica de pacientes",
      "Soporte por email",
    ],
    cta: "Elegir Básico",
    popular: false,
  },
  {
    id: "PROFESIONAL",
    name: "Intermedio",
    price: 99,
    description: "Para clínicas en crecimiento",
    features: [
      "Todos los canales (WhatsApp + Facebook + Instagram)",
      "Hasta 5 usuarios",
      "Etiquetas y asignación de conversaciones",
      "Analíticas completas del dashboard",
      "Reportes de conversión por etapa",
      "Soporte por chat",
    ],
    cta: "Elegir Intermedio",
    popular: true,
  },
  {
    id: "CLINICA",
    name: "Elite",
    price: 200,
    description: "Para grupos y cadenas dentales",
    features: [
      "Usuarios ilimitados",
      "Multi-sede",
      "Hermes AI: Captador + Reactivador",
      "Onboarding personalizado",
      "Soporte dedicado prioritario",
      "Acceso anticipado a nuevas funciones",
    ],
    cta: "Elegir Elite",
    popular: false,
  },
];

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null);

  const handleCheckout = async (planId: string) => {
    setLoading(planId);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Stethoscope className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900">DentFlow</span>
          </Link>
          <Link href="/login">
            <Button variant="outline" size="sm">
              Iniciar sesión
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <div className="text-center py-16 px-4">
        <Badge variant="secondary" className="mb-4">
          <Zap className="w-3 h-3 mr-1" />
          14 días de prueba gratuita
        </Badge>
        <h1 className="text-4xl font-bold text-gray-900 mb-3">
          Precios simples y transparentes
        </h1>
        <p className="text-lg text-gray-500 max-w-xl mx-auto">
          Sin contratos. Sin sorpresas. Cancela cuando quieras.
          Todos los planes incluyen onboarding gratuito.
        </p>
      </div>

      {/* Plans */}
      <div className="max-w-5xl mx-auto px-4 pb-20">
        <div className="grid grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={cn(
                "bg-white rounded-2xl border p-6 flex flex-col",
                plan.popular
                  ? "border-indigo-500 shadow-lg shadow-indigo-100 relative"
                  : "border-gray-100 shadow-sm"
              )}
            >
              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <Badge className="bg-indigo-600 text-white hover:bg-indigo-600 px-3">
                    Más popular
                  </Badge>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                <p className="text-sm text-gray-500 mt-1">{plan.description}</p>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-gray-900">
                    ${plan.price}
                  </span>
                  <span className="text-gray-500 text-sm">/mes USD</span>
                </div>
              </div>

              <ul className="space-y-2.5 flex-1 mb-6">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span className="text-sm text-gray-600">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                onClick={() => handleCheckout(plan.id)}
                disabled={loading === plan.id}
                className={cn(
                  "w-full",
                  plan.popular
                    ? "bg-indigo-600 hover:bg-indigo-700"
                    : "bg-gray-900 hover:bg-gray-800"
                )}
              >
                {loading === plan.id ? "Redirigiendo..." : plan.cta}
              </Button>
            </div>
          ))}
        </div>

        {/* FAQ / Trust signals */}
        <div className="mt-12 text-center">
          <p className="text-sm text-gray-500">
            ¿Preguntas?{" "}
            <a href="mailto:hola@dentflow.app" className="text-indigo-600 hover:underline">
              Escríbenos a hola@dentflow.app
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
