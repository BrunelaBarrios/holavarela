'use client'

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react"
import Image from "next/image"
import { BriefcaseBusiness, Check, Eye, EyeOff, ImagePlus, Pencil, Plus, Trash2, X } from "lucide-react"
import { AdminConfirmModal } from "../../components/AdminConfirmModal"
import { fileToDataUrl } from "../../lib/fileToDataUrl"
import { formatJobDate, getJobImages, getJobLink, JOB_CATEGORIES, JOB_SCHEDULES, JOB_STATUSES, type JobOpportunity, type JobStatus } from "../../lib/jobOpportunities"

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
  const editDialogRef = useRef<HTMLDialogElement>(null)
  const [processingFile, setProcessingFile] = useState(false)
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
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState("")
  const [editingImageError, setEditingImageError] = useState("")

  useEffect(() => {
    const dialog = editDialogRef.current
    if (!editing || !dialog || dialog.open) return
    dialog.showModal()
  }, [editing])
  const editingOpen = Boolean(editing)
  useEffect(() => {
    if (!editingOpen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = previous }
  }, [editingOpen])

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

  const save = async (event: FormEvent) => {
    event.preventDefault()
    if (!editing || editSaving || processingFile) return
    setEditSaving(true)
    setEditError("")
    try {
      const response = await fetch("/api/admin/oportunidades-laborales", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "No se pudieron guardar los cambios.")
      setEditing(null)
      void load()
    } catch (cause) {
      setEditError(cause instanceof Error ? cause.message : "No se pudo conectar. Tus cambios siguen en el formulario.")
    } finally {
      setEditSaving(false)
    }
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

  const setEditingImages = (images: string[]) => {
    if (!editing) return
    setEditing({
      ...editing,
      imagen_url: images.length > 1 ? JSON.stringify(images) : images[0] || null,
    })
  }

  const addEditingImages = async (selectedFiles?: FileList | null) => {
    if (!editing || !selectedFiles?.length) return
    setEditingImageError("")
    setProcessingFile(true)
    try {
      const currentImages = getJobImages(editing)
      const files = Array.from(selectedFiles)
      if (currentImages.length + files.length > 6) {
        throw new Error("Podés tener hasta 6 fotos por publicación.")
      }
      const added: string[] = []
      for (const selectedFile of files) {
        added.push(await fileToDataUrl(selectedFile, {
          maxWidth: 1200,
          maxHeight: 1800,
          targetFileSizeBytes: 400 * 1024,
        }))
      }
      setEditingImages([...currentImages, ...added])
    } catch (cause) {
      setEditingImageError(cause instanceof Error ? cause.message : "No se pudieron procesar las fotos.")
    } finally { setProcessingFile(false) }
  }

  const replaceCv = async (file?: File) => {
    if (!file) return
    setEditError("")
    if (!["application/pdf", "image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5_000_000) {
      setEditError("Elegí un PDF, JPG, PNG o WebP de hasta 5 MB.")
      return
    }
    setProcessingFile(true)
    const reader = new FileReader()
    reader.onload = () => { setEditing(current => current ? {...current, cv_url: String(reader.result)} : current); setProcessingFile(false) }
    reader.onerror = () => { setEditError("No se pudo leer el currículum."); setProcessingFile(false) }
    reader.readAsDataURL(file)
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
          <button onClick={() => { setEditingImageError(""); setEditError(""); setEditing({...item, enlace_url: getJobLink(item) || "", horario: /^https?:\/\//i.test(item.horario || "") ? "" : item.horario}) }} aria-label={`Editar ${item.titulo}`} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-blue-50 px-3 text-blue-700"><Pencil className="h-4 w-4"/>Editar</button>
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
            <label className="text-sm font-semibold">Categoría<select value={poster.categoria} onChange={event => setPoster({...poster, categoria: event.target.value})} className="mt-2 min-w-0 w-full rounded-xl border p-3 text-base font-normal">{JOB_CATEGORIES.map(value => <option key={value}>{value}</option>)}</select></label>
            <AdminField label="Localidad" value={poster.localidad} onChange={value => setPoster({...poster, localidad: value})} required />
            <AdminField label="Teléfono (opcional)" value={poster.telefono} onChange={value => setPoster({...poster, telefono: value})} type="tel" />
            <AdminField label="Correo (opcional)" value={poster.email} onChange={value => setPoster({...poster, email: value})} type="email" />
            <AdminField label="Fecha límite (opcional)" value={poster.fecha_vencimiento} onChange={value => setPoster({...poster, fecha_vencimiento: value})} type="date" />
            <AdminField label="Cómo postularse (opcional)" value={poster.forma_postulacion} onChange={value => setPoster({...poster, forma_postulacion: value})} />
            <AdminField label="Enlace de inscripción (opcional)" value={poster.enlace_url} onChange={value => setPoster({...poster, enlace_url: value})} placeholder="Pegá el enlace para el botón Inscribite aquí" />
            <label className="text-sm font-semibold sm:col-span-2">Descripción breve (opcional)<textarea rows={4} value={poster.descripcion} onChange={event => setPoster({...poster, descripcion: event.target.value})} placeholder="Si la dejás vacía, invitaremos a consultar el afiche." className="mt-2 min-w-0 w-full rounded-xl border p-3 text-base font-normal"/></label>
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

    {editing ? <dialog ref={editDialogRef} onCancel={event => { if (editSaving || processingFile) event.preventDefault(); else setEditing(null) }} aria-labelledby="edit-job-title" className="fixed inset-0 m-auto max-h-[94dvh] w-[calc(100%-1rem)] max-w-3xl overflow-y-auto overscroll-contain rounded-2xl bg-white p-0 backdrop:bg-slate-950/60">
      <form onSubmit={save} className="mx-auto my-2 max-w-3xl rounded-2xl bg-white p-4 sm:my-8 sm:p-6">
        <fieldset disabled={editSaving || processingFile} className="min-w-0">
        <div className="flex items-start justify-between gap-4">
          <div><h2 id="edit-job-title" className="text-xl font-bold">Editar publicación</h2><p className="mt-1 text-sm text-slate-500">Editá la información, el contacto, la inscripción y las fotos de tu publicación.</p></div>
          <button type="button" onClick={() => setEditing(null)} aria-label="Cerrar" className="rounded-full p-2 hover:bg-slate-100"><X/></button>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <AdminField label="Nombre" required value={editing.nombre_publicante} onChange={value => setEditing({...editing, nombre_publicante: value})}/>
          <AdminField label="Título" required value={editing.titulo} onChange={value => setEditing({...editing, titulo: value})}/>
          <AdminField label="Localidad" required value={editing.localidad} onChange={value => setEditing({...editing, localidad: value})}/>
          <AdminField label="Enlace de inscripción (opcional)" value={editing.enlace_url || ""} onChange={value => setEditing({...editing, enlace_url: value})} placeholder="Pegá el enlace para el botón Inscribite aquí"/>
          <label className="text-sm font-semibold">Tipo de publicación<select value={editing.tipo_publicacion} onChange={e => setEditing({...editing, tipo_publicacion: e.target.value as JobOpportunity["tipo_publicacion"]})} className="mt-2 w-full rounded-xl border p-3 text-base font-normal"><option value="oferta">Buscan personal</option><option value="busqueda">Busca trabajo</option></select></label>
          <label className="text-sm font-semibold">Categoría<select value={editing.categoria} onChange={e => setEditing({...editing, categoria: e.target.value})} className="mt-2 w-full rounded-xl border p-3 text-base font-normal">{JOB_CATEGORIES.map(value => <option key={value}>{value}</option>)}</select></label>
          <label className="text-sm font-semibold">Estado<select value={editing.estado} onChange={e => setEditing({...editing, estado: e.target.value as JobStatus})} className="mt-2 w-full rounded-xl border p-3 text-base font-normal">{JOB_STATUSES.map(value => <option key={value}>{value}</option>)}</select></label>
          <label className="text-sm font-semibold">Jornada<select value={editing.tipo_jornada || ""} onChange={e => setEditing({...editing, tipo_jornada: e.target.value})} className="mt-2 w-full rounded-xl border p-3 text-base font-normal"><option value="">Sin especificar</option>{JOB_SCHEDULES.map(value => <option key={value}>{value}</option>)}</select></label>
          <AdminField label="Horario" type="text" value={editing.horario || ""} onChange={value => setEditing({...editing, horario: value})}/>
          <AdminField label="Disponibilidad" type="text" value={editing.disponibilidad || ""} onChange={value => setEditing({...editing, disponibilidad: value})}/>
          <AdminField label="Teléfono" type="tel" value={editing.telefono || ""} onChange={value => setEditing({...editing, telefono: value})}/>
          <AdminField label="Correo electrónico" type="email" value={editing.email || ""} onChange={value => setEditing({...editing, email: value})}/>
          <AdminField label="Fecha límite (vacía para no tener vencimiento)" type="date" value={editing.fecha_vencimiento || ""} onChange={value => setEditing({...editing, fecha_vencimiento: value})}/>
          <label className="text-sm font-semibold sm:col-span-2">Cómo postularse<textarea rows={3} value={editing.forma_postulacion || ""} onChange={e => setEditing({...editing, forma_postulacion: e.target.value})} className="mt-2 w-full rounded-xl border p-3 text-base font-normal"/></label>
          <label className="text-sm font-semibold sm:col-span-2">Requisitos<textarea rows={3} value={editing.requisitos || ""} onChange={e => setEditing({...editing, requisitos: e.target.value})} className="mt-2 w-full rounded-xl border p-3 text-base font-normal"/></label>
          <label className="text-sm font-semibold sm:col-span-2">Experiencia<textarea rows={3} value={editing.experiencia || ""} onChange={e => setEditing({...editing, experiencia: e.target.value})} className="mt-2 w-full rounded-xl border p-3 text-base font-normal"/></label>
          <label className="text-sm font-semibold sm:col-span-2">Habilidades<textarea rows={3} value={editing.habilidades || ""} onChange={e => setEditing({...editing, habilidades: e.target.value})} className="mt-2 w-full rounded-xl border p-3 text-base font-normal"/></label>
          <label className="text-sm font-semibold sm:col-span-2">Descripción<textarea rows={5} value={editing.descripcion} onChange={event => setEditing({...editing, descripcion: event.target.value})} className="mt-2 min-w-0 w-full rounded-xl border p-3 text-base font-normal"/></label>
        </div>

        {(editing.tipo_publicacion === "busqueda" || editing.cv_url) && <section className="mt-6 rounded-xl border border-slate-200 p-4">
          <h3 className="font-bold">Currículum</h3>
          <p className="mt-1 text-sm text-slate-600">{editing.cv_url ? "Hay un currículum adjunto. Podés reemplazarlo o quitarlo." : "Podés adjuntar un PDF o una imagen de hasta 5 MB."}</p>
          <label className="mt-3 block text-sm font-semibold">{editing.cv_url ? "Reemplazar currículum" : "Adjuntar currículum"}<input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={e => { void replaceCv(e.target.files?.[0]); e.currentTarget.value = "" }} className="mt-2 block w-full min-w-0 text-base"/></label>
          {editing.cv_url && <button type="button" onClick={() => setEditing({...editing, cv_url: null})} className="mt-3 min-h-11 rounded-lg bg-red-50 px-3 text-sm font-bold text-red-700">Quitar currículum</button>}
        </section>}
        <section className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><h3 className="font-bold text-slate-950">Fotos de la publicación</h3><p className="text-sm text-slate-500">La primera imagen será la portada. Máximo 6 fotos.</p></div>
            <label className="cursor-pointer rounded-xl bg-sky-50 px-4 py-2.5 text-sm font-bold text-sky-700 hover:bg-sky-100">
              Agregar fotos
              <input type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif" onChange={event => { void addEditingImages(event.target.files); event.currentTarget.value = "" }} className="sr-only"/>
            </label>
          </div>
          {getJobImages(editing).length ? <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {getJobImages(editing).map((image, index) => <div key={`${image.slice(-24)}-${index}`} className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
              <Image src={image} alt={`Foto ${index + 1}`} width={400} height={500} unoptimized className="aspect-[4/5] h-full w-full object-contain"/>
              <span className="absolute left-2 top-2 rounded-full bg-slate-950/75 px-2 py-1 text-[10px] font-bold text-white">{index === 0 ? "Portada" : index + 1}</span>
              <div className="absolute bottom-2 left-2 right-2 flex gap-1">
                {index > 0 ? <button type="button" onClick={() => { const images = getJobImages(editing); setEditingImages([images[index], ...images.filter((_, itemIndex) => itemIndex !== index)]) }} className="flex-1 rounded-lg bg-white/95 px-2 py-1.5 text-[11px] font-bold text-sky-700 shadow">Usar de portada</button> : null}
                <button type="button" onClick={() => setEditingImages(getJobImages(editing).filter((_, itemIndex) => itemIndex !== index))} aria-label={`Quitar foto ${index + 1}`} className="rounded-lg bg-white/95 p-1.5 text-red-600 shadow"><Trash2 className="h-4 w-4"/></button>
              </div>
            </div>)}
          </div> : <div className="mt-4 rounded-xl border-2 border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">Esta publicación no tiene fotos.</div>}
          {editingImageError ? <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{editingImageError}</p> : null}
        </section>

        {editError && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{editError}</p>}
        <div className="sticky bottom-0 mt-6 grid grid-cols-2 gap-3 border-t border-slate-100 bg-white py-4"><button type="button" onClick={() => setEditing(null)} className="rounded-xl border px-3 py-3">Cancelar</button><button type="submit" disabled={editSaving} className="rounded-xl bg-sky-700 px-3 py-3 font-semibold text-white disabled:opacity-60">{processingFile ? "Procesando…" : editSaving ? "Guardando…" : "Guardar cambios"}</button></div>
        </fieldset>
      </form>
    </dialog> : null}
    <AdminConfirmModal isOpen={Boolean(deleting)} title="Eliminar publicación" description={`Se eliminará definitivamente “${deleting?.titulo || ""}”.`} confirmLabel="Eliminar" confirmVariant="danger" onCancel={() => setDeleting(null)} onConfirm={() => void remove()}/>
  </div>
}

function AdminField({ label, value, onChange, required, type = "text", placeholder }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; type?: string; placeholder?: string }) {
  return <label className="text-sm font-semibold">{label}<input type={type} value={value} onChange={event => onChange(event.target.value)} required={required} placeholder={placeholder} className="mt-2 min-w-0 w-full rounded-xl border p-3 text-base font-normal"/></label>
}
