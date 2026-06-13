import { revalidatePath } from "next/cache"
import { NextResponse, type NextRequest } from "next/server"
import { readAdminSessionFromRequest } from "../../../lib/adminSession"
import { logAdminActivityServer } from "../../../lib/adminActivityServer"
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin"

type SaveInstitucionPayload = {
  action: "save"
  id?: number
  payload: {
    nombre?: string
    descripcion?: string | null
    direccion?: string | null
    telefono?: string | null
    web_url?: string | null
    instagram_url?: string | null
    facebook_url?: string | null
    foto?: string | null
    estado?: string | null
    usa_whatsapp?: boolean
    destacado?: boolean
    premium_detalle?: string | null
    premium_galeria?: string[] | null
    premium_extra_titulo?: string | null
    premium_extra_detalle?: string | null
    premium_extra_galeria?: string[] | null
    premium_activo?: boolean
    premium_cursos_activo?: boolean
    premium_cursos_titulo?: string | null
  }
}

type DeleteInstitucionPayload = {
  action: "delete"
  id?: number
}

type ToggleInstitucionVisibilityPayload = {
  action: "toggle_visibility"
  id?: number
}

type ToggleInstitucionFeaturedPayload = {
  action: "toggle_featured"
  id?: number
}

type InstitucionActionPayload =
  | SaveInstitucionPayload
  | DeleteInstitucionPayload
  | ToggleInstitucionVisibilityPayload
  | ToggleInstitucionFeaturedPayload

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

function normalizeGallery(value?: string[] | null) {
  const normalized = (value || [])
    .map((item) => item.trim())
    .filter(Boolean)

  return normalized.length ? normalized : null
}

const optionalInstitutionColumns = [
  "destacado",
  "web_url",
  "instagram_url",
  "facebook_url",
  "usa_whatsapp",
  "premium_detalle",
  "premium_galeria",
  "premium_extra_titulo",
  "premium_extra_detalle",
  "premium_extra_galeria",
  "premium_activo",
  "premium_cursos_activo",
  "premium_cursos_titulo",
  "foto",
] as const

type InstitucionPayload = Record<string, unknown>

function getMissingOptionalColumn(error: { code?: string; message?: string }) {
  if (error.code !== "42703") return null

  const message = (error.message || "").toLowerCase()
  return optionalInstitutionColumns.find((column) =>
    message.includes(column.toLowerCase())
  ) || null
}

async function saveInstitucionWithSchemaFallback(params: {
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>
  id?: number
  payload: InstitucionPayload
}) {
  const payload = { ...params.payload }
  const skippedColumns: string[] = []

  for (let attempt = 0; attempt <= optionalInstitutionColumns.length; attempt += 1) {
    const query = params.id
      ? params.supabaseAdmin
          .from("instituciones")
          .update(payload)
          .eq("id", params.id)
          .select("*")
          .single()
      : params.supabaseAdmin
          .from("instituciones")
          .insert([payload])
          .select("*")
          .single()

    const { data, error } = await query

    if (!error) {
      return { data, skippedColumns, error: null }
    }

    const missingColumn = getMissingOptionalColumn(error)
    if (!missingColumn || !(missingColumn in payload)) {
      return { data: null, skippedColumns, error }
    }

    delete payload[missingColumn]
    skippedColumns.push(missingColumn)
  }

  return {
    data: null,
    skippedColumns,
    error: new Error("No se pudo guardar la institucion con las columnas disponibles."),
  }
}

