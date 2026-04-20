export type SiteTrafficSnapshot = {
  configured: boolean
  visitors: number | null
  pageViews: number | null
  periodLabel: string
  updatedAt: string | null
}

const DEFAULT_PERIOD_LABEL = "Ultimos 30 dias"

function parseNullableMetric(value: string | undefined) {
  if (!value) return null

  const normalized = value.replace(/[^\d.-]/g, "")
  if (!normalized) return null

  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

// Centralizamos la lectura para mostrar el mismo trafico en admin y usuario.
export function readSiteTrafficSnapshotFromEnv(): SiteTrafficSnapshot {
  const visitors = parseNullableMetric(process.env.VERCEL_ANALYTICS_VISITORS_30D)
  const pageViews = parseNullableMetric(process.env.VERCEL_ANALYTICS_PAGE_VIEWS_30D)

  return {
    configured: visitors !== null || pageViews !== null,
    visitors,
    pageViews,
    periodLabel: process.env.VERCEL_ANALYTICS_PERIOD_LABEL?.trim() || DEFAULT_PERIOD_LABEL,
    updatedAt: process.env.VERCEL_ANALYTICS_UPDATED_AT?.trim() || null,
  }
}
