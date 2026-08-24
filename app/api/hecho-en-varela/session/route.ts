import { NextResponse, type NextRequest } from "next/server"
import { attachHechoVarelaSession, clearHechoVarelaSession, readHechoVarelaSession, validBootstrapCredentials, verifyHechoVarelaPassword } from "../../../lib/hechoVarelaAdminSession"
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin"

export async function GET(request: NextRequest) { const session = await readHechoVarelaSession(request); return NextResponse.json({ authenticated: Boolean(session), session }) }
export async function POST(request: NextRequest) {
  const { username = "", password = "" } = await request.json()
  if (validBootstrapCredentials(username, password)) return attachHechoVarelaSession(NextResponse.json({ ok: true }), { id: "bootstrap", username: username.trim(), role: "superadmin", emprendimientoId: null })
  const db = getSupabaseAdmin()
  const { data: user } = await db.from("usuarios_hecho_varela").select("*").eq("username", username.trim().toLowerCase()).eq("activo", true).maybeSingle()
  if (!user || !await verifyHechoVarelaPassword(password, user.password_hash, user.password_salt)) return NextResponse.json({ error: "Usuario o contraseña incorrectos." }, { status: 401 })
  await db.from("usuarios_hecho_varela").update({ ultimo_acceso: new Date().toISOString() }).eq("id", user.id)
  return attachHechoVarelaSession(NextResponse.json({ ok: true }), { id: user.id, username: user.username, role: user.role, emprendimientoId: user.emprendimiento_id })
}
export async function DELETE() { return clearHechoVarelaSession(NextResponse.json({ ok: true })) }
