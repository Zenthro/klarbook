import type { UserRole } from "./server/database/schema"

// auth.d.ts
declare module "#auth-utils" {
  interface User {
    id: string
    name: string
    role: UserRole
    email: string
    organisationId: string
    organisationName: string
  }

  interface UserSession {}

  interface SecureSessionData {
    role: UserRole
    userId: string
    sessionToken: string
    organisationId: string
  }
}

export {}
