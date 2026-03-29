'use client'

import { useState, type ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { X } from "lucide-react"
import { OptimizedImage } from "./OptimizedImage"

type DetailMetaItem = {
  icon: LucideIcon
  text: string
}

type PublicDetailModalProps = {
  open: boolean
  onClose: () => void
  title: string
  imageSrc?: string | null
  imageAlt: string
  badge?: string | null
  description?: string | null
  meta?: DetailMetaItem[]
  actions?: ReactNode
}

export function PublicDetailModal({
  open,
  onClose,
  title,
  imageSrc,
  imageAlt,
  badge,
  description,
  meta = [],
  actions,
}: PublicDetailModalProps) {
  const [isImageZoomed, setIsImageZoomed] = useState(false)

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 p-4">
      {isImageZoomed && imageSrc ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/92 p-4">
          <button
            type="button"
            onClick={() => setIsImageZoomed(false)}
            className="absolute right-4 top-4 rounded-full bg-white/90 p-2 text-slate-700 shadow-sm transition hover:bg-white"
            aria-label="Cerrar imagen ampliada"
          >
            <X className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={() => setIsImageZoomed(false)}
            className="relative h-[88vh] w-full max-w-5xl overflow-hidden rounded-[28px] bg-white/5"
          >
            <OptimizedImage
              src={imageSrc}
              alt={imageAlt}
              sizes="100vw"
              priority
              className="object-contain p-4"
            />
          </button>
        </div>
      ) : null}

      <div className="relative max-h-[90vh] w-full max-w-7xl overflow-y-auto rounded-[28px] bg-white shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-full bg-white/90 p-2 text-slate-700 shadow-sm transition hover:bg-white"
          aria-label="Cerrar detalle"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-[1.45fr_0.55fr]">
          <div className="bg-[linear-gradient(180deg,#f8fafc_0%,#eef4ff_100%)]">
            {imageSrc ? (
              <div className="flex min-h-[420px] w-full items-center justify-center bg-slate-100 p-3 md:min-h-[620px] md:p-5">
                <button
                  type="button"
                  onClick={() => setIsImageZoomed(true)}
                  className="relative aspect-[4/5] h-[380px] w-full max-w-[680px] overflow-hidden rounded-[24px] border border-white/80 bg-white shadow-[0_18px_45px_-28px_rgba(15,23,42,0.45)] transition hover:scale-[1.01] md:h-[560px]"
                  aria-label="Ver imagen mas grande"
                >
                  <OptimizedImage
                    src={imageSrc}
                    alt={imageAlt}
                    sizes="(max-width: 1024px) 100vw, 60vw"
                    className="object-cover"
                  />
                </button>
              </div>
            ) : (
              <div className="flex min-h-[320px] items-center justify-center text-slate-400">
                Sin imagen
              </div>
            )}
          </div>

          <div className="p-6 md:p-8">
            {badge && (
              <div className="mb-4 inline-flex rounded-full bg-sky-50 px-3 py-1 text-sm font-semibold text-sky-700">
                {badge}
              </div>
            )}

            <h3 className="text-3xl font-semibold leading-tight text-slate-900">
              {title}
            </h3>

            {meta.length > 0 && (
              <div className="mt-6 space-y-3 text-slate-600">
                {meta.map(({ icon: Icon, text }, index) => (
                  <div key={`${text}-${index}`} className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    <span>{text}</span>
                  </div>
                ))}
              </div>
            )}

            {description && (
              <p className="mt-6 whitespace-pre-line text-lg leading-8 text-slate-600">
                {description}
              </p>
            )}

            {actions && <div className="mt-8 flex flex-wrap gap-3">{actions}</div>}
          </div>
        </div>
      </div>
    </div>
  )
}
