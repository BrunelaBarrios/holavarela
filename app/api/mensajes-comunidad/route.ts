import { NextResponse, type NextRequest } from "next/server"
import { getSupabaseAdmin } from "../../lib/supabaseAdmin"
import { consumeRateLimit, getClientIp } from "../../lib/rateLimit"
import { validatePublicCommunityMessage } from "../../lib/communityMessages"

export const dynamic = "force-dynamic"

async function activateDueMessages() {
  const admin = getSupabaseAdmin()
  const now = new Date().toISOString()
  await admin
    .from("mensajes_comunidad")
    .update({ estado: "activo" })
    .eq("estado", "programado")
    .lte("fecha_publicacion", now)
    .gt("fecha_vencimiento", now)
  await admin
    .from("mensajes_comunidad")
    .update({ estado: "vencido" })
    .in("estado", ["activo", "programado"])
    .lte("fecha_vencimiento", now)
}

export async function GET() {
  try {
    await activateDueMessages()
    const admin = getSupabaseAdmin()
    const now = new Date().toISOString()
    const [
      { data: messages, error },
      { data: institutions },
      { count: activeOpportunityCount },
    ] = await Promise.all([
      admin
        .from("mensajes_comunidad")
        .select("id, nombre, mensaje, fecha_publicacion, fecha_vencimiento, institucion_id, instituciones(nombre)")
        .eq("estado", "activo")
        .lte("fecha_publicacion", now)
        .gt("fecha_vencimiento", now)
        .order("fecha_publicacion", { ascending: false })
        .limit(20),
      admin
        .from("instituciones")
        .select("id, nombre")
        .or("estado.is.null,estado.eq.activo")
        .order("nombre", { ascending: true }),
      admin
        .from("oportunidades_laborales")
        .select("id", { count: "exact", head: true })
        .eq("estado", "activa")
        .or(`fecha_vencimiento.is.null,fecha_vencimiento.gte.${now.slice(0, 10)}`),
    ])
    if (error) throw error
    return NextResponse.json({
      messages: messages || [],
      institutions: institutions || [],
      activeOpportunityCount: activeOpportunityCount || 0,
    })
  } catch (error) {
    console.error("community messages GET", error)
    return NextResponse.json({ error: "No pudimos cargar los mensajes." }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const rate = consumeRateLimit({
      key: `community-message:${getClientIp(request)}`,
      limit: 5,
      windowMs: 60 * 60 * 1000,
    })
    if (!rate.allowed) {
      return NextResponse.json({ error: "Alcanzaste el límite de envíos. Probá nuevamente más tarde." }, { status: 429 })
    }

    const result = validatePublicCommunityMessage(await request.json())
    if (!result.value) return NextResponse.json({ error: result.error }, { status: 400 })

    const admin = getSupabaseAdmin()
    if (result.value.institucionId) {
      const { data } = await admin
        .from("instituciones")
        .select("id")
        .eq("id", result.value.institucionId)
        .or("estado.is.null,estado.eq.activo")
        .maybeSingle()
      if (!data) return NextResponse.json({ error: "La institución seleccionada no está disponible." }, { status: 400 })
    }

    const { error } = await admin.from("mensajes_comunidad").insert([{
      nombre: result.value.nombre,
      mensaje: result.value.mensaje,
      institucion_id: result.value.institucionId,
      fecha_programada: result.value.fechaProgramada,
      estado: "pendiente",
    }])
    if (error) throw error
    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (error) {
    console.error("community messages POST", error)
    return NextResponse.json({ error: "No pudimos enviar el mensaje." }, { status: 500 })
  }
}
