"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import { Stethoscope, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { requestPhoneVerification, completeRegistration } from "@/lib/actions/registration"

const COUNTRIES: { name: string; code: string; dial: string }[] = [
  { name: "Ecuador",   code: "EC", dial: "+593" },
  { name: "Colombia",  code: "CO", dial: "+57" },
  { name: "Perú",      code: "PE", dial: "+51" },
  { name: "México",    code: "MX", dial: "+52" },
  { name: "Chile",     code: "CL", dial: "+56" },
  { name: "Argentina", code: "AR", dial: "+54" },
]

type Step = "form" | "otp"

export function WhatsAppRegisterFlow() {
  const router = useRouter()
  const [step, setStep] = useState<Step>("form")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const [country, setCountry] = useState(COUNTRIES[0])
  const [form, setForm] = useState({ name: "", lastName: "", email: "", localPhone: "" })
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""))
  const [password, setPassword] = useState("")
  const inputsRef = useRef<(HTMLInputElement | null)[]>([])

  const fullPhone = `${country.dial}${form.localPhone.replace(/\D/g, "")}`

  async function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    const res = await requestPhoneVerification({ phone: fullPhone })
    setLoading(false)
    if (!res.success) { setError(res.error ?? "No se pudo enviar el código"); return }
    setStep("otp")
  }

  function handleDigitChange(i: number, value: string) {
    const v = value.replace(/\D/g, "").slice(0, 1)
    setDigits((prev) => {
      const next = [...prev]
      next[i] = v
      return next
    })
    if (v && i < 5) inputsRef.current[i + 1]?.focus()
  }

  async function handleVerifyAndCreate(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    const code = digits.join("")
    if (code.length !== 6) { setError("Ingresa los 6 dígitos del código"); return }
    if (password.length < 8) { setError("La contraseña debe tener al menos 8 caracteres"); return }

    setLoading(true)
    const res = await completeRegistration({
      name:     form.name,
      lastName: form.lastName,
      country:  country.code,
      phone:    fullPhone,
      email:    form.email,
      code,
      password,
    })

    if (!res.success) {
      setLoading(false)
      setError(res.error ?? "No se pudo completar el registro")
      return
    }

    await signIn("credentials", { email: form.email, password, redirect: false })
    router.push("/wizard")
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
            <Stethoscope className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-gray-900 text-2xl">Hermes CRM</span>
        </div>

        <Card className="shadow-sm border-gray-100">
          {step === "form" ? (
            <>
              <CardHeader className="pb-2 pt-6 px-6">
                <h1 className="text-xl font-bold text-gray-900">¡Personalicemos tu cuenta Hermes!</h1>
                <p className="text-sm text-gray-500">Comienza tu prueba gratuita de 14 días</p>
              </CardHeader>
              <CardContent className="px-6 pb-6">
                <form onSubmit={handleRequestOtp} className="space-y-4 mt-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="name">Nombre *</Label>
                    <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="lastName">Apellidos *</Label>
                    <Input id="lastName" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email *</Label>
                    <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="dr@miClinica.co" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="country">País *</Label>
                    <select
                      id="country"
                      value={country.code}
                      onChange={(e) => setCountry(COUNTRIES.find((c) => c.code === e.target.value) ?? COUNTRIES[0])}
                      className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm outline-none"
                    >
                      {COUNTRIES.map((c) => (
                        <option key={c.code} value={c.code}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="phone">Te enviaremos un código por WhatsApp *</Label>
                    <div className="flex gap-2">
                      <span className="flex items-center px-3 h-9 rounded-md border border-input bg-muted text-sm text-gray-600">
                        {country.dial}
                      </span>
                      <Input
                        id="phone"
                        value={form.localPhone}
                        onChange={(e) => setForm({ ...form, localPhone: e.target.value })}
                        placeholder="987654321"
                        required
                        className="flex-1"
                      />
                    </div>
                  </div>

                  {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

                  <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700" disabled={loading}>
                    {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Continuar
                  </Button>
                </form>
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader className="pb-2 pt-6 px-6">
                <h1 className="text-xl font-bold text-gray-900">Revisa tu WhatsApp</h1>
                <p className="text-sm text-gray-500">Enviamos un código a {country.dial} {form.localPhone}</p>
              </CardHeader>
              <CardContent className="px-6 pb-6">
                <form onSubmit={handleVerifyAndCreate} className="space-y-4 mt-2">
                  <div className="flex justify-between gap-2">
                    {digits.map((d, i) => (
                      <input
                        key={i}
                        ref={(el) => { inputsRef.current[i] = el }}
                        value={d}
                        onChange={(e) => handleDigitChange(i, e.target.value)}
                        inputMode="numeric"
                        maxLength={1}
                        className="w-10 h-12 text-center text-lg font-semibold rounded-md border border-input outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
                      />
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => setStep("form")}
                    className="text-xs text-indigo-600 hover:underline"
                  >
                    ¿Número equivocado? Volver
                  </button>

                  <div className="space-y-1.5">
                    <Label htmlFor="password">Crea una contraseña *</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mínimo 8 caracteres"
                      minLength={8}
                      required
                    />
                  </div>

                  {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

                  <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700" disabled={loading}>
                    {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Verificar y continuar
                  </Button>
                </form>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
