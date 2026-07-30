import { NextResponse, type NextRequest } from "next/server"
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin"

const FREE_CODE = "PRUEBAHV2026"
const HALF_CODE = "MITADHV50"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const code = typeof body.code === "string" ? body.code : ""
    const promo = typeof body.promo === "string" ? body.promo.trim().toUpperCase() : ""
    if (!/^[0-9a-f-]{36}$/i.test(code)) return NextResponse.json({ error: "Primero guardá el currículum." }, { status: 400 })
    if (promo !== FREE_CODE && promo !== HALF_CODE) return NextResponse.json({ error: "El código ingresado no es válido." }, { status: 400 })

    const supabase = getSupabaseAdmin()
    const { data: current } = await supabase.from("curriculums_generados").select("codigo_promocional").eq("codigo", code).maybeSingle()
    if (!current) return NextResponse.json({ error: "Currículum no encontrado." }, { status: 404 })
    if (current.codigo_promocional) return NextResponse.json({ error: "Este currículum ya utilizó un código." }, { status: 409 })

    if (promo === FREE_CODE) {
      const { count } = await supabase.from("curriculums_generados").select("id", { count: "exact", head: true }).eq("codigo_promocional", FREE_CODE)
      if ((count || 0) >= 1) return NextResponse.json({ error: "El código de prueba gratuita ya fue utilizado." }, { status: 409 })
      const { error } = await supabase.from("curriculums_generados").update({
        codigo_promocional: FREE_CODE, descuento_porcentaje: 100, monto_pago: 0,
        estado_pago: "approved", aprobado_at: new Date().toISOString(),
      }).eq("codigo", code)
      if (error) throw error
      return NextResponse.json({ promo: "free", payment_status: "approved" })
    }

    const { error } = await supabase.from("curriculums_generados").update({
      codigo_promocional: HALF_CODE, descuento_porcentaje: 50, monto_pago: 100,
    }).eq("codigo", code)
    if (error) throw error
    return NextResponse.json({ promo: "half", payment_status: "draft" })
  } catch {
    return NextResponse.json({ error: "No pudimos aplicar el código." }, { status: 500 })
  }
}
