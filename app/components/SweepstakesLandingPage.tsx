'use client'

import Link from "next/link"
import { useEffect, useState } from "react"
import { ArrowRight, Gift, Phone, UserRound } from "lucide-react"
import { OptimizedImage } from "./OptimizedImage"
import { PublicHeader } from "./PublicHeader"
import { createSweepstakesEntry, fetchSweepstakesConfig, fetchSweepstakesConfigById, hasSweepstakesEntry, type SweepstakesConfig } from "../lib/sweepstakes"
import { getEventLikesBrowserKey } from "../lib/eventLikes"

export function SweepstakesLandingPage({ sorteoId }: { sorteoId?: number }) {
  const [config, setConfig] = useState<SweepstakesConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [nombre, setNombre] = useState("")
  const [telefono, setTelefono] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true

    const loadConfig = async () => {
      const result = sorteoId
        ? await fetchSweepstakesConfigById(sorteoId)
        : await fetchSweepstakesConfig()
      if (!active) return

      setConfig(result.config)
      setLoading(false)
    }

    void loadConfig()

    return () => {
      active = false
    }
  }, [sorteoId])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!config) return

    const browserKey = getEventLikesBrowserKey()
    setSubmitting(true)
    setError("")
    setMessage("")

    const existingEntry = await hasSweepstakesEntry(browserKey, config.id)
    if (existingEntry.exists) {
      setSubmitting(false)
      setMessage("Ya estabas participando. Gracias por sumarte a Hola Varela.")
      return
    }

    const result = await createSweepstakesEntry({
      sorteoId: config.id,
      browserKey,
      nombre,
      telefono,
      totalLikes: 0,
    })

    if (result.status === "error") {
      setSubmitting(false)
      setError("No pudimos registrar tu participación. Intenta nuevamente.")
      return
    }

    setSubmitting(false)
    setNombre("")
    setTelefono("")
    setMessage("Gracias por participar. Sigue viendo Hola Varela.")
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fbff_0%,#eef7f2_45%,#ffffff_100%)] text-slate-900">
      <PublicHeader navItems={[]} />

      <section className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          {loading ? (
            <div className="rounded-[32px] border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">
              Cargando sorteo...
            </div>
          ) : !config ? (
            <div className="rounded-[32px] border border-slate-200 bg-white p-10 text-center shadow-sm">
              <div className="mx-auto inline-flex rounded-full bg-slate-100 p-4 text-slate-500">
                <Gift className="h-6 w-6" />
              </div>
              <h1 className="mt-5 text-3xl font-semibold text-slate-950">Hola Varela</h1>
              <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600">
                En este momento no hay un sorteo activo para participar.
              </p>
              <div className="mt-6">
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-600"
                >
                  Ver Hola Varela
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                <div className="inline-flex rounded-full bg-emerald-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                  Hola Varela
                </div>
                <h1 className="mt-5 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                  {config.title}
                </h1>
                <p className="mt-5 whitespace-pre-line text-lg leading-8 text-slate-600">
                  {config.description}
                </p>

                {config.participants.length ? (
                  <div className="mt-8">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Participan
                    </div>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      {config.participants.map((participant) => (
                        <Link
                          key={`${participant.type}-${participant.id}`}
                          href={participant.href}
                          className="overflow-hidden rounded-[24px] border border-slate-200 bg-slate-50 transition hover:-translate-y-0.5 hover:shadow-md"
                        >
                          <div className="relative h-40 w-full bg-slate-100">
                            {participant.imageSrc ? (
                              <OptimizedImage
                                src={participant.imageSrc}
                                alt={participant.nombre}
                                sizes="(max-width: 768px) 100vw, 33vw"
                                className="object-cover"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center text-sm text-slate-400">
                                Sin imagen
                              </div>
                            )}
                          </div>
                          <div className="p-4">
                            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                              {participant.type}
                            </div>
                            <div className="mt-2 text-lg font-semibold text-slate-900">
                              {participant.nombre}
                            </div>
                            <div className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-blue-700">
                              Ver ficha
                              <ArrowRight className="h-4 w-4" />
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : null}
              </section>

              <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                <div className="inline-flex rounded-full bg-sky-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
                  Participa
                </div>
                <h2 className="mt-5 text-3xl font-semibold text-slate-950">
                  Deja tus datos
                </h2>
                <p className="mt-3 text-base leading-7 text-slate-600">
                  Completa nombre y teléfono para participar del sorteo.
                </p>

                <form onSubmit={handleSubmit} className="mt-8 space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Nombre</label>
                    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3">
                      <UserRound className="h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        value={nombre}
                        onChange={(event) => setNombre(event.target.value)}
                        required
                        className="w-full outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Telefono</label>
                    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3">
                      <Phone className="h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        value={telefono}
                        onChange={(event) => setTelefono(event.target.value)}
                        required
                        className="w-full outline-none"
                      />
                    </div>
                  </div>

                  {error ? (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {error}
                    </div>
                  ) : null}

                  {message ? (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                      {message}
                    </div>
                  ) : null}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-70"
                  >
                    {submitting ? "Guardando..." : "Participar"}
                  </button>
                </form>

                <div className="mt-6">
                  <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 transition hover:text-blue-800"
                  >
                    Ver Hola Varela
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </section>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
