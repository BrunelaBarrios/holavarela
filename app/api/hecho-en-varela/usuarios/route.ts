import { NextResponse, type NextRequest } from "next/server"
import { hashHechoVarelaPassword, readHechoVarelaSession, verifyHechoVarelaPassword } from "../../../lib/hechoVarelaAdminSession"
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin"

const publicFields = "id, username, nombre, role, emprendimiento_id, activo, creado_at, ultimo_acceso, emprendimientos_varela(nombre)"

export async function GET(request: NextRequest) {
  const session = await readHechoVarelaSession(request)
  if (!session) return NextResponse.json({ error: "Acceso requerido." }, { status: 401 })
  if (session.role !== "superadmin") return NextResponse.json({ user: { username: session.username, role: session.role } })
  const { data, error } = await getSupabaseAdmin().from("usuarios_hecho_varela").select(publicFields).order("creado_at")
  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ users: data })
}

export async function POST(request: NextRequest) {
  const session = await readHechoVarelaSession(request)
  if (!session) return NextResponse.json({ error: "Acceso requerido." }, { status: 401 })
  const body = await request.json(), db = getSupabaseAdmin()
  if (body.action === "change-own-password") {
    if (session.id === "bootstrap") return NextResponse.json({ error: "La contraseña principal se cambia desde los secretos de Cloudflare." }, { status: 400 })
    if (!body.currentPassword || !body.password || body.password.length < 10) return NextResponse.json({ error: "La contraseña nueva debe tener al menos 10 caracteres." }, { status: 400 })
    const { data: user } = await db.from("usuarios_hecho_varela").select("password_hash,password_salt").eq("id", session.id).single()
    if (!user || !await verifyHechoVarelaPassword(body.currentPassword, user.password_hash, user.password_salt)) return NextResponse.json({ error: "La contraseña actual no es correcta." }, { status: 400 })
    const password = await hashHechoVarelaPassword(body.password)
    const { error } = await db.from("usuarios_hecho_varela").update({ password_hash: password.hash, password_salt: password.salt, actualizado_at: new Date().toISOString() }).eq("id", session.id)
    return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({ ok: true })
  }
  if (session.role !== "superadmin") return NextResponse.json({ error: "Solo el administrador principal puede administrar usuarios." }, { status: 403 })
  if (body.action === "delete") { const { error } = await db.from("usuarios_hecho_varela").delete().eq("id", body.id); return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({ ok: true }) }
  if (body.action === "toggle") { const { error } = await db.from("usuarios_hecho_varela").update({ activo: !body.activo }).eq("id", body.id); return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({ ok: true }) }
  if (body.action === "reset-password") {
    if (!body.password || body.password.length < 10) return NextResponse.json({ error: "La contraseña debe tener al menos 10 caracteres." }, { status: 400 })
    const password = await hashHechoVarelaPassword(body.password)
    const { error } = await db.from("usuarios_hecho_varela").update({ password_hash: password.hash, password_salt: password.salt, actualizado_at: new Date().toISOString() }).eq("id", body.id)
    return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({ ok: true })
  }
  if (body.action !== "save" || !body.username || !body.nombre || !body.password || !body.emprendimientoId) return NextResponse.json({ error: "Completá nombre, usuario, contraseña y emprendimiento." }, { status: 400 })
  if (body.password.length < 10) return NextResponse.json({ error: "La contraseña debe tener al menos 10 caracteres." }, { status: 400 })
  const password = await hashHechoVarelaPassword(body.password)
  const { error } = await db.from("usuarios_hecho_varela").insert({ username: body.username.trim().toLowerCase(), nombre: body.nombre.trim(), password_hash: password.hash, password_salt: password.salt, role: "admin", emprendimiento_id: body.emprendimientoId })
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({ ok: true })
}
