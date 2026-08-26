import { revalidatePath } from "next/cache"
import { NextResponse, type NextRequest } from "next/server"
import { readHechoVarelaSession } from "../../../lib/hechoVarelaAdminSession"
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin"
import { makeSlug } from "../../../lib/hechoEnVarela"

const refresh = (slug?: string) => { revalidatePath("/hecho-en-varela"); if (slug) { revalidatePath(`/hecho-en-varela/producto/${slug}`); revalidatePath(`/hecho-en-varela/emprendimiento/${slug}`) } }

export async function GET(request: NextRequest) {
  const session = await readHechoVarelaSession(request)
  if (!session) return NextResponse.json({ error: "Acceso requerido." }, { status: 401 })
  const db = getSupabaseAdmin()
  let venturesQuery = db.from("emprendimientos_varela").select("*").order("orden")
  let productsQuery = db.from("productos_varela").select("*, emprendimientos_varela(nombre)").order("orden")
  if (session.role !== "superadmin") {
    if (!session.emprendimientoId) return NextResponse.json({ error: "La cuenta no tiene un emprendimiento asignado." }, { status: 403 })
    venturesQuery = venturesQuery.eq("id", session.emprendimientoId)
    productsQuery = productsQuery.eq("emprendimiento_id", session.emprendimientoId)
  }
  const [ventures, products] = await Promise.all([venturesQuery, productsQuery])
  if (ventures.error || products.error) return NextResponse.json({ error: ventures.error?.message || products.error?.message }, { status: 500 })
  return NextResponse.json({ ventures: ventures.data, products: products.data, session: { username: session.username, role: session.role } })
}

export async function POST(request: NextRequest) {
 try {
  const session = await readHechoVarelaSession(request)
  if (!session) return NextResponse.json({ error: "Acceso requerido." }, { status: 401 })
  const db = getSupabaseAdmin(), body = await request.json()
  const isVenture = body.entity === "venture"
  const table = isVenture ? "emprendimientos_varela" : "productos_varela"
  if (session.role !== "superadmin") {
    if (!session.emprendimientoId) return NextResponse.json({ error: "Cuenta sin emprendimiento asignado." }, { status: 403 })
    if (isVenture) return NextResponse.json({ error: "Esta cuenta solo puede administrar productos." }, { status: 403 })
    if (!isVenture && body.id) { const { data } = await db.from("productos_varela").select("emprendimiento_id").eq("id", body.id).maybeSingle(); if (!data || data.emprendimiento_id !== session.emprendimientoId) return NextResponse.json({ error: "No podés administrar este producto." }, { status: 403 }) }
  }
  if (body.action === "delete") { const result = await db.from(table).delete().eq("id", body.id); if (result.error) return NextResponse.json({ error: result.error.message }, { status: 400 }); refresh(); return NextResponse.json({ ok: true }) }
  if (body.action === "toggle") { const result = await db.from(table).update({ activo: !body.activo }).eq("id", body.id); if (result.error) return NextResponse.json({ error: result.error.message }, { status: 400 }); refresh(body.slug); return NextResponse.json({ ok: true }) }
  if (body.action !== "save") return NextResponse.json({ error: "Acción no válida." }, { status: 400 })
  if (!isVenture && session.role === "superadmin" && !body.payload?.emprendimiento_id) return NextResponse.json({ error: "Seleccioná el emprendimiento del producto." }, { status: 400 })
  const payload = { ...body.payload, slug: body.payload.slug?.trim() || makeSlug(body.payload.nombre || ""), orden: Number(body.payload.orden || 0) }
  if (session.role !== "superadmin" && !isVenture) payload.emprendimiento_id = session.emprendimientoId
  if (session.role !== "superadmin" && isVenture) { delete payload.activo; delete payload.orden }
  if (!isVenture) { payload.precio = payload.consultar_precio || payload.precio === "" ? null : Number(payload.precio); payload.imagenes = (payload.imagenes || []).slice(0, 10); payload.variantes = (payload.variantes || []).filter(Boolean) }
  const query = body.id ? db.from(table).update(payload).eq("id", body.id) : db.from(table).insert(payload)
  const result = await query.select("*").single()
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 400 })
  refresh(result.data.slug); return NextResponse.json({ ok: true, record: result.data })
 } catch (error) {
  console.error("Error al guardar el catálogo de Hecho en Varela", error)
  return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo guardar el producto." }, { status: 500 })
 }
}
