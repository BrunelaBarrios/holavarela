import type { AdminSession } from "./adminAuth"
import { getSupabaseAdmin } from "./supabaseAdmin"

type AdminActivityInput = {
  action: string
  section: string
  target?: string | null
  details?: string | null
}

export async function logAdminActivityServer(
  session: AdminSession,
  input: AdminActivityInput
) {
  await getSupabaseAdmin().from("admin_actividad").insert([
    {
      admin_username: session.username,
      admin_nombre: session.name,
      admin_rol: session.role,
      accion: input.action,
      seccion: input.section,
      objetivo: input.target || null,
      detalle: input.details || null,
    },
  ])
}
