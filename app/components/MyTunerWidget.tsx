'use client'

import { ExternalLink, Radio } from "lucide-react"

type MyTunerWidgetProps = {
  streamUrl: string
  title: string
}

export function MyTunerWidget({ streamUrl, title }: MyTunerWidgetProps) {
  const normalizedUrl = streamUrl.trim()

  if (!normalizedUrl) {
    return (
      <div className="rounded-2xl bg-white/10 p-5 text-white/85">
        Carga una URL de radio para habilitar la reproduccion.
      </div>
    )
  }

  return (
    <a
      href={normalizedUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-white px-8 py-5 text-xl font-semibold text-blue-700 shadow-sm transition hover:bg-slate-50"
    >
      <Radio className="h-6 w-6" />
      Escuchar {title} en otra web
      <ExternalLink className="h-5 w-5" />
    </a>
  )
}
