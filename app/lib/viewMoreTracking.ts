import { supabase } from "../supabase"

export const VIEW_MORE_SECTIONS = [
  "comercios",
  "eventos",
  "cursos",
  "servicios",
  "instituciones",
] as const

export type ViewMoreSection = (typeof VIEW_MORE_SECTIONS)[number]

export type ViewMoreTotals = Record<ViewMoreSection, number>

export const emptyViewMoreTotals = (): ViewMoreTotals => ({
  comercios: 0,
  eventos: 0,
  cursos: 0,
  servicios: 0,
  instituciones: 0,
})

export const recordViewMore = async (
  section: ViewMoreSection,
  itemId: string,
  itemTitle?: string | null
) => {
  const payload = JSON.stringify({
    section,
    itemId,
    itemTitle: itemTitle || null,
  })

  if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
    const sent = navigator.sendBeacon(
      "/api/metricas/view-more",
      new Blob([payload], { type: "application/json" })
    )

    if (sent) return
  }

  if (typeof fetch !== "undefined") {
    try {
      await fetch("/api/metricas/view-more", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: payload,
        keepalive: true,
      })
      return
    } catch {
      // Fall back to the direct Supabase insert below.
    }
  }

  const { error } = await supabase.from("view_more_clicks").insert([
    {
      section,
      item_id: itemId,
      item_title: itemTitle || null,
    },
  ])

  if (error) {
    console.error('No se pudo registrar el clic en "Ver más":', error)
  }
}

export const buildViewMoreTotals = (
  rows: Array<{ section: string | null }>
): ViewMoreTotals =>
  rows.reduce<ViewMoreTotals>((acc, row) => {
    const section = row.section as ViewMoreSection | null
    if (!section || !VIEW_MORE_SECTIONS.includes(section)) return acc
    acc[section] += 1
    return acc
  }, emptyViewMoreTotals())
