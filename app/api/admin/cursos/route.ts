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
    servicio_id?: number | null
    edad_destino?: string | string[] | null
    categoria?: string | null
    lugar?: string | null
    dias_semana?: string[] | null
    hora_inicio?: string | null
    hora_fin?: string | null
    horarios?: Array<{ dia?: string; hora_inicio?: string; hora_fin?: string }> | null
    costo_tipo?: string | null
    responsable?: string
    contacto?: string
    web_url?: string | null
    instagram_url?: string | null
    facebook_url?: string | null
    imagen?: string | null
    premium_galeria?: string[] | null
    destacado?: boolean
    estado?: string | null
    usa_whatsapp?: boolean
  }
}

const COURSE_AGE_GROUPS = new Set([
  "adultos",
  "adultos_mayores",
  "ninos",
  "adolescentes",
  "todas_las_edades",
])

const COURSE_DAYS = new Set([
  "lunes",
  "martes",
  "miercoles",
  "jueves",
  "viernes",
  "sabado",
  "domingo",
])

const COURSE_COST_TYPES = new Set(["gratis", "con_costo"])

const ADMIN_COURSE_SELECT =
  "id, nombre, descripcion, institucion_id, servicio_id, edad_destino, categoria, lugar, dias_semana, hora_inicio, hora_fin, horarios, costo_tipo, responsable, contacto, web_url, instagram_url, facebook_url, premium_galeria, destacado, estado, usa_whatsapp"

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

function normalizeTextList(value?: string[] | null) {
  return Array.isArray(value)
    ? value.map((item) => item.trim()).filter(Boolean)
    : []
}

function normalizeCourseAgeGroups(value?: string | string[] | null) {
  const values = Array.isArray(value) ? value : (value || "").split(",")
  const groups = values
    .map((item) => item.trim())
    .filter((item) => COURSE_AGE_GROUPS.has(item))

  const uniqueGroups = Array.from(new Set(groups))
  const specificGroups = uniqueGroups.filter((item) => item !== "todas_las_edades")

  return (specificGroups.length ? specificGroups : ["todas_las_edades"]).join(",")
}

function normalizeCourseDays(value?: string[] | null) {
  if (!Array.isArray(value)) return []

  return Array.from(
    new Set(value.map((item) => item.trim()).filter((item) => COURSE_DAYS.has(item)))
  )
}

function normalizeTime(value?: string | null) {
  const normalized = value?.trim()
  if (!normalized) return null

  return /^\d{2}:\d{2}$/.test(normalized) ? normalized : null
}

function normalizeCostType(value?: string | null) {
  return value && COURSE_COST_TYPES.has(value) ? value : "gratis"
}

function normalizeCourseSchedules(
  value?: Array<{ dia?: string; hora_inicio?: string; hora_fin?: string }> | null
) {
  if (!Array.isArray(value)) return []

  return value.flatMap((schedule) => {
    const dia = schedule.dia?.trim()
    const horaInicio = normalizeTime(schedule.hora_inicio)
    const horaFin = normalizeTime(schedule.hora_fin)
    if (!dia || !COURSE_DAYS.has(dia) || !horaInicio) return []

    return [{ dia, hora_inicio: horaInicio, hora_fin: horaFin }]
  })
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
        .select(ADMIN_COURSE_SELECT)
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
        .select(ADMIN_COURSE_SELECT)
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

    const horarios = normalizeCourseSchedules(body.payload.horarios)
    const legacyDays = normalizeCourseDays(body.payload.dias_semana)
    const payload = {
      nombre: body.payload.nombre?.trim() || "",
      descripcion: body.payload.descripcion?.trim() || "",
      institucion_id: body.payload.institucion_id || null,
      servicio_id: body.payload.servicio_id || null,
      edad_destino: normalizeCourseAgeGroups(body.payload.edad_destino),
      categoria: normalizeText(body.payload.categoria),
      lugar: normalizeText(body.payload.lugar),
      dias_semana: horarios.length
        ? Array.from(new Set(horarios.map((schedule) => schedule.dia)))
        : legacyDays,
      hora_inicio: horarios[0]?.hora_inicio || normalizeTime(body.payload.hora_inicio),
      hora_fin: horarios[0]?.hora_fin || normalizeTime(body.payload.hora_fin),
      horarios,
      costo_tipo: normalizeCostType(body.payload.costo_tipo),
      responsable: body.payload.responsable?.trim() || "",
      contacto: body.payload.contacto?.trim() || "",
      web_url: normalizeUrl(body.payload.web_url),
      instagram_url: normalizeUrl(body.payload.instagram_url),
      facebook_url: normalizeUrl(body.payload.facebook_url),
      premium_galeria: normalizeTextList(body.payload.premium_galeria),
      destacado: Boolean(body.payload.destacado),
      estado: body.payload.estado || "activo",
      usa_whatsapp: Boolean(body.payload.usa_whatsapp),
      ...(Object.prototype.hasOwnProperty.call(body.payload, "imagen")
        ? { imagen: normalizeText(body.payload.imagen) }
        : {}),
    }

    if (!payload.nombre || !payload.descripcion || !payload.responsable) {
      return NextResponse.json(
        { error: "Completa los datos principales del curso o clase." },
        { status: 400 }
      )
    }

    if (payload.institucion_id && payload.servicio_id) {
      return NextResponse.json(
        { error: "El curso puede estar asociado a una institución o a un servicio, no a ambos al mismo tiempo." },
        { status: 400 }
      )
    }

    // Route all admin writes through the server to reduce client-side exposure.
    if (body.id) {
      const { data, error } = await supabaseAdmin
        .from("cursos")
        .update(payload)
        .eq("id", body.id)
        .select(ADMIN_COURSE_SELECT)
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
      .select(ADMIN_COURSE_SELECT)
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
