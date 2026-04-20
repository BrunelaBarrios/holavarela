import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { readAdminSessionFromRequest } from "../../../lib/adminSession"
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin"

type SiteTrafficPayload = {
  visitors?: number
  pageViews?: number
  periodLabel?: string
  periodStart?: string
  periodEnd?: string
  sourceLabel?: string
}

async function requireAdminSession(request: NextRequest) {
  return readAdminSessionFromRequest(request)
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireAdminSession(request)
    if (!session) {
      return NextResponse.json({ error: "Sesion admin requerida." }, { status: 401 })
    }

    const body = (await request.json()) as SiteTrafficPayload
    const visitors = Number(body.visitors)
    const pageViews = Number(body.pageViews)
    const periodLabel = body.periodLabel?.trim() || "Ultimos 30 dias"
    const periodStart = body.periodStart?.trim() || ""
    const periodEnd = body.periodEnd?.trim() || ""
    const sourceLabel = body.sourceLabel?.trim() || "Vercel Analytics"

    if (!Number.isFinite(visitors) || visitors < 0 || !Number.isInteger(visitors)) {
      return NextResponse.json({ error: "Los visitantes deben ser un numero entero valido." }, { status: 400 })
    }

    if (!Number.isFinite(pageViews) || pageViews < 0 || !Number.isInteger(pageViews)) {
      return NextResponse.json({ error: "Los page views deben ser un numero entero valido." }, { status: 400 })
    }

    if (!periodStart || !periodEnd) {
      return NextResponse.json({ error: "Completa las fechas desde y hasta." }, { status: 400 })
    }

    if (periodStart > periodEnd) {
      return NextResponse.json({ error: "La fecha inicial no puede ser mayor a la final." }, { status: 400 })
    }

    const { error } = await getSupabaseAdmin().from("site_traffic_summary").upsert({
      id: 1,
      visitors,
      page_views: pageViews,
      period_label: periodLabel,
      period_start: periodStart,
      period_end: periodEnd,
      source_label: sourceLabel,
      updated_at: new Date().toISOString(),
      updated_by: session.username,
    })

    if (error) {
      throw error
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No pudimos guardar el trafico general."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
