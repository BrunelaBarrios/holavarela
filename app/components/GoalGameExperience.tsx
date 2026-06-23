'use client'

import { useMemo, useState, type CSSProperties } from "react"
import { ArrowLeft, Goal, RotateCcw, Shield, Trophy } from "lucide-react"
import {
  type GoalGameConfig,
  type GoalGameRankingEntry,
  normalizeGoalPlayerName,
} from "../lib/goalGame"

type KickSide = "izquierda" | "angulo-izquierdo" | "centro" | "angulo-derecho" | "derecha"
type KeeperMove = "vuelo" | "estirada" | "barrida" | "rebote"

const KICK_OPTIONS: Array<{
  key: KickSide
  label: string
  helper: string
}> = [
  { key: "izquierda", label: "Izquierda", helper: "Cruzar al palo" },
  { key: "angulo-izquierdo", label: "Angulo izq.", helper: "Arriba, imposible" },
  { key: "centro", label: "Centro", helper: "Fuerte al medio" },
  { key: "angulo-derecho", label: "Angulo der.", helper: "Arriba, con clase" },
  { key: "derecha", label: "Derecha", helper: "Abrir el pie" },
]

const SIDE_LABELS: Record<KickSide, string> = {
  izquierda: "la izquierda",
  "angulo-izquierdo": "el angulo izquierdo",
  centro: "el centro",
  "angulo-derecho": "el angulo derecho",
  derecha: "la derecha",
}

const SIDE_POSITIONS: Record<KickSide, { left: number; top: number }> = {
  izquierda: { left: 22, top: 43 },
  "angulo-izquierdo": { left: 24, top: 25 },
  centro: { left: 50, top: 39 },
  "angulo-derecho": { left: 76, top: 25 },
  derecha: { left: 78, top: 43 },
}

const KEEPER_MOVES: KeeperMove[] = ["vuelo", "estirada", "barrida", "rebote"]

function pickGoalkeeperSide(): KickSide {
  return KICK_OPTIONS[Math.floor(Math.random() * KICK_OPTIONS.length)].key
}

