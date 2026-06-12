'use client'

import { Info, X } from "lucide-react"
import { OptimizedImage } from "./OptimizedImage"
import type { SweepstakesParticipant } from "../lib/sweepstakes"

type SweepstakesPopupProps = {
  open: boolean
  title?: string
  description: string
  participants: SweepstakesParticipant[]
  loading?: boolean
  error?: string
  onClose: () => void
}

export function SweepstakesPopup({
  open,
  title = "Como participar",
  description,
  participants,
  onClose,
}: SweepstakesPopupProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[95] overflow-y-auto bg-slate-950/45 p-4">
      <div className="mx-auto flex min-h-full items-center justify-center">
        <div className="relative my-6 w-full max-w-xl overflow-hidden rounded-[30px] border border-white/20 bg-white shadow-2xl">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 z-10 rounded-full border border-slate-200 bg-white/95 p-2 text-slate-600 shadow-sm transition hover:text-slate-900"
            aria-label="Cerrar aviso del sorteo"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="max-h-[90vh] overflow-y-auto bg-[radial-gradient(circle_at_top_left,#d7f0db_0%,#eef8f2_42%,#f8fbff_100%)] p-6 sm:p-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/85 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
              <Info className="h-4 w-4" />
              Sorteo Hola Varela
            </div>

            <h2 className="mt-5 pr-8 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              {title}
            </h2>
            <p className="mt-4 whitespace-pre-line text-base leading-8 text-slate-700">
              {description}
            </p>

            {participants.length ? (
              <div className="mt-6 rounded-[24px] border border-white/80 bg-white/85 p-4 shadow-sm">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Premios de
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {participants.map((participant) => (
                    <div
                      key={`${participant.type}-${participant.id}`}
                      className="overflow-hidden rounded-[20px] border border-slate-100 bg-white"
                    >
                      <div className="relative h-24 w-full bg-slate-100">
                        {participant.imageSrc ? (
                          <OptimizedImage
                            src={participant.imageSrc}
                            alt={participant.nombre}
                            sizes="(max-width: 768px) 100vw, 25vw"
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-sm text-slate-400">
                            Sin foto
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <div className="text-sm font-semibold text-slate-900">
                          {participant.nombre}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

          </div>
        </div>
      </div>
    </div>
  )
}
