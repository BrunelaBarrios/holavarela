export type SiteTrafficSnapshot = {
  configured: boolean
  visitors: number | null
  pageViews: number | null
  periodLabel: string
  periodStart: string | null
  periodEnd: string | null
  sourceLabel: string
  updatedAt: string | null
}

const DEFAULT_PERIOD_LABEL = "Ultimos 30 dias"
const DEFAULT_SOURCE_LABEL = "Vercel Analytics"

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
    periodStart: process.env.VERCEL_ANALYTICS_PERIOD_START?.trim() || null,
    periodEnd: process.env.VERCEL_ANALYTICS_PERIOD_END?.trim() || null,
    sourceLabel: process.env.VERCEL_ANALYTICS_SOURCE_LABEL?.trim() || DEFAULT_SOURCE_LABEL,
    updatedAt: process.env.VERCEL_ANALYTICS_UPDATED_AT?.trim() || null,
  }
}
