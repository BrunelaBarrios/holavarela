import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin"
import { readSiteTrafficSnapshotFromEnv } from "../../../lib/siteTrafficSummary"

export const dynamic = "force-dynamic"

const INTERNAL_PERIOD_DAYS = 30

const getIsoDaysAgo = (days: number) => {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toISOString()
}

export async function GET() {
  const envSnapshot = readSiteTrafficSnapshotFromEnv()
  const supabaseAdmin = getSupabaseAdmin()

  try {
    const { data, error } = await supabaseAdmin
      .from("site_traffic_summary")
      .select("visitors, page_views, period_label, period_start, period_end, source_label, updated_at")
      .eq("id", 1)
      .maybeSingle()

    if (error) {
      throw error
    }

    if (data) {
      return NextResponse.json(
        {
          configured: true,
          visitors: typeof data.visitors === "number" ? data.visitors : null,
          pageViews: typeof data.page_views === "number" ? data.page_views : null,
          periodLabel: data.period_label?.trim() || envSnapshot.periodLabel,
          periodStart: data.period_start || null,
          periodEnd: data.period_end || null,
          sourceLabel: data.source_label?.trim() || envSnapshot.sourceLabel,
          updatedAt: data.updated_at || null,
        },
        {
          headers: {
            "Cache-Control": "no-store, max-age=0",
          },
        }
      )
    }
  } catch (error) {
    console.warn("No se pudo leer site_traffic_summary, usamos variables de entorno.", error)
  }

  try {
    const since = getIsoDaysAgo(INTERNAL_PERIOD_DAYS)

    const [{ count: pageViewsCount, error: pageViewsError }, { data: visitorRows, error: visitorError }] =
      await Promise.all([
        supabaseAdmin
          .from("content_visits")
          .select("*", { count: "exact", head: true })
          .eq("section", "site_pages")
          .gte("created_at", since),
        supabaseAdmin
          .from("content_visits")
          .select("browser_key")
          .eq("section", "site_pages")
          .gte("created_at", since),
      ])

    if (pageViewsError) throw pageViewsError
    if (visitorError) throw visitorError

    const visitors = new Set((visitorRows || []).map((row) => row.browser_key).filter(Boolean)).size
    const pageViews = typeof pageViewsCount === "number" ? pageViewsCount : 0

    if (visitors > 0 || pageViews > 0) {
      return NextResponse.json(
        {
          configured: true,
          visitors,
          pageViews,
          periodLabel: `Ultimos ${INTERNAL_PERIOD_DAYS} dias`,
          periodStart: null,
          periodEnd: null,
          sourceLabel: "Metricas internas de Hola Varela",
          updatedAt: new Date().toISOString(),
        },
        {
          headers: {
            "Cache-Control": "no-store, max-age=0",
          },
        }
      )
    }
  } catch (error) {
    console.warn("No se pudo calcular el trafico interno del sitio.", error)
  }

  return NextResponse.json(envSnapshot, {
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  })
}
