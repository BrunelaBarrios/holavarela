import { NextResponse, type NextRequest } from "next/server"
import { readAdminSessionFromRequest } from "../../../lib/adminSession"
import { logAdminActivityServer } from "../../../lib/adminActivityServer"
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin"

type SaveServicioPayload = {
  action: "save"
  id?: number
  payload: {
    nombre?: string
    categoria?: string
    descripcion?: string | null
    premium_detalle?: string | null
    premium_galeria?: string[]
    premium_activo?: boolean
    responsable?: string | null
    contacto?: string | null
    direccion?: string | null
    web_url?: string | null
    instagram_url?: string | null
    facebook_url?: string | null
    imagen?: string | null
    destacado?: boolean
    estado?: string | null
    usa_whatsapp?: boolean
  }
}

type DeleteServicioPayload = {
  action: "delete"
  id?: number
}

type ToggleServicioVisibilityPayload = {
  action: "toggle_visibility"
  id?: number
}

type ToggleServicioFeaturedPayload = {
  action: "toggle_featured"
  id?: number
}

type ServicioActionPayload =
  | SaveServicioPayload
  | DeleteServicioPayload
  | ToggleServicioVisibilityPayload
  | ToggleServicioFeaturedPayload

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

export async function POST(request: NextRequest) {
  try {
    const session = await readAdminSessionFromRequest(request)
    if (!session) {
      return NextResponse.json({ error: "Sesion admin requerida." }, { status: 401 })
    }

    const supabaseAdmin = getSupabaseAdmin()
    const body = (await request.json()) as ServicioActionPayload

    if (body.action === "delete") {
      if (!body.id) {
        return NextResponse.json({ error: "Falta el servicio a eliminar." }, { status: 400 })
      }

      const { data: existing, error: loadError } = await supabaseAdmin
        .from("servicios")
        .select("id, nombre")
        .eq("id", body.id)
        .maybeSingle()

      if (loadError) throw loadError
      if (!existing) {
        return NextResponse.json({ error: "No encontramos el servicio." }, { status: 404 })
      }

      const { error } = await supabaseAdmin.from("servicios").delete().eq("id", body.id)
      if (error) throw error

      await logAdminActivityServer(session, {
        action: "Eliminar",
        section: "Servicios",
        target: existing.nombre,
      })

      return NextResponse.json({ ok: true })
    }

    if (body.action === "toggle_visibility") {
      if (!body.id) {
        return NextResponse.json({ error: "Falta el servicio." }, { status: 400 })
      }

      const { data: existing, error: loadError } = await supabaseAdmin
        .from("servicios")
        .select("id, nombre, estado")
        .eq("id", body.id)
        .maybeSingle()

      if (loadError) throw loadError
      if (!existing) {
        return NextResponse.json({ error: "No encontramos el servicio." }, { status: 404 })
      }

      const nextEstado =
        existing.estado === "oculto" || existing.estado === "borrador" ? "activo" : "oculto"

      const { data, error } = await supabaseAdmin
        .from("servicios")
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
        section: "Servicios",
        target: existing.nombre,
      })

      return NextResponse.json({ ok: true, record: data })
    }

    if (body.action === "toggle_featured") {
      if (!body.id) {
        return NextResponse.json({ error: "Falta el servicio." }, { status: 400 })
      }

      const { data: existing, error: loadError } = await supabaseAdmin
        .from("servicios")
        .select("id, nombre, destacado")
        .eq("id", body.id)
        .maybeSingle()

      if (loadError) throw loadError
      if (!existing) {
        return NextResponse.json({ error: "No encontramos el servicio." }, { status: 404 })
      }

      const { data, error } = await supabaseAdmin
        .from("servicios")
        .update({ destacado: !existing.destacado })
        .eq("id", body.id)
        .select("*")
        .single()

      if (error) throw error

      await logAdminActivityServer(session, {
        action: !existing.destacado ? "Destacar" : "Quitar destacado",
        section: "Servicios",
        target: existing.nombre,
      })

      return NextResponse.json({ ok: true, record: data })
    }

    if (body.action !== "save") {
      return NextResponse.json({ error: "Accion no soportada." }, { status: 400 })
    }

    const payload = {
      nombre: body.payload.nombre?.trim() || "",
      categoria: body.payload.categoria?.trim() || "Servicios",
      descripcion: normalizeText(body.payload.descripcion),
      premium_detalle: normalizeText(body.payload.premium_detalle),
      premium_galeria: normalizeGallery(body.payload.premium_galeria),
      premium_activo: Boolean(body.payload.premium_activo),
      responsable: normalizeText(body.payload.responsable),
      contacto: normalizeText(body.payload.contacto),
      direccion: normalizeText(body.payload.direccion),
      web_url: normalizeUrl(body.payload.web_url),
      instagram_url: normalizeUrl(body.payload.instagram_url),
      facebook_url: normalizeUrl(body.payload.facebook_url),
      imagen: normalizeText(body.payload.imagen),
      destacado: Boolean(body.payload.destacado),
      estado: body.payload.estado || "activo",
      usa_whatsapp: Boolean(body.payload.usa_whatsapp),
    }

    if (!payload.nombre) {
      return NextResponse.json({ error: "El nombre es obligatorio." }, { status: 400 })
    }

    if (!body.id && !payload.imagen) {
      return NextResponse.json(
        { error: "Tenes que cargar una foto para crear un servicio." },
        { status: 400 }
      )
    }

    // Keep admin writes server-side so the browser never writes directly.
    if (body.id) {
      const { data, error } = await supabaseAdmin
        .from("servicios")
        .update(payload)
        .eq("id", body.id)
        .select("*")
        .single()

      if (error) throw error

      await logAdminActivityServer(session, {
        action: payload.estado === "borrador" ? "Guardar borrador" : "Editar",
        section: "Servicios",
        target: payload.nombre,
      })

      return NextResponse.json({ ok: true, record: data })
    }

    const { data, error } = await supabaseAdmin
      .from("servicios")
      .insert([payload])
      .select("*")
      .single()

    if (error) throw error

    await logAdminActivityServer(session, {
      action: payload.estado === "borrador" ? "Crear borrador" : "Crear",
      section: "Servicios",
      target: payload.nombre,
    })

    return NextResponse.json({ ok: true, record: data })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No pudimos guardar el servicio."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
