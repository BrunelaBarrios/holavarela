import { NextRequest, NextResponse } from "next/server"
import { readAdminSessionFromRequest } from "../../../lib/adminSession"
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin"

type CountQueryResult = {
  count: number
  warning?: string
}

export async function GET(request: NextRequest) {
  const session = await readAdminSessionFromRequest(request)

  if (!session) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 })
  }

  try {
    const supabaseAdmin = getSupabaseAdmin()

    const safeCount = async (
      label: string,
      query: PromiseLike<{ count: number | null; error: { message?: string } | null }>
    ): Promise<CountQueryResult> => {
      const { count, error } = await query

      if (error) {
        return {
          count: 0,
          warning: `${label}: ${error.message || "No se pudo contar."}`,
        }
      }

      return { count: count || 0 }
    }

    const [
      comercios,
      eventos,
      servicios,
      instituciones,
      cursos,
      usuarios,
      newComercios,
      newEventos,
      newContactos,
      pendingPasswordRequests,
      pendingComercios,
      pendingServicios,
    ] = await Promise.all([
      safeCount(
        "Comercios",
        supabaseAdmin.from("comercios").select("id", { count: "exact", head: true })
      ),
      safeCount(
        "Eventos",
        supabaseAdmin.from("eventos").select("id", { count: "exact", head: true })
      ),
      safeCount(
        "Servicios",
        supabaseAdmin.from("servicios").select("id", { count: "exact", head: true })
      ),
      safeCount(
        "Instituciones",
        supabaseAdmin.from("instituciones").select("id", { count: "exact", head: true })
      ),
      safeCount(
        "Cursos",
        supabaseAdmin.from("cursos").select("id", { count: "exact", head: true })
      ),
      safeCount(
        "Usuarios",
        supabaseAdmin
          .from("usuarios_registrados")
          .select("id", { count: "exact", head: true })
      ),
      safeCount(
        "Comercios borrador",
        supabaseAdmin
          .from("comercios")
          .select("id", { count: "exact", head: true })
          .eq("estado", "borrador")
      ),
      safeCount(
        "Eventos borrador",
        supabaseAdmin
          .from("eventos")
          .select("id", { count: "exact", head: true })
          .eq("estado", "borrador")
      ),
      safeCount(
        "Contactos pendientes",
        supabaseAdmin
          .from("contacto_solicitudes")
          .select("id", { count: "exact", head: true })
          .or("visto.is.null,visto.eq.false")
      ),
      safeCount(
        "Claves solicitadas",
        supabaseAdmin
          .from("password_reset_requests")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending")
      ),
      safeCount(
        "Comercios con suscripcion pendiente",
        supabaseAdmin
          .from("comercios")
          .select("id", { count: "exact", head: true })
          .eq("estado_suscripcion", "pendiente")
      ),
      safeCount(
        "Servicios con suscripcion pendiente",
        supabaseAdmin
          .from("servicios")
          .select("id", { count: "exact", head: true })
          .eq("estado_suscripcion", "pendiente")
      ),
    ])
    const warnings = [
      comercios.warning,
      eventos.warning,
      servicios.warning,
      instituciones.warning,
      cursos.warning,
      usuarios.warning,
      newComercios.warning,
      newEventos.warning,
      newContactos.warning,
      pendingPasswordRequests.warning,
      pendingComercios.warning,
      pendingServicios.warning,
    ].filter(Boolean)

    return NextResponse.json({
      counts: {
        comercios: comercios.count,
        eventos: eventos.count,
        servicios: servicios.count,
        instituciones: instituciones.count,
        cursos: cursos.count,
        usuarios: usuarios.count,
        newComercios: newComercios.count,
        newEventos: newEventos.count,
        newContactos: newContactos.count,
        pendingPasswordRequests: pendingPasswordRequests.count,
        pendingSubscriptions: pendingComercios.count + pendingServicios.count,
      },
      warnings,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo cargar el dashboard."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
