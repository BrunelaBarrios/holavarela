import type { AdminRole } from "./adminAuth"

export const SUPERADMIN_ONLY_ADMIN_PATHS = [
  "/admin/sitio",
  "/admin/sorteos",
  "/admin/desafios",
  "/admin/radio",
  "/admin/administradores",
  "/admin/actividad",
] as const

export function isSuperAdminOnlyAdminPath(pathname: string) {
  return SUPERADMIN_ONLY_ADMIN_PATHS.some((prefix) => pathname.startsWith(prefix))
}

export function canAccessAdminPath(pathname: string, role?: AdminRole | null) {
  if (!isSuperAdminOnlyAdminPath(pathname)) return true
  return role === "superadmin"
}
