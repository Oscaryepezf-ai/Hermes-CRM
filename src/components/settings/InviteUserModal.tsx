"use client"

import { useState } from "react"
import { X, UserPlus } from "lucide-react"
import { toast } from "sonner"
import { inviteUser } from "@/lib/actions/users"
import { ROLE_LABELS, ROLE_DESCRIPTIONS } from "@/types/rbac"
import type { UserRole } from "@prisma/client"

const ROLES: UserRole[] = ["ADMIN", "DOCTOR", "RECEPTIONIST"]

export function InviteUserModal() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedRole, setSelectedRole] = useState<UserRole>("RECEPTIONIST")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim()) {
      toast.error("Nombre y email son obligatorios")
      return
    }
    setLoading(true)
    const result = await inviteUser({ name, email, role: selectedRole })
    setLoading(false)
    if (result.success) {
      toast.success(`Invitación enviada a ${email}`)
      setOpen(false)
      setName("")
      setEmail("")
      setSelectedRole("RECEPTIONIST")
    } else {
      toast.error(result.error)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 h-9 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
      >
        <UserPlus className="w-4 h-4" />
        Invitar usuario
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />

          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">Invitar nuevo miembro</h2>
              <button
                onClick={() => setOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500">Nombre completo *</label>
                <input
                  type="text"
                  placeholder="Dr. Juan García"
                  className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500">Email *</label>
                <input
                  type="email"
                  placeholder="juan@clinica.com"
                  className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-500">Rol *</label>
                <div className="space-y-2">
                  {ROLES.map((role) => (
                    <label
                      key={role}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedRole === role
                          ? "border-indigo-400 bg-indigo-50"
                          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="role"
                        value={role}
                        checked={selectedRole === role}
                        onChange={() => setSelectedRole(role)}
                        className="mt-0.5 accent-indigo-600"
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-800">{ROLE_LABELS[role]}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{ROLE_DESCRIPTIONS[role]}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <p className="text-xs text-gray-400">
                Recibirá un email con el link de acceso. El link expira en 48 horas.
              </p>
            </div>

            {/* Footer */}
            <div className="flex items-center gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 h-9 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 h-9 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {loading ? "Enviando…" : "Enviar invitación"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
