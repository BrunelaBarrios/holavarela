import { NextResponse, type NextRequest } from "next/server"
import { readAdminSessionFromRequest } from "../../../lib/adminSession"
import { logAdminActivityServer } from "../../../lib/adminActivityServer"
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin"

type SaveEventoPayload = {
  action: "save"
  id?: number
  payload: {
    titulo?: string
    categoria?: string | null
    fecha?: string
    fecha_fin?: string | null
    fecha_solo_mes?: boolean
    ubicacion?: string
    telefono?: string | null
    web_url?: string | null
    instagram_url?: string | null
    facebook_url?: string | null
    descripcion?: string
    imagen?: string | null
    estado?: string | null
    usa_whatsapp?: boolean
  }
}

type DeleteEventoPayload = {
  action: "delete"
  id?: number
}

type ToggleEventoVisibilityPayload = {
  action: "toggle_visibility"
  id?: number
}

type DuplicateEventoPayload = {
  action: "duplicate"
  id?: number
}

type EventoActionPayload =
  | SaveEventoPayload
  | DeleteEventoPayload
  | ToggleEventoVisibilityPayload
  | DuplicateEventoPayload

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

export async function POST(request: NextRequest) {
  try {
    const session = await readAdminSessionFromRequest(request)
    if (!session) {
      return NextResponse.json({ error: "Sesion admin requerida." }, { status: 401 })
    }

    const supabaseAdmin = getSupabaseAdmin()
    const body = (await request.json()) as EventoActionPayload

    if (body.action === "delete") {
      if (!body.id) {
        return NextResponse.json({ error: "Falta el evento a eliminar." }, { status: 400 })
      }

      const { data: existing, error: loadError } = await supabaseAdmin
        .from("eventos")
        .select("id, titulo")
        .eq("id", body.id)
        .maybeSingle()

      if (loadError) throw loadError
      if (!existing) {
        return NextResponse.json({ error: "No encontramos el evento." }, { status: 404 })
      }

      const { error } = await supabaseAdmin.from("eventos").delete().eq("id", body.id)
      if (error) throw error

      await logAdminActivityServer(session, {
        action: "Eliminar",
        section: "Eventos",
        target: existing.titulo,
      })

      return NextResponse.json({ ok: true })
    }

    if (body.action === "toggle_visibility") {
      if (!body.id) {
        return NextResponse.json({ error: "Falta el evento." }, { status: 400 })
      }

      const { data: existing, error: loadError } = await supabaseAdmin
        .from("eventos")
        .select("id, titulo, estado")
        .eq("id", body.id)
        .maybeSingle()

      if (loadError) throw loadError
      if (!existing) {
        return NextResponse.json({ error: "No encontramos el evento." }, { status: 404 })
      }

      const nextEstado =
        existing.estado === "oculto" || existing.estado === "borrador" ? "activo" : "oculto"

      const { data, error } = await supabaseAdmin
        .from("eventos")
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
        section: "Eventos",
        target: existing.titulo,
      })

      return NextResponse.json({ ok: true, record: data })
    }

    if (body.action === "duplicate") {
      if (!body.id) {
        return NextResponse.json({ error: "Falta el evento a duplicar." }, { status: 400 })
      }

      const { data: existing, error: loadError } = await supabaseAdmin
        .from("eventos")
        .select("*")
        .eq("id", body.id)
        .maybeSingle()

      if (loadError) throw loadError
      if (!existing) {
        return NextResponse.json({ error: "No encontramos el evento." }, { status: 404 })
      }

      const payload = {
        titulo: `${existing.titulo} (copia)`,
        categoria: normalizeText(existing.categoria),
        fecha: existing.fecha,
        fecha_fin: existing.fecha_fin || null,
        fecha_solo_mes: Boolean(existing.fecha_solo_mes),
        ubicacion: existing.ubicacion,
        telefono: normalizeText(existing.telefono),
        web_url: normalizeUrl(existing.web_url),
        instagram_url: normalizeUrl(existing.instagram_url),
        facebook_url: normalizeUrl(existing.facebook_url),
        descripcion: existing.descripcion,
        imagen: normalizeText(existing.imagen),
        estado: "borrador",
        usa_whatsapp: Boolean(existing.usa_whatsapp),
        owner_email: normalizeText(existing.owner_email),
      }

      const { data, error } = await supabaseAdmin
        .from("eventos")
        .insert([payload])
        .select("*")
        .single()

      if (error) throw error

      await logAdminActivityServer(session, {
        action: "Duplicar a borrador",
        section: "Eventos",
        target: existing.titulo,
      })

      return NextResponse.json({ ok: true, record: data })
    }

    if (body.action !== "save") {
      return NextResponse.json({ error: "Accion no soportada." }, { status: 400 })
    }

    const payload = {
      titulo: body.payload.titulo?.trim() || "",
      categoria: normalizeText(body.payload.categoria) || "Evento",
      fecha: body.payload.fecha || "",
      fecha_fin: normalizeText(body.payload.fecha_fin),
      fecha_solo_mes: Boolean(body.payload.fecha_solo_mes),
      ubicacion: body.payload.ubicacion?.trim() || "",
      telefono: normalizeText(body.payload.telefono),
      web_url: normalizeUrl(body.payload.web_url),
      instagram_url: normalizeUrl(body.payload.instagram_url),
      facebook_url: normalizeUrl(body.payload.facebook_url),
      descripcion: body.payload.descripcion?.trim() || "",
      imagen: normalizeText(body.payload.imagen),
      estado: body.payload.estado || "activo",
      usa_whatsapp: Boolean(body.payload.usa_whatsapp),
    }

    if (!payload.titulo || !payload.fecha || !payload.ubicacion || !payload.descripcion) {
      return NextResponse.json(
        { error: "Completa los datos principales del evento." },
        { status: 400 }
      )
    }

    if (!body.id && !payload.imagen) {
      return NextResponse.json(
        { error: "Tenes que cargar una foto para crear un evento." },
        { status: 400 }
      )
    }

    // Centralize event writes so drafts, edits and toggles pass by the server.
    if (body.id) {
      const { data, error } = await supabaseAdmin
        .from("eventos")
        .update(payload)
        .eq("id", body.id)
        .select("*")
        .single()

      if (error) throw error

      await logAdminActivityServer(session, {
        action: payload.estado === "borrador" ? "Guardar borrador" : "Editar",
        section: "Eventos",
        target: payload.titulo,
      })

      return NextResponse.json({ ok: true, record: data })
    }

    const { data, error } = await supabaseAdmin
      .from("eventos")
      .insert([payload])
      .select("*")
      .single()

    if (error) throw error

    await logAdminActivityServer(session, {
      action: payload.estado === "borrador" ? "Crear borrador" : "Crear",
      section: "Eventos",
      target: payload.titulo,
    })

    return NextResponse.json({ ok: true, record: data })
  } catch (error) {
    const message = error instanceof Error ? error.message : "No pudimos guardar el evento."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
