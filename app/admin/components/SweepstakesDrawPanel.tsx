'use client'

import { useCallback, useEffect, useRef, useState } from "react"
import { Download, Maximize, Play, Trophy, Video, X } from "lucide-react"
import type { DrawView } from "../../lib/sweepstakesDraw"

export function SweepstakesDrawPanel({ campaignId, title }: { campaignId: number; title: string }) {
  const [count, setCount] = useState("1")
  const [draws, setDraws] = useState<DrawView[]>([])
  const [draw, setDraw] = useState<DrawView | null>(null)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
  const dialog = useRef<HTMLDialogElement>(null)
  const loadHistory = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/sorteos/extraccion?campaignId=${campaignId}`, { cache: "no-store" })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error)
      setDraws(result.draws)
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo cargar el historial.") }
    finally { setLoading(false) }
  }, [campaignId])
  useEffect(() => { void loadHistory() }, [loadHistory])
  useEffect(() => {
    if (!open || !dialog.current) return
    const element = dialog.current
    element.showModal()
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = previous; element.close() }
  }, [open])
  const request = async (body: object) => {
    const response = await fetch("/api/admin/sorteos/extraccion", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ campaignId, ...body }) })
    const result = await response.json()
    if (!response.ok) throw new Error(result.error || "No se pudo completar la operación.")
    return result.draw as DrawView
  }
  const prepare = async () => {
    if (busyRef.current) return
    busyRef.current = true; setBusy(true); setError("")
    try {
      const prepared = await request({ action: "prepare", count: Number(count) })
      setDraw(prepared); setOpen(true)
      void loadHistory()
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo preparar el sorteo.") }
    finally { busyRef.current = false; setBusy(false) }
  }
  const run = async () => {
    if (!draw || draw.winners || busyRef.current) return
    busyRef.current = true; setBusy(true); setError("")
    try {
      for (let value = 3; value > 0; value--) {
        setCountdown(value)
        await new Promise(resolve => window.setTimeout(resolve, 1000))
      }
      setCountdown(0)
      const result = await request({ action: "draw", drawId: draw.id })
      setDraw(result)
      void loadHistory()
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo obtener el resultado. Podés reintentar esta misma extracción.") }
    finally { setCountdown(null); busyRef.current = false; setBusy(false) }
  }
  const download = () => {
    if (!draw?.winners) return
    const text = ["HOLA VARELA · RESULTADO DEL SORTEO", draw.title, `Extracción #${draw.id}`,
      `Participaciones al preparar: ${draw.total}`, `Participantes distintos: ${draw.people}`, `Preparado: ${formatDate(draw.preparedAt)}`,
      `Realizado: ${formatDate(draw.completedAt!)}`, "Cada cupón tiene la misma probabilidad. No se repite una persona en esta extracción (según teléfono).", "",
      ...draw.winners.map((winner, index) => `${index + 1}. ${winner.name} · ID de cupón ${winner.id}`)].join("\n")
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }))
    const link = document.createElement("a"); link.href = url; link.download = `resultado-sorteo-${campaignId}-${draw.id}.txt`; link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  const close = () => {
    if (busyRef.current) return
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {})
    setOpen(false)
  }
  return <section className="mb-6 overflow-hidden rounded-3xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-amber-50 p-5 sm:p-7">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="text-xs font-bold uppercase tracking-widest text-indigo-600">La hora del sorteo</p><h2 className="mt-2 text-2xl font-black text-slate-950">Elegir ganadores</h2><p className="mt-2 text-sm leading-6 text-slate-600">Prepará una extracción de <strong>{title}</strong> y mostrá el proceso en una pantalla lista para grabar.</p></div>
      <Trophy className="h-10 w-10 text-amber-500" aria-hidden="true"/>
    </div>
    <form onSubmit={event => { event.preventDefault(); void prepare() }} className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
      <label className="text-sm font-bold text-slate-700">Cantidad de ganadores<input type="number" min={1} max={100} step={1} required value={count} onChange={event => setCount(event.target.value)} disabled={busy} className="mt-2 block min-h-12 w-full rounded-xl border border-indigo-200 bg-white px-4 text-base sm:w-40"/></label>
      <button disabled={busy || loading} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-indigo-700 px-5 py-3 font-bold text-white hover:bg-indigo-800 disabled:opacity-50"><Video className="h-5 w-5"/>{busy ? "Preparando…" : "Preparar sorteo"}</button>
    </form>
    <p className="mt-3 text-sm leading-6 text-slate-600">Se incluyen todos los cupones de este sorteo, sin aplicar los filtros de la tabla. La lista queda fijada al preparar. Los corazones no agregan chances. No se repite un mismo teléfono entre ganadores.</p>
    {!open && error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}<button onClick={() => { setError(""); void loadHistory() }} className="ml-2 underline">Reintentar carga</button></p>}
    <details className="mt-5 border-t border-indigo-100 pt-4"><summary className="cursor-pointer font-bold text-indigo-800">Historial y extracciones preparadas {draws.length > 0 ? `(${draws.length})` : ""}</summary>
      <p className="mt-2 text-xs text-slate-500">Últimas 30 extracciones. Una nueva extracción es independiente y puede volver a seleccionar ganadores anteriores.</p>
      {loading ? <p className="mt-3 text-sm">Cargando…</p> : !draws.length ? <p className="mt-3 text-sm text-slate-500">Todavía no hay extracciones.</p> : <ul className="mt-3 space-y-2">{draws.map(item => <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-3 text-sm"><div><strong>#{item.id} · {item.count} {item.count === 1 ? "ganador" : "ganadores"}</strong><p className="text-slate-500">{formatDate(item.completedAt || item.preparedAt)} · {item.winners ? "Realizado" : "Preparado, sin sortear"}</p></div><button onClick={() => { setDraw(item); setError(""); setOpen(true) }} className="min-h-11 rounded-lg border border-indigo-200 px-3 font-bold text-indigo-700">{item.winners ? "Ver resultado" : "Continuar"}</button></li>)}</ul>}
    </details>
    {open && draw && <dialog ref={dialog} onCancel={event => { event.preventDefault(); close() }} aria-labelledby="draw-title" className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none overflow-y-auto bg-slate-950 p-4 text-white backdrop:bg-slate-950 sm:p-8">
      <div className="mx-auto flex min-h-full max-w-5xl flex-col">
        <div className="flex flex-wrap items-center justify-between gap-3"><span className="text-sm font-black tracking-widest text-amber-300">HOLA VARELA · SORTEOS</span><div className="flex gap-2"><button type="button" onClick={() => void dialog.current?.requestFullscreen?.().catch(() => setError("Usá el modo presentación de esta ventana; tu navegador no permite pantalla completa."))} aria-label="Pantalla completa" className="min-h-11 rounded-xl border border-white/20 px-3"><Maximize className="h-5 w-5"/></button><button type="button" disabled={busy} onClick={close} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/20 px-3 disabled:opacity-40"><X className="h-5 w-5"/>Cerrar</button></div></div>
        <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
          <p className="text-xs font-bold uppercase tracking-[.25em] text-indigo-300">{draw.winners ? "Resultado guardado" : "Extracción aleatoria"}</p>
          <h2 id="draw-title" className="mt-4 max-w-4xl break-words text-3xl font-black sm:text-5xl">{draw.title}</h2>
          <div className="mt-6 flex flex-wrap justify-center gap-3 text-sm"><span className="rounded-full bg-white/10 px-4 py-2">{draw.total} cupones</span><span className="rounded-full bg-white/10 px-4 py-2">{draw.people} participantes</span><span className="rounded-full bg-amber-300 px-4 py-2 font-bold text-slate-950">{draw.count} {draw.count === 1 ? "ganador" : "ganadores"}</span></div>
          <div role="status" aria-live="polite" className="w-full">
            {busy ? <div className="py-12"><div className="text-8xl font-black text-amber-300 sm:text-9xl">{countdown || <Trophy className="mx-auto h-24 w-24 motion-safe:animate-pulse"/>}</div><p className="mt-5 text-lg text-indigo-200">{countdown ? "El sorteo está por comenzar…" : "Seleccionando y guardando el resultado…"}</p></div> : draw.winners ? <ol className="mt-8 grid gap-4 sm:grid-cols-2">{draw.winners.map((winner, index) => <li key={winner.id} className="rounded-3xl border border-amber-300/40 bg-gradient-to-br from-indigo-900 to-slate-900 p-6"><Trophy className="mx-auto h-8 w-8 text-amber-300"/><p className="mt-3 text-sm font-bold text-amber-300">Ganador {index + 1}</p><h3 className="mt-2 break-words text-3xl font-black">{winner.name}</h3><p className="mt-3 text-sm text-indigo-200">ID de cupón {winner.id}</p></li>)}</ol> : <div className="py-10"><Trophy className="mx-auto h-20 w-20 text-amber-300"/><p className="mx-auto mt-5 max-w-xl leading-7 text-indigo-100">Todo listo. Iniciá la grabación de tu pantalla y presioná el botón para comenzar la cuenta regresiva.</p><button type="button" onClick={() => void run()} className="mt-7 inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-amber-300 px-8 py-4 text-lg font-black text-slate-950 hover:bg-amber-200"><Play className="h-6 w-6"/>{error ? "Reintentar esta extracción" : "Sortear ahora"}</button><p className="mt-4 text-xs text-indigo-300">Esta pantalla no graba automáticamente.</p></div>}
          </div>
          {error && <p role="alert" className="mt-4 max-w-xl rounded-xl bg-red-950 p-4 text-red-100">{error}</p>}
          {draw.winners && !busy && <button onClick={download} className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-xl border border-amber-300/50 px-5 py-3 font-bold text-amber-200"><Download className="h-5 w-5"/>Descargar resultado</button>}
        </div>
        <footer className="border-t border-white/10 py-4 text-center text-xs leading-6 text-slate-400">Extracción #{draw.id} · Lista fijada el {formatDate(draw.preparedAt)}{draw.completedAt && <> · Realizada el {formatDate(draw.completedAt)}</>}<br/>Selección aleatoria en el servidor. Cada cupón tiene la misma chance. Una persona por teléfono, sin repetir en esta extracción.</footer>
      </div>
    </dialog>}
  </section>
}
function formatDate(value: string) { return new Date(value).toLocaleString("es-UY", { dateStyle: "short", timeStyle: "short", timeZone: "America/Montevideo" }) }
