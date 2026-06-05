'use client'

import Link from "next/link"
import { useEffect, useState } from "react"
import { ArrowRight, Gift, Phone, UserRound } from "lucide-react"
import { PublicHeader } from "./PublicHeader"
import {
  createSweepstakesEntry,
  fetchSweepstakesConfig,
  fetchSweepstakesConfigById,
  type SweepstakesConfig,
  type SweepstakesEntrySource,
} from "../lib/sweepstakes"
import { getEventLikesBrowserKey } from "../lib/eventLikes"

type MatchType = "individual" | "familiar"

const MATCH_TYPES: Array<{
  key: MatchType
  title: string
  description: string
}> = [
  {
    key: "individual",
    title: "Partida individual",
    description: "Una persona participa con sus datos.",
  },
  {
    key: "familiar",
    title: "Partida familiar",
    description: "Ideal para jugar y participar en familia.",
  },
]

function getLandingEntrySource(): SweepstakesEntrySource {
  if (typeof window === "undefined") return "web"

  const params = new URLSearchParams(window.location.search)
  const rawSource = params.get("origen") || params.get("source") || params.get("utm_source")

  return rawSource?.toLowerCase() === "qr" ? "qr" : "web"
}

export function SweepstakesLandingPage({ sorteoId }: { sorteoId?: number }) {
  const [config, setConfig] = useState<SweepstakesConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [nombre, setNombre] = useState("")
  const [telefono, setTelefono] = useState("")
  const [matchType, setMatchType] = useState<MatchType | null>(null)
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

  const selectedMatchType = MATCH_TYPES.find((option) => option.key === matchType)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!config) return

    const browserKey = getEventLikesBrowserKey()
    setSubmitting(true)
    setError("")
    setMessage("")

    const result = await createSweepstakesEntry({
      sorteoId: config.id,
      browserKey,
      nombre,
      telefono,
      totalLikes: 3,
      source: getLandingEntrySource(),
    })

    if (result.status === "error") {
      setSubmitting(false)
      setError("No pudimos registrar tu participacion. Intenta nuevamente.")
      return
    }

    setSubmitting(false)
    setNombre("")
    setTelefono("")
    setMessage("Gracias por participar. Sigue viendo Hola Varela.")
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fbff_0%,#eef7f2_45%,#ffffff_100%)] text-slate-900">
      <PublicHeader items={[]} />

      <section className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
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
            <div className="space-y-6">
              <section className="rounded-[32px] border border-blue-200/50 bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_58%,#38bdf8_100%)] p-6 text-white shadow-[0_24px_70px_rgba(29,78,216,0.24)] sm:p-8">
                <div className="inline-flex rounded-full bg-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-blue-50 ring-1 ring-white/20">
                  Sorteo Hola Varela
                </div>
                <h1 className="mt-5 text-4xl font-semibold tracking-normal sm:text-5xl">
                  {config.title}
                </h1>
                <p className="mt-5 max-w-3xl whitespace-pre-line text-lg leading-8 text-blue-50">
                  {config.description}
                </p>

                {!matchType ? (
                  <div className="mt-8">
                    <div className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-100">
                      Elegir tipo de partida
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {MATCH_TYPES.map((option) => (
                        <button
                          key={option.key}
                          type="button"
                          onClick={() => {
                            setMatchType(option.key)
                            setError("")
                            setMessage("")
                          }}
                          className="rounded-2xl border border-white/25 bg-white/12 p-5 text-left transition hover:-translate-y-0.5 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/70"
                        >
                          <span className="block text-lg font-semibold text-white">
                            {option.title}
                          </span>
                          <span className="mt-2 block text-sm leading-6 text-blue-50">
                            {option.description}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="mt-8 flex flex-col gap-3 rounded-2xl border border-white/20 bg-white/12 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-100">
                        Tipo de partida
                      </div>
                      <div className="mt-1 text-lg font-semibold text-white">
                        {selectedMatchType?.title}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setMatchType(null)
                        setError("")
                        setMessage("")
                      }}
                      className="inline-flex items-center justify-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
                    >
                      Cambiar
                    </button>
                  </div>
                )}
              </section>

              {matchType ? (
                <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                  <div className="inline-flex rounded-full bg-sky-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
                    Participa
                  </div>
                  <h2 className="mt-5 text-3xl font-semibold text-slate-950">
                    Deja tus datos
                  </h2>
                  <p className="mt-3 text-base leading-7 text-slate-600">
                    Completa nombre y telefono para participar del sorteo.
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
                      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-600 disabled:opacity-70"
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
              ) : null}
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
