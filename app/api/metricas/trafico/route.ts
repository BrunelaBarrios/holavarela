import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin"
import { readSiteTrafficSnapshotFromEnv } from "../../../lib/siteTrafficSummary"

export const revalidate = 1800

export async function GET() {
  const envSnapshot = readSiteTrafficSnapshotFromEnv()

  try {
    const { data, error } = await getSupabaseAdmin()
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
            // Dejamos cache suave para no recalcular en cada visita.
            "Cache-Control": "s-maxage=1800, stale-while-revalidate=43200",
          },
        }
      )
    }
  } catch (error) {
    console.warn("No se pudo leer site_traffic_summary, usamos variables de entorno.", error)
  }

  return NextResponse.json(envSnapshot, {
    headers: {
      // Dejamos cache suave para no recalcular en cada visita.
      "Cache-Control": "s-maxage=1800, stale-while-revalidate=43200",
    },
  })
}
