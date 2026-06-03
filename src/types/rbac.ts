import type { UserRole } from '@prisma/client'

export type Module =
  | 'dashboard'
  | 'pipeline'
  | 'patients'
  | 'agenda'
  | 'dr_clinic'
  | 'hermes_ai'
  | 'inbox'
  | 'reports'
  | 'settings'
  | 'users'

export type Action =
  | 'view'
  | 'create'
  | 'edit'
  | 'delete'
  | 'configure'
  | 'export'
  | 'view_financial'
  | 'view_others'

export type Permission = `${Module}:${Action}`

export type SessionUser = {
  id: string
  name: string
  email: string
  role: UserRole
  clinicId: string
  isActive: boolean
}

export { type UserRole }

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN:        'Administrador',
  DOCTOR:       'Doctor',
  RECEPTIONIST: 'Recepcionista',
}

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  ADMIN:        'Acceso total al CRM, configuración y equipo',
  DOCTOR:       'Acceso clínico completo: pipeline, pacientes y Dr. Clinic',
  RECEPTIONIST: 'Gestión de agenda, leads y contacto con pacientes',
}

export const ROLE_COLORS: Record<UserRole, { bg: string; text: string; border: string }> = {
  ADMIN:        { bg: 'bg-violet-100', text: 'text-violet-700', border: 'border-violet-300' },
  DOCTOR:       { bg: 'bg-blue-100',   text: 'text-blue-700',   border: 'border-blue-300'   },
  RECEPTIONIST: { bg: 'bg-teal-100',   text: 'text-teal-700',   border: 'border-teal-300'   },
}

export const ROLE_ICONS: Record<UserRole, 'ShieldCheck' | 'Stethoscope' | 'Headset'> = {
  ADMIN:        'ShieldCheck',
  DOCTOR:       'Stethoscope',
  RECEPTIONIST: 'Headset',
}
