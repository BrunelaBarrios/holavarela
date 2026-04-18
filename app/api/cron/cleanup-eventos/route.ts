import { NextResponse, type NextRequest } from "next/server"
import { getDateKeyDaysAgo, isEventExpiredBefore } from "../../../lib/eventDates"
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin"

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  const secret = process.env.CRON_SECRET

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 })
  }

  try {
    const supabaseAdmin = getSupabaseAdmin()
    const limitDate = getDateKeyDaysAgo(10)

    const { data, error } = await supabaseAdmin
      .from("eventos")
      .select("id, titulo, fecha, fecha_fin, fecha_solo_mes, estado")
      .neq("estado", "borrador")

    if (error) throw error

    const expiredEvents = (data || []).filter((evento) =>
      isEventExpiredBefore(evento, limitDate)
    )

    if (!expiredEvents.length) {
      return NextResponse.json({
        ok: true,
        removed: 0,
        limitDate,
      })
    }

    const ids = expiredEvents.map((evento) => evento.id)
    const { error: deleteError } = await supabaseAdmin.from("eventos").delete().in("id", ids)
    if (deleteError) throw deleteError

    return NextResponse.json({
      ok: true,
      removed: ids.length,
      removedIds: ids,
      limitDate,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No pudimos limpiar los eventos vencidos."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
