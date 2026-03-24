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
      <div className="rounded-[28px] border border-blue-400/20 bg-[linear-gradient(135deg,#1d4ed8_0%,#1e40af_100%)] p-5 text-white/85 shadow-[0_18px_45px_-30px_rgba(29,78,216,0.75)]">
        Carga una URL de radio para habilitar la reproduccion.
      </div>
    )
  }

  return (
    <a
      href={normalizedUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex w-full items-center justify-center gap-4 rounded-[28px] border border-blue-400/20 bg-[linear-gradient(135deg,#1d4ed8_0%,#1e40af_100%)] px-8 py-5 text-white shadow-[0_18px_45px_-30px_rgba(29,78,216,0.75)] transition hover:-translate-y-0.5 hover:brightness-105"
    >
      <Radio className="h-6 w-6" />
      <span className="flex flex-col text-left">
        <span className="text-xl font-semibold">Escucha: Radio {title}</span>
        <span className="text-sm font-medium text-blue-100">
          te redirigiremos a radios.com.uy
        </span>
      </span>
      <ExternalLink className="h-5 w-5" />
    </a>
  )
}
