import { revalidatePath } from "next/cache"
import { NextResponse, type NextRequest } from "next/server"
import { readAdminSessionFromRequest } from "../../../lib/adminSession"
import { logAdminActivityServer } from "../../../lib/adminActivityServer"
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin"
import { validatePublicCommunityMessage } from "../../../lib/communityMessages"

export const dynamic = "force-dynamic"

async function requireSession(request: NextRequest) {
  return readAdminSessionFromRequest(request)
}

export async function GET(request: NextRequest) {
  const session = await requireSession(request)
  if (!session) return NextResponse.json({ error: "Sesión admin requerida." }, { status: 401 })
  const { data, error } = await getSupabaseAdmin()
    .from("mensajes_comunidad")
    .select("*, instituciones(nombre)")
    .order("fecha_creacion", { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ messages: data || [] })
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession(request)
    if (!session) return NextResponse.json({ error: "Sesión admin requerida." }, { status: 401 })
    const body = await request.json()
    if (!body.id) return NextResponse.json({ error: "Falta el mensaje." }, { status: 400 })
    const admin = getSupabaseAdmin()
    const { data: existing, error: loadError } = await admin.from("mensajes_comunidad").select("*").eq("id", body.id).maybeSingle()
    if (loadError) throw loadError
    if (!existing) return NextResponse.json({ error: "No encontramos el mensaje." }, { status: 404 })

    if (body.action === "delete") {
      const { error } = await admin.from("mensajes_comunidad").delete().eq("id", body.id)
      if (error) throw error
      await logAdminActivityServer(session, { action: "Eliminar", section: "Mensajes de la comunidad", target: existing.nombre })
      revalidatePath("/")
      return NextResponse.json({ ok: true })
    }

    const now = new Date()
    let update: Record<string, unknown> = {}
    let actionLabel = body.action
    if (body.action === "approve") {
      if (existing.fecha_programada) {
        const scheduled = new Date(existing.fecha_programada)
        if (scheduled.getTime() <= now.getTime()) {
          return NextResponse.json({ error: "La fecha programada ya pasó. Cambiala o publicá inmediatamente." }, { status: 400 })
        }
        update = { estado: "programado", fecha_publicacion: scheduled.toISOString() }
      } else update = { estado: "activo", fecha_publicacion: now.toISOString() }
      actionLabel = "Aprobar"
    } else if (body.action === "publish_now") {
      update = { estado: "activo", fecha_publicacion: now.toISOString(), fecha_programada: null }
      actionLabel = "Publicar inmediatamente"
    } else if (body.action === "reject") update = { estado: "rechazado" }
    else if (body.action === "cancel") update = { estado: "cancelado" }
    else if (body.action === "reschedule") {
      const scheduled = new Date(body.fechaProgramada)
      if (Number.isNaN(scheduled.getTime()) || scheduled.getTime() <= now.getTime()) return NextResponse.json({ error: "Elegí una fecha futura." }, { status: 400 })
      update = { fecha_programada: scheduled.toISOString(), fecha_publicacion: scheduled.toISOString(), estado: "programado" }
      actionLabel = "Cambiar fecha programada"
    } else if (body.action === "edit") {
      const validated = validatePublicCommunityMessage({ nombre: body.nombre, mensaje: body.mensaje, institucionId: body.institucionId })
      if (!validated.value) return NextResponse.json({ error: validated.error }, { status: 400 })
      update = { nombre: validated.value.nombre, mensaje: validated.value.mensaje, institucion_id: validated.value.institucionId }
      actionLabel = "Editar"
    } else return NextResponse.json({ error: "Acción no válida." }, { status: 400 })

    const { data, error } = await admin.from("mensajes_comunidad").update(update).eq("id", body.id).select("*, instituciones(nombre)").single()
    if (error) throw error
    await logAdminActivityServer(session, { action: actionLabel, section: "Mensajes de la comunidad", target: existing.nombre })
    revalidatePath("/")
    return NextResponse.json({ ok: true, message: data })
  } catch (error) {
    console.error("admin community messages", error)
    return NextResponse.json({ error: "No pudimos actualizar el mensaje." }, { status: 500 })
  }
}
