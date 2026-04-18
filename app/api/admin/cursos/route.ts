import { NextResponse, type NextRequest } from "next/server"
import { readAdminSessionFromRequest } from "../../../lib/adminSession"
import { logAdminActivityServer } from "../../../lib/adminActivityServer"
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin"

type SaveCursoPayload = {
  action: "save"
  id?: number
  payload: {
    nombre?: string
    descripcion?: string
    institucion_id?: number | null
    responsable?: string
    contacto?: string
    web_url?: string | null
    instagram_url?: string | null
    facebook_url?: string | null
    imagen?: string | null
    destacado?: boolean
    estado?: string | null
    usa_whatsapp?: boolean
  }
}

type DeleteCursoPayload = {
  action: "delete"
  id?: number
}

type ToggleCursoVisibilityPayload = {
  action: "toggle_visibility"
  id?: number
}

type ToggleCursoFeaturedPayload = {
  action: "toggle_featured"
  id?: number
}

type CursoActionPayload =
  | SaveCursoPayload
  | DeleteCursoPayload
  | ToggleCursoVisibilityPayload
  | ToggleCursoFeaturedPayload

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
    const body = (await request.json()) as CursoActionPayload

    if (body.action === "delete") {
      if (!body.id) {
        return NextResponse.json({ error: "Falta el curso a eliminar." }, { status: 400 })
      }

      const { data: existing, error: loadError } = await supabaseAdmin
        .from("cursos")
        .select("id, nombre")
        .eq("id", body.id)
        .maybeSingle()

      if (loadError) throw loadError
      if (!existing) {
        return NextResponse.json({ error: "No encontramos el curso." }, { status: 404 })
      }

      const { error } = await supabaseAdmin.from("cursos").delete().eq("id", body.id)
      if (error) throw error

      await logAdminActivityServer(session, {
        action: "Eliminar",
        section: "Cursos",
        target: existing.nombre,
      })

      return NextResponse.json({ ok: true })
    }

    if (body.action === "toggle_visibility") {
      if (!body.id) {
        return NextResponse.json({ error: "Falta el curso." }, { status: 400 })
      }

      const { data: existing, error: loadError } = await supabaseAdmin
        .from("cursos")
        .select("id, nombre, estado")
        .eq("id", body.id)
        .maybeSingle()

      if (loadError) throw loadError
      if (!existing) {
        return NextResponse.json({ error: "No encontramos el curso." }, { status: 404 })
      }

      const nextEstado =
        existing.estado === "oculto" || existing.estado === "borrador" ? "activo" : "oculto"

      const { data, error } = await supabaseAdmin
        .from("cursos")
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
        section: "Cursos",
        target: existing.nombre,
      })

      return NextResponse.json({ ok: true, record: data })
    }

    if (body.action === "toggle_featured") {
      if (!body.id) {
        return NextResponse.json({ error: "Falta el curso." }, { status: 400 })
      }

      const { data: existing, error: loadError } = await supabaseAdmin
        .from("cursos")
        .select("id, nombre, destacado")
        .eq("id", body.id)
        .maybeSingle()

      if (loadError) throw loadError
      if (!existing) {
        return NextResponse.json({ error: "No encontramos el curso." }, { status: 404 })
      }

      const { data, error } = await supabaseAdmin
        .from("cursos")
        .update({ destacado: !existing.destacado })
        .eq("id", body.id)
        .select("*")
        .single()

      if (error) throw error

      await logAdminActivityServer(session, {
        action: !existing.destacado ? "Destacar" : "Quitar destacado",
        section: "Cursos",
        target: existing.nombre,
      })

      return NextResponse.json({ ok: true, record: data })
    }

    if (body.action !== "save") {
      return NextResponse.json({ error: "Accion no soportada." }, { status: 400 })
    }

    const payload = {
      nombre: body.payload.nombre?.trim() || "",
      descripcion: body.payload.descripcion?.trim() || "",
      institucion_id: body.payload.institucion_id || null,
      responsable: body.payload.responsable?.trim() || "",
      contacto: body.payload.contacto?.trim() || "",
      web_url: normalizeUrl(body.payload.web_url),
      instagram_url: normalizeUrl(body.payload.instagram_url),
      facebook_url: normalizeUrl(body.payload.facebook_url),
      imagen: normalizeText(body.payload.imagen),
      destacado: Boolean(body.payload.destacado),
      estado: body.payload.estado || "activo",
      usa_whatsapp: Boolean(body.payload.usa_whatsapp),
    }

    if (!payload.nombre || !payload.descripcion || !payload.responsable) {
      return NextResponse.json(
        { error: "Completa los datos principales del curso o clase." },
        { status: 400 }
      )
    }

    if (!body.id && !payload.imagen) {
      return NextResponse.json(
        { error: "Tenes que cargar una foto para crear un curso o clase." },
        { status: 400 }
      )
    }

    // Route all admin writes through the server to reduce client-side exposure.
    if (body.id) {
      const { data, error } = await supabaseAdmin
        .from("cursos")
        .update(payload)
        .eq("id", body.id)
        .select("*")
        .single()

      if (error) throw error

      await logAdminActivityServer(session, {
        action: payload.estado === "borrador" ? "Guardar borrador" : "Editar",
        section: "Cursos",
        target: payload.nombre,
      })

      return NextResponse.json({ ok: true, record: data })
    }

    const { data, error } = await supabaseAdmin
      .from("cursos")
      .insert([payload])
      .select("*")
      .single()

    if (error) throw error

    await logAdminActivityServer(session, {
      action: payload.estado === "borrador" ? "Crear borrador" : "Crear",
      section: "Cursos",
      target: payload.nombre,
    })

    return NextResponse.json({ ok: true, record: data })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No pudimos guardar el curso o clase."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
