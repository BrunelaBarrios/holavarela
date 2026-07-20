'use client'

import { useEffect, useMemo, useState } from "react"
import { Ban, Check, Clock3, Pencil, Play, Search, Trash2, XCircle } from "lucide-react"
import { AdminEmptyState, AdminLoadingPanel, AdminNotice, AdminPageHeader } from "../components/AdminUI"

type Message = {
  id: string; nombre: string; mensaje: string; institucion_id: number | null
  fecha_creacion: string; fecha_programada: string | null; fecha_publicacion: string | null
  fecha_vencimiento: string | null; estado: string
  instituciones: { nombre: string } | { nombre: string }[] | null
}

const stateClasses: Record<string, string> = {
  pendiente: "bg-amber-100 text-amber-800", programado: "bg-sky-100 text-sky-800",
  activo: "bg-emerald-100 text-emerald-800", vencido: "bg-slate-100 text-slate-700",
  rechazado: "bg-rose-100 text-rose-800", cancelado: "bg-zinc-100 text-zinc-700",
}

export default function AdminCommunityMessagesPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState("todos")
  const [editing, setEditing] = useState<Message | null>(null)
  const [editName, setEditName] = useState("")
  const [editText, setEditText] = useState("")
  const [scheduleId, setScheduleId] = useState<string | null>(null)
  const [scheduledAt, setScheduledAt] = useState("")

  const load = async () => {
    setLoading(true)
    const response = await fetch("/api/admin/mensajes-comunidad", { cache: "no-store" })
    const data = await response.json()
    setLoading(false)
    if (!response.ok) return setError(data.error || "No pudimos cargar los mensajes.")
    setMessages(data.messages || [])
  }
  useEffect(() => {
    const timeoutId = window.setTimeout(() => { void load() }, 0)
    return () => window.clearTimeout(timeoutId)
  }, [])

  const action = async (id: string, actionName: string, extra: Record<string, unknown> = {}) => {
    setError("")
    const response = await fetch("/api/admin/mensajes-comunidad", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action: actionName, ...extra }) })
    const data = await response.json()
    if (!response.ok) return setError(data.error || "No pudimos realizar la acción.")
    if (actionName === "delete") setMessages((items) => items.filter((item) => item.id !== id))
    else setMessages((items) => items.map((item) => item.id === id ? data.message : item))
    setEditing(null); setScheduleId(null)
  }

  const visible = useMemo(() => messages.filter((item) => {
    const matchesState = filter === "todos" || item.estado === filter
    const haystack = `${item.nombre} ${item.mensaje}`.toLowerCase()
    return matchesState && haystack.includes(query.toLowerCase())
  }), [messages, filter, query])

  if (loading) return <><AdminPageHeader title="Mensajes de la comunidad" description="Moderación, programación y vigencia de publicaciones." /><AdminLoadingPanel /></>

  return (
    <div>
      <AdminPageHeader title="Mensajes de la comunidad" eyebrow="Contenido público" description="Cada mensaje aprobado permanece visible durante 24 horas desde su publicación." />
      {error ? <AdminNotice tone="danger" className="mb-5">{error}</AdminNotice> : null}
      <div className="mb-5 grid gap-3 md:grid-cols-[1fr_auto]">
        <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5"><Search className="h-4 w-4 text-slate-400" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nombre o mensaje" className="w-full outline-none" /></label>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5">{["todos", "pendiente", "programado", "activo", "vencido", "rechazado", "cancelado"].map((state) => <option key={state}>{state}</option>)}</select>
      </div>
      {!visible.length ? <AdminEmptyState title="No hay mensajes para mostrar" description="Los nuevos envíos aparecerán aquí como pendientes." /> : (
        <div className="space-y-4">{visible.map((item) => {
          const institution = Array.isArray(item.instituciones) ? item.instituciones[0]?.nombre : item.instituciones?.nombre
          return <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:justify-between">
              <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><strong className="text-slate-950">{item.nombre}</strong><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${stateClasses[item.estado] || stateClasses.vencido}`}>{item.estado}</span></div><p className="mt-3 whitespace-pre-wrap leading-7 text-slate-700">{item.mensaje}</p><div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500"><span>Creado: {new Date(item.fecha_creacion).toLocaleString("es-UY")}</span>{institution ? <span>Institución: {institution}</span> : null}{item.fecha_programada ? <span>Programado: {new Date(item.fecha_programada).toLocaleString("es-UY")}</span> : null}{item.fecha_vencimiento ? <span>Vence: {new Date(item.fecha_vencimiento).toLocaleString("es-UY")}</span> : null}</div></div>
              <div className="flex max-w-xl flex-wrap content-start gap-2">
                {item.estado === "pendiente" ? <button onClick={() => void action(item.id, "approve")} className="admin-btn bg-emerald-600 text-white"><Check className="h-4 w-4" /> Aprobar</button> : null}
                <button onClick={() => void action(item.id, "publish_now")} className="admin-btn bg-blue-600 text-white"><Play className="h-4 w-4" /> Publicar ahora</button>
                <button onClick={() => { setEditing(item); setEditName(item.nombre); setEditText(item.mensaje) }} className="admin-btn border border-slate-200"><Pencil className="h-4 w-4" /> Editar</button>
                <button onClick={() => { setScheduleId(item.id); setScheduledAt(item.fecha_programada ? new Date(item.fecha_programada).toISOString().slice(0, 16) : "") }} className="admin-btn border border-slate-200"><Clock3 className="h-4 w-4" /> Programar</button>
                <button onClick={() => void action(item.id, "reject")} className="admin-btn border border-rose-200 text-rose-700"><XCircle className="h-4 w-4" /> Rechazar</button>
                <button onClick={() => void action(item.id, "cancel")} className="admin-btn border border-slate-200"><Ban className="h-4 w-4" /> Cancelar</button>
                <button onClick={() => { if (window.confirm("¿Eliminar este mensaje definitivamente?")) void action(item.id, "delete") }} className="admin-btn border border-rose-200 text-rose-700"><Trash2 className="h-4 w-4" /> Eliminar</button>
              </div>
            </div>
            {editing?.id === item.id ? <div className="mt-5 grid gap-3 border-t border-slate-100 pt-5"><input value={editName} maxLength={80} onChange={(e) => setEditName(e.target.value)} className="rounded-xl border border-slate-200 px-4 py-3" /><textarea value={editText} maxLength={300} onChange={(e) => setEditText(e.target.value)} rows={4} className="rounded-xl border border-slate-200 px-4 py-3" /><div className="flex gap-2"><button onClick={() => void action(item.id, "edit", { nombre: editName, mensaje: editText, institucionId: item.institucion_id })} className="admin-btn bg-slate-950 text-white">Guardar cambios</button><button onClick={() => setEditing(null)} className="admin-btn border border-slate-200">Cerrar</button></div></div> : null}
            {scheduleId === item.id ? <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row"><input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className="rounded-xl border border-slate-200 px-4 py-3" /><button onClick={() => void action(item.id, "reschedule", { fechaProgramada: new Date(scheduledAt).toISOString() })} disabled={!scheduledAt} className="admin-btn bg-sky-600 text-white disabled:opacity-50">Guardar fecha</button></div> : null}
          </article>
        })}</div>
      )}
      <style jsx>{`.admin-btn{display:inline-flex;align-items:center;gap:.4rem;border-radius:.75rem;padding:.55rem .75rem;font-size:.8rem;font-weight:600;transition:opacity .2s}.admin-btn:hover{opacity:.82}`}</style>
    </div>
  )
}
