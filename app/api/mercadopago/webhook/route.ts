import { revalidatePath } from "next/cache"
import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin"
import {
  getMercadoPagoPreapproval,
  getPlanKeyFromMercadoPagoPlanId,
  mapMercadoPagoStatus,
  parseExternalReference,
} from "../../../lib/mercadoPago"

type EntityTable = "comercios" | "servicios" | "instituciones"

const tableByType = {
  comercio: "comercios",
  servicio: "servicios",
  institucion: "instituciones",
} as const

const keepsPremiumProfile = (planKey: string | null, statusKey: string) =>
  planKey === "destacado_plus" && (statusKey === "activa" || statusKey === "pendiente")

function revalidateEntityPages(table: EntityTable, id?: number) {
  revalidatePath("/")
  if (table === "comercios") {
    revalidatePath("/comercios")
    if (id) revalidatePath(`/comercios/${id}`)
    return
  }

  if (table === "servicios") {
    revalidatePath("/servicios")
    if (id) revalidatePath(`/servicios/${id}`)
    return
  }

  revalidatePath("/instituciones")
  if (id) revalidatePath(`/instituciones/${id}`)
}

async function updateEntityByReference(params: {
  table: EntityTable
  id: number
  preapprovalId: string
  planKey: string | null
  statusKey: string
  payerEmail?: string | null
}) {
  const supabaseAdmin = getSupabaseAdmin()

  const { error } = await supabaseAdmin
    .from(params.table)
    .update({
      plan_suscripcion: params.planKey,
      estado_suscripcion: params.statusKey,
      premium_activo: keepsPremiumProfile(params.planKey, params.statusKey),
      suscripcion_actualizada_at: new Date().toISOString(),
      owner_email: params.payerEmail || undefined,
      mp_preapproval_id: params.preapprovalId,
    })
    .eq("id", params.id)

  if (error) {
    throw new Error(`No pudimos actualizar ${params.table}#${params.id}: ${error.message}`)
  }

  revalidateEntityPages(params.table, params.id)
}

async function updateEntityByEmail(params: {
  email: string
  preapprovalId: string
  planKey: string | null
  statusKey: string
}) {
  const supabaseAdmin = getSupabaseAdmin()
  const tables: EntityTable[] = ["comercios", "servicios", "instituciones"]

  for (const table of tables) {
    const { data } = await supabaseAdmin
      .from(table)
      .select("id")
      .eq("owner_email", params.email)
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!data) continue

    const { error } = await supabaseAdmin
      .from(table)
      .update({
        plan_suscripcion: params.planKey,
        estado_suscripcion: params.statusKey,
        premium_activo: keepsPremiumProfile(params.planKey, params.statusKey),
        suscripcion_actualizada_at: new Date().toISOString(),
        mp_preapproval_id: params.preapprovalId,
      })
      .eq("id", data.id)

    if (error) {
      throw new Error(`No pudimos actualizar ${table} por email: ${error.message}`)
    }

    revalidateEntityPages(table, data.id)

    return true
  }

  return false
}

async function syncPreapproval(preapprovalId: string) {
  const preapproval = await getMercadoPagoPreapproval(preapprovalId)
  const statusKey = mapMercadoPagoStatus(preapproval.status)
  const planKey = getPlanKeyFromMercadoPagoPlanId(preapproval.preapproval_plan_id)
  const reference = parseExternalReference(preapproval.external_reference)

  if (reference) {
    await updateEntityByReference({
      table: tableByType[reference.type],
      id: reference.id,
      preapprovalId: preapproval.id,
      planKey,
      statusKey,
      payerEmail: preapproval.payer_email,
    })
    return
  }

  if (preapproval.payer_email) {
    await updateEntityByEmail({
      email: preapproval.payer_email,
      preapprovalId: preapproval.id,
      planKey,
      statusKey,
    })
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json().catch(() => null)
    const url = new URL(request.url)

    const topic =
      payload?.type ||
      payload?.topic ||
      url.searchParams.get("type") ||
      url.searchParams.get("topic")

    const preapprovalId =
      payload?.data?.id ||
      payload?.id ||
      url.searchParams.get("data.id") ||
      url.searchParams.get("id")

    if (!topic || !String(topic).includes("preapproval") || !preapprovalId) {
      return NextResponse.json({ ok: true, ignored: true })
    }

    await syncPreapproval(String(preapprovalId))
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Mercado Pago webhook error:", error)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const preapprovalId = url.searchParams.get("id") || url.searchParams.get("data.id")

  if (!preapprovalId) {
    return NextResponse.json({ ok: true, ignored: true })
  }

  try {
    await syncPreapproval(preapprovalId)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Mercado Pago webhook GET error:", error)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
