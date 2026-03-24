'use client'

import { ExternalLink, Radio } from "lucide-react"

type MyTunerWidgetProps = {
  streamUrl: string
  title: string
  description: string
  isLive: boolean
}

export function MyTunerWidget({
  streamUrl,
  title,
  description,
  isLive,
}: MyTunerWidgetProps) {
  const normalizedUrl = streamUrl.trim()

  if (!isLive || !normalizedUrl) return null

  return (
    <section className="py-6">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-[32px] border border-blue-100 bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_55%,#38bdf8_100%)] p-6 text-white shadow-[0_24px_60px_-32px_rgba(29,78,216,0.7)] md:p-8">
          <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-white/90">
                <span className="h-2 w-2 rounded-full bg-emerald-300" />
                En vivo
              </div>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
                {title}
              </h2>
              <p className="mt-3 max-w-2xl text-base leading-7 text-blue-50/95 md:text-lg">
                {description}
              </p>
            </div>

            <a
              href={normalizedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-3 rounded-2xl bg-white px-6 py-4 font-semibold text-blue-700 shadow-lg transition hover:-translate-y-0.5 hover:bg-slate-50"
            >
              <Radio className="h-5 w-5" />
              Escuchar ahora
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
