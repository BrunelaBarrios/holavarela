import { NextResponse, type NextRequest } from "next/server"
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const code = typeof body.code === "string" ? body.code : ""
    const operation = typeof body.operation === "string" ? body.operation.trim().slice(0, 120) : ""
    const receipt = typeof body.receipt === "string" && body.receipt.length < 3_000_000 ? body.receipt : null
    if (!/^[0-9a-f-]{36}$/i.test(code) || !operation) return NextResponse.json({ error: "Faltan datos del pago." }, { status: 400 })
    const { error } = await getSupabaseAdmin().from("curriculums_generados")
      .update({ estado_pago: "pending", numero_operacion: operation, comprobante: receipt, pago_enviado_at: new Date().toISOString() })
      .eq("codigo", code)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch { return NextResponse.json({ error: "No pudimos registrar el pago." }, { status: 500 }) }
}
