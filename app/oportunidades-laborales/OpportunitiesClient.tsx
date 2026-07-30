'use client'

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react"
import { ArrowRight, BriefcaseBusiness, CalendarDays, Clock3, ExternalLink, MapPin, Search, X } from "lucide-react"
import { PublicHeader } from "../components/PublicHeader"
import { OptimizedImage } from "../components/OptimizedImage"
import { buildHomePublicNav } from "../lib/publicNav"
import { fileToDataUrl } from "../lib/fileToDataUrl"
import { formatJobDate, getJobImages, getJobLink, JOB_CATEGORIES, JOB_SCHEDULES, type JobOpportunity, type JobType } from "../lib/jobOpportunities"

const emptyForm = {
  nombre_publicante: "", titulo: "", descripcion: "", requisitos: "",
  experiencia: "", habilidades: "", horario: "", disponibilidad: "",
  localidad: "José Pedro Varela", telefono: "", email: "", forma_postulacion: "",
  fecha_vencimiento: "", duracion_publicacion: "30", imagen_url: "", cv_url: "",
  consentimiento: false, publicar_perfil: false,
}

const JOB_SEARCH_DURATIONS = [
  { value: "15", label: "15 días" },
  { value: "30", label: "30 días" },
  { value: "60", label: "60 días" },
  { value: "90", label: "90 días" },
  { value: "hasta_aviso", label: "Hasta que avise que ya no estoy buscando" },
] as const

