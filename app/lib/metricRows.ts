import { supabase } from "../supabase"

const METRIC_PAGE_SIZE = 1000

type MetricRowsOptions = {
  equals?: Record<string, string | number | boolean>
  since?: string
}

export const fetchMetricRows = async <T,>(
  table: string,
  select: string,
  options: MetricRowsOptions = {}
) => {
  const rows: T[] = []
  let from = 0

  while (true) {
    let query = supabase
      .from(table)
      .select(select)
      .order("created_at", { ascending: false })
      .range(from, from + METRIC_PAGE_SIZE - 1)

    if (options.since) {
      query = query.gte("created_at", options.since)
    }

    Object.entries(options.equals || {}).forEach(([column, value]) => {
      query = query.eq(column, value)
    })

    const { data, error } = await query

    if (error) {
      throw error
    }

    const page = (data || []) as T[]
    rows.push(...page)

    if (page.length < METRIC_PAGE_SIZE) {
      break
    }

    from += METRIC_PAGE_SIZE
  }

  return rows
}

export const fetchMetricRowsWithFallback = async <T,>(
  table: string,
  select: string,
  label: string,
  options: MetricRowsOptions = {}
) => {
  try {
    return await fetchMetricRows<T>(table, select, options)
  } catch (error) {
    console.warn(`No se pudo cargar ${label}.`, error)
    return [] as T[]
  }
}
