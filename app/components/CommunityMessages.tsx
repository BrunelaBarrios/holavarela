'use client'

import { useEffect, useMemo, useState } from "react"
import { CalendarClock, Clock3, MessageCircle, Send, X } from "lucide-react"
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

export function CommunityMessages() {
  const [messages, setMessages] = useState<Message[]>([])
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set())
  const [institutions, setInstitutions] = useState<Institution[]>([])
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
    setInstitutions(data.institutions || [])
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => { void load() }, 0)
    return () => window.clearTimeout(timeoutId)
  }, [])
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
    <section className="py-10 sm:py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-[28px] border border-emerald-100 bg-white/90 p-5 shadow-sm sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">La voz de Varela</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">Mensajes de la comunidad</h2>
              <p className="mt-3 text-base text-slate-600">Compartí un mensaje con la comunidad. Estará visible durante 24 horas.</p>
            </div>
            <button type="button" onClick={() => { setOpen(true); setSuccess(false); setError("") }} className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-700 px-5 py-3 font-semibold text-white transition hover:bg-emerald-800">
              <MessageCircle className="h-5 w-5" /> Publicar un mensaje
            </button>
          </div>

          {messages.length ? (
            <div className="mt-7 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {messages.map((message) => (
                <article key={message.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <p className="whitespace-pre-wrap text-sm leading-6 text-slate-800">
                    {expandedMessages.has(message.id) || message.mensaje.length <= 150
                      ? message.mensaje
                      : `${message.mensaje.slice(0, 150).trimEnd()}…`}
                  </p>
                  {message.mensaje.length > 150 ? (
                    <button
                      type="button"
                      onClick={() => setExpandedMessages((current) => {
                        const next = new Set(current)
                        if (next.has(message.id)) next.delete(message.id)
                        else next.add(message.id)
                        return next
                      })}
                      className="mt-2 text-sm font-semibold text-emerald-700 hover:text-emerald-800"
                      aria-expanded={expandedMessages.has(message.id)}
                    >
                      {expandedMessages.has(message.id) ? "Ver menos" : "Ver más"}
                    </button>
                  ) : null}
                  <div className="mt-4 space-y-1 border-t border-slate-200 pt-3 text-xs text-slate-600">
                    <p><strong className="text-slate-800">Publicado por:</strong> {message.nombre}</p>
                    {institutionName(message) ? <p><strong className="text-slate-800">En referencia a:</strong> {institutionName(message)}</p> : null}
                    <p className="flex items-center gap-1.5"><Clock3 className="h-4 w-4" /> {new Intl.DateTimeFormat("es-UY", { hour: "2-digit", minute: "2-digit" }).format(new Date(message.fecha_publicacion))}</p>
                    <p className="font-medium text-emerald-700">{remainingLabel(message.fecha_vencimiento)}</p>
                  </div>
                </article>
              ))}
            </div>
          ) : <p className="mt-7 rounded-2xl bg-slate-50 px-5 py-6 text-center text-sm text-slate-500">Todavía no hay mensajes activos.</p>}
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
