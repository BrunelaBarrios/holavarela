import { revalidatePath } from "next/cache"
import { NextResponse, type NextRequest } from "next/server"
import { readHechoVarelaSession } from "../../../lib/hechoVarelaAdminSession"
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin"
import { makeSlug } from "../../../lib/hechoEnVarela"

const refresh = (slug?: string) => { revalidatePath("/hecho-en-varela"); if (slug) { revalidatePath(`/hecho-en-varela/producto/${slug}`); revalidatePath(`/hecho-en-varela/emprendimiento/${slug}`) } }

export async function GET(request: NextRequest) {
  if (!await readHechoVarelaSession(request)) return NextResponse.json({ error: "Acceso requerido." }, { status: 401 })
  const db = getSupabaseAdmin()
  const [ventures, products] = await Promise.all([db.from("emprendimientos_varela").select("*").order("orden"), db.from("productos_varela").select("*, emprendimientos_varela(nombre)").order("orden")])
  if (ventures.error || products.error) return NextResponse.json({ error: ventures.error?.message || products.error?.message }, { status: 500 })
  return NextResponse.json({ ventures: ventures.data, products: products.data })
}

export async function POST(request: NextRequest) {
  if (!await readHechoVarelaSession(request)) return NextResponse.json({ error: "Acceso requerido." }, { status: 401 })
  const db = getSupabaseAdmin(), body = await request.json()
  const table = body.entity === "venture" ? "emprendimientos_varela" : "productos_varela"
  if (body.action === "delete") { const result = await db.from(table).delete().eq("id", body.id); if (result.error) return NextResponse.json({ error: result.error.message }, { status: 400 }); refresh(); return NextResponse.json({ ok: true }) }
  if (body.action === "toggle") { const result = await db.from(table).update({ activo: !body.activo }).eq("id", body.id); if (result.error) return NextResponse.json({ error: result.error.message }, { status: 400 }); refresh(body.slug); return NextResponse.json({ ok: true }) }
  if (body.action !== "save") return NextResponse.json({ error: "Acción no válida." }, { status: 400 })
  const payload = { ...body.payload, slug: body.payload.slug?.trim() || makeSlug(body.payload.nombre || ""), orden: Number(body.payload.orden || 0) }
  if (body.entity === "product") { payload.precio = payload.consultar_precio || payload.precio === "" ? null : Number(payload.precio); payload.imagenes = (payload.imagenes || []).slice(0, 10); payload.variantes = (payload.variantes || []).filter(Boolean) }
  const query = body.id ? db.from(table).update(payload).eq("id", body.id) : db.from(table).insert(payload)
  const result = await query.select("*").single()
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 400 })
  refresh(result.data.slug); return NextResponse.json({ ok: true, record: result.data })
}
