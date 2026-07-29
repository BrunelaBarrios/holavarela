'use client'

import { useCallback, useEffect, useState } from "react"
import { Download, FileText, Mail, MapPin, Phone, Search, Trash2, X } from "lucide-react"

type Candidate = {
  id: string
  nombre_completo: string
  puesto_buscado: string | null
  presentacion: string
  experiencia: string
  habilidades: string
  disponibilidad: string | null
  localidad: string
  telefono: string | null
  email: string | null
  cv_url: string | null
  autoriza_publicacion: boolean
  estado: "nuevo" | "contactado" | "entrevistado" | "archivado"
  notas_internas: string | null
  fecha_creacion: string
}

const statuses = ["nuevo", "contactado", "entrevistado", "archivado"] as const
const cvExtension = (value: string) => {
  if (value.startsWith("data:image/jpeg")) return "jpg"
  if (value.startsWith("data:image/png")) return "png"
  if (value.startsWith("data:image/webp")) return "webp"
  return "pdf"
}

export default function AdminCurriculumsPage() {
  const [items, setItems] = useState<Candidate[]>([])
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState("")
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Candidate | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (query.trim()) params.set("q", query.trim())
    if (status) params.set("estado", status)
    const response = await fetch(`/api/admin/candidatos-laborales?${params}`, { cache: "no-store" })
    const result = await response.json()
    if (response.ok) setItems(result.items || [])
    setLoading(false)
  }, [query, status])

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 250)
    return () => window.clearTimeout(timer)
  }, [load])

  const update = async (candidate: Candidate, changes: Partial<Candidate>) => {
    await fetch("/api/admin/candidatos-laborales", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: candidate.id, ...changes }),
    })
    setSelected(current => current?.id === candidate.id ? { ...current, ...changes } : current)
    void load()
  }

  const remove = async (candidate: Candidate) => {
    if (!window.confirm(`¿Eliminar definitivamente el currículum de ${candidate.nombre_completo}?`)) return
    await fetch(`/api/admin/candidatos-laborales?id=${candidate.id}`, { method: "DELETE" })
    setSelected(null)
    void load()
  }

  return <div>
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold text-slate-950">Base de currículums</h1>
        <p className="mt-1 text-slate-500">Información privada de personas en búsqueda laboral.</p>
      </div>
      <span className="rounded-full bg-white px-4 py-2 text-sm font-semibold shadow-sm">{items.length} registros</span>
    </div>

    <div className="mt-6 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-[1fr_220px]">
      <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4">
        <Search className="h-5 w-5 text-slate-400"/>
        <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar nombre, puesto, habilidad, experiencia o localidad" className="w-full py-3 outline-none"/>
      </label>
      <select value={status} onChange={event => setStatus(event.target.value)} className="rounded-xl border border-slate-200 px-4 py-3">
        <option value="">Todos los estados</option>
        {statuses.map(value => <option key={value} value={value}>{value}</option>)}
      </select>
    </div>

    {loading ? <p className="py-16 text-center text-slate-500">Buscando currículums...</p> :
      items.length === 0 ? <div className="mt-6 rounded-2xl bg-white py-16 text-center"><FileText className="mx-auto h-12 w-12 text-slate-300"/><p className="mt-3 text-slate-500">No hay currículums que coincidan.</p></div> :
      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-4">Persona</th><th className="px-5 py-4">Busca</th><th className="px-5 py-4">Localidad</th><th className="px-5 py-4">Contacto</th><th className="px-5 py-4">Estado</th><th className="px-5 py-4">CV</th></tr></thead>
            <tbody className="divide-y divide-slate-100">{items.map(item => <tr key={item.id} onClick={() => setSelected(item)} className="cursor-pointer hover:bg-sky-50/50">
              <td className="px-5 py-4"><strong className="block text-slate-900">{item.nombre_completo}</strong><span className="text-xs text-slate-500">{new Date(item.fecha_creacion).toLocaleDateString("es-UY")}</span></td>
              <td className="max-w-xs px-5 py-4"><span className="line-clamp-2">{item.puesto_buscado || "Sin puesto específico"}</span></td>
              <td className="px-5 py-4">{item.localidad}</td>
              <td className="px-5 py-4">{item.telefono || item.email || "Sin dato"}</td>
              <td className="px-5 py-4"><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase">{item.estado}</span></td>
              <td className="px-5 py-4">{item.cv_url ? <a href={item.cv_url} download={`CV-${item.nombre_completo}.${cvExtension(item.cv_url)}`} onClick={event => event.stopPropagation()} className="inline-flex items-center gap-1 font-bold text-sky-700"><Download className="h-4 w-4"/>Descargar</a> : <span className="text-slate-400">Sin archivo</span>}</td>
            </tr>)}</tbody>
          </table>
        </div>
      </div>}

    {selected ? <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm"><div className="mx-auto my-8 max-w-3xl rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
      <button onClick={() => setSelected(null)} className="float-right rounded-full p-2 hover:bg-slate-100" aria-label="Cerrar"><X/></button>
      <p className="text-xs font-bold uppercase tracking-wider text-sky-700">{selected.autoriza_publicacion ? "Autoriza publicación" : "Perfil privado"}</p>
      <h2 className="mt-2 pr-12 text-3xl font-black">{selected.nombre_completo}</h2>
      <p className="mt-1 text-lg font-semibold text-slate-600">{selected.puesto_buscado || "Búsqueda laboral general"}</p>
      <div className="mt-5 flex flex-wrap gap-3 text-sm text-slate-600"><span className="flex items-center gap-1"><MapPin className="h-4 w-4"/>{selected.localidad}</span>{selected.telefono ? <a href={`tel:${selected.telefono}`} className="flex items-center gap-1"><Phone className="h-4 w-4"/>{selected.telefono}</a> : null}{selected.email ? <a href={`mailto:${selected.email}`} className="flex items-center gap-1"><Mail className="h-4 w-4"/>{selected.email}</a> : null}</div>
      <Section title="Presentación" text={selected.presentacion}/><Section title="Experiencia" text={selected.experiencia}/><Section title="Habilidades" text={selected.habilidades}/>{selected.disponibilidad ? <Section title="Disponibilidad" text={selected.disponibilidad}/> : null}
      <label className="mt-6 block text-sm font-bold">Notas internas<textarea defaultValue={selected.notas_internas || ""} onBlur={event => void update(selected, { notas_internas: event.target.value })} rows={4} className="mt-2 w-full rounded-xl border border-slate-200 p-3 font-normal"/></label>
      <div className="mt-6 flex flex-wrap gap-3">
        <select value={selected.estado} onChange={event => void update(selected, { estado: event.target.value as Candidate["estado"] })} className="rounded-xl border px-4 py-3 font-semibold">{statuses.map(value => <option key={value}>{value}</option>)}</select>
        {selected.cv_url ? <a href={selected.cv_url} download={`CV-${selected.nombre_completo}.${cvExtension(selected.cv_url)}`} className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-3 font-bold text-white"><Download className="h-4 w-4"/>Descargar CV</a> : null}
        <button onClick={() => void remove(selected)} className="ml-auto inline-flex items-center gap-2 rounded-xl bg-red-50 px-5 py-3 font-bold text-red-700"><Trash2 className="h-4 w-4"/>Eliminar</button>
      </div>
    </div></div> : null}
  </div>
}

function Section({ title, text }: { title: string; text: string }) {
  return <section className="mt-6"><h3 className="font-bold text-slate-950">{title}</h3><p className="mt-2 whitespace-pre-wrap leading-7 text-slate-600">{text}</p></section>
}
