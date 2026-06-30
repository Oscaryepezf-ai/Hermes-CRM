import type { UserRole } from '@prisma/client'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name: string
      email: string
      role: UserRole
      clinicId: string
      clinicIds: string[]
      isActive: boolean
      isSuperAdmin: boolean
      avatarUrl?: string | null
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: UserRole
    clinicId: string
    clinicIds: string[]
    isActive: boolean
    isSuperAdmin: boolean
    avatarUrl?: string | null
  }
}
