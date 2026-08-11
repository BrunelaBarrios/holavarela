'use client'

import { useCallback, useEffect, useMemo, useState } from "react"
import { Clock3, Eye, EyeOff, Megaphone, Pencil, Plus, Trash2, X } from "lucide-react"
import { OptimizedImage } from "../../components/OptimizedImage"
import { fileToDataUrl } from "../../lib/fileToDataUrl"

type EntityType = "comercio" | "servicio" | "institucion"
type Filter = "todos" | "activos" | "inactivos"

type Highlight = {
  id: number
  imagen_url: string
  entidad_tipo: EntityType
  entidad_id: number
  activo: boolean
  delay_seconds: number
}

type Option = { key: string; type: EntityType; id: number; label: string }
type Form = { id: number | null; imagen_url: string; entityKey: string; activo: boolean; delay_seconds: number }

const emptyForm: Form = { id: null, imagen_url: "", entityKey: "", activo: true, delay_seconds: 12 }

export default function AdminDestacadosPage() {
  const [items, setItems] = useState<Highlight[]>([])
  const [options, setOptions] = useState<Option[]>([])
  const [filter, setFilter] = useState<Filter>("todos")
  const [form, setForm] = useState<Form>(emptyForm)
  const [modalOpen, setModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")

  const load = useCallback(async () => {
    setError("")
    const response = await fetch("/api/admin/destacados", { cache: "no-store" })
    const result = await response.json().catch(() => null) as { error?: string; highlights?: Highlight[]; options?: Option[] } | null
    if (!response.ok || result?.error) setError(result?.error || "No se pudieron cargar los destacados.")
    else {
      setItems(result?.highlights || [])
      setOptions(result?.options || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  const visibleItems = useMemo(() => items.filter((item) =>
    filter === "todos" || (filter === "activos" ? item.activo : !item.activo)
  ), [filter, items])

  const labelFor = (item: Highlight) => options.find((option) => option.key === `${item.entidad_tipo}:${item.entidad_id}`)?.label || `${item.entidad_tipo} #${item.entidad_id}`

  const closeModal = () => { setModalOpen(false); setForm(emptyForm); setError("") }
  const openCreate = () => { setForm(emptyForm); setMessage(""); setError(""); setModalOpen(true) }
  const openEdit = (item: Highlight) => {
    setForm({ id: item.id, imagen_url: item.imagen_url, entityKey: `${item.entidad_tipo}:${item.entidad_id}`, activo: item.activo, delay_seconds: item.delay_seconds || 12 })
    setMessage(""); setError(""); setModalOpen(true)
  }

  const uploadImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const imageDataUrl = await fileToDataUrl(file)
      setForm((current) => ({ ...current, imagen_url: imageDataUrl }))
    }
    catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo cargar la imagen.") }
  }

  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true); setError(""); setMessage("")
    const [entidad_tipo, rawId] = form.entityKey.split(":")
    const response = await fetch("/api/admin/destacados", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "save", id: form.id || undefined, payload: { imagen_url: form.imagen_url, entidad_tipo, entidad_id: Number(rawId), activo: form.activo, delay_seconds: form.delay_seconds } }),
    })
    const result = await response.json().catch(() => null) as { error?: string } | null
    if (!response.ok || result?.error) setError(result?.error || "No se pudo guardar el destacado.")
    else { await load(); closeModal(); setMessage("Destacado guardado correctamente.") }
    setSaving(false)
  }

  const action = async (item: Highlight, actionName: "toggle_active" | "delete") => {
    if (actionName === "delete" && !window.confirm("¿Eliminar este destacado?")) return
    setSaving(true); setError(""); setMessage("")
    const response = await fetch("/api/admin/destacados", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: actionName, id: item.id }) })
    const result = await response.json().catch(() => null) as { error?: string } | null
    if (!response.ok || result?.error) setError(result?.error || "No se pudo completar la acción.")
    else { await load(); setMessage(actionName === "delete" ? "Destacado eliminado." : item.activo ? "Destacado desactivado." : "Destacado activado.") }
    setSaving(false)
  }

  return <div className="mx-auto max-w-7xl">
    <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div><h1 className="text-3xl font-semibold text-slate-950">Avisos destacados</h1><p className="mt-2 text-slate-500">Carga imágenes rotativas para mostrar en la web y vincularlas con una propuesta.</p></div>
      <button onClick={openCreate} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 font-semibold text-white transition hover:bg-blue-600"><Plus className="h-5 w-5"/>Agregar destacado</button>
    </div>

    {error && !modalOpen ? <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
    {message ? <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div> : null}

    <div className="mb-6 flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1">
        {(["todos", "activos", "inactivos"] as Filter[]).map((value) => <button key={value} onClick={() => setFilter(value)} className={`rounded-lg px-4 py-2 text-sm font-medium capitalize ${filter === value ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"}`}>{value}</button>)}
      </div>
      <span className="pr-3 text-sm text-slate-500">{visibleItems.length} de {items.length}</span>
    </div>

    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="hidden grid-cols-[190px_1fr_130px_120px_150px] gap-4 border-b bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 md:grid"><span>Imagen</span><span>Propuesta</span><span>Estado</span><span>Espera</span><span className="text-right">Acciones</span></div>
      {loading ? <div className="p-10 text-center text-slate-500">Cargando destacados...</div> : visibleItems.length === 0 ? <div className="p-10 text-center text-slate-500"><Megaphone className="mx-auto mb-3 h-8 w-8 text-slate-300"/>No hay destacados en esta vista.</div> : visibleItems.map((item) => <div key={item.id} className="grid gap-4 border-b border-slate-100 p-5 last:border-0 md:grid-cols-[190px_1fr_130px_120px_150px] md:items-center">
        <div className="relative h-20 w-28 overflow-hidden rounded-xl border bg-slate-50"><OptimizedImage src={item.imagen_url} alt={labelFor(item)} sizes="112px" className="object-contain"/></div>
        <div><p className="font-semibold text-slate-950">{labelFor(item).replace(/^[^:]+:\s*/, "")}</p><p className="mt-1 text-sm capitalize text-slate-500">{item.entidad_tipo}</p></div>
        <div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${item.activo ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{item.activo ? "Activo" : "Inactivo"}</span></div>
        <div className="flex items-center gap-2 text-sm text-slate-600"><Clock3 className="h-4 w-4"/>{item.delay_seconds || 12}s</div>
        <div className="flex justify-end gap-1">
          <button onClick={() => void action(item, "toggle_active")} disabled={saving} title={item.activo ? "Desactivar" : "Activar"} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100">{item.activo ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}</button>
          <button onClick={() => openEdit(item)} title="Editar" className="rounded-lg p-2 text-blue-600 hover:bg-blue-50"><Pencil className="h-4 w-4"/></button>
          <button onClick={() => void action(item, "delete")} disabled={saving} title="Eliminar" className="rounded-lg p-2 text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4"/></button>
        </div>
      </div>)}
    </div>

    {modalOpen ? <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) closeModal() }}>
      <div role="dialog" aria-modal="true" aria-labelledby="highlight-title" className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-6 py-5"><h2 id="highlight-title" className="text-xl font-semibold">{form.id ? "Editar destacado" : "Agregar destacado"}</h2><button onClick={closeModal} aria-label="Cerrar" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5"/></button></div>
        <form onSubmit={save} className="space-y-5 p-6">
          {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
          <div><label className="mb-2 block text-sm font-medium">Imagen del destacado</label><input type="file" accept="image/*" onChange={uploadImage} className="w-full rounded-xl border px-4 py-3 text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-slate-100 file:px-4 file:py-2"/>{form.imagen_url ? <div className="relative mt-3 h-48 overflow-hidden rounded-xl border bg-slate-50"><OptimizedImage src={form.imagen_url} alt="Vista previa" sizes="600px" className="object-contain"/></div> : null}</div>
          <div><label className="mb-2 block text-sm font-medium">Propuesta relacionada</label><select required value={form.entityKey} onChange={(event) => setForm((current) => ({ ...current, entityKey: event.target.value }))} className="w-full rounded-xl border px-4 py-3"><option value="">Seleccionar propuesta</option>{options.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}</select></div>
          <div className="grid gap-4 sm:grid-cols-2"><label className="flex items-center gap-3 rounded-xl border p-4"><input type="checkbox" checked={form.activo} onChange={(event) => setForm((current) => ({ ...current, activo: event.target.checked }))} className="h-5 w-5"/><span className="text-sm font-medium">Destacado activo</span></label><div><label className="mb-2 block text-sm font-medium">Segundos de espera</label><input type="number" min={5} max={180} value={form.delay_seconds} onChange={(event) => setForm((current) => ({ ...current, delay_seconds: Number(event.target.value) }))} className="w-full rounded-xl border px-4 py-3"/></div></div>
          <div className="flex gap-3 pt-2"><button disabled={saving} className="flex-1 rounded-xl bg-slate-950 px-5 py-3 font-semibold text-white hover:bg-blue-600 disabled:opacity-60">{saving ? "Guardando..." : "Guardar destacado"}</button><button type="button" onClick={closeModal} className="rounded-xl border px-5 py-3 text-slate-600">Cancelar</button></div>
        </form>
      </div>
    </div> : null}
  </div>
}
