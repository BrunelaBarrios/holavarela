import { NextResponse, type NextRequest } from "next/server"
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin"
import { createMercadoPagoPreference } from "../../../lib/mercadoPago"
import { absoluteUrl } from "../../../lib/seo"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const code = typeof body.code === "string" ? body.code : ""
    if (!/^[0-9a-f-]{36}$/i.test(code)) return NextResponse.json({ error: "Currículum inválido." }, { status: 400 })
    const { data, error } = await getSupabaseAdmin().from("curriculums_generados")
      .select("nombre,email,monto_pago,estado_pago").eq("codigo", code).maybeSingle()
    if (error || !data) return NextResponse.json({ error: "Currículum no encontrado." }, { status: 404 })
    if (data.estado_pago === "approved") return NextResponse.json({ approved: true })
    const amount = Number(data.monto_pago || 200)
    if (amount <= 0) return NextResponse.json({ approved: true })
    const returnUrl = absoluteUrl(`/armar-curriculum/pago/${code}`)
    const preference = await createMercadoPagoPreference({
      items: [{ id: `cv-${code}`, title: `Currículum profesional - ${data.nombre}`, quantity: 1, currency_id: "UYU", unit_price: amount }],
      payer: data.email ? { email: data.email } : undefined,
      external_reference: `curriculum:${code}`,
      back_urls: { success: returnUrl, pending: returnUrl, failure: returnUrl },
      auto_return: "approved",
      notification_url: absoluteUrl("/api/mercadopago/webhook"),
      statement_descriptor: "HOLA VARELA",
    })
    await getSupabaseAdmin().from("curriculums_generados").update({ mp_preference_id: preference.id }).eq("codigo", code)
    return NextResponse.json({ url: preference.init_point })
  } catch (error) {
    console.error("Curriculum checkout error:", error)
    return NextResponse.json({ error: "No pudimos iniciar el pago." }, { status: 500 })
  }
}
