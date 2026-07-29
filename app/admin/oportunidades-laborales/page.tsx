'use client'

import { useCallback, useEffect, useState, type FormEvent } from "react"
import Image from "next/image"
import { BriefcaseBusiness, Check, Eye, EyeOff, ImagePlus, Pencil, Plus, Trash2, X } from "lucide-react"
import { AdminConfirmModal } from "../../components/AdminConfirmModal"
import { fileToDataUrl } from "../../lib/fileToDataUrl"
import { formatJobDate, getJobImages, getJobLink, JOB_CATEGORIES, JOB_STATUSES, type JobOpportunity, type JobStatus } from "../../lib/jobOpportunities"

const emptyPoster = {
  nombre_publicante: "",
  titulo: "",
  categoria: "Otros",
  descripcion: "",
  localidad: "José Pedro Varela",
  telefono: "",
  email: "",
  forma_postulacion: "",
  enlace_url: "",
  fecha_vencimiento: "",
  imagen_url: "",
  imagenes_url: [] as string[],
}

export default function AdminJobsPage() {
  const [items, setItems] = useState<JobOpportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [visibleEnHome, setVisibleEnHome] = useState(true)
  const [visibilitySaving, setVisibilitySaving] = useState(false)
  const [visibilityError, setVisibilityError] = useState("")
  const [type, setType] = useState("")
  const [status, setStatus] = useState("")
  const [category, setCategory] = useState("")
  const [editing, setEditing] = useState<JobOpportunity | null>(null)
  const [deleting, setDeleting] = useState<JobOpportunity | null>(null)
  const [posterOpen, setPosterOpen] = useState(false)
  const [poster, setPoster] = useState(emptyPoster)
  const [posterSaving, setPosterSaving] = useState(false)
  const [posterError, setPosterError] = useState("")

  const load = useCallback(async () => {
    const query = new URLSearchParams()
    if (type) query.set("tipo", type)
    if (status) query.set("estado", status)
    if (category) query.set("categoria", category)
    const response = await fetch(`/api/admin/oportunidades-laborales?${query}`, { cache: "no-store" })
    const result = await response.json()
    if (response.ok) {
      setItems(result.items || [])
      setVisibleEnHome(result.visibleEnHome !== false)
    }
    setLoading(false)
  }, [type, status, category])

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(timer)
  }, [load])

  const changeStatus = async (id: string, next: JobStatus) => {
    await fetch("/api/admin/oportunidades-laborales", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, estado: next }),
    })
    void load()
  }

  const save = async () => {
    if (!editing) return
    await fetch("/api/admin/oportunidades-laborales", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...editing, enlace_url: getJobLink(editing) || "" }),
    })
    setEditing(null)
    void load()
  }

  const remove = async () => {
    if (!deleting) return
    await fetch(`/api/admin/oportunidades-laborales?id=${deleting.id}`, { method: "DELETE" })
    setDeleting(null)
    void load()
  }

  const toggleHomeVisibility = async () => {
    const next = !visibleEnHome
    setVisibilitySaving(true)
    setVisibilityError("")
    const response = await fetch("/api/admin/oportunidades-laborales", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle_home_visibility", visible: next }),
    })
    const result = await response.json()
    if (response.ok) setVisibleEnHome(result.visibleEnHome === true)
    else setVisibilityError(result.error || "No se pudo cambiar la visibilidad en la Home.")
    setVisibilitySaving(false)
  }

  const selectPosters = async (selectedFiles?: FileList | null) => {
    if (!selectedFiles?.length) return
    setPosterError("")
    try {
      const files = Array.from(selectedFiles)
      if (files.length > 6) throw new Error("Podés cargar hasta 6 fotos por afiche.")
      const imagenesUrl: string[] = []
      for (const selectedFile of files) {
        imagenesUrl.push(await fileToDataUrl(selectedFile, {
          maxWidth: 1200,
          maxHeight: 1800,
          targetFileSizeBytes: 400 * 1024,
        }))
      }
      setPoster(current => ({ ...current, imagen_url: imagenesUrl[0] || "", imagenes_url: imagenesUrl }))
    } catch (cause) {
      setPosterError(cause instanceof Error ? cause.message : "No se pudieron procesar las fotos.")
    }
  }

  const publishPoster = async (event: FormEvent) => {
    event.preventDefault()
    if (!poster.imagenes_url.length) {
      setPosterError("Seleccioná al menos una foto del afiche.")
      return
    }
    setPosterSaving(true)
    setPosterError("")
    const response = await fetch("/api/admin/oportunidades-laborales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(poster),
    })
    const result = await response.json()
    if (response.ok) {
      setPoster(emptyPoster)
      setPosterOpen(false)
      setStatus("")
      setType("oferta")
      void load()
    } else {
      setPosterError(result.error || "No se pudo publicar el afiche.")
    }
    setPosterSaving(false)
  }

  return <div>
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold text-slate-950">Oportunidades Laborales</h1>
        <p className="mt-1 text-slate-500">Publicá afiches y moderá ofertas y búsquedas laborales.</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded-full bg-white px-4 py-2 text-sm font-semibold shadow-sm">{items.length} publicaciones</span>
        <button type="button" onClick={() => { setPoster(emptyPoster); setPosterError(""); setPosterOpen(true) }} className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-sky-700">
          <Plus className="h-4 w-4" /> Publicar afiche
        </button>
      </div>
    </div>

    <div className="mt-6 flex flex-col justify-between gap-4 rounded-2xl border border-sky-200 bg-sky-50 p-5 sm:flex-row sm:items-center">
      <div className="flex items-start gap-3">
        {visibleEnHome ? <Eye className="mt-0.5 h-5 w-5 text-sky-700"/> : <EyeOff className="mt-0.5 h-5 w-5 text-slate-500"/>}
        <div>
          <h2 className="font-bold text-slate-950">Visibilidad en la Home</h2>
          <p className="mt-1 text-sm text-slate-600">{visibleEnHome ? "El acceso a Oportunidades Laborales está visible en la página principal." : "El acceso está oculto en la Home; la página de oportunidades sigue disponible."}</p>
          {visibilityError ? <p className="mt-2 text-sm font-semibold text-red-700">{visibilityError}</p> : null}
        </div>
      </div>
      <button type="button" onClick={() => void toggleHomeVisibility()} disabled={visibilitySaving} className={`shrink-0 rounded-xl px-5 py-3 text-sm font-bold text-white transition disabled:opacity-60 ${visibleEnHome ? "bg-slate-700 hover:bg-slate-600" : "bg-sky-600 hover:bg-sky-500"}`}>
        {visibilitySaving ? "Guardando..." : visibleEnHome ? "Ocultar de la Home" : "Mostrar en la Home"}
      </button>
    </div>

    <div className="mt-6 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-3">
      <select value={type} onChange={event => setType(event.target.value)} className="rounded-xl border p-3"><option value="">Todos los tipos</option><option value="oferta">Buscan personal</option><option value="busqueda">Buscan trabajo</option></select>
      <select value={status} onChange={event => setStatus(event.target.value)} className="rounded-xl border p-3"><option value="">Todos los estados</option>{JOB_STATUSES.map(value => <option key={value}>{value}</option>)}</select>
      <select value={category} onChange={event => setCategory(event.target.value)} className="rounded-xl border p-3"><option value="">Todas las categorías</option>{JOB_CATEGORIES.map(value => <option key={value}>{value}</option>)}</select>
    </div>

    {loading ? <div className="py-16 text-center text-slate-500">Cargando publicaciones...</div> : items.length === 0 ? <div className="mt-6 rounded-2xl bg-white py-16 text-center"><BriefcaseBusiness className="mx-auto h-12 w-12 text-slate-300"/><p className="mt-3 text-slate-500">No hay publicaciones con estos filtros.</p></div> : <div className="mt-6 space-y-3">{items.map(item => <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col justify-between gap-4 lg:flex-row">
        <div className="flex min-w-0 gap-4">
          {getJobImages(item)[0] ? <div className="relative shrink-0"><Image src={getJobImages(item)[0]} alt="" width={80} height={96} unoptimized className="h-24 w-20 rounded-lg border border-slate-200 bg-slate-50 object-contain" />{getJobImages(item).length > 1 ? <span className="absolute -right-2 -top-2 rounded-full bg-sky-700 px-2 py-0.5 text-[10px] font-bold text-white">{getJobImages(item).length} fotos</span> : null}</div> : null}
          <div className="min-w-0">
            <div className="flex flex-wrap gap-2 text-xs font-bold uppercase"><span className="rounded-full bg-sky-50 px-3 py-1 text-sky-700">{item.tipo_publicacion}</span><span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">{item.estado}</span></div>
            <h2 className="mt-3 text-xl font-bold">{item.titulo}</h2>
            <p className="text-sm text-slate-500">{item.nombre_publicante} · {item.categoria} · {item.localidad} · {formatJobDate(item.fecha_creacion)}</p>
            <p className="mt-3 line-clamp-2 max-w-3xl text-sm text-slate-600">{item.descripcion}</p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-start gap-2">
          <button onClick={() => void changeStatus(item.id, "activa")} title="Aprobar" className="rounded-lg bg-emerald-50 p-2 text-emerald-700"><Check className="h-4 w-4"/></button>
          <button onClick={() => void changeStatus(item.id, "rechazada")} title="Rechazar" className="rounded-lg bg-amber-50 p-2 text-amber-700"><X className="h-4 w-4"/></button>
          <button onClick={() => void changeStatus(item.id, item.estado === "activa" ? "vencida" : "pendiente")} className="rounded-lg border px-3 py-2 text-xs font-semibold">{item.estado === "activa" ? "Desactivar" : "Pendiente"}</button>
          <button onClick={() => setEditing(item)} className="rounded-lg bg-blue-50 p-2 text-blue-700"><Pencil className="h-4 w-4"/></button>
          <button onClick={() => setDeleting(item)} className="rounded-lg bg-red-50 p-2 text-red-700"><Trash2 className="h-4 w-4"/></button>
        </div>
      </div>
    </article>)}</div>}

    {posterOpen ? <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm">
      <form onSubmit={publishPoster} className="mx-auto my-6 max-w-4xl rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
        <div className="flex items-start justify-between gap-4"><div><h2 className="text-2xl font-black">Publicar afiche laboral</h2><p className="mt-1 text-sm text-slate-500">Se publicará inmediatamente en “Buscan personal”.</p></div><button type="button" onClick={() => setPosterOpen(false)} aria-label="Cerrar" className="rounded-full p-2 hover:bg-slate-100"><X/></button></div>
        <div className="mt-6 grid gap-6 md:grid-cols-[minmax(0,1fr)_280px]">
          <div className="grid content-start gap-4 sm:grid-cols-2">
            <AdminField label="Título de la oferta" value={poster.titulo} onChange={value => setPoster({...poster, titulo: value})} required />
            <AdminField label="Empresa o anunciante" value={poster.nombre_publicante} onChange={value => setPoster({...poster, nombre_publicante: value})} required />
            <label className="text-sm font-semibold">Categoría<select value={poster.categoria} onChange={event => setPoster({...poster, categoria: event.target.value})} className="mt-2 w-full rounded-xl border p-3 font-normal">{JOB_CATEGORIES.map(value => <option key={value}>{value}</option>)}</select></label>
            <AdminField label="Localidad" value={poster.localidad} onChange={value => setPoster({...poster, localidad: value})} required />
            <AdminField label="Teléfono (opcional)" value={poster.telefono} onChange={value => setPoster({...poster, telefono: value})} type="tel" />
            <AdminField label="Correo (opcional)" value={poster.email} onChange={value => setPoster({...poster, email: value})} type="email" />
            <AdminField label="Fecha límite (opcional)" value={poster.fecha_vencimiento} onChange={value => setPoster({...poster, fecha_vencimiento: value})} type="date" />
            <AdminField label="Cómo postularse (opcional)" value={poster.forma_postulacion} onChange={value => setPoster({...poster, forma_postulacion: value})} />
            <AdminField label="Enlace al sitio (opcional)" value={poster.enlace_url} onChange={value => setPoster({...poster, enlace_url: value})} placeholder="www.ejemplo.com" />
            <label className="text-sm font-semibold sm:col-span-2">Descripción breve (opcional)<textarea rows={4} value={poster.descripcion} onChange={event => setPoster({...poster, descripcion: event.target.value})} placeholder="Si la dejás vacía, invitaremos a consultar el afiche." className="mt-2 w-full rounded-xl border p-3 font-normal"/></label>
          </div>
          <div className="flex min-h-80 flex-col rounded-2xl border-2 border-dashed border-sky-200 bg-sky-50 p-3">
            {poster.imagenes_url.length ? <div className="grid max-h-[450px] flex-1 grid-cols-2 gap-2 overflow-y-auto">
              {poster.imagenes_url.map((image, index) => <div key={`${image.slice(-24)}-${index}`} className="relative overflow-hidden rounded-xl border border-sky-100 bg-white">
                <Image src={image} alt={`Vista previa, foto ${index + 1}`} width={600} height={900} unoptimized className="aspect-[4/5] h-full w-full object-contain" />
                <span className="absolute left-2 top-2 rounded-full bg-slate-950/75 px-2 py-1 text-[10px] font-bold text-white">{index + 1}</span>
                <button type="button" onClick={() => setPoster(current => { const next = current.imagenes_url.filter((_, imageIndex) => imageIndex !== index); return {...current, imagenes_url: next, imagen_url: next[0] || ""} })} aria-label={`Quitar foto ${index + 1}`} className="absolute right-2 top-2 rounded-full bg-white p-1 text-red-600 shadow"><X className="h-3.5 w-3.5"/></button>
              </div>)}
            </div> : <div className="flex flex-1 flex-col items-center justify-center p-8 text-center"><ImagePlus className="h-10 w-10 text-sky-600"/><strong className="mt-3 block text-slate-900">Seleccionar fotos</strong><small className="mt-1 block text-slate-500">Hasta 6 fotos, de 6 MB cada una</small></div>}
            <label className="mt-3 cursor-pointer rounded-xl bg-sky-700 px-4 py-2.5 text-center text-sm font-bold text-white hover:bg-sky-800">
              {poster.imagenes_url.length ? "Cambiar fotos" : "Elegir fotos"}
              <input type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif" onChange={event => void selectPosters(event.target.files)} className="sr-only" />
            </label>
          </div>
        </div>
        {posterError ? <p className="mt-5 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{posterError}</p> : null}
        <div className="mt-6 flex flex-wrap justify-end gap-3"><button type="button" onClick={() => setPosterOpen(false)} className="rounded-xl border px-5 py-3 font-semibold">Cancelar</button><button disabled={posterSaving} className="rounded-xl bg-sky-600 px-6 py-3 font-bold text-white disabled:opacity-60">{posterSaving ? "Publicando..." : "Publicar ahora"}</button></div>
      </form>
    </div> : null}

    {editing ? <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4"><div className="mx-auto my-8 max-w-2xl rounded-2xl bg-white p-6"><h2 className="text-xl font-bold">Editar publicación</h2><div className="mt-5 grid gap-4"><AdminField label="Nombre" value={editing.nombre_publicante} onChange={value => setEditing({...editing, nombre_publicante: value})}/><AdminField label="Título" value={editing.titulo} onChange={value => setEditing({...editing, titulo: value})}/><AdminField label="Localidad" value={editing.localidad} onChange={value => setEditing({...editing, localidad: value})}/><AdminField label="Enlace al sitio (opcional)" value={getJobLink(editing) || ""} onChange={value => setEditing({...editing, enlace_url: value})} placeholder="www.ejemplo.com"/><label className="text-sm font-semibold">Descripción<textarea rows={6} value={editing.descripcion} onChange={event => setEditing({...editing, descripcion: event.target.value})} className="mt-2 w-full rounded-xl border p-3 font-normal"/></label></div><div className="mt-5 flex gap-3"><button onClick={() => void save()} className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white">Guardar</button><button onClick={() => setEditing(null)} className="rounded-xl border px-5 py-3">Cancelar</button></div></div></div> : null}
    <AdminConfirmModal isOpen={Boolean(deleting)} title="Eliminar publicación" description={`Se eliminará definitivamente “${deleting?.titulo || ""}”.`} confirmLabel="Eliminar" confirmVariant="danger" onCancel={() => setDeleting(null)} onConfirm={() => void remove()}/>
  </div>
}

function AdminField({ label, value, onChange, required, type = "text", placeholder }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; type?: string; placeholder?: string }) {
  return <label className="text-sm font-semibold">{label}<input type={type} value={value} onChange={event => onChange(event.target.value)} required={required} placeholder={placeholder} className="mt-2 w-full rounded-xl border p-3 font-normal"/></label>
}