function pickKeeperMove(): KeeperMove {
  return KEEPER_MOVES[Math.floor(Math.random() * KEEPER_MOVES.length)]
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
    keeperMove: KeeperMove
    goal: boolean
  } | null>(null)
  const [ranking, setRanking] = useState(initialRanking)
  const [saving, setSaving] = useState(false)
  const [shotAnimating, setShotAnimating] = useState(false)
  const [shotNumber, setShotNumber] = useState(0)
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
    if (!gameStarted || gameOver || saving || shotAnimating) return

    const goalkeeper = pickGoalkeeperSide()
    const keeperMove = pickKeeperMove()
    const isGoal = side !== goalkeeper
    const nextScore = isGoal ? score + 1 : score

    setShotAnimating(true)
    setShotNumber((current) => current + 1)
    setLastKick({ player: side, goalkeeper, keeperMove, goal: isGoal })
    setMessage("La pelota va al arco...")

    window.setTimeout(() => {
      setShotAnimating(false)

      if (isGoal) {
        setScore(nextScore)
        setMessage("Gol. Segui pateando.")
        return
      }

      setGameOver(true)
      setMessage("Atajada. Fin de la partida.")
      void saveScore(nextScore)
    }, 950)
  }

  const resetGame = () => {
    setScore(0)
    setGameStarted(false)
    setGameOver(false)
    setShotAnimating(false)
    setLastKick(null)
    setMessage("")
  }

  if (!config.activo) {
    return (
      <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#ecfeff_54%,#ffffff_100%)] px-4 py-8 text-slate-950">
        <div className="mx-auto max-w-3xl">
          {/* Una navegacion completa evita fallos del router en el Worker. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-sky-200 hover:text-sky-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a Hola Varela
          </a>

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
        {/* Una navegacion completa evita fallos del router en el Worker. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a
          href="/"
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-sky-200 hover:text-sky-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a Hola Varela
        </a>

        <section className="mt-6 overflow-hidden rounded-[28px] border border-cyan-100 bg-white shadow-[0_22px_60px_-38px_rgba(8,145,178,0.55)]">
          <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="min-w-0 overflow-hidden bg-[linear-gradient(135deg,#0f172a_0%,#075985_52%,#16a34a_100%)] p-4 text-white sm:p-8 lg:p-10">
              <div className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ring-1 ring-white/20">
                Penal a penal
              </div>
              <h1 className="mt-4 text-3xl font-black tracking-normal sm:text-5xl">
                {config.titulo}
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-cyan-50 sm:text-lg">
                Elegi entre cinco zonas del arco, incluidos los dos angulos. Si el arquero adivina, termina la partida. Si no, es gol y sumas otro punto.
              </p>

              <div className="mt-7 min-w-0 rounded-3xl border border-white/20 bg-white/10 p-3 backdrop-blur sm:mt-8 sm:p-5">
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
                    <div className="flex min-w-0 items-center justify-between gap-2 sm:gap-3">
                      <div>
                        <div className="text-sm font-semibold text-cyan-50">
                          Jugando como {normalizedName}
                        </div>
                        <div className="mt-1 text-3xl font-black">{score} gol(es)</div>
                      </div>
                      <button
                        type="button"
                        onClick={resetGame}
                        className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-white/20 bg-white/10 p-3 text-sm font-semibold text-white transition hover:bg-white/15 sm:rounded-2xl sm:px-4"
                        aria-label="Reiniciar partida"
                      >
                        <RotateCcw className="h-4 w-4" />
                        <span className="hidden sm:inline">Reiniciar</span>
                      </button>
                    </div>

                    <GoalGameScene
                      lastKick={lastKick}
                      shotAnimating={shotAnimating}
                      shotNumber={shotNumber}
                    />

                    <div className="mt-5 grid min-w-0 grid-cols-[repeat(2,minmax(0,1fr))] gap-2 sm:mt-6 sm:grid-cols-[repeat(5,minmax(0,1fr))] sm:gap-3">
                      {KICK_OPTIONS.map((option) => (
                        <button
                          key={option.key}
                          type="button"
                          onClick={() => kick(option.key)}
                          disabled={gameOver || saving || shotAnimating}
                          className={`min-h-[84px] min-w-0 overflow-hidden rounded-xl border border-white/20 bg-white px-3 py-3 text-left text-slate-950 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.8)] transition hover:-translate-y-0.5 hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-[92px] sm:rounded-2xl sm:py-4 ${
                            option.key === "centro" ? "col-span-2 sm:col-span-1" : ""
                          }`}
                        >
                          <span className="block break-words text-base font-black leading-tight sm:text-lg">{option.label}</span>
                          <span className="mt-1 block break-words text-xs font-medium leading-4 text-slate-500 sm:text-sm">
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
                    Vos pateaste a {SIDE_LABELS[lastKick.player]} y el arquero fue a {SIDE_LABELS[lastKick.goalkeeper]}.
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
                      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-slate-100 bg-white px-3 py-3 shadow-[0_14px_32px_-28px_rgba(15,23,42,0.5)] sm:px-4"
                    >
                      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-sm font-black text-white">
                          {index + 1}
                        </span>
                        <span className="truncate text-sm font-black text-slate-950">
                          {entry.nombre}
                        </span>
                      </div>
                      <span className="inline-flex min-w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 px-2.5 py-1.5 text-sm font-black text-emerald-800">
                        {entry.puntaje}<span className="ml-1 hidden sm:inline">gol</span>
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

function GoalGameScene({
  lastKick,
  shotAnimating,
  shotNumber,
}: {
  lastKick: {
    player: KickSide
    goalkeeper: KickSide
    keeperMove: KeeperMove
    goal: boolean
  } | null
  shotAnimating: boolean
  shotNumber: number
}) {
  const goalkeeperSide = lastKick?.goalkeeper || "centro"
  const playerSide = lastKick?.player || "centro"
  const keeperTarget = SIDE_POSITIONS[goalkeeperSide]
  const ballTarget = SIDE_POSITIONS[playerSide]
  const keeperLeft = keeperTarget.left
  const ballLeft = ballTarget.left
  const ballTop = ballTarget.top
  const move = lastKick?.keeperMove || "rebote"
  const keeperDirection =
    goalkeeperSide === "izquierda" || goalkeeperSide === "angulo-izquierdo"
      ? -1
      : goalkeeperSide === "derecha" || goalkeeperSide === "angulo-derecho"
        ? 1
        : 0
  const keeperRotation = keeperDirection * (move === "barrida" ? 42 : move === "estirada" ? 28 : 18)
  const isHighSave = goalkeeperSide === "angulo-izquierdo" || goalkeeperSide === "angulo-derecho"
  const keeperTop = isHighSave
    ? 17
    : move === "barrida"
      ? 39
      : move === "estirada"
        ? 25
        : move === "vuelo"
          ? 28
          : 31
  const keeperScale = move === "rebote" ? 1.08 : move === "barrida" ? 0.95 : 1
  const isSaved = lastKick?.goal === false

  return (
    <div className="mt-5 min-w-0 overflow-hidden rounded-2xl border border-white/20 bg-[linear-gradient(180deg,#dff7ff_0%,#f8fafc_42%,#2f9b52_43%,#18733b_100%)] p-2 shadow-inner sm:mt-6 sm:rounded-3xl sm:p-4">
      <div className="relative mx-auto aspect-[16/10] max-h-[360px] min-h-[180px] w-full min-w-0 overflow-hidden rounded-xl border border-white/30 bg-[linear-gradient(180deg,#dff7ff_0%,#f8fafc_45%,#2ebc67_46%,#178044_100%)] sm:min-h-[210px] sm:rounded-2xl">
        <div className="absolute left-1/2 top-[10%] h-[47%] w-[74%] -translate-x-1/2 rounded-t-2xl border-[6px] border-white shadow-[0_10px_24px_-18px_rgba(15,23,42,0.9)] sm:border-8">
          <div className="grid h-full grid-cols-4 grid-rows-3 opacity-35">
            {Array.from({ length: 12 }).map((_, index) => (
              <div key={index} className="border border-slate-300/80" />
            ))}
          </div>
        </div>

        <div className="absolute left-1/2 top-[55%] h-[28%] w-[64%] -translate-x-1/2 rounded-t-full border-4 border-white/65 border-b-0" />
        <div className="absolute bottom-[12%] left-1/2 h-2 w-[72%] -translate-x-1/2 rounded-full bg-white/75" />
        <div className="absolute bottom-[13%] left-1/2 h-24 w-24 -translate-x-1/2 rounded-full border-4 border-white/55" />

        {lastKick && !shotAnimating ? (
          <div
            className={`absolute top-[29%] z-10 flex -translate-x-1/2 items-center justify-center rounded-full px-3 py-1 text-xs font-black shadow-lg ${
              lastKick.goal
                ? "bg-emerald-100 text-emerald-800"
                : "bg-amber-100 text-amber-800"
            }`}
            style={{ left: `${ballLeft}%` }}
          >
            {lastKick.goal ? "Gol" : "Atajo"}
          </div>
        ) : (
          <div className="absolute left-1/2 top-[28%] z-10 -translate-x-1/2 rounded-full bg-white/90 px-3 py-1 text-xs font-black text-slate-700 shadow-lg">
            El macaco esta listo
          </div>
        )}

        <div
          key={`keeper-${shotNumber}`}
          className={`absolute z-20 h-24 w-24 -translate-x-1/2 sm:h-28 sm:w-28 ${
            lastKick ? "goal-keeper-dive" : ""
          }`}
          style={
            {
              left: `${keeperLeft}%`,
              top: `${keeperTop}%`,
              transform: `translateX(-50%) rotate(${keeperRotation}deg) scale(${keeperScale})`,
              "--keeper-left": `${keeperLeft}%`,
              "--keeper-top": `${keeperTop}%`,
              "--keeper-rotation": `${keeperRotation}deg`,
              "--keeper-scale": keeperScale,
            } as CSSProperties
          }
          aria-hidden="true"
        >
          <GoalkeeperMacaco move={move} saved={isSaved && !shotAnimating} />
        </div>

        <div
          key={`ball-${shotNumber}`}
          className={`absolute z-30 h-10 w-10 -translate-x-1/2 rounded-full border-[3px] border-slate-950 bg-white shadow-[0_12px_22px_-12px_rgba(15,23,42,0.8)] ${
            lastKick ? "goal-ball-flight" : "top-[78%]"
          }`}
          style={
            {
              left: `${lastKick ? ballLeft : 50}%`,
              top: lastKick ? `${ballTop}%` : undefined,
              "--ball-left": `${ballLeft}%`,
              "--ball-top": `${ballTop}%`,
            } as CSSProperties
          }
          aria-hidden="true"
        >
          <div className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-950" />
          <div className="absolute left-1 top-2 h-3 w-4 rotate-[-25deg] rounded-full border border-slate-950" />
          <div className="absolute right-1 top-2 h-3 w-4 rotate-[25deg] rounded-full border border-slate-950" />
          <div className="absolute bottom-1 left-3 h-3 w-4 rounded-full border border-slate-950" />
        </div>

        {lastKick ? (
          <div
            key={`impact-${shotNumber}`}
            className={`goal-impact absolute z-40 h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 ${
              lastKick.goal
                ? "border-emerald-300 bg-emerald-200/25"
                : "border-amber-300 bg-amber-200/35"
            }`}
            style={{ left: `${ballLeft}%`, top: `${ballTop}%` }}
            aria-label={`La pelota pego en ${SIDE_LABELS[playerSide]}`}
          >
            <span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow" />
          </div>
        ) : null}

        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-white/90 px-4 py-2 text-xs font-black text-emerald-800 shadow-sm">
          Pateador
        </div>

        {lastKick?.goal && !shotAnimating ? <GoalCelebration side={playerSide} /> : null}
      </div>
      <style jsx>{`
        .goal-ball-flight {
          animation: ball-flight 900ms cubic-bezier(0.2, 0.75, 0.25, 1) both;
        }

        .goal-keeper-dive {
          animation: keeper-dive 760ms cubic-bezier(0.2, 0.7, 0.2, 1) both;
        }

        .goal-impact {
          animation: impact-pulse 420ms ease-out 690ms both;
        }

        @keyframes ball-flight {
          0% {
            left: 50%;
            top: 78%;
            transform: translateX(-50%) scale(1) rotate(0deg);
          }
          70% {
            transform: translateX(-50%) scale(0.78) rotate(280deg);
          }
          100% {
            left: var(--ball-left);
            top: var(--ball-top);
            transform: translateX(-50%) scale(0.68) rotate(420deg);
          }
        }

        @keyframes keeper-dive {
          0% {
            left: 50%;
            top: 31%;
            transform: translateX(-50%) rotate(0deg) scale(1);
          }
          100% {
            left: var(--keeper-left);
            top: var(--keeper-top);
            transform: translateX(-50%) rotate(var(--keeper-rotation))
              scale(var(--keeper-scale));
          }
        }

        @keyframes impact-pulse {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.25);
          }
          55% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1.3);
          }
          100% {
            opacity: 0.85;
            transform: translate(-50%, -50%) scale(1);
          }
        }
      `}</style>
    </div>
  )
}

function GoalkeeperMacaco({
  move,
  saved,
}: {
  move: KeeperMove
  saved: boolean
}) {
  const leftArmClass =
    move === "barrida"
      ? "-left-1 top-14 rotate-[10deg]"
      : move === "estirada"
        ? "-left-3 top-9 -rotate-[42deg]"
        : "left-0 top-11 -rotate-[25deg]"
  const rightArmClass =
    move === "barrida"
      ? "-right-1 top-14 -rotate-[10deg]"
      : move === "estirada"
        ? "-right-3 top-9 rotate-[42deg]"
        : "right-0 top-11 rotate-[25deg]"

  return (
    <div className="relative h-full w-full drop-shadow-[0_8px_5px_rgba(15,23,42,0.28)]">
      <div className="absolute left-1/2 top-8 h-14 w-16 -translate-x-1/2 rounded-[22px_22px_16px_16px] border-[3px] border-slate-900 bg-emerald-400 sm:h-16 sm:w-[70px]">
        <div className="absolute inset-x-2 top-2 h-2 rounded-full bg-emerald-200/75" />
        <div className="absolute left-1/2 top-5 -translate-x-1/2 text-[18px] font-black leading-none text-white drop-shadow-sm">
          1
        </div>
        <div className="absolute bottom-1.5 left-1/2 h-1.5 w-8 -translate-x-1/2 rounded-full bg-slate-900/20" />
      </div>

      <div className="absolute left-1/2 top-0 z-20 h-11 w-11 -translate-x-1/2 rounded-[48%_48%_44%_44%] border-[3px] border-slate-900 bg-amber-200">
        <div className="absolute -left-[3px] -top-[3px] h-5 w-11 rounded-t-full border-x-[3px] border-t-[3px] border-slate-900 bg-slate-800" />
        <div className="absolute left-2.5 top-[19px] h-1.5 w-1.5 rounded-full bg-slate-950" />
        <div className="absolute right-2.5 top-[19px] h-1.5 w-1.5 rounded-full bg-slate-950" />
        <div className="absolute left-1/2 top-[27px] h-2 w-4 -translate-x-1/2 rounded-b-full border-b-2 border-slate-900 bg-white" />
        <div className="absolute -left-2 top-4 h-3 w-2 rounded-l-full border-2 border-slate-900 bg-amber-200" />
        <div className="absolute -right-2 top-4 h-3 w-2 rounded-r-full border-2 border-slate-900 bg-amber-200" />
      </div>

      <div className={`absolute z-10 h-4 w-12 origin-right rounded-full border-[3px] border-slate-900 bg-emerald-300 ${leftArmClass}`}>
        <div className="absolute -left-3 -top-2 h-8 w-7 rounded-[45%_55%_55%_45%] border-[3px] border-slate-900 bg-amber-50">
          <div className="absolute right-1 top-1 h-4 w-1 rounded-full bg-emerald-400" />
        </div>
      </div>
      <div className={`absolute z-10 h-4 w-12 origin-left rounded-full border-[3px] border-slate-900 bg-emerald-300 ${rightArmClass}`}>
        <div className="absolute -right-3 -top-2 h-8 w-7 rounded-[55%_45%_45%_55%] border-[3px] border-slate-900 bg-amber-50">
          <div className="absolute left-1 top-1 h-4 w-1 rounded-full bg-emerald-400" />
        </div>
      </div>

      <div className="absolute bottom-1 left-1/2 h-7 w-14 -translate-x-1/2 rounded-[8px_8px_15px_15px] border-[3px] border-slate-900 bg-slate-800" />
      <div className="absolute bottom-0 left-[23px] h-5 w-8 -rotate-12 rounded-full border-[3px] border-slate-900 bg-slate-950" />
      <div className="absolute bottom-0 right-[23px] h-5 w-8 rotate-12 rounded-full border-[3px] border-slate-900 bg-slate-950" />

      {saved ? (
        <div className="absolute -right-2 -top-3 z-30 rounded-full border-2 border-amber-300 bg-white px-2.5 py-1 text-[10px] font-black uppercase text-amber-700 shadow-lg">
          Atajada
        </div>
      ) : null}
    </div>
  )
}

function GoalCelebration({ side }: { side: KickSide }) {
  const left = SIDE_POSITIONS[side].left
  const confetti = [
    { left: 12, top: 18, color: "bg-amber-300", rotate: -18 },
    { left: 26, top: 11, color: "bg-cyan-300", rotate: 22 },
    { left: 42, top: 17, color: "bg-emerald-300", rotate: -30 },
    { left: 58, top: 10, color: "bg-white", rotate: 15 },
    { left: 74, top: 18, color: "bg-amber-300", rotate: 32 },
    { left: 88, top: 12, color: "bg-cyan-300", rotate: -22 },
  ]

  return (
    <div className="pointer-events-none absolute inset-0 z-40">
      <div
        className="absolute top-[18%] -translate-x-1/2 animate-bounce rounded-full bg-emerald-400 px-4 py-2 text-base font-black text-emerald-950 shadow-xl"
        style={{ left: `${left}%` }}
      >
        GOLAZO
      </div>
      {confetti.map((piece, index) => (
        <div
          key={index}
          className={`absolute h-3 w-1.5 rounded-full ${piece.color}`}
          style={{
            left: `${piece.left}%`,
            top: `${piece.top}%`,
            transform: `rotate(${piece.rotate}deg)`,
          }}
        />
      ))}
      <div
        className="absolute bottom-[8%] h-16 w-16 -translate-x-1/2 animate-bounce"
        style={{ left: `${Math.min(Math.max(left, 24), 76)}%` }}
        aria-hidden="true"
      >
        <div className="absolute left-1/2 top-0 h-8 w-8 -translate-x-1/2 rounded-full border-2 border-slate-900 bg-amber-200" />
        <div className="absolute left-1/2 top-7 h-9 w-10 -translate-x-1/2 rounded-2xl border-2 border-slate-900 bg-white" />
        <div className="absolute left-0 top-7 h-3 w-8 -rotate-[35deg] rounded-full border-2 border-slate-900 bg-white" />
        <div className="absolute right-0 top-7 h-3 w-8 rotate-[35deg] rounded-full border-2 border-slate-900 bg-white" />
      </div>
    </div>
  )
}
