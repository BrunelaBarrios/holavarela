import { NextResponse, type NextRequest } from "next/server"
import { getSupabaseAdmin } from "../../lib/supabaseAdmin"
import { consumeRateLimit, getClientIp } from "../../lib/rateLimit"

const clean = (value: unknown, max = 3000) =>
  typeof value === "string" ? value.trim().slice(0, max) : ""

export async function POST(request: NextRequest) {
  const rate = consumeRateLimit({
    key: `candidate:${getClientIp(request)}`,
    limit: 5,
    windowMs: 60 * 60 * 1000,
  })
  if (!rate.allowed) {
    return NextResponse.json({ error: "Alcanzaste el límite de envíos. Intentá más tarde." }, { status: 429 })
  }

  try {
    const body = await request.json()
    const nombre = clean(body.nombre_publicante, 120)
    const presentacion = clean(body.descripcion)
    const experiencia = clean(body.experiencia)
    const habilidades = clean(body.habilidades)
    const localidad = clean(body.localidad, 100)
    const autorizaPublicacion = body.publicar_perfil === true
    const cvUrl = clean(body.cv_url, 3_000_000)

    if (!body.consentimiento || !nombre || !presentacion || !experiencia || !habilidades || !localidad) {
      return NextResponse.json({ error: "Revisá los campos obligatorios y la autorización de almacenamiento." }, { status: 400 })
    }
    if (cvUrl && !cvUrl.startsWith("data:application/pdf;base64,")) {
      return NextResponse.json({ error: "El currículum debe ser un archivo PDF válido." }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    const candidatePayload = {
      nombre_completo: nombre,
      puesto_buscado: clean(body.titulo, 160) || null,
      presentacion,
      experiencia,
      habilidades,
      disponibilidad: clean(body.disponibilidad, 300) || null,
      localidad,
      telefono: clean(body.telefono, 50) || null,
      email: clean(body.email, 180).toLowerCase() || null,
      cv_url: cvUrl || null,
      foto_url: clean(body.imagen_url, 1_000_000) || null,
      autoriza_publicacion: autorizaPublicacion,
      estado: "nuevo",
    }
    const { data, error } = await supabase
      .from("candidatos_laborales")
      .insert(candidatePayload)
      .select("id")
      .single()
    if (error) throw error

    if (autorizaPublicacion) {
      await supabase.from("oportunidades_laborales").insert({
        tipo_publicacion: "busqueda",
        nombre_publicante: nombre,
        titulo: clean(body.titulo, 160) || "Búsqueda laboral",
        categoria: "Otros",
        descripcion: presentacion,
        experiencia,
        habilidades,
        disponibilidad: clean(body.disponibilidad, 300) || null,
        localidad,
        telefono: clean(body.telefono, 50) || null,
        email: clean(body.email, 180).toLowerCase() || null,
        imagen_url: clean(body.imagen_url, 1_000_000) || null,
        cv_url: null,
        estado: "pendiente",
      })
    }

    return NextResponse.json({
      ok: true,
      id: data.id,
      message: autorizaPublicacion
        ? "Guardamos tu currículum de forma privada. Tu perfil público quedó pendiente de revisión."
        : "Guardamos tu información y currículum de forma privada. No se publicará en el sitio.",
    }, { status: 201 })
  } catch {
    return NextResponse.json({
      error: "No pudimos guardar la información. Verificá que la base de currículums esté configurada.",
    }, { status: 500 })
  }
}
