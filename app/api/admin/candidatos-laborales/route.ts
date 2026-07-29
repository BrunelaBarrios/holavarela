import { NextResponse, type NextRequest } from "next/server"
import { readAdminSessionFromRequest } from "../../../lib/adminSession"
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin"

const clean = (value: unknown, max = 500) =>
  typeof value === "string" ? value.trim().slice(0, max) : ""

export async function GET(request: NextRequest) {
  if (!await readAdminSessionFromRequest(request)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 })
  }
  const params = request.nextUrl.searchParams
  const search = clean(params.get("q"), 120)
  const status = clean(params.get("estado"), 30)
  let query = getSupabaseAdmin()
    .from("candidatos_laborales")
    .select("*")
    .order("fecha_creacion", { ascending: false })
    .limit(500)
  if (status) query = query.eq("estado", status)
  if (search) {
    const safe = search.replace(/[%_,]/g, " ")
    query = query.or(
      `nombre_completo.ilike.%${safe}%,puesto_buscado.ilike.%${safe}%,habilidades.ilike.%${safe}%,experiencia.ilike.%${safe}%,localidad.ilike.%${safe}%`
    )
  }
  const { data, error } = await query
  return error
    ? NextResponse.json({ error: error.message }, { status: 500 })
    : NextResponse.json({ items: data || [] })
}

export async function PATCH(request: NextRequest) {
  if (!await readAdminSessionFromRequest(request)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 })
  }
  const body = await request.json()
  const id = clean(body.id, 80)
  if (!id) return NextResponse.json({ error: "Falta el identificador." }, { status: 400 })
  const allowedStatuses = ["nuevo", "contactado", "entrevistado", "archivado"]
  const changes: Record<string, unknown> = {}
  if (allowedStatuses.includes(body.estado)) changes.estado = body.estado
  if ("notas_internas" in body) changes.notas_internas = clean(body.notas_internas, 3000) || null
  const { error } = await getSupabaseAdmin().from("candidatos_laborales").update(changes).eq("id", id)
  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ ok: true })
}

export async function DELETE(request: NextRequest) {
  if (!await readAdminSessionFromRequest(request)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 })
  }
  const id = clean(request.nextUrl.searchParams.get("id"), 80)
  if (!id) return NextResponse.json({ error: "Falta el identificador." }, { status: 400 })
  const { error } = await getSupabaseAdmin().from("candidatos_laborales").delete().eq("id", id)
  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ ok: true })
}
