'use client'

import Link from "next/link"
import { useEffect, useMemo, useRef, useState, type TouchEvent } from "react"
import { ArrowRight, BriefcaseBusiness, CalendarClock, ChevronLeft, ChevronRight, MessageCircle, Send, X } from "lucide-react"
import { COMMUNITY_MESSAGE_MAX_LENGTH } from "../lib/communityMessages"

type Institution = { id: number; nombre: string }
type Message = {
  id: string
  nombre: string
  mensaje: string
  institucion_id: number | null
  fecha_publicacion: string
  fecha_vencimiento: string
  instituciones: { nombre: string } | { nombre: string }[] | null
}

const emptyForm = { nombre: "", mensaje: "", institucionId: "", mode: "approval", date: "", time: "" }

function institutionName(message: Message) {
  const value = message.instituciones
  return Array.isArray(value) ? value[0]?.nombre : value?.nombre
}

function remainingLabel(expiresAt: string) {
  const hours = Math.max(1, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 3_600_000))
  return `Disponible por ${hours} hora${hours === 1 ? "" : "s"} más`
}

export function CommunityMessages({ showOpportunities = true }: { showOpportunities?: boolean }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [activeOpportunityCount, setActiveOpportunityCount] = useState(0)
  const [activeMessage, setActiveMessage] = useState(0)
  const [carouselPaused, setCarouselPaused] = useState(false)
  const touchStartX = useRef<number | null>(null)
  const [open, setOpen] = useState(false)
  const [preview, setPreview] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const load = async () => {
    const response = await fetch("/api/mensajes-comunidad", { cache: "no-store" })
    if (!response.ok) return
    const data = await response.json()
    setMessages(data.messages || [])
    setActiveMessage(0)
    setInstitutions(data.institutions || [])
    setActiveOpportunityCount(data.activeOpportunityCount || 0)
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => { void load() }, 0)
    return () => window.clearTimeout(timeoutId)
  }, [])
  useEffect(() => {
    if (messages.length < 2 || carouselPaused) return
    const intervalId = window.setInterval(
      () => setActiveMessage(current => (current + 1) % messages.length),
      5500
    )
    return () => window.clearInterval(intervalId)
  }, [carouselPaused, messages.length])

  const moveCarousel = (direction: -1 | 1) => {
    if (messages.length < 2) return
    setActiveMessage(current => (current + direction + messages.length) % messages.length)
  }

  const finishSwipe = (event: TouchEvent<HTMLDivElement>) => {
    if (touchStartX.current === null) return
    const distance = event.changedTouches[0].clientX - touchStartX.current
    touchStartX.current = null
    if (Math.abs(distance) > 45) moveCarousel(distance < 0 ? 1 : -1)
  }
  const selectedInstitution = useMemo(
    () => institutions.find((item) => String(item.id) === form.institucionId),
    [form.institucionId, institutions]
  )

  const validate = () => {
    if (!form.nombre.trim()) return "Ingresá tu nombre."
    if (!form.mensaje.trim()) return "Escribí un mensaje."
    if (form.mode === "scheduled" && (!form.date || !form.time)) return "Elegí la fecha y la hora."
    if (form.mode === "scheduled" && new Date(`${form.date}T${form.time}`).getTime() <= Date.now()) {
      return "La fecha programada debe ser posterior al momento actual."
    }
    return ""
  }

  const showPreview = () => {
    const validationError = validate()
    setError(validationError)
    if (!validationError) setPreview(true)
  }

  const submit = async () => {
    setLoading(true)
    setError("")
    const fechaProgramada = form.mode === "scheduled" ? new Date(`${form.date}T${form.time}`).toISOString() : null
    const response = await fetch("/api/mensajes-comunidad", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, fechaProgramada }),
    })
    const data = await response.json()
    setLoading(false)
    if (!response.ok) return setError(data.error || "No pudimos enviar el mensaje.")
    setSuccess(true)
    setPreview(false)
    setForm(emptyForm)
  }

  return (
    <section className="py-4 sm:py-6">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className={`grid overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-[0_16px_45px_-36px_rgba(15,23,42,.5)] ${showOpportunities ? "md:grid-cols-2" : ""}`}>
          {showOpportunities ? <div className="flex min-h-[250px] flex-col justify-between p-6 sm:p-7 md:border-r md:border-slate-200">
            <div>
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-700"><BriefcaseBusiness className="h-5 w-5" /></span>
                <h2 className="text-xl font-bold tracking-tight text-slate-900">Oportunidades laborales</h2>
              </div>
              <p className="mt-4 max-w-md text-sm leading-6 text-slate-600">Encontrá ofertas de trabajo o compartí tu búsqueda laboral.</p>
              {activeOpportunityCount > 0 ? <p className="mt-3 inline-flex rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">{activeOpportunityCount} {activeOpportunityCount === 1 ? "oportunidad activa" : "oportunidades activas"}</p> : null}
            </div>
            <Link href="/oportunidades-laborales" className="mt-5 inline-flex w-fit items-center gap-2 rounded-full bg-sky-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-800">Ver oportunidades <ArrowRight className="h-4 w-4" /></Link>
          </div> : null}

          <div className={`flex min-h-[250px] flex-col p-6 sm:p-7 ${showOpportunities ? "border-t border-slate-200 md:border-t-0" : ""}`} onMouseEnter={() => setCarouselPaused(true)} onMouseLeave={() => setCarouselPaused(false)} onTouchStart={event => { touchStartX.current = event.touches[0].clientX }} onTouchEnd={finishSwipe}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><MessageCircle className="h-5 w-5" /></span>
                <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-emerald-800">La comunidad comparte</h2>
              </div>
              {messages.length > 1 ? <div className="hidden items-center gap-1 md:flex">
                <button type="button" onClick={() => moveCarousel(-1)} aria-label="Ver mensaje anterior" className="rounded-full p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-emerald-700"><ChevronLeft className="h-4 w-4"/></button>
                <button type="button" onClick={() => moveCarousel(1)} aria-label="Ver mensaje siguiente" className="rounded-full p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-emerald-700"><ChevronRight className="h-4 w-4"/></button>
              </div> : null}
            </div>
            <div className="mt-4 min-h-[112px] flex-1 overflow-hidden">
              {messages.length ? <div className="flex h-full transition-transform duration-500 ease-out" style={{ transform: `translateX(-${activeMessage * 100}%)` }}>
                {messages.map(message => <article key={message.id} className="w-full shrink-0">
                  <p className="line-clamp-3 text-[15px] leading-6 text-slate-800">“{message.mensaje}”</p>
                  <div className="mt-2 text-xs leading-5 text-slate-500">
                    {message.nombre ? <span className="font-medium text-slate-700">Publicado por {message.nombre}</span> : null}
                    {institutionName(message) ? <span> · {institutionName(message)}</span> : null}
                    <p className="text-emerald-700">{remainingLabel(message.fecha_vencimiento)}</p>
                  </div>
                </article>)}
              </div> : <div className="rounded-xl border border-dashed border-emerald-200 bg-emerald-50/50 px-4 py-3 text-sm leading-5 text-slate-600">Publicá aquí una felicitación, un saludo o un mensaje para alguien. Estará visible durante 24 horas.</div>}
            </div>
            <div className="mt-2 flex min-h-8 items-end justify-between gap-4">
              <div className="flex gap-1.5" aria-label={messages.length > 1 ? `Mensaje ${activeMessage + 1} de ${messages.length}` : undefined}>
                {messages.length > 1 ? messages.map((message, index) => <button key={message.id} type="button" onClick={() => setActiveMessage(index)} aria-label={`Ver mensaje ${index + 1}`} className={`h-1.5 rounded-full transition-all ${index === activeMessage ? "w-5 bg-emerald-600" : "w-1.5 bg-slate-300"}`}/>) : null}
              </div>
              <button type="button" onClick={() => { setOpen(true); setSuccess(false); setError("") }} className="text-sm font-semibold text-emerald-700 transition hover:text-emerald-900">Publicar mensaje</button>
            </div>
          </div>
        </div>
      </div>

      {open ? (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/55 p-0 sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-labelledby="community-message-title">
          <div className="max-h-[94vh] w-full overflow-y-auto rounded-t-[28px] bg-white p-5 shadow-2xl sm:max-w-2xl sm:rounded-[28px] sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div><h3 id="community-message-title" className="text-2xl font-semibold text-slate-900">Publicar un mensaje</h3><p className="mt-1 text-sm text-slate-500">Todos los mensajes pasan por moderación.</p></div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar" className="rounded-full p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>

            {success ? <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-800"><strong>Mensaje enviado.</strong><p className="mt-1 text-sm">Quedó pendiente de aprobación.</p></div> : preview ? (
              <div className="mt-6">
                <p className="mb-3 text-sm font-semibold text-slate-700">Vista previa</p>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5"><p className="whitespace-pre-wrap leading-7 text-slate-800">{form.mensaje}</p><div className="mt-4 border-t border-slate-200 pt-4 text-sm text-slate-600"><p><strong>Publicado por:</strong> {form.nombre}</p>{selectedInstitution ? <p><strong>En referencia a:</strong> {selectedInstitution.nombre}</p> : null}</div></div>
                <p className="mt-3 text-sm text-slate-500">{form.mode === "scheduled" ? `Programado para ${new Date(`${form.date}T${form.time}`).toLocaleString("es-UY")}, sujeto a aprobación previa.` : "Se publicará cuando sea aprobado."}</p>
                {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" onClick={() => setPreview(false)} className="rounded-full border border-slate-300 px-5 py-3 font-semibold text-slate-700">Editar</button><button type="button" disabled={loading} onClick={submit} className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-700 px-5 py-3 font-semibold text-white disabled:opacity-60"><Send className="h-4 w-4" /> {loading ? "Enviando…" : "Enviar mensaje"}</button></div>
              </div>
            ) : (
              <form className="mt-6 space-y-5" onSubmit={(event) => { event.preventDefault(); showPreview() }}>
                <label className="block text-sm font-medium text-slate-700">Nombre de la persona<input value={form.nombre} maxLength={80} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-600" /></label>
                <label className="block text-sm font-medium text-slate-700">Mensaje<textarea value={form.mensaje} maxLength={COMMUNITY_MESSAGE_MAX_LENGTH} rows={5} onChange={(e) => setForm({ ...form, mensaje: e.target.value })} className="mt-2 w-full resize-none rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-600" /><span className="mt-1 block text-right text-xs text-slate-500">{form.mensaje.length}/{COMMUNITY_MESSAGE_MAX_LENGTH}</span></label>
                <label className="block text-sm font-medium text-slate-700">Institución relacionada <span className="font-normal text-slate-400">(opcional)</span><select value={form.institucionId} onChange={(e) => setForm({ ...form, institucionId: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3"><option value="">Sin institución</option>{institutions.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select></label>
                <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">La institución fue mencionada como referencia. Esto no significa que haya publicado o aprobado el mensaje.</p>
                <fieldset><legend className="text-sm font-medium text-slate-700">Momento de publicación</legend><div className="mt-2 grid gap-2 sm:grid-cols-2"><label className="flex cursor-pointer gap-3 rounded-xl border border-slate-200 p-4"><input type="radio" checked={form.mode === "approval"} onChange={() => setForm({ ...form, mode: "approval" })} /> <span>Publicar cuando sea aprobado</span></label><label className="flex cursor-pointer gap-3 rounded-xl border border-slate-200 p-4"><input type="radio" checked={form.mode === "scheduled"} onChange={() => setForm({ ...form, mode: "scheduled" })} /> <span>Programar para otro día</span></label></div></fieldset>
                {form.mode === "scheduled" ? <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium text-slate-700">Fecha<input type="date" min={new Date().toISOString().slice(0, 10)} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3" /></label><label className="text-sm font-medium text-slate-700">Hora<input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3" /></label></div> : null}
                <p className="text-xs leading-5 text-slate-500">No se permiten enlaces, teléfonos, correos electrónicos, imágenes ni archivos.</p>
                {error ? <p className="text-sm text-red-600">{error}</p> : null}
                <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-full bg-emerald-700 px-5 py-3 font-semibold text-white"><CalendarClock className="h-5 w-5" /> Ver vista previa</button>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </section>
  )
}
