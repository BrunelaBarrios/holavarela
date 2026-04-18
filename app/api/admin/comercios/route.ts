import { NextResponse, type NextRequest } from "next/server"
import { readAdminSessionFromRequest } from "../../../lib/adminSession"
import { logAdminActivityServer } from "../../../lib/adminActivityServer"
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin"

type SaveComercioPayload = {
  action: "save"
  id?: number
  payload: {
    nombre?: string
    direccion?: string | null
    telefono?: string | null
    descripcion?: string | null
    premium_detalle?: string | null
    premium_galeria?: string[]
    premium_extra_titulo?: string | null
    premium_extra_detalle?: string | null
    premium_extra_galeria?: string[]
    premium_activo?: boolean
    web_url?: string | null
    instagram_url?: string | null
    facebook_url?: string | null
    imagen_url?: string | null
    estado?: string | null
    destacado?: boolean
    usa_whatsapp?: boolean
  }
}

type DeleteComercioPayload = {
  action: "delete"
  id?: number
}

type ToggleVisibilityPayload = {
  action: "toggle_visibility"
  id?: number
}

type ToggleFeaturedPayload = {
  action: "toggle_featured"
  id?: number
}

type ComercioActionPayload =
  | SaveComercioPayload
  | DeleteComercioPayload
  | ToggleVisibilityPayload
  | ToggleFeaturedPayload

function normalizeText(value?: string | null) {
  const normalized = value?.trim()
  return normalized ? normalized : null
}

function normalizeUrl(value?: string | null) {
  const normalized = value?.trim()
  if (!normalized) return null

  try {
    const url = new URL(normalized)
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null
  } catch {
    return null
  }
}

function normalizeGallery(values?: string[]) {
  return (values || []).map((item) => item.trim()).filter(Boolean).slice(0, 12)
}

async function requireAdminSession(request: NextRequest) {
  return readAdminSessionFromRequest(request)
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdminSession(request)
    if (!session) {
      return NextResponse.json({ error: "Sesion admin requerida." }, { status: 401 })
    }

    const supabaseAdmin = getSupabaseAdmin()
    const body = (await request.json()) as ComercioActionPayload

    if (body.action === "delete") {
      if (!body.id) {
        return NextResponse.json({ error: "Falta el comercio a eliminar." }, { status: 400 })
      }

      const { data: existing, error: loadError } = await supabaseAdmin
        .from("comercios")
        .select("id, nombre")
        .eq("id", body.id)
        .maybeSingle()

      if (loadError) throw loadError
      if (!existing) {
        return NextResponse.json({ error: "No encontramos el comercio." }, { status: 404 })
      }

      const { error } = await supabaseAdmin.from("comercios").delete().eq("id", body.id)
      if (error) throw error

      await logAdminActivityServer(session, {
        action: "Eliminar",
        section: "Comercios",
        target: existing.nombre,
      })

      return NextResponse.json({ ok: true })
    }

    if (body.action === "toggle_visibility") {
      if (!body.id) {
        return NextResponse.json({ error: "Falta el comercio." }, { status: 400 })
      }

      const { data: existing, error: loadError } = await supabaseAdmin
        .from("comercios")
        .select("id, nombre, estado")
        .eq("id", body.id)
        .maybeSingle()

      if (loadError) throw loadError
      if (!existing) {
        return NextResponse.json({ error: "No encontramos el comercio." }, { status: 404 })
      }

      const nextEstado =
        existing.estado === "oculto" || existing.estado === "borrador" ? "activo" : "oculto"

      const { data, error } = await supabaseAdmin
        .from("comercios")
        .update({ estado: nextEstado })
        .eq("id", body.id)
        .select("*")
        .single()

      if (error) throw error

      await logAdminActivityServer(session, {
        action:
          nextEstado === "activo"
            ? existing.estado === "borrador"
              ? "Publicar borrador"
              : "Mostrar"
            : "Ocultar",
        section: "Comercios",
        target: existing.nombre,
      })

      return NextResponse.json({ ok: true, record: data })
    }

    if (body.action === "toggle_featured") {
      if (!body.id) {
        return NextResponse.json({ error: "Falta el comercio." }, { status: 400 })
      }

      const { data: existing, error: loadError } = await supabaseAdmin
        .from("comercios")
        .select("id, nombre, destacado")
        .eq("id", body.id)
        .maybeSingle()

      if (loadError) throw loadError
      if (!existing) {
        return NextResponse.json({ error: "No encontramos el comercio." }, { status: 404 })
      }

      const { data, error } = await supabaseAdmin
        .from("comercios")
        .update({ destacado: !existing.destacado })
        .eq("id", body.id)
        .select("*")
        .single()

      if (error) throw error

      await logAdminActivityServer(session, {
        action: !existing.destacado ? "Destacar" : "Quitar destacado",
        section: "Comercios",
        target: existing.nombre,
      })

      return NextResponse.json({ ok: true, record: data })
    }

    if (body.action !== "save") {
      return NextResponse.json({ error: "Accion no soportada." }, { status: 400 })
    }

    const payload = {
      nombre: body.payload.nombre?.trim() || "",
      direccion: normalizeText(body.payload.direccion),
      telefono: normalizeText(body.payload.telefono),
      descripcion: normalizeText(body.payload.descripcion),
      premium_detalle: normalizeText(body.payload.premium_detalle),
      premium_galeria: normalizeGallery(body.payload.premium_galeria),
      premium_extra_titulo: normalizeText(body.payload.premium_extra_titulo),
      premium_extra_detalle: normalizeText(body.payload.premium_extra_detalle),
      premium_extra_galeria: normalizeGallery(body.payload.premium_extra_galeria),
      premium_activo: Boolean(body.payload.premium_activo),
      web_url: normalizeUrl(body.payload.web_url),
      instagram_url: normalizeUrl(body.payload.instagram_url),
      facebook_url: normalizeUrl(body.payload.facebook_url),
      imagen_url: normalizeText(body.payload.imagen_url),
      estado: body.payload.estado || "activo",
      destacado: Boolean(body.payload.destacado),
      usa_whatsapp: Boolean(body.payload.usa_whatsapp),
    }

    if (!payload.nombre) {
      return NextResponse.json({ error: "El nombre es obligatorio." }, { status: 400 })
    }

    if (!body.id && !payload.imagen_url) {
      return NextResponse.json(
        { error: "Tenes que cargar una foto para crear un comercio." },
        { status: 400 }
      )
    }

    if (body.id) {
      const { data, error } = await supabaseAdmin
        .from("comercios")
        .update(payload)
        .eq("id", body.id)
        .select("*")
        .single()

      if (error) throw error

      await logAdminActivityServer(session, {
        action: payload.estado === "borrador" ? "Guardar borrador" : "Editar",
        section: "Comercios",
        target: payload.nombre,
      })

      return NextResponse.json({ ok: true, record: data })
    }

    const { data, error } = await supabaseAdmin
      .from("comercios")
      .insert([payload])
      .select("*")
      .single()

    if (error) throw error

    await logAdminActivityServer(session, {
      action: payload.estado === "borrador" ? "Crear borrador" : "Crear",
      section: "Comercios",
      target: payload.nombre,
    })

    return NextResponse.json({ ok: true, record: data })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No pudimos guardar el comercio."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
