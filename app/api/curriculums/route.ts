import { NextResponse, type NextRequest } from "next/server"
import { getSupabaseAdmin } from "../../lib/supabaseAdmin"

const validTemplate = (value: unknown) => ["classic", "modern", "simple", "executive", "creative"].includes(String(value)) ? String(value) : "modern"
const validCode = (value: unknown) => typeof value === "string" && /^[0-9a-f-]{36}$/i.test(value) ? value : ""
const validData = (value: unknown) => value && typeof value === "object" ? value : null
const dataWithTemplate = (data: object, template: string) => ({ ...data, __cvTemplate: template })

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = validData(body.data)
    if (!data) return NextResponse.json({ error: "Los datos no son válidos." }, { status: 400 })
    const code = crypto.randomUUID()
    const template = validTemplate(body.template)
    const row = {
      codigo: code, datos: dataWithTemplate(data, template), modelo: template,
      nombre: String((data as Record<string, unknown>).name || "").slice(0, 120),
      email: String((data as Record<string, unknown>).email || "").slice(0, 160),
      telefono: String((data as Record<string, unknown>).phone || "").slice(0, 60),
    }
    let { error } = await getSupabaseAdmin().from("curriculums_generados").insert(row)
    if (error?.code === "23514") {
      ;({ error } = await getSupabaseAdmin().from("curriculums_generados").insert({ ...row, modelo: "modern" }))
    }
    if (error) throw error
    return NextResponse.json({ code })
  } catch {
    return NextResponse.json({ error: "No pudimos guardar el currículum. Verificá que la base esté actualizada." }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const code = validCode(body.code), data = validData(body.data)
    if (!code || !data) return NextResponse.json({ error: "Código o datos inválidos." }, { status: 400 })
    const template = validTemplate(body.template)
    const changes = { datos: dataWithTemplate(data, template), modelo: template, actualizado_at: new Date().toISOString() }
    let { data: row, error } = await getSupabaseAdmin().from("curriculums_generados")
      .update(changes)
      .eq("codigo", code).gt("editable_hasta", new Date().toISOString()).select("codigo").maybeSingle()
    if (error?.code === "23514") {
      ;({ data: row, error } = await getSupabaseAdmin().from("curriculums_generados")
        .update({ datos: changes.datos, actualizado_at: changes.actualizado_at })
        .eq("codigo", code).gt("editable_hasta", new Date().toISOString()).select("codigo").maybeSingle())
    }
    if (error || !row) return NextResponse.json({ error: "El enlace no existe o el período de edición venció." }, { status: 404 })
    return NextResponse.json({ code })
  } catch { return NextResponse.json({ error: "No pudimos actualizar el currículum." }, { status: 500 }) }
}

export async function GET(request: NextRequest) {
  const code = validCode(request.nextUrl.searchParams.get("code"))
  if (!code) return NextResponse.json({ error: "Código inválido." }, { status: 400 })
  const { data, error } = await getSupabaseAdmin().from("curriculums_generados")
    .select("datos, modelo, estado_pago, editable_hasta").eq("codigo", code).maybeSingle()
  if (error || !data) return NextResponse.json({ error: "Currículum no encontrado." }, { status: 404 })
  const savedData = data.datos as Record<string, unknown>
  return NextResponse.json({ data: savedData, template: validTemplate(savedData?.__cvTemplate ?? data.modelo), payment_status: data.estado_pago, editable_until: data.editable_hasta })
}
