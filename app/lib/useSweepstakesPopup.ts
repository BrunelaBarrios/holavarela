'use client'

import { useCallback, useState } from "react"
import { getEventLikesBrowserKey } from "./eventLikes"
import { HOME_SWEEPSTAKES_POPUP_SESSION_KEY } from "./localStorageKeys"
import type { SweepstakesConfig, SweepstakesEntrySource } from "./sweepstakes"

const SWEEPSTAKES_THRESHOLD = 3

type EventLikeResult = {
  status: "liked" | "exists" | "error"
  browserKey?: string
  totalLikes?: number
}

export function useSweepstakesPopup() {
  const [config, setConfig] = useState<SweepstakesConfig | null>(null)
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState("")
  const [currentTotalLikes, setCurrentTotalLikes] = useState(0)
  const [entrySource, setEntrySource] = useState<SweepstakesEntrySource>("corazones")

  const closePopup = useCallback(() => {
    setOpen(false)
    setSubmitError("")
  }, [])

  const loadHomePopupBubble = useCallback(async () => {
    if (typeof window === "undefined") return

    const { fetchHomeSweepstakesPopupConfig } = await import("./sweepstakes")
    const resultConfig = await fetchHomeSweepstakesPopupConfig()
    if (!resultConfig.config) return

    setConfig(resultConfig.config)
    setCurrentTotalLikes(3)
    setEntrySource("web")
    setSubmitError("")
  }, [])

  const openHomePopup = useCallback(() => {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(HOME_SWEEPSTAKES_POPUP_SESSION_KEY, "true")
    }

    setOpen(true)
  }, [])

  const handleLikeResult = useCallback(async (result: EventLikeResult) => {
    if (result.status !== "liked") return

    const totalLikes = result.totalLikes || 0

    if (totalLikes < SWEEPSTAKES_THRESHOLD) return
    if (totalLikes % SWEEPSTAKES_THRESHOLD !== 0) return

    const { fetchSweepstakesConfig } = await import("./sweepstakes")
    const resultConfig = await fetchSweepstakesConfig()
    if (!resultConfig.config) return

    setConfig(resultConfig.config)
    setCurrentTotalLikes(totalLikes)
    setEntrySource("corazones")
    setSubmitError("")
    setOpen(true)
  }, [])

  const submitEntry = useCallback(async (nombre: string, telefono: string) => {
    const browserKey = getEventLikesBrowserKey()
    const { createSweepstakesEntry } = await import("./sweepstakes")

    setSubmitting(true)
    setSubmitError("")

    const entryResult = await createSweepstakesEntry({
      sorteoId: config?.id || 0,
      browserKey,
      nombre,
      telefono,
      totalLikes: Math.max(currentTotalLikes, 3),
      source: entrySource,
    })

    if (entryResult.status === "error") {
      setSubmitError("No pudimos guardar tu participación. Intenta nuevamente.")
      setSubmitting(false)
      return { ok: false }
    }

    setSubmitting(false)
    return { ok: true }
  }, [config?.id, currentTotalLikes, entrySource])

  return {
    config,
    open,
    submitting,
    submitError,
    loadHomePopupBubble,
    openHomePopup,
    closePopup,
    handleLikeResult,
    submitEntry,
  }
}
