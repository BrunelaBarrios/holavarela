'use client'

import Link from "next/link"
import { useState } from "react"
import { ArrowRight, X } from "lucide-react"
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
  onSubmit: (nombre: string, telefono: string) => Promise<{ ok: boolean }>
}

export function SweepstakesPopup({
  open,
  title = "Participá con tus corazones",
  description,
  participants,
  loading = false,
  error = "",
  onClose,
  onSubmit,
}: SweepstakesPopupProps) {
  const [nombre, setNombre] = useState("")
  const [telefono, setTelefono] = useState("")
  const [success, setSuccess] = useState("")

  if (!open) return null

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSuccess("")

    const result = await onSubmit(nombre, telefono)
    if (!result.ok) return

    setSuccess("Ya quedaste participando. Mucha suerte.")
    setNombre("")
    setTelefono("")
    window.setTimeout(() => {
      setSuccess("")
      onClose()
    }, 1200)
  }

  return (
    <div className="fixed inset-0 z-[95] overflow-y-auto bg-slate-950/70 p-4">
      <div className="mx-auto flex min-h-full items-center justify-center">
        <div className="relative my-6 w-full max-w-3xl overflow-hidden rounded-[32px] border border-white/10 bg-white shadow-2xl max-h-[90vh]">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 z-10 rounded-full border border-slate-200 bg-white/95 p-2 text-slate-600 shadow-sm transition hover:text-slate-900"
            aria-label="Cerrar popup del sorteo"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="grid max-h-[90vh] gap-0 overflow-y-auto lg:grid-cols-[1.05fr_0.95fr]">
            <div className="bg-[radial-gradient(circle_at_top_left,#d7f0db_0%,#e9f7ef_35%,#edf5ff_100%)] p-6 sm:p-8">
              <div className="inline-flex rounded-full bg-white/85 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                Sorteo Hola Varela
              </div>
              <h2 className="mt-5 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                {title}
              </h2>
              <p className="mt-4 whitespace-pre-line text-base leading-8 text-slate-700">
                {description}
              </p>

              {participants.length ? (
                <div className="mt-6">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Premios de
                  </div>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    {participants.map((participant) => (
                      <Link
                        key={`${participant.type}-${participant.id}`}
                        href={participant.href}
                        className="overflow-hidden rounded-[24px] border border-white/80 bg-white/90 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                      >
                        <div className="relative h-36 w-full bg-slate-100">
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
                        <div className="p-4">
                          <div className="text-base font-semibold text-slate-900">
                            {participant.nombre}
                          </div>
                          <div className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-emerald-700">
                            Ver ficha
                            <ArrowRight className="h-4 w-4" />
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="p-6 sm:p-8">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <h3 className="text-xl font-semibold text-slate-950">
                    Dejanos tus datos
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Con tu nombre y teléfono ya quedás participando del sorteo.
                  </p>
                </div>

                {error ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                ) : null}

                {success ? (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    {success}
                  </div>
                ) : null}

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Nombre</label>
                  <input
                    type="text"
                    value={nombre}
                    onChange={(event) => setNombre(event.target.value)}
                    required
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-emerald-400"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Telefono</label>
                  <input
                    type="text"
                    value={telefono}
                    onChange={(event) => setTelefono(event.target.value)}
                    required
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-emerald-400"
                  />
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex flex-1 items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-70"
                  >
                    {loading ? "Guardando..." : "Participar"}
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex items-center justify-center rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    Ahora no
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}