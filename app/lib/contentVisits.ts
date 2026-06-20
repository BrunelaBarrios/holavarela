'use client'

import { supabase } from "../supabase"
import { trackAnalyticsEvent } from "./clientAnalytics"

export const CONTENT_VISIT_SECTIONS = [
  "comercios",
  "eventos",
  "cursos",
  "servicios",
  "instituciones",
  "destacados_home",
  "site_pages",
] as const

const CONTENT_VISITS_BROWSER_KEY = "hola-varela-content-visits-browser"
const CONTENT_VISITS_SESSION_PREFIX = "hola-varela-content-visit"
const SITE_VISITS_SESSION_PREFIX = "hola-varela-site-visit"
const SITE_VISITS_DAILY_PREFIX = "hola-varela-site-visit-day"

export type ContentVisitSection = (typeof CONTENT_VISIT_SECTIONS)[number]

const createBrowserKey = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }

  return `visit-${Math.random().toString(36).slice(2)}-${Date.now()}`
}

export const getContentVisitsBrowserKey = () => {
  if (typeof window === "undefined") return ""

  const existingKey = window.localStorage.getItem(CONTENT_VISITS_BROWSER_KEY)
  if (existingKey) return existingKey

  const nextKey = createBrowserKey()
  window.localStorage.setItem(CONTENT_VISITS_BROWSER_KEY, nextKey)
  return nextKey
}

export const recordContentVisit = async (
  section: ContentVisitSection,
  itemId: string,
  itemTitle?: string | null
) => {
  trackAnalyticsEvent("content_visit", {
    content_section: section,
    item_id: itemId,
    item_title: itemTitle,
  })

  const browserKey = getContentVisitsBrowserKey()

  if (!browserKey) return

  if (typeof window !== "undefined") {
    const sessionKey = `${CONTENT_VISITS_SESSION_PREFIX}:${section}:${itemId}`
    if (window.sessionStorage.getItem(sessionKey)) return
    window.sessionStorage.setItem(sessionKey, "1")
  }

  const { error } = await supabase.from("content_visits").insert([
    {
      section,
      item_id: itemId,
      item_title: itemTitle || null,
      browser_key: browserKey,
    },
  ])

  if (error) {
    console.error("No se pudo registrar la visita del contenido:", error)
  }
}

export const recordHighlightImpression = async (
  itemId: string,
  itemTitle?: string | null
) => {
  trackAnalyticsEvent("highlight_impression", {
    item_id: itemId,
    item_title: itemTitle,
  })

  const browserKey = getContentVisitsBrowserKey()
  if (!browserKey) return

  const { error } = await supabase.from("content_visits").insert([
    {
      section: "destacados_home",
      item_id: itemId,
      item_title: itemTitle || null,
      browser_key: browserKey,
    },
  ])

  if (error) {
    console.error("No se pudo registrar la impresion del destacado:", error)
  }
}

export const recordSiteVisit = async (pageId: string, pageTitle?: string | null) => {
  if (typeof window === "undefined") return

  trackAnalyticsEvent("site_visit", {
    page_id: pageId,
    page_title: pageTitle,
  })

  const browserKey = getContentVisitsBrowserKey()
  if (!browserKey) return

  const sessionKey = `${SITE_VISITS_SESSION_PREFIX}:${pageId}`
  if (window.sessionStorage.getItem(sessionKey)) return

  window.sessionStorage.setItem(sessionKey, "1")

  const todayKey = new Date().toISOString().slice(0, 10)
  const dailyKey = `${SITE_VISITS_DAILY_PREFIX}:${pageId}`
  if (window.localStorage.getItem(dailyKey) === todayKey) return

  window.localStorage.setItem(dailyKey, todayKey)

  const { error } = await supabase.from("content_visits").insert([
    {
      section: "site_pages",
      item_id: pageId,
      item_title: pageTitle || null,
      browser_key: browserKey,
    },
  ])

  if (error) {
    console.error("No se pudo registrar la visita de la página:", error)
  }
}
