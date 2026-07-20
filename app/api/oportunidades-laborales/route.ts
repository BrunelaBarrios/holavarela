import { NextResponse, type NextRequest } from "next/server"
import { getSupabaseAdmin } from "../../lib/supabaseAdmin"
import { JOB_CATEGORIES, JOB_SCHEDULES } from "../../lib/jobOpportunities"

const clean = (value: unknown, max = 3000) => typeof value === "string" ? value.trim().slice(0, max) : ""

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams
    const id = clean(params.get("id"), 80)
    const limit = Math.min(Math.max(Number(params.get("limit")) || 50, 1), 100)
    let query = getSupabaseAdmin().from("oportunidades_laborales").select(
      id
        ? "*"
        : "id,tipo_publicacion,nombre_publicante,titulo,categoria,descripcion,requisitos,experiencia,habilidades,tipo_jornada,horario,disponibilidad,localidad,estado,fecha_creacion,fecha_vencimiento"
    ).eq("estado", "activa")
    if (id) query = query.eq("id", id)
    const type = clean(params.get("tipo"), 20)
    const category = clean(params.get("categoria"), 80)
    const schedule = clean(params.get("jornada"), 80)
    const location = clean(params.get("localidad"), 100)
    if (type === "oferta" || type === "busqueda") query = query.eq("tipo_publicacion", type)
    if (category) query = query.eq("categoria", category)
    if (schedule) query = query.eq("tipo_jornada", schedule)
    if (location) query = query.ilike("localidad", location)
    const { data, error } = await query.order("fecha_creacion", { ascending: false }).limit(limit)
    if (error) throw error
    if (id && !data?.length) return NextResponse.json({ error: "Publicación no encontrada." }, { status: 404 })
    return NextResponse.json({ items: data || [] })
  } catch {
    return NextResponse.json({ error: "No se pudieron cargar las oportunidades." }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const tipo = clean(body.tipo_publicacion, 20)
    const categoria = clean(body.categoria, 80)
    const jornada = clean(body.tipo_jornada, 80)
    const nombre = clean(body.nombre_publicante, 120)
    const titulo = clean(body.titulo, 160)
    const descripcion = clean(body.descripcion)
    const localidad = clean(body.localidad, 100)
    if (!body.consentimiento || !["oferta", "busqueda"].includes(tipo) || !nombre || !titulo || !descripcion || !localidad || !JOB_CATEGORIES.includes(categoria as never)) {
      return NextResponse.json({ error: "Revisá los campos obligatorios y el consentimiento." }, { status: 400 })
    }
    if (jornada && !JOB_SCHEDULES.includes(jornada as never)) return NextResponse.json({ error: "Tipo de jornada inválido." }, { status: 400 })
    const payload = {
      tipo_publicacion: tipo, nombre_publicante: nombre, titulo, categoria, descripcion, localidad,
      requisitos: clean(body.requisitos) || null, experiencia: clean(body.experiencia) || null,
      habilidades: clean(body.habilidades) || null, tipo_jornada: jornada || null,
      horario: clean(body.horario, 200) || null, disponibilidad: clean(body.disponibilidad, 300) || null,
      telefono: clean(body.telefono, 50) || null, email: clean(body.email, 180).toLowerCase() || null,
      forma_postulacion: clean(body.forma_postulacion, 500) || null,
      imagen_url: clean(body.imagen_url, 1000000) || null, cv_url: clean(body.cv_url, 1500000) || null,
      fecha_vencimiento: clean(body.fecha_vencimiento, 20) || null, estado: "pendiente",
    }
    const { data, error } = await getSupabaseAdmin().from("oportunidades_laborales").insert(payload).select("id").single()
    if (error) throw error
    return NextResponse.json({ ok: true, id: data.id, message: "Publicación enviada. La revisaremos antes de publicarla." }, { status: 201 })
  } catch {
    return NextResponse.json({ error: "No pudimos enviar la publicación. Intentá nuevamente." }, { status: 500 })
  }
}