export function OpportunitiesClient() {
  const [type, setType] = useState<JobType>("oferta")
  const [items, setItems] = useState<JobOpportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [category, setCategory] = useState("")
  const [schedule, setSchedule] = useState("")
  const [location, setLocation] = useState("")
  const [position, setPosition] = useState("")
  const [modal, setModal] = useState<JobType | "detail" | null>(null)
  const [selected, setSelected] = useState<JobOpportunity | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [sending, setSending] = useState(false)
  const [notice, setNotice] = useState("")

  const load = useCallback(async () => {
    setLoading(true); setError("")
    const query = new URLSearchParams({ tipo: type })
    if (type === "oferta" && category) query.set("categoria", category)
    if (type === "oferta" && schedule) query.set("jornada", schedule)
    if (type === "busqueda" && position.trim()) query.set("puesto", position.trim())
    if (location.trim()) query.set("localidad", location.trim())
    try {
      const response = await fetch(`/api/oportunidades-laborales?${query}`, { cache: "no-store" })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error)
      setItems(result.items || [])
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudieron cargar los datos.") }
    finally { setLoading(false) }
  }, [type, category, schedule, location, position])
  useEffect(() => { void load() }, [load])

  const locations = useMemo(() => Array.from(new Set(items.map(item => item.localidad))).sort(), [items])
  const changeType = (next: JobType) => {
    setType(next)
    setCategory("")
    setSchedule("")
    setPosition("")
  }
  const openForm = (next: JobType) => { setType(next); setForm(emptyForm); setNotice(""); setModal(next) }
  const openDetail = async (item: JobOpportunity) => {
    setSelected(item); setModal("detail")
    const response = await fetch(`/api/oportunidades-laborales?id=${item.id}`)
    const result = await response.json()
    if (response.ok && result.items?.[0]) setSelected(result.items[0])
  }
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setSending(true); setNotice("")
    try {
      const endpoint = modal === "busqueda" ? "/api/candidatos-laborales" : "/api/oportunidades-laborales"
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, tipo_publicacion: modal }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error)
      setNotice(result.message); setForm(emptyForm)
    } catch (cause) { setNotice(cause instanceof Error ? cause.message : "No se pudo enviar.") }
    finally { setSending(false) }
  }
  const update = (key: keyof typeof form, value: string | boolean) => setForm(current => ({ ...current, [key]: value }))
  const file = async (key: "imagen_url" | "cv_url", selectedFile?: File) => {
    if (!selectedFile) return
    if (key === "cv_url") {
      const allowedCvTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"]
      if (!allowedCvTypes.includes(selectedFile.type) || selectedFile.size > 2_000_000) {
        setNotice("El currículum debe ser PDF, JPG, PNG o WebP de hasta 2 MB.")
        return
      }
      const reader = new FileReader()
      reader.onload = () => update(key, String(reader.result || ""))
      reader.readAsDataURL(selectedFile)
      return
    }
    try {
      update(key, await fileToDataUrl(selectedFile))
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : "No se pudo procesar la foto.")
    }
  }

  return <main className="min-h-screen bg-[linear-gradient(180deg,#f0f9ff_0%,#ffffff_32%,#f8fafc_100%)] text-slate-900">
    <PublicHeader items={[...buildHomePublicNav(), { href: "/oportunidades-laborales", label: "Trabajo", active: true }]} />
    <section className="border-b border-sky-100 px-4 py-14 sm:py-20">
      <div className="mx-auto max-w-6xl text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-600 text-white shadow-lg"><BriefcaseBusiness className="h-8 w-8" /></div>
        <h1 className="mt-6 text-4xl font-black tracking-tight sm:text-6xl">Oportunidades Laborales</h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-600">Conectamos personas que buscan empleo con comercios, empresas e instituciones de José Pedro Varela.</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <button onClick={() => openForm("oferta")} className="rounded-full bg-slate-950 px-6 py-3 font-bold text-white hover:bg-sky-700">Publicar una oferta laboral</button>
          <button onClick={() => openForm("busqueda")} className="rounded-full border border-sky-200 bg-white px-6 py-3 font-bold text-sky-700 hover:bg-sky-50">Cargar mi currículum</button>
        </div>
      </div>
    </section>
    <section className="mx-auto max-w-6xl px-4 py-10">
      <div className="grid grid-cols-2 rounded-2xl bg-slate-100 p-1.5">
        {(["oferta", "busqueda"] as JobType[]).map(value => <button key={value} onClick={() => changeType(value)} className={`rounded-xl px-3 py-3 font-bold transition ${type === value ? "bg-white text-sky-700 shadow-sm" : "text-slate-500"}`}>{value === "oferta" ? "Buscan personal" : "Buscan trabajo"}</button>)}
      </div>
      <div className="mt-5 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-3">
        {type === "oferta" ? <><select aria-label="Categoría" value={category} onChange={e => setCategory(e.target.value)} className="rounded-xl border border-slate-200 px-4 py-3"><option value="">Todas las categorías</option>{JOB_CATEGORIES.map(value => <option key={value}>{value}</option>)}</select><select aria-label="Tipo de jornada" value={schedule} onChange={e => setSchedule(e.target.value)} className="rounded-xl border border-slate-200 px-4 py-3"><option value="">Todas las jornadas</option>{JOB_SCHEDULES.map(value => <option key={value}>{value}</option>)}</select></> : <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 md:col-span-2"><Search className="h-4 w-4 text-slate-400"/><input value={position} onChange={e => setPosition(e.target.value)} placeholder="Área o puesto buscado" className="w-full py-3 outline-none"/></label>}
        <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-4"><Search className="h-4 w-4 text-slate-400"/><input list="job-locations" value={location} onChange={e => setLocation(e.target.value)} placeholder="Localidad" className="w-full py-3 outline-none"/><datalist id="job-locations">{locations.map(value => <option key={value} value={value}/>)}</datalist></label>
      </div>
      {loading ? <div className="grid gap-5 py-8 md:grid-cols-2">{[1,2,3,4].map(i => <div key={i} className="h-72 animate-pulse rounded-3xl bg-slate-100"/>)}</div> : error ? <p className="my-10 rounded-2xl bg-red-50 p-5 text-center text-red-700">{error}</p> : items.length === 0 ? <div className="my-10 rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center"><BriefcaseBusiness className="mx-auto h-10 w-10 text-slate-300"/><h2 className="mt-4 text-xl font-bold">Todavía no hay publicaciones activas</h2><p className="mt-2 text-slate-500">Podés ser la primera persona en compartir una oportunidad.</p></div> : <div className="grid gap-5 py-8 md:grid-cols-2">{items.map(item => <article
        key={item.id}
        role="button"
        tabIndex={0}
        aria-label={`${item.tipo_publicacion === "oferta" ? "Ver propuesta" : "Ver perfil"}: ${item.titulo}`}
        onClick={() => void openDetail(item)}
        onKeyDown={event => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault()
            void openDetail(item)
          }
        }}
        className="group flex cursor-pointer flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_18px_45px_-35px_rgba(15,23,42,.55)] transition hover:-translate-y-1 hover:border-sky-300 hover:shadow-[0_24px_55px_-32px_rgba(14,165,233,.45)] focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
      >
        <div className="flex justify-between gap-3"><span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-bold uppercase text-sky-700">{item.tipo_publicacion === "oferta" ? "Buscan personal" : "Busca trabajo"}</span><span className="text-xs text-slate-400">{formatJobDate(item.fecha_creacion)}</span></div>
        <JobImages item={item} compact />
        <h2 className="mt-5 text-2xl font-black">{item.titulo}</h2><p className="mt-1 font-semibold text-slate-600">{item.nombre_publicante}</p>
        <div className="mt-4 flex flex-wrap gap-2 text-sm text-slate-600">{item.tipo_publicacion === "oferta" ? <span className="rounded-lg bg-slate-100 px-3 py-1.5">{item.categoria}</span> : null}{(item.tipo_jornada || item.disponibilidad) && <span className="rounded-lg bg-slate-100 px-3 py-1.5">{item.tipo_jornada || item.disponibilidad}</span>}<span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5"><MapPin className="h-3.5 w-3.5"/>{item.localidad}</span></div>
        <p className="mt-5 line-clamp-3 leading-7 text-slate-600">{item.descripcion}</p><span className="mt-6 inline-flex items-center gap-2 self-start font-bold text-sky-700">{type === "oferta" ? "Ver propuesta" : "Ver perfil"}<ArrowRight className="h-4 w-4 transition group-hover:translate-x-1"/></span>
      </article>)}</div>}
    </section>
    {modal && <div className="fixed inset-0 z-[70] overflow-y-auto bg-slate-950/55 p-4 backdrop-blur-sm"><div className="mx-auto my-4 max-w-3xl rounded-3xl bg-white p-5 shadow-2xl sm:p-8"><button onClick={() => setModal(null)} aria-label="Cerrar" className="float-right rounded-full p-2 hover:bg-slate-100"><X/></button>
      {modal === "detail" && selected ? <JobDetail item={selected}/> : <form onSubmit={submit}><h2 className="pr-12 text-2xl font-black">{modal === "oferta" ? "Publicar una oferta laboral" : "Cargar mis datos y currículum"}</h2><p className="mt-2 text-sm text-slate-500">{modal === "busqueda" ? "Tu información se guardará de forma privada. Solo se publicará si lo elegís expresamente." : "La publicación quedará pendiente hasta que sea revisada."}</p>
        {modal === "oferta" ? <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2"><Field label="Nombre de empresa, institución o particular" value={form.nombre_publicante} onChange={v => update("nombre_publicante", v)} required/><Field label="Puesto solicitado" value={form.titulo} onChange={v => update("titulo", v)} required/><Field label="Localidad" value={form.localidad} onChange={v => update("localidad", v)} required/><Field label="Horario" value={form.horario} onChange={v => update("horario", v)}/></div>
          <Area label="Descripción del puesto" value={form.descripcion} onChange={v => update("descripcion", v)} required/><Area label="Requisitos" value={form.requisitos} onChange={v => update("requisitos", v)}/>
        </> : <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2"><Field label="Nombre completo" value={form.nombre_publicante} onChange={v => update("nombre_publicante", v)} required/><Field label="Área o puesto buscado (opcional)" value={form.titulo} onChange={v => update("titulo", v)}/><Field label="Localidad" value={form.localidad} onChange={v => update("localidad", v)} required/><Field label="Disponibilidad (opcional)" value={form.disponibilidad} onChange={v => update("disponibilidad", v)}/></div>
          <Area label="Presentación personal" value={form.descripcion} onChange={v => update("descripcion", v)} required/><Area label="Experiencia" value={form.experiencia} onChange={v => update("experiencia", v)} required/><Area label="Habilidades" value={form.habilidades} onChange={v => update("habilidades", v)} required/>
          <label className="mt-5 flex gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-slate-700"><input type="checkbox" checked={form.publicar_perfil} onChange={e => update("publicar_perfil", e.target.checked)} className="mt-1"/><span><strong className="block text-slate-900">También quiero publicar mi búsqueda laboral</strong>Si no marcás esta opción, tus datos y tu currículum permanecerán privados y solo serán visibles para la administración de Hola Varela.</span></label>
          {form.publicar_perfil ? <><label className="mt-4 block text-sm font-semibold">¿Por cuánto tiempo querés publicar tu búsqueda?<select value={form.duracion_publicacion} onChange={e => update("duracion_publicacion", e.target.value)} required className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal">{JOB_SEARCH_DURATIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>{form.duracion_publicacion === "hasta_aviso" ? <p className="mt-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Cuando ya no estés buscando trabajo, avisanos para retirar tu publicación.</p> : null}</> : null}
        </>}
        <div className="grid gap-4 sm:grid-cols-2"><Field label="Teléfono (opcional)" value={form.telefono} onChange={v => update("telefono", v)} type="tel"/><Field label="Correo electrónico (opcional)" value={form.email} onChange={v => update("email", v)} type="email"/>{modal === "oferta" && <><Field label="Forma de postulación" value={form.forma_postulacion} onChange={v => update("forma_postulacion", v)}/><Field label="Fecha límite (opcional)" value={form.fecha_vencimiento} onChange={v => update("fecha_vencimiento", v)} type="date"/></>}</div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2"><FileField label={modal === "busqueda" ? "Foto (opcional)" : "Imagen o logo (opcional)"} accept="image/*" onChange={f => void file("imagen_url", f)}/>{modal === "busqueda" && <FileField label="Currículum vitae (opcional, PDF o imagen de hasta 2 MB)" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={f => void file("cv_url", f)}/>}</div>
        <label className="mt-5 flex gap-3 rounded-2xl bg-sky-50 p-4 text-sm text-slate-700"><input type="checkbox" checked={form.consentimiento} onChange={e => update("consentimiento", e.target.checked)} required className="mt-1"/><span>{modal === "busqueda" ? "Autorizo a Hola Varela a almacenar mis datos y mi currículum en su base privada para facilitar contactos laborales. Puedo solicitar su eliminación. La publicación pública depende exclusivamente de la opción anterior." : "Autorizo a Hola Varela a publicar la información ingresada. Entiendo que los datos de contacto solo aparecerán en el detalle."}</span></label>
        {notice && <p className={`mt-4 rounded-xl p-3 text-sm ${notice.includes("Guardamos") || notice.startsWith("Publicaci") ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{notice}</p>}<button disabled={sending} className="mt-5 w-full rounded-xl bg-sky-600 py-3.5 font-bold text-white hover:bg-sky-700 disabled:opacity-60">{sending ? "Enviando..." : modal === "busqueda" ? "Guardar información" : "Enviar para revisión"}</button>
      </form>}
    </div></div>}
  </main>
}

function JobDetail({ item }: { item: JobOpportunity }) { const jobLink = getJobLink(item); return <div className="pr-8"><span className="text-sm font-bold uppercase text-sky-700">{item.tipo_publicacion === "oferta" ? "Buscan personal" : "Busca trabajo"}</span><JobImages item={item}/><h2 className="mt-4 text-3xl font-black">{item.titulo}</h2><p className="mt-1 font-semibold text-slate-600">{item.nombre_publicante}</p><div className="mt-5 flex flex-wrap gap-3 text-sm text-slate-600"><span className="flex items-center gap-1"><MapPin className="h-4 w-4"/>{item.localidad}</span><span className="flex items-center gap-1"><CalendarDays className="h-4 w-4"/>{formatJobDate(item.fecha_creacion)}</span>{item.tipo_jornada && <span className="flex items-center gap-1"><Clock3 className="h-4 w-4"/>{item.tipo_jornada}</span>}</div><p className="mt-6 whitespace-pre-wrap leading-7 text-slate-700">{item.descripcion}</p>{item.requisitos && <Detail label="Requisitos" value={item.requisitos}/>} {item.experiencia && <Detail label="Experiencia" value={item.experiencia}/>} {item.habilidades && <Detail label="Habilidades" value={item.habilidades}/>} {item.disponibilidad && <Detail label="Disponibilidad" value={item.disponibilidad}/>} {item.tipo_publicacion === "oferta" && item.forma_postulacion && <Detail label="Cómo postularse" value={item.forma_postulacion}/>}<div className="mt-6 flex flex-wrap gap-3">{jobLink && <a className="inline-flex items-center gap-2 rounded-full bg-sky-600 px-5 py-2.5 font-bold text-white shadow-lg shadow-sky-200 transition hover:-translate-y-0.5 hover:bg-sky-700" href={jobLink} target="_blank" rel="noopener noreferrer">Visitar sitio<ExternalLink className="h-4 w-4"/></a>}{item.email && <a className="rounded-full bg-slate-900 px-5 py-2.5 font-bold text-white" href={`mailto:${item.email}`}>Enviar correo</a>}{item.telefono && <a className="rounded-full border border-sky-200 px-5 py-2.5 font-bold text-sky-700" href={`tel:${item.telefono}`}>Llamar</a>}</div></div> }
function JobImages({ item, compact = false }: { item: JobOpportunity; compact?: boolean }) {
  const images = getJobImages(item)
  if (!images.length) return null
  if (compact) return <div className={`relative mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 ${item.tipo_publicacion === "oferta" ? "aspect-[4/5] w-full" : "h-28 w-28"}`}>
    <OptimizedImage src={images[0]} alt={item.tipo_publicacion === "oferta" ? `Afiche de ${item.titulo}, foto 1` : `Foto de ${item.nombre_publicante}`} sizes={item.tipo_publicacion === "oferta" ? "(min-width: 768px) 550px, 100vw" : "112px"} className={item.tipo_publicacion === "oferta" ? "object-contain" : "object-cover"} />
    {images.length > 1 ? <span className="absolute right-3 top-3 rounded-full bg-slate-950/80 px-3 py-1 text-xs font-bold text-white">{images.length} fotos</span> : null}
  </div>
  return <div className={`mt-4 ${item.tipo_publicacion === "oferta" ? "space-y-4" : ""}`}>
    {images.map((image, index) => <div key={`${image.slice(-24)}-${index}`} className={`relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 ${item.tipo_publicacion === "oferta" ? "aspect-[4/5] w-full" : "h-32 w-32"}`}>
      <OptimizedImage src={image} alt={item.tipo_publicacion === "oferta" ? `Afiche de ${item.titulo}, foto ${index + 1} de ${images.length}` : `Foto de ${item.nombre_publicante}`} sizes={item.tipo_publicacion === "oferta" ? "(min-width: 768px) 700px, 100vw" : "128px"} className={item.tipo_publicacion === "oferta" ? "object-contain" : "object-cover"} />
      {images.length > 1 ? <span className="absolute bottom-3 right-3 rounded-full bg-slate-950/80 px-3 py-1 text-xs font-bold text-white">{index + 1} / {images.length}</span> : null}
    </div>)}
  </div>
}
function Detail({ label, value }: { label: string; value: string }) { return <div className="mt-5"><h3 className="font-bold">{label}</h3><p className="mt-1 whitespace-pre-wrap text-slate-600">{value}</p></div> }
function Field({ label, value, onChange, required, type="text" }: { label:string; value:string; onChange:(v:string)=>void; required?:boolean; type?:string }) { return <label className="block text-sm font-semibold">{label}<input type={type} value={value} onChange={e=>onChange(e.target.value)} required={required} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-sky-500"/></label> }
function Area({ label, value, onChange, required }: { label:string; value:string; onChange:(v:string)=>void; required?:boolean }) { return <label className="mt-4 block text-sm font-semibold">{label}<textarea value={value} onChange={e=>onChange(e.target.value)} required={required} rows={4} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-sky-500"/></label> }
function FileField({label,accept,onChange}:{label:string;accept:string;onChange:(file?:File)=>void}) { return <label className="block text-sm font-semibold">{label}<input type="file" accept={accept} onChange={e=>onChange(e.target.files?.[0])} className="mt-2 block w-full rounded-xl border border-slate-200 p-2 text-sm file:rounded-lg file:border-0 file:bg-sky-50 file:px-3 file:py-2"/></label> }
