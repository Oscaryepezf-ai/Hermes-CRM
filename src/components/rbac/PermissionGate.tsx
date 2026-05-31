import { hasPermission } from '@/lib/rbac/permissions'
import type { Module, Action } from '@/types/rbac'
import type { UserRole } from '@prisma/client'

type PermissionGateProps = {
  role: UserRole
  module: Module
  action: Action
  children: React.ReactNode
  fallback?: React.ReactNode
  mode?: 'hide' | 'disable'
}

export function PermissionGate({
  role,
  module,
  action,
  children,
  fallback = null,
  mode = 'hide',
}: PermissionGateProps) {
  const allowed = hasPermission(role, module, action)

  if (!allowed) {
    if (mode === 'disable') {
      return (
        <div className="opacity-40 pointer-events-none select-none" aria-disabled>
          {children}
        </div>
      )
    }
    return <>{fallback}</>
  }

  return <>{children}</>
}
