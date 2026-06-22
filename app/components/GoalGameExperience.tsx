'use client'

import Link from "next/link"
import { useMemo, useState } from "react"
import { ArrowLeft, Goal, RotateCcw, Shield, Trophy } from "lucide-react"
import {
  type GoalGameConfig,
  type GoalGameRankingEntry,
  normalizeGoalPlayerName,
} from "../lib/goalGame"

type KickSide = "izquierda" | "centro" | "derecha"

const KICK_OPTIONS: Array<{
  key: KickSide
  label: string
  helper: string
}> = [
  { key: "izquierda", label: "Izquierda", helper: "Cruzar al palo" },
  { key: "centro", label: "Centro", helper: "Fuerte al medio" },
  { key: "derecha", label: "Derecha", helper: "Abrir el pie" },
]

const SIDE_LABELS: Record<KickSide, string> = {
  izquierda: "izquierda",
  centro: "centro",
  derecha: "derecha",
}

function pickGoalkeeperSide(): KickSide {
  return KICK_OPTIONS[Math.floor(Math.random() * KICK_OPTIONS.length)].key
}

export function GoalGameExperience({
  config,
  initialRanking,
}: {
  config: GoalGameConfig
  initialRanking: GoalGameRankingEntry[]
}) {
  const [name, setName] = useState("")
  const [score, setScore] = useState(0)
  const [gameStarted, setGameStarted] = useState(false)
  const [gameOver, setGameOver] = useState(false)
  const [lastKick, setLastKick] = useState<{
    player: KickSide
    goalkeeper: KickSide
    goal: boolean
  } | null>(null)
  const [ranking, setRanking] = useState(initialRanking)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")

  const normalizedName = useMemo(() => normalizeGoalPlayerName(name), [name])
  const canStart = normalizedName.length > 0 && config.activo

  const saveScore = async (finalScore: number) => {
    setSaving(true)
    setMessage("Guardando puntaje...")

    try {
      const response = await fetch("/api/juego-gol/participaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: normalizedName,
          puntaje: finalScore,
        }),
      })
      const result = (await response.json()) as {
        ranking?: GoalGameRankingEntry[]
        error?: string
      }

      if (!response.ok) {
        setMessage(result.error || "No se pudo guardar el puntaje.")
        return
      }

      setRanking(result.ranking || ranking)
      setMessage("Puntaje guardado en el ranking.")
    } catch {
      setMessage("No se pudo guardar el puntaje.")
    } finally {
      setSaving(false)
    }
  }

  const startGame = () => {
    if (!canStart) {
      setMessage("Ingresa tu nombre para empezar.")
      return
    }

    setName(normalizedName)
    setScore(0)
    setGameStarted(true)
    setGameOver(false)
    setLastKick(null)
    setMessage("")
  }

  const kick = (side: KickSide) => {
    if (!gameStarted || gameOver || saving) return

    const goalkeeper = pickGoalkeeperSide()
    const isGoal = side !== goalkeeper
    const nextScore = isGoal ? score + 1 : score

    setLastKick({ player: side, goalkeeper, goal: isGoal })

    if (isGoal) {
      setScore(nextScore)
      setMessage("Gol. Segui pateando.")
      return
    }

    setGameOver(true)
    setMessage("Atajada. Fin de la partida.")
    void saveScore(nextScore)
  }

  const resetGame = () => {
    setScore(0)
    setGameStarted(false)
    setGameOver(false)
    setLastKick(null)
    setMessage("")
  }

  if (!config.activo) {
    return (
      <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#ecfeff_54%,#ffffff_100%)] px-4 py-8 text-slate-950">
        <div className="mx-auto max-w-3xl">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-sky-200 hover:text-sky-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a Hola Varela
          </Link>

          <section className="mt-10 rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-[0_22px_55px_-36px_rgba(15,23,42,0.32)]">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
              <Goal className="h-8 w-8" />
            </div>
            <h1 className="mt-5 text-3xl font-black tracking-normal sm:text-4xl">
              {config.titulo}
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-base leading-7 text-slate-600">
              El juego esta pausado por ahora. Cuando vuelva a estar activo, vas a verlo anunciado en la home.
            </p>
          </section>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#ecfeff_0%,#f8fafc_46%,#ffffff_100%)] px-4 py-6 text-slate-950 sm:py-8">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-sky-200 hover:text-sky-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a Hola Varela
        </Link>

        <section className="mt-6 overflow-hidden rounded-[28px] border border-cyan-100 bg-white shadow-[0_22px_60px_-38px_rgba(8,145,178,0.55)]">
          <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="bg-[linear-gradient(135deg,#0f172a_0%,#075985_52%,#16a34a_100%)] p-5 text-white sm:p-8 lg:p-10">
              <div className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ring-1 ring-white/20">
                Penal a penal
              </div>
              <h1 className="mt-4 text-4xl font-black tracking-normal sm:text-5xl">
                {config.titulo}
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-cyan-50 sm:text-lg">
                Elegi izquierda, centro o derecha. Si el arquero adivina, termina la partida. Si no, es gol y sumas otro punto.
              </p>

              <div className="mt-8 rounded-3xl border border-white/20 bg-white/10 p-4 backdrop-blur sm:p-5">
                {!gameStarted ? (
                  <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-cyan-50">
                        Tu nombre
                      </span>
                      <input
                        type="text"
                        value={name}
                        onChange={(event) => setName(event.target.value.slice(0, 30))}
                        maxLength={30}
                        placeholder="Nombre o apodo"
                        className="w-full rounded-2xl border border-white/20 bg-white px-4 py-4 text-base font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-cyan-200"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={startGame}
                      disabled={!canStart}
                      className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-white px-6 text-base font-black text-slate-950 transition hover:-translate-y-0.5 hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Goal className="h-5 w-5" />
                      Empezar
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-cyan-50">
                          Jugando como {normalizedName}
                        </div>
                        <div className="mt-1 text-3xl font-black">{score} gol(es)</div>
                      </div>
                      <button
                        type="button"
                        onClick={resetGame}
                        className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
                      >
                        <RotateCcw className="h-4 w-4" />
                        Reiniciar
                      </button>
                    </div>

                    <div className="mt-6 grid gap-3 sm:grid-cols-3">
                      {KICK_OPTIONS.map((option) => (
                        <button
                          key={option.key}
                          type="button"
                          onClick={() => kick(option.key)}
                          disabled={gameOver || saving}
                          className="rounded-2xl border border-white/20 bg-white px-4 py-5 text-left text-slate-950 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.8)] transition hover:-translate-y-0.5 hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <span className="block text-lg font-black">{option.label}</span>
                          <span className="mt-1 block text-sm font-medium text-slate-500">
                            {option.helper}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {lastKick ? (
                  <div
                    className={`mt-5 rounded-2xl border px-4 py-3 text-sm font-semibold ${
                      lastKick.goal
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : "border-amber-200 bg-amber-50 text-amber-800"
                    }`}
                  >
                    Vos pateaste a la {SIDE_LABELS[lastKick.player]} y el arquero fue a la {SIDE_LABELS[lastKick.goalkeeper]}.
                  </div>
                ) : null}

                {message ? (
                  <div className="mt-4 text-sm font-semibold text-cyan-50">{message}</div>
                ) : null}

                {gameOver ? (
                  <button
                    type="button"
                    onClick={startGame}
                    disabled={saving}
                    className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-5 py-4 text-base font-black text-emerald-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                  >
                    <RotateCcw className="h-5 w-5" />
                    Jugar otra vez
                  </button>
                ) : null}
              </div>
            </div>

            <aside className="bg-slate-50 p-5 sm:p-8">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                  <Trophy className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-950">Ranking</h2>
                  <p className="text-sm text-slate-500">Mejores puntajes</p>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {ranking.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm leading-6 text-slate-500">
                    Todavia no hay participantes. El primer penal puede ser tuyo.
                  </div>
                ) : (
                  ranking.slice(0, 10).map((entry, index) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-white bg-white px-4 py-3 shadow-[0_14px_32px_-28px_rgba(15,23,42,0.5)]"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-sm font-black text-white">
                          {index + 1}
                        </span>
                        <span className="truncate text-sm font-black text-slate-950">
                          {entry.nombre}
                        </span>
                      </div>
                      <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-sm font-black text-emerald-700">
                        {entry.puntaje}
                      </span>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-6 rounded-2xl border border-cyan-100 bg-cyan-50 p-4 text-sm leading-6 text-cyan-900">
                <div className="flex items-center gap-2 font-black">
                  <Shield className="h-4 w-4" />
                  Regla rapida
                </div>
                <p className="mt-2">
                  En empate queda primero quien llego antes al puntaje.
                </p>
              </div>
            </aside>
          </div>
        </section>
      </div>
    </main>
  )
}
