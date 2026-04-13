'use client'

import { useEffect, useState } from "react"
import { getEventLikesBrowserKey } from "./eventLikes"
import {
  createSweepstakesEntry,
  fetchSweepstakesConfig,
  hasSweepstakesEntry,
  type SweepstakesConfig,
} from "./sweepstakes"

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

  useEffect(() => {
    const loadConfig = async () => {
      const result = await fetchSweepstakesConfig()
      setConfig(result.config)
    }

    void loadConfig()
  }, [])

  const closePopup = () => {
    setOpen(false)
    setSubmitError("")
  }

  const handleLikeResult = async (result: EventLikeResult) => {
    if (result.status !== "liked") return
    if (!config) return

    const totalLikes = result.totalLikes || 0
    if (totalLikes !== SWEEPSTAKES_THRESHOLD) return

    const browserKey = result.browserKey || getEventLikesBrowserKey()

    const existingEntry = await hasSweepstakesEntry(browserKey, config.id)
    if (existingEntry.exists) return

    setSubmitError("")
    setOpen(true)
  }

  const submitEntry = async (nombre: string, telefono: string) => {
    const browserKey = getEventLikesBrowserKey()

    setSubmitting(true)
    setSubmitError("")

    const likeResult = await hasSweepstakesEntry(browserKey, config?.id)
    if (likeResult.exists) {
      setSubmitting(false)
      return { ok: true }
    }

    const entryResult = await createSweepstakesEntry({
      sorteoId: config?.id || 0,
      browserKey,
      nombre,
      telefono,
      totalLikes: SWEEPSTAKES_THRESHOLD,
    })

    if (entryResult.status === "error") {
      setSubmitError("No pudimos guardar tu participación. Intenta nuevamente.")
      setSubmitting(false)
      return { ok: false }
    }

    setSubmitting(false)
    return { ok: true }
  }

  return {
    config,
    open,
    submitting,
    submitError,
    closePopup,
    handleLikeResult,
    submitEntry,
  }
}
