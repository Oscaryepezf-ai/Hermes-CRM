import { auth } from '../../../auth'
import { hasPermission } from './permissions'
import type { Module, Action, SessionUser } from '@/types/rbac'

type GuardResult =
  | { authorized: true; user: SessionUser }
  | { authorized: false; error: string; status: 401 | 403 }

export async function requirePermission(
  module: Module,
  action: Action
): Promise<GuardResult> {
  const session = await auth()

  if (!session?.user?.id || !session.user.clinicId) {
    return { authorized: false, error: 'No autenticado', status: 401 }
  }

  const user = session.user as SessionUser

  if (user.isActive === false) {
    return {
      authorized: false,
      error: 'Tu cuenta ha sido desactivada. Contacta al administrador.',
      status: 403,
    }
  }

  if (!hasPermission(user.role, module, action)) {
    return {
      authorized: false,
      error: `No tienes permiso para realizar esta acción (${module}:${action})`,
      status: 403,
    }
  }

  return { authorized: true, user }
}

export async function requireAuth(): Promise<GuardResult> {
  const session = await auth()

  if (!session?.user?.id) {
    return { authorized: false, error: 'No autenticado', status: 401 }
  }

  return { authorized: true, user: session.user as SessionUser }
}

export function requireSameClinic(user: SessionUser, clinicId: string): boolean {
  return user.clinicId === clinicId
}

export function unauthorizedResponse(message: string) {
  return { success: false as const, error: message }
}
