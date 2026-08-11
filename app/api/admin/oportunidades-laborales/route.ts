import { NextResponse, type NextRequest } from "next/server"
import { revalidatePath } from "next/cache"
import { readAdminSessionFromRequest } from "../../../lib/adminSession"
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin"
import { JOB_STATUSES } from "../../../lib/jobOpportunities"

const clean = (value: unknown, max = 3000) =>
  typeof value === "string" ? value.trim().slice(0, max) : ""

const todayInUruguay = () => new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Montevideo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date())

async function expireClosedOpportunities() {
  return getSupabaseAdmin()
    .from("oportunidades_laborales")
    .update({ estado: "vencida" })
    .eq("estado", "activa")
    .lt("fecha_vencimiento", todayInUruguay())
}

const cleanHttpUrl = (value: unknown) => {
  const raw = clean(value, 500)
  if (!raw) return null
  try {
    const normalized = /^[a-z][a-z\d+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`
    const url = new URL(normalized)
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  if (!await readAdminSessionFromRequest(request)) return NextResponse.json({ error: "No autorizado." }, { status: 401 })
  const { error: expirationError } = await expireClosedOpportunities()
  if (expirationError) return NextResponse.json({ error: expirationError.message }, { status: 500 })
  const params = request.nextUrl.searchParams
  const supabaseAdmin = getSupabaseAdmin()
  let query = supabaseAdmin.from("oportunidades_laborales").select("*").order("fecha_creacion", { ascending: false })
  const type = params.get("tipo"), status = params.get("estado"), category = params.get("categoria")
  if (type) query = query.eq("tipo_publicacion", type)
  if (status) query = query.eq("estado", status)
  if (category) query = query.eq("categoria", category)
  const [{ data, error }, visibilityResult] = await Promise.all([
    query.limit(300),
    supabaseAdmin
      .from("sitio")
      .select("mostrar_oportunidades_laborales_home")
      .eq("id", 1)
      .maybeSingle(),
  ])
  return error
    ? NextResponse.json({ error: error.message }, { status: 500 })
    : NextResponse.json({
        items: data || [],
        visibleEnHome:
          visibilityResult.error?.code === "42703"
            ? true
            : visibilityResult.data?.mostrar_oportunidades_laborales_home !== false,
      })
}

export async function POST(request: NextRequest) {
  if (!await readAdminSessionFromRequest(request)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 })
  }

  const body = await request.json()
  const nombrePublicante = clean(body.nombre_publicante, 120)
  const titulo = clean(body.titulo, 160)
  const descripcion = clean(body.descripcion)
  const localidad = clean(body.localidad, 100)
  const images = Array.isArray(body.imagenes_url)
    ? body.imagenes_url
        .slice(0, 6)
        .map((value: unknown) => clean(value, 1_000_000))
        .filter((value: string) => value.startsWith("data:image/"))
    : []
  const legacyImage = clean(body.imagen_url, 1_000_000)
  const posterImages = images.length ? images : legacyImage.startsWith("data:image/") ? [legacyImage] : []
  const submittedLink = clean(body.enlace_url, 500)
  const link = cleanHttpUrl(submittedLink)

  if (!nombrePublicante || !titulo || !localidad || !posterImages.length) {
    return NextResponse.json(
      { error: "Completá el título, el anunciante, la localidad y seleccioná un afiche válido." },
      { status: 400 }
    )
  }
  if (submittedLink && !link) {
    return NextResponse.json({ error: "Ingresá un enlace válido, por ejemplo www.ejemplo.com." }, { status: 400 })
  }

  const payload = {
    tipo_publicacion: "oferta",
    nombre_publicante: nombrePublicante,
    titulo,
    categoria: clean(body.categoria, 80) || "Otros",
    descripcion: descripcion || "Consultá toda la información en el afiche.",
    requisitos: clean(body.requisitos) || null,
    localidad,
    telefono: clean(body.telefono, 50) || null,
    email: clean(body.email, 180).toLowerCase() || null,
    forma_postulacion: clean(body.forma_postulacion, 500) || null,
    horario: link,
    imagen_url: posterImages.length === 1 ? posterImages[0] : JSON.stringify(posterImages),
    fecha_vencimiento: clean(body.fecha_vencimiento, 20) || null,
    estado: "activa",
  }

  const { data, error } = await getSupabaseAdmin()
    .from("oportunidades_laborales")
    .insert(payload)
    .select("id")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  revalidatePath("/oportunidades-laborales")
  revalidatePath("/")
  return NextResponse.json({ ok: true, id: data.id }, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  if (!await readAdminSessionFromRequest(request)) return NextResponse.json({ error: "No autorizado." }, { status: 401 })
  const body = await request.json()
  if (body.action === "toggle_home_visibility") {
    const visible = body.visible === true
    const { error } = await getSupabaseAdmin()
      .from("sitio")
      .upsert({ id: 1, mostrar_oportunidades_laborales_home: visible })

    if (error) {
      return NextResponse.json(
        {
          error:
            error.code === "42703"
              ? "Falta aplicar la columna de visibilidad de oportunidades en Supabase."
              : error.message,
        },
        { status: 500 }
      )
    }

    revalidatePath("/")
    return NextResponse.json({ ok: true, visibleEnHome: visible })
  }
  if (!body.id) return NextResponse.json({ error: "Falta el identificador." }, { status: 400 })
  const allowed = ["nombre_publicante","titulo","categoria","descripcion","requisitos","experiencia","habilidades","tipo_jornada","horario","disponibilidad","localidad","telefono","email","forma_postulacion","enlace_url","imagen_url","cv_url","fecha_vencimiento"]
  const changes: Record<string, unknown> = {}
  for (const key of allowed) {
    if (!(key in body)) continue
    if (key === "enlace_url") {
      const submittedLink = clean(body[key], 500)
      const link = cleanHttpUrl(submittedLink)
      if (submittedLink && !link) return NextResponse.json({ error: "Ingresá un enlace válido, por ejemplo www.ejemplo.com." }, { status: 400 })
      changes.horario = link
    } else {
      changes[key] = typeof body[key] === "string" ? body[key].trim() || null : body[key]
    }
  }
  if (body.estado && JOB_STATUSES.includes(body.estado)) changes.estado = body.estado
  const { error } = await getSupabaseAdmin().from("oportunidades_laborales").update(changes).eq("id", body.id)
  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ ok: true })
}

export async function DELETE(request: NextRequest) {
  if (!await readAdminSessionFromRequest(request)) return NextResponse.json({ error: "No autorizado." }, { status: 401 })
  const id = request.nextUrl.searchParams.get("id")
  if (!id) return NextResponse.json({ error: "Falta el identificador." }, { status: 400 })
  const { error } = await getSupabaseAdmin().from("oportunidades_laborales").delete().eq("id", id)
  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ ok: true })
}
