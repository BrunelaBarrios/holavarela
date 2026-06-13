'use client'

import { useEffect, useState } from "react"
import { Share2 } from "lucide-react"
import { trackAnalyticsEvent } from "../lib/clientAnalytics"
import { recordShare, type ShareSection } from "../lib/shareTracking"

type ShareButtonProps = {
  title: string
  text?: string
  url: string
  section: ShareSection
  itemId: string
  className?: string
}

export function ShareButton({
  title,
  text,
  url,
  section,
  itemId,
  className = "",
}: ShareButtonProps) {
  const [feedback, setFeedback] = useState<"idle" | "copied">("idle")

  useEffect(() => {
    if (feedback !== "copied") return

    const timeoutId = window.setTimeout(() => setFeedback("idle"), 1800)
    return () => window.clearTimeout(timeoutId)
  }, [feedback])

  const handleShare = async () => {
    const fallbackToClipboard = async () => {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url)
        setFeedback("copied")
        return
      }

      setFeedback("copied")
      window.prompt("Copia este enlace:", url)
    }

    trackAnalyticsEvent("share_click", {
      content_section: section,
      item_id: itemId,
      item_title: title,
    })

    try {
      await recordShare(section, itemId, title)
    } catch (error) {
      console.error("No se pudo registrar el compartido:", error)
    }

    try {
      const cleanTitle = title.trim()
      const cleanText = text?.trim()
      const shareData: ShareData = {
        title: cleanTitle,
        ...(cleanText ? { text: cleanText } : {}),
        url,
      }

      if (
        navigator.share &&
        (!navigator.canShare || navigator.canShare(shareData))
      ) {
        await navigator.share(shareData)
        return
      }

      await fallbackToClipboard()
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return

      try {
        await fallbackToClipboard()
      } catch (clipboardError) {
        console.error("No se pudo copiar el enlace:", clipboardError)
        window.prompt("Copia este enlace:", url)
      }
    }
  }

  return (
    <button type="button" onClick={handleShare} className={className}>
      <Share2 className="h-4 w-4" />
      {feedback === "copied" ? "Enlace copiado" : "Compartir"}
    </button>
  )
}
