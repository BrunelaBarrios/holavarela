'use client'

import { useEffect, useState } from "react"
import { Share2 } from "lucide-react"

type ShareButtonProps = {
  title: string
  text?: string
  url: string
  className?: string
}

export function ShareButton({
  title,
  text,
  url,
  className = "",
}: ShareButtonProps) {
  const [feedback, setFeedback] = useState<"idle" | "copied">("idle")

  useEffect(() => {
    if (feedback !== "copied") return

    const timeoutId = window.setTimeout(() => setFeedback("idle"), 1800)
    return () => window.clearTimeout(timeoutId)
  }, [feedback])

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url })
        return
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url)
        setFeedback("copied")
        return
      }

      window.prompt("Copiá este enlace:", url)
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return
      window.alert("No se pudo compartir este contenido.")
    }
  }

  return (
    <button type="button" onClick={handleShare} className={className}>
      <Share2 className="h-4 w-4" />
      {feedback === "copied" ? "Enlace copiado" : "Compartir"}
    </button>
  )
}
