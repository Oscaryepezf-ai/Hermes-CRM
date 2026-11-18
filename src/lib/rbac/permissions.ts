import type { UserRole } from '@prisma/client'
import type { Permission, Module, Action } from '@/types/rbac'

const PERMISSIONS: Record<UserRole, Permission[]> = {
  ADMIN: [
    'dashboard:view', 'dashboard:view_financial',
    'pipeline:view', 'pipeline:create', 'pipeline:edit', 'pipeline:delete',
    'patients:view', 'patients:create', 'patients:edit', 'patients:delete',
    'agenda:view', 'agenda:create', 'agenda:edit', 'agenda:delete', 'agenda:view_others',
    'dr_clinic:view', 'dr_clinic:create', 'dr_clinic:edit',
    'hermes_ai:view', 'hermes_ai:configure',
    'inbox:view', 'inbox:create', 'inbox:edit',
    'reports:view', 'reports:view_financial', 'reports:export',
    'settings:view', 'settings:configure', 'settings:edit',
    'users:view', 'users:create', 'users:edit', 'users:delete',
    'ad_spend:view', 'ad_spend:create', 'ad_spend:edit', 'ad_spend:delete',
  ],

  DOCTOR: [
    'dashboard:view',
    'pipeline:view', 'pipeline:create', 'pipeline:edit',
    'patients:view', 'patients:create', 'patients:edit',
    'agenda:view', 'agenda:create', 'agenda:edit', 'agenda:delete',
    'dr_clinic:view', 'dr_clinic:create', 'dr_clinic:edit',
    'hermes_ai:view',
    'inbox:view', 'inbox:create', 'inbox:edit',
    'reports:view',
    'settings:configure',
  ],

  RECEPTIONIST: [
    'dashboard:view',
    'pipeline:view', 'pipeline:create', 'pipeline:edit',
    'patients:view', 'patients:create', 'patients:edit',
    'agenda:view', 'agenda:create', 'agenda:edit', 'agenda:delete', 'agenda:view_others',
    'inbox:view', 'inbox:create', 'inbox:edit',
    'reports:view',
  ],

  ANALYST: [
    'dashboard:view',
    'reports:view', 'reports:view_financial', 'reports:export',
    'ad_spend:view', 'ad_spend:create', 'ad_spend:edit', 'ad_spend:delete',
  ],
}

export function hasPermission(role: UserRole, module: Module, action: Action): boolean {
  const permission = `${module}:${action}` as Permission
  return PERMISSIONS[role]?.includes(permission) ?? false
}

export function hasAllPermissions(
  role: UserRole,
  permissions: { module: Module; action: Action }[]
): boolean {
  return permissions.every((p) => hasPermission(role, p.module, p.action))
}

export function hasAnyPermission(
  role: UserRole,
  permissions: { module: Module; action: Action }[]
): boolean {
  return permissions.some((p) => hasPermission(role, p.module, p.action))
}

export function getPermissionsForRole(role: UserRole): Permission[] {
  return PERMISSIONS[role] ?? []
}

// Maps sidebar nav item key → module ID used for permission checks
export const SIDEBAR_MODULES: Record<UserRole, string[]> = {
  ADMIN:        ['dashboard', 'pipeline', 'inbox', 'agenda', 'patients', 'dr_clinic', 'hermes_ai', 'reports', 'ad_spend', 'settings'],
  DOCTOR:       ['dashboard', 'pipeline', 'inbox', 'agenda', 'patients', 'dr_clinic', 'hermes_ai', 'reports'],
  RECEPTIONIST: ['dashboard', 'pipeline', 'inbox', 'agenda', 'patients', 'reports'],
  ANALYST:      ['dashboard', 'reports', 'ad_spend'],
}
