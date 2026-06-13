'use client'

import { useState } from "react"
import { Gift, Info, Phone, UserRound, X } from "lucide-react"
import { OptimizedImage } from "./OptimizedImage"
import type { SweepstakesParticipant } from "../lib/sweepstakes"

type SweepstakesPopupMode = "info" | "entry"

type SweepstakesPopupProps = {
  open: boolean
  title?: string
  description: string
  participants: SweepstakesParticipant[]
  mode?: SweepstakesPopupMode
  loading?: boolean
  error?: string
  onClose: () => void
  onSubmit?: (nombre: string, telefono: string) => Promise<{ ok: boolean }>
}

export function SweepstakesPopup({
  open,
  title = "Como participar",
  description,
  participants,
  mode = "info",
  loading = false,
  error = "",
  onClose,
  onSubmit,
}: SweepstakesPopupProps) {
  const [nombre, setNombre] = useState("")
  const [telefono, setTelefono] = useState("")
  const [success, setSuccess] = useState("")

  if (!open) return null

  const isEntryMode = mode === "entry"

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!onSubmit) return

    setSuccess("")
    const result = await onSubmit(nombre, telefono)
    if (!result.ok) return

    setSuccess("Cupón registrado. Gracias por participar.")
    setNombre("")
    setTelefono("")
    window.setTimeout(() => {
      setSuccess("")
      onClose()
    }, 1400)
  }

  return (
    <div className="fixed inset-0 z-[95] overflow-y-auto bg-slate-950/45 p-4">
      <div className="mx-auto flex min-h-full items-center justify-center">
        <div className={`relative my-6 w-full overflow-hidden rounded-[30px] border border-white/20 bg-white shadow-2xl ${isEntryMode ? "max-w-3xl" : "max-w-xl"}`}>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 z-10 rounded-full border border-slate-200 bg-white/95 p-2 text-slate-600 shadow-sm transition hover:text-slate-900"
            aria-label={isEntryMode ? "Cerrar aviso del sorteo" : "Cerrar aviso informativo"}
          >
            <X className="h-5 w-5" />
          </button>

          <div className={`max-h-[90vh] overflow-y-auto ${isEntryMode ? "grid lg:grid-cols-[1.05fr_0.95fr]" : ""}`}>
            <div className="bg-[radial-gradient(circle_at_top_left,#d7f0db_0%,#eef8f2_42%,#f8fbff_100%)] p-6 sm:p-8">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/85 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                {isEntryMode ? <Gift className="h-4 w-4" /> : <Info className="h-4 w-4" />}
                {isEntryMode ? "Sorteo Hola Varela" : "Como participar"}
              </div>

              <h2 className="mt-5 pr-8 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                {isEntryMode ? "Completá tu cupón" : title}
              </h2>
              <p className="mt-4 whitespace-pre-line text-base leading-8 text-slate-700">
                {description}
              </p>

              {isEntryMode && participants.length ? (
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
                        <div className="relative h-24 w-full bg-white p-3">
                          {participant.imageSrc ? (
                            <OptimizedImage
                              src={participant.imageSrc}
                              alt={participant.nombre}
                              sizes="(max-width: 768px) 100vw, 25vw"
                              className="object-contain"
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

            {isEntryMode ? (
              <div className="p-6 sm:p-8">
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <h3 className="text-xl font-semibold text-slate-950">
                      Tus datos
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Al llegar a 3 corazones podés completar este cupón para el sorteo.
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

                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-slate-700">Nombre</span>
                    <span className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 transition focus-within:border-emerald-400">
                      <UserRound className="h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        value={nombre}
                        onChange={(event) => setNombre(event.target.value)}
                        required
                        className="w-full bg-transparent outline-none"
                      />
                    </span>
                  </label>

                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-slate-700">Teléfono</span>
                    <span className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 transition focus-within:border-emerald-400">
                      <Phone className="h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        value={telefono}
                        onChange={(event) => setTelefono(event.target.value)}
                        required
                        className="w-full bg-transparent outline-none"
                      />
                    </span>
                  </label>

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="submit"
                      disabled={loading}
                      className="inline-flex flex-1 items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-70"
                    >
                      {loading ? "Guardando..." : "Guardar cupón"}
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="inline-flex items-center justify-center rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                    >
                      Cerrar
                    </button>
                  </div>
                </form>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
