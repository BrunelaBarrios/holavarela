import { NextRequest, NextResponse } from "next/server"
import { readAdminSessionFromRequest } from "../../../lib/adminSession"
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin"

export async function GET(request: NextRequest) {
  const session = await readAdminSessionFromRequest(request)

  if (!session) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 })
  }

  try {
    const supabaseAdmin = getSupabaseAdmin()
    const [
      { count: comercios, error: comerciosError },
      { count: eventos, error: eventosError },
      { count: servicios, error: serviciosError },
      { count: instituciones, error: institucionesError },
      { count: cursos, error: cursosError },
      { count: usuarios, error: usuariosError },
      { count: newComercios, error: newComerciosError },
      { count: newEventos, error: newEventosError },
      { count: newContactos, error: newContactosError },
      { count: pendingPasswordRequests, error: pendingPasswordRequestsError },
      { count: pendingComercios, error: pendingComerciosError },
      { count: pendingServicios, error: pendingServiciosError },
    ] = await Promise.all([
      supabaseAdmin.from("comercios").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("eventos").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("servicios").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("instituciones").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("cursos").select("id", { count: "exact", head: true }),
      supabaseAdmin
        .from("usuarios_registrados")
        .select("id", { count: "exact", head: true }),
      supabaseAdmin
        .from("comercios")
        .select("id", { count: "exact", head: true })
        .eq("estado", "borrador"),
      supabaseAdmin
        .from("eventos")
        .select("id", { count: "exact", head: true })
        .eq("estado", "borrador"),
      supabaseAdmin
        .from("contacto_solicitudes")
        .select("id", { count: "exact", head: true })
        .or("visto.is.null,visto.eq.false"),
      supabaseAdmin
        .from("password_reset_requests")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
      supabaseAdmin
        .from("comercios")
        .select("id", { count: "exact", head: true })
        .eq("estado_suscripcion", "pendiente"),
      supabaseAdmin
        .from("servicios")
        .select("id", { count: "exact", head: true })
        .eq("estado_suscripcion", "pendiente"),
    ])
    const firstError =
      comerciosError ||
      eventosError ||
      serviciosError ||
      institucionesError ||
      cursosError ||
      usuariosError ||
      newComerciosError ||
      newEventosError ||
      newContactosError ||
      pendingPasswordRequestsError ||
      pendingComerciosError ||
      pendingServiciosError

    if (firstError) {
      throw firstError
    }

    return NextResponse.json({
      counts: {
        comercios: comercios || 0,
        eventos: eventos || 0,
        servicios: servicios || 0,
        instituciones: instituciones || 0,
        cursos: cursos || 0,
        usuarios: usuarios || 0,
        newComercios: newComercios || 0,
        newEventos: newEventos || 0,
        newContactos: newContactos || 0,
        pendingPasswordRequests: pendingPasswordRequests || 0,
        pendingSubscriptions: (pendingComercios || 0) + (pendingServicios || 0),
      },
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo cargar el dashboard."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
