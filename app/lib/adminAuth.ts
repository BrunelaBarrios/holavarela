export type AdminRole = "superadmin" | "admin"

export type AdminSession = {
  username: string
  name: string
  role: AdminRole
}

const ADMIN_SESSION_STORAGE_KEY = "hola-varela-admin-session"

export function getAdminSession(): AdminSession | null {
  if (typeof window === "undefined") return null

  const raw = window.localStorage.getItem(ADMIN_SESSION_STORAGE_KEY)
  if (!raw) return null

  try {
    return JSON.parse(raw) as AdminSession
  } catch {
    return null
  }
}

export function saveAdminSession(session: AdminSession) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(ADMIN_SESSION_STORAGE_KEY, JSON.stringify(session))
}

export function clearAdminSession() {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(ADMIN_SESSION_STORAGE_KEY)
}
