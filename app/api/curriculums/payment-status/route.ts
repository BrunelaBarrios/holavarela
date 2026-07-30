import { NextResponse, type NextRequest } from "next/server"
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin"
import { getMercadoPagoPayment } from "../../../lib/mercadoPago"

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code") || ""
  const paymentId = request.nextUrl.searchParams.get("payment_id") || ""
  if (!/^[0-9a-f-]{36}$/i.test(code)) return NextResponse.json({ error: "Código inválido." }, { status: 400 })
  try {
    if (paymentId) {
      const payment = await getMercadoPagoPayment(paymentId)
      if (payment.external_reference === `curriculum:${code}` && payment.status === "approved") {
        await getSupabaseAdmin().from("curriculums_generados").update({
          estado_pago: "approved", mp_payment_id: String(payment.id), aprobado_at: new Date().toISOString(),
          editable_hasta: new Date(Date.now() + 30 * 86400000).toISOString(),
        }).eq("codigo", code)
      }
    }
    const { data } = await getSupabaseAdmin().from("curriculums_generados").select("estado_pago").eq("codigo", code).maybeSingle()
    return NextResponse.json({ payment_status: data?.estado_pago || "draft" })
  } catch {
    return NextResponse.json({ error: "No pudimos verificar el pago." }, { status: 500 })
  }
}
