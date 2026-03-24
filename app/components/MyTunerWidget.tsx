'use client'

import { Play, Radio, VolumeX } from "lucide-react"

type MyTunerWidgetProps = {
  streamUrl: string
  title: string
  description: string
}

export function MyTunerWidget({
  streamUrl,
  title,
  description,
}: MyTunerWidgetProps) {
  const normalizedUrl = streamUrl.trim()

  if (!normalizedUrl) {
    return (
      <div className="rounded-[28px] bg-[linear-gradient(135deg,#4da3e6_0%,#5ea8e6_55%,#6bb2ea_100%)] p-6 text-white shadow-[0_20px_45px_-24px_rgba(59,130,246,0.65)]">
        Carga una URL de radio para habilitar la reproduccion.
      </div>
    )
  }

  return (
    <a
      href={normalizedUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex w-full items-center justify-between gap-6 rounded-[28px] bg-[linear-gradient(135deg,#4a99de_0%,#5ba6e5_55%,#69b2eb_100%)] px-10 py-8 text-white shadow-[0_20px_50px_-24px_rgba(59,130,246,0.7)] transition hover:-translate-y-0.5 hover:brightness-[1.03] max-md:flex-col max-md:items-start"
    >
      <div className="flex items-center gap-7">
        <div className="flex h-[120px] w-[120px] items-center justify-center rounded-full bg-white/14">
          <Radio className="h-12 w-12" strokeWidth={2.2} />
        </div>

        <div className="text-left">
          <h2 className="text-4xl font-semibold tracking-tight max-md:text-3xl">
            {title}
          </h2>
          <p className="mt-3 text-2xl font-medium text-white/95 max-md:text-xl">
            {description}
          </p>
          <div className="mt-6 flex items-center gap-3 text-xl text-white/95 max-md:text-lg">
            <VolumeX className="h-5 w-5" />
            <span>Fuera del aire</span>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center">
        <div className="inline-flex items-center gap-4 rounded-2xl bg-white px-10 py-5 text-[2rem] font-semibold text-blue-500 shadow-sm max-md:px-8 max-md:py-4 max-md:text-xl">
          <Play className="h-7 w-7 fill-current" />
          <span>Escuchar ahora</span>
        </div>
      </div>
    </a>
  )
}