function revalidateInstitucionPages(id?: number) {
  revalidatePath("/")
  revalidatePath("/instituciones")
  if (id) {
    revalidatePath(`/instituciones/${id}`)
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await readAdminSessionFromRequest(request)
    if (!session) {
      return NextResponse.json({ error: "Sesion admin requerida." }, { status: 401 })
    }

    const supabaseAdmin = getSupabaseAdmin()
    const body = (await request.json()) as InstitucionActionPayload

    if (body.action === "delete") {
      if (!body.id) {
        return NextResponse.json({ error: "Falta la institución a eliminar." }, { status: 400 })
      }

      const { data: existing, error: loadError } = await supabaseAdmin
        .from("instituciones")
        .select("id, nombre")
        .eq("id", body.id)
        .maybeSingle()

      if (loadError) throw loadError
      if (!existing) {
        return NextResponse.json({ error: "No encontramos la institución." }, { status: 404 })
      }

      const { error } = await supabaseAdmin.from("instituciones").delete().eq("id", body.id)
      if (error) throw error

      await logAdminActivityServer(session, {
        action: "Eliminar",
        section: "Instituciones",
        target: existing.nombre,
      })

      revalidateInstitucionPages(body.id)

      return NextResponse.json({ ok: true })
    }

    if (body.action === "toggle_visibility") {
      if (!body.id) {
        return NextResponse.json({ error: "Falta la institución." }, { status: 400 })
      }

      const { data: existing, error: loadError } = await supabaseAdmin
        .from("instituciones")
        .select("id, nombre, estado")
        .eq("id", body.id)
        .maybeSingle()

      if (loadError) throw loadError
      if (!existing) {
        return NextResponse.json({ error: "No encontramos la institución." }, { status: 404 })
      }

      const nextEstado =
        existing.estado === "oculto" || existing.estado === "borrador" ? "activo" : "oculto"

      const { data, error } = await supabaseAdmin
        .from("instituciones")
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
        section: "Instituciones",
        target: existing.nombre,
      })

      revalidateInstitucionPages(body.id)

      return NextResponse.json({ ok: true, record: data })
    }

    if (body.action === "toggle_featured") {
      if (!body.id) {
        return NextResponse.json({ error: "Falta la institución." }, { status: 400 })
      }

      const { data: existing, error: loadError } = await supabaseAdmin
        .from("instituciones")
        .select("id, nombre, destacado")
        .eq("id", body.id)
        .maybeSingle()

      if (loadError) throw loadError
      if (!existing) {
        return NextResponse.json({ error: "No encontramos la institución." }, { status: 404 })
      }

      const { data, error } = await supabaseAdmin
        .from("instituciones")
        .update({ destacado: !existing.destacado })
        .eq("id", body.id)
        .select("*")
        .single()

      if (error) throw error

      await logAdminActivityServer(session, {
        action: !existing.destacado ? "Destacar" : "Quitar destacado",
        section: "Instituciones",
        target: existing.nombre,
      })

      revalidateInstitucionPages(body.id)

      return NextResponse.json({ ok: true, record: data })
    }

    if (body.action !== "save") {
      return NextResponse.json({ error: "Accion no soportada." }, { status: 400 })
    }

    const payload = {
      nombre: body.payload.nombre?.trim() || "",
      descripcion: normalizeText(body.payload.descripcion),
      direccion: normalizeText(body.payload.direccion),
      telefono: normalizeText(body.payload.telefono),
      web_url: normalizeUrl(body.payload.web_url),
      instagram_url: normalizeUrl(body.payload.instagram_url),
      facebook_url: normalizeUrl(body.payload.facebook_url),
      estado: body.payload.estado || "activo",
      usa_whatsapp: Boolean(body.payload.usa_whatsapp),
      ...(body.payload.destacado !== undefined
        ? { destacado: Boolean(body.payload.destacado) }
        : {}),
      premium_detalle: normalizeText(body.payload.premium_detalle),
      premium_galeria: normalizeGallery(body.payload.premium_galeria),
      premium_extra_titulo: normalizeText(body.payload.premium_extra_titulo),
      premium_extra_detalle: normalizeText(body.payload.premium_extra_detalle),
      premium_extra_galeria: normalizeGallery(body.payload.premium_extra_galeria),
      premium_activo: Boolean(body.payload.premium_activo),
      premium_cursos_activo: Boolean(body.payload.premium_cursos_activo),
      premium_cursos_titulo: normalizeText(body.payload.premium_cursos_titulo),
      ...("foto" in body.payload ? { foto: normalizeText(body.payload.foto) } : {}),
    }

    if (!payload.nombre) {
      return NextResponse.json({ error: "El nombre es obligatorio." }, { status: 400 })
    }

    if (body.id) {
      const { data, error, skippedColumns } = await saveInstitucionWithSchemaFallback({
        supabaseAdmin,
        id: body.id,
        payload,
      })

      if (error) throw error

      await logAdminActivityServer(session, {
        action: "Editar",
        section: "Instituciones",
        target: payload.nombre,
      })

      revalidateInstitucionPages(body.id)

      return NextResponse.json({ ok: true, record: data, skippedColumns })
    }

    const { data, error, skippedColumns } = await saveInstitucionWithSchemaFallback({
      supabaseAdmin,
      payload,
    })

    if (error) throw error

    await logAdminActivityServer(session, {
      action: "Crear",
      section: "Instituciones",
      target: payload.nombre,
    })

    revalidateInstitucionPages(data.id)

    return NextResponse.json({ ok: true, record: data, skippedColumns })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No pudimos guardar la institución."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
