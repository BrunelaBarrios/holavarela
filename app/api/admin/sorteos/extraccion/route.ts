import { createHmac, randomInt, timingSafeEqual } from "node:crypto"
import { NextResponse, type NextRequest } from "next/server"
import { readAdminSessionFromRequest } from "../../../../lib/adminSession"
import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin"
import { drawView, selectDrawWinners, type DrawRecord, type DrawTicket } from "../../../../lib/sweepstakesDraw"

const PREPARED = "Sorteo preparado"
const COMPLETED = "Sorteo realizado"
const section = "Extracciones de sorteos"
function sign(payload: string) {
  const secret = process.env.ADMIN_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!secret) throw new Error("No está configurado el registro seguro del sorteo.")
  return createHmac("sha256", secret).update(payload).digest("hex")
}
function encode(record: DrawRecord) {
  const payload = JSON.stringify(record)
  return JSON.stringify({ payload, signature: sign(payload) })
}
function decode(raw: string): DrawRecord {
  const { payload, signature } = JSON.parse(raw)
  const actual = Buffer.from(String(signature), "hex")
  const expected = Buffer.from(sign(payload), "hex")
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new Error("No se pudo verificar el registro del sorteo.")
  const record = JSON.parse(payload)
  if (record.version !== 1) throw new Error("Registro de sorteo incompatible.")
  return record
}
async function authorize(request: NextRequest) {
  const session = await readAdminSessionFromRequest(request)
  return session?.role === "superadmin" ? session : null
}
export async function GET(request: NextRequest) {
  if (!await authorize(request)) return NextResponse.json({ error: "Acceso de superadministrador requerido." }, { status: 403 })
  const campaignId = Number(request.nextUrl.searchParams.get("campaignId"))
  if (!Number.isSafeInteger(campaignId) || campaignId < 1) return NextResponse.json({ error: "Seleccioná un sorteo." }, { status: 400 })
  try {
    const { data, error } = await getSupabaseAdmin().from("admin_actividad").select("id,detalle")
      .eq("seccion", section).eq("objetivo", String(campaignId)).in("accion", [PREPARED, COMPLETED])
      .order("id", { ascending: false }).limit(30)
    if (error) throw error
    const draws = (data || []).flatMap(row => {
      try { const record = decode(row.detalle); return record.campaignId === campaignId ? [drawView(row.id, record)] : [] } catch { return [] }
    })
    return NextResponse.json({ draws }, { headers: { "Cache-Control": "no-store" } })
  } catch { return NextResponse.json({ error: "No se pudo cargar el historial. Intentá nuevamente." }, { status: 500 }) }
}
export async function POST(request: NextRequest) {
  const session = await authorize(request)
  if (!session) return NextResponse.json({ error: "Acceso de superadministrador requerido." }, { status: 403 })
  try {
    const body = await request.json()
    const campaignId = Number(body.campaignId)
    if (!Number.isSafeInteger(campaignId) || campaignId < 1) return NextResponse.json({ error: "Seleccioná un sorteo." }, { status: 400 })
    const db = getSupabaseAdmin()
    if (body.action === "prepare") {
      const count = Number(body.count)
      if (!Number.isSafeInteger(count) || count < 1 || count > 100) return NextResponse.json({ error: "Elegí entre 1 y 100 ganadores." }, { status: 400 })
      const campaign = await db.from("sorteo_popup_config").select("id,titulo").eq("id", campaignId).single()
      if (campaign.error) throw campaign.error
      const last = await db.from("sorteo_participaciones").select("id").eq("sorteo_id", campaignId).order("id", { ascending: false }).limit(1)
      if (last.error) throw last.error
      const ceiling = last.data?.[0]?.id
      if (!ceiling) return NextResponse.json({ error: "Este sorteo no tiene cupones." }, { status: 400 })
      const tickets: DrawTicket[] = []
      const groups = new Map<string, number>()
      for (let from = 0; ; from += 1000) {
        const batch = await db.from("sorteo_participaciones").select("id,nombre,telefono").eq("sorteo_id", campaignId)
          .lte("id", ceiling).order("id", { ascending: true }).range(from, from + 999)
        if (batch.error) throw batch.error
        for (const entry of batch.data || []) {
          let phone = String(entry.telefono || "").replace(/\D/g, "")
          if (phone.startsWith("00598")) phone = phone.slice(5)
          else if (phone.startsWith("598")) phone = phone.slice(3)
          phone = phone.replace(/^0+/, "")
          const key = phone || `entry:${entry.id}`
          if (!groups.has(key)) groups.set(key, entry.id)
          tickets.push({ id: entry.id, name: entry.nombre, group: groups.get(key)! })
        }
        if (tickets.length > 30000) return NextResponse.json({ error: "El sorteo supera los 30.000 cupones admitidos en esta pantalla." }, { status: 400 })
        if ((batch.data?.length || 0) < 1000) break
      }
      if (count > groups.size) return NextResponse.json({ error: `Hay ${groups.size} participantes distintos. Reducí la cantidad de ganadores.` }, { status: 400 })
      const record: DrawRecord = { version: 1, campaignId, title: campaign.data.titulo || `Sorteo #${campaignId}`, count,
        preparedAt: new Date().toISOString(), tickets }
      const saved = await db.from("admin_actividad").insert({ admin_username: session.username, admin_nombre: session.name,
        admin_rol: session.role, accion: PREPARED, seccion: section, objetivo: String(campaignId), detalle: encode(record) }).select("id").single()
      if (saved.error) throw saved.error
      return NextResponse.json({ draw: drawView(saved.data.id, record) })
    }
    if (body.action !== "draw" || !Number.isSafeInteger(body.drawId) || body.drawId < 1) return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 })
    const existing = await db.from("admin_actividad").select("id,detalle,accion").eq("id", body.drawId).eq("seccion", section).eq("objetivo", String(campaignId)).single()
    if (existing.error) throw existing.error
    const record = decode(existing.data.detalle)
    if (record.campaignId !== campaignId) throw new Error("El registro corresponde a otro sorteo.")
    if (record.winners) return NextResponse.json({ draw: drawView(existing.data.id, record) })
    const completed: DrawRecord = { ...record, completedAt: new Date().toISOString(), winners: selectDrawWinners(record.tickets, record.count, randomInt) }
    // Compare-and-set: only one request can finish this prepared extraction.
    const saved = await db.from("admin_actividad").update({ accion: COMPLETED, detalle: encode(completed) })
      .eq("id", body.drawId).eq("accion", PREPARED).select("id")
    if (saved.error) throw saved.error
    if (!saved.data?.length) {
      const latest = await db.from("admin_actividad").select("detalle").eq("id", body.drawId).single()
      if (latest.error) throw latest.error
      const result = decode(latest.data.detalle)
      if (!result.winners) throw new Error("La extracción aún no se completó.")
      return NextResponse.json({ draw: drawView(body.drawId, result) })
    }
    return NextResponse.json({ draw: drawView(body.drawId, completed) })
  } catch {
    return NextResponse.json({ error: "No se pudo completar la operación. Reintentá: una extracción ya guardada conserva sus ganadores." }, { status: 500 })
  }
}
