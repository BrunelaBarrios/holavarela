import { NextResponse, type NextRequest } from "next/server"
import { readAdminSessionFromRequest } from "../../../lib/adminSession"
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin"
import { JOB_STATUSES } from "../../../lib/jobOpportunities"

export async function GET(request: NextRequest) {
  if (!await readAdminSessionFromRequest(request)) return NextResponse.json({ error: "No autorizado." }, { status: 401 })
  const params = request.nextUrl.searchParams
  let query = getSupabaseAdmin().from("oportunidades_laborales").select("*").order("fecha_creacion", { ascending: false })
  const type = params.get("tipo"), status = params.get("estado"), category = params.get("categoria")
  if (type) query = query.eq("tipo_publicacion", type)
  if (status) query = query.eq("estado", status)
  if (category) query = query.eq("categoria", category)
  const { data, error } = await query.limit(300)
  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ items: data || [] })
}

export async function PATCH(request: NextRequest) {
  if (!await readAdminSessionFromRequest(request)) return NextResponse.json({ error: "No autorizado." }, { status: 401 })
  const body = await request.json()
  if (!body.id) return NextResponse.json({ error: "Falta el identificador." }, { status: 400 })
  const allowed = ["nombre_publicante","titulo","categoria","descripcion","requisitos","experiencia","habilidades","tipo_jornada","horario","disponibilidad","localidad","telefono","email","forma_postulacion","imagen_url","cv_url","fecha_vencimiento"]
  const changes: Record<string, unknown> = {}
  for (const key of allowed) if (key in body) changes[key] = typeof body[key] === "string" ? body[key].trim() || null : body[key]
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
