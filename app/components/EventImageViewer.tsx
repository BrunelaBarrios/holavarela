'use client'

import { useState } from "react"
import { X, ZoomIn } from "lucide-react"
import { OptimizedImage } from "./OptimizedImage"

type EventImageViewerProps = {
  src: string
  alt: string
}

export function EventImageViewer({ src, alt }: EventImageViewerProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group relative block aspect-[16/10] w-full bg-white"
        aria-label="Agrandar imagen del evento"
      >
        <OptimizedImage
          src={src}
          alt={alt}
          sizes="(max-width: 1280px) 100vw, 58vw"
          priority
          className="object-contain p-2 sm:p-4"
        />
        <span className="absolute bottom-4 right-4 inline-flex items-center gap-2 rounded-full bg-slate-950/80 px-4 py-2 text-sm font-semibold text-white shadow-lg transition group-hover:bg-blue-600">
          <ZoomIn className="h-4 w-4" />
          Agrandar
        </span>
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/90 p-3 sm:p-6"
          onClick={() => setOpen(false)}
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute right-4 top-4 z-10 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
          >
            <X className="h-4 w-4" />
            Cerrar
          </button>
          <div
            className="relative h-[88vh] w-full max-w-7xl overflow-hidden rounded-[28px] border border-white/10 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <OptimizedImage
              src={src}
              alt={alt}
              sizes="100vw"
              priority
              className="object-contain p-2 sm:p-5"
            />
          </div>
        </div>
      ) : null}
    </>
  )
}
