import { revalidatePath } from "next/cache"
import { NextResponse, type NextRequest } from "next/server"
import { logAdminActivityServer } from "../../../lib/adminActivityServer"
import { readAdminSessionFromRequest } from "../../../lib/adminSession"
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin"

type HighlightEntityType = "comercio" | "servicio" | "institucion"

type SaveHighlightPayload = {
  action: "save"
  id?: number
  payload: {
    imagen_url?: string | null
    entidad_tipo?: HighlightEntityType
    entidad_id?: number
    activo?: boolean
    delay_seconds?: number
  }
}

type ToggleHighlightPayload = {
  action: "toggle_active"
  id?: number
}

type DeleteHighlightPayload = {
  action: "delete"
  id?: number
}

type HighlightActionPayload =
  | SaveHighlightPayload
  | ToggleHighlightPayload
  | DeleteHighlightPayload

function normalizeImageUrl(value?: string | null) {
  const normalized = value?.trim()
  return normalized ? normalized : null
}

function normalizeDelaySeconds(value?: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return 12
  return Math.max(5, Math.min(Math.round(value), 180))
}

function isValidEntityType(value?: string): value is HighlightEntityType {
  return value === "comercio" || value === "servicio" || value === "institucion"
}

async function getEntityOptions(supabaseAdmin: ReturnType<typeof getSupabaseAdmin>) {
  const [comerciosResult, serviciosResult, institucionesResult] = await Promise.all([
    supabaseAdmin
      .from("comercios")
      .select("id, nombre")
      .or("estado.is.null,estado.eq.activo")
      .order("nombre", { ascending: true }),
    supabaseAdmin
      .from("servicios")
      .select("id, nombre")
      .or("estado.is.null,estado.eq.activo")
      .order("nombre", { ascending: true }),
    supabaseAdmin
      .from("instituciones")
      .select("id, nombre")
      .or("estado.is.null,estado.eq.activo")
      .order("nombre", { ascending: true }),
  ])

  if (comerciosResult.error) throw comerciosResult.error
  if (serviciosResult.error) throw serviciosResult.error
  if (institucionesResult.error) throw institucionesResult.error

  return [
    ...((comerciosResult.data || []) as Array<{ id: number; nombre: string }>).map(
      (item) => ({
        key: `comercio:${item.id}`,
        type: "comercio" as const,
        id: Number(item.id),
        label: `Comercio: ${item.nombre}`,
      })
    ),
    ...((serviciosResult.data || []) as Array<{ id: number; nombre: string }>).map(
      (item) => ({
        key: `servicio:${item.id}`,
        type: "servicio" as const,
        id: Number(item.id),
        label: `Servicio: ${item.nombre}`,
      })
    ),
    ...((institucionesResult.data || []) as Array<{ id: number; nombre: string }>).map(
      (item) => ({
        key: `institucion:${item.id}`,
        type: "institucion" as const,
        id: Number(item.id),
        label: `Institucion: ${item.nombre}`,
      })
    ),
  ]
}

export async function GET(request: NextRequest) {
  try {
    const session = await readAdminSessionFromRequest(request)
    if (!session) {
      return NextResponse.json({ error: "Sesion admin requerida." }, { status: 401 })
    }

    const supabaseAdmin = getSupabaseAdmin()
    const [highlightResult, options] = await Promise.all([
      supabaseAdmin
        .from("destacados_home")
        .select("id, imagen_url, entidad_tipo, entidad_id, activo, delay_seconds, created_at, updated_at")
        .order("activo", { ascending: false })
        .order("updated_at", { ascending: false }),
      getEntityOptions(supabaseAdmin),
    ])

    if (highlightResult.error) throw highlightResult.error

    return NextResponse.json({
      highlights: highlightResult.data || [],
      options,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudieron cargar los destacados."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await readAdminSessionFromRequest(request)
    if (!session) {
      return NextResponse.json({ error: "Sesion admin requerida." }, { status: 401 })
    }

    const body = (await request.json()) as HighlightActionPayload
    const supabaseAdmin = getSupabaseAdmin()

    if (body.action === "delete") {
      if (!body.id) {
        return NextResponse.json({ error: "Falta el destacado a eliminar." }, { status: 400 })
      }

      const { error } = await supabaseAdmin.from("destacados_home").delete().eq("id", body.id)
      if (error) throw error

      await logAdminActivityServer(session, {
        action: "Eliminar",
        section: "Destacados",
        target: `Destacado #${body.id}`,
      })

      revalidatePath("/")
      return NextResponse.json({ ok: true })
    }

    if (body.action === "toggle_active") {
      if (!body.id) {
        return NextResponse.json({ error: "Falta el destacado." }, { status: 400 })
      }

      const { data: existing, error: loadError } = await supabaseAdmin
        .from("destacados_home")
        .select("id, activo")
        .eq("id", body.id)
        .maybeSingle()

      if (loadError) throw loadError
      if (!existing) {
        return NextResponse.json({ error: "No encontramos el destacado." }, { status: 404 })
      }

      const nextActive = existing.activo !== true
      const { data, error } = await supabaseAdmin
        .from("destacados_home")
        .update({ activo: nextActive, updated_at: new Date().toISOString() })
        .eq("id", body.id)
        .select("id, imagen_url, entidad_tipo, entidad_id, activo, delay_seconds, created_at, updated_at")
        .single()

      if (error) throw error
      await logAdminActivityServer(session, {
        action: nextActive ? "Activar" : "Desactivar",
        section: "Destacados",
        target: `Destacado #${body.id}`,
      })

      revalidatePath("/")
      return NextResponse.json({ ok: true, record: data })
    }

    if (body.action !== "save") {
      return NextResponse.json({ error: "Accion no valida." }, { status: 400 })
    }

    const imageUrl = normalizeImageUrl(body.payload.imagen_url)
    const entityType = body.payload.entidad_tipo
    const entityId = Number(body.payload.entidad_id || 0)

    if (!imageUrl) {
      return NextResponse.json({ error: "Carga una imagen para el destacado." }, { status: 400 })
    }

    if (!isValidEntityType(entityType) || !entityId) {
      return NextResponse.json(
        { error: "Selecciona un comercio, servicio o institucion relacionado." },
        { status: 400 }
      )
    }

    const payload = {
      imagen_url: imageUrl,
      entidad_tipo: entityType,
      entidad_id: entityId,
      activo: body.payload.activo === true,
      delay_seconds: normalizeDelaySeconds(body.payload.delay_seconds),
      updated_at: new Date().toISOString(),
    }

    const query = body.id
      ? supabaseAdmin
          .from("destacados_home")
          .update(payload)
          .eq("id", body.id)
          .select("id, imagen_url, entidad_tipo, entidad_id, activo, delay_seconds, created_at, updated_at")
          .single()
      : supabaseAdmin
          .from("destacados_home")
          .insert(payload)
          .select("id, imagen_url, entidad_tipo, entidad_id, activo, delay_seconds, created_at, updated_at")
          .single()

    const { data, error } = await query
    if (error) throw error

    await logAdminActivityServer(session, {
      action: body.id ? "Editar" : "Crear",
      section: "Destacados",
      target: `${entityType}:${entityId}`,
      details: payload.activo ? "Quedo activo en la rotacion de destacados de la Home." : undefined,
    })

    revalidatePath("/")
    return NextResponse.json({ ok: true, record: data })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo guardar el destacado."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
