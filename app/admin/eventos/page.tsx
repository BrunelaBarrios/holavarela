'use client'

import { useEffect, useState } from "react"
import { Calendar, Eye, EyeOff, Pencil, Plus, Trash2, X } from "lucide-react"
import { AdminConfirmModal } from "../../components/AdminConfirmModal"
import { supabase } from "../../supabase"
import { logAdminActivity } from "../../lib/adminActivity"
import { formatEventDateRange } from "../../lib/eventDates"
import { fileToDataUrl } from "../../lib/fileToDataUrl"

type Evento = {
  id: number
  titulo: string
  categoria?: string | null
  fecha: string
  fecha_fin?: string | null
  ubicacion: string
  descripcion: string
  imagen?: string | null
  estado?: string | null
}

type EventoForm = {
  titulo: string
  categoria: string
  fecha: string
  fechaFin: string
  ubicacion: string
  descripcion: string
  imagen: string
}

const initialForm: EventoForm = {
  titulo: "",
  categoria: "Evento",
  fecha: "",
  fechaFin: "",
  ubicacion: "",
  descripcion: "",
  imagen: "",
}

const categoriasEvento = ["Evento", "Promocion", "Sorteo", "Beneficios"]

export default function AdminEventosPage() {
  const [eventos, setEventos] = useState<Evento[]>([])
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingEvento, setEditingEvento] = useState<Evento | null>(null)
  const [formData, setFormData] = useState<EventoForm>(initialForm)
  const [loading, setLoading] = useState(false)
  const [saveError, setSaveError] = useState("")
  const [deletingEvento, setDeletingEvento] = useState<Evento | null>(null)
  const today = new Date().toISOString().slice(0, 10)

  const cargarEventos = async () => {
    const { data, error } = await supabase
      .from("eventos")
      .select("*")
      .order("fecha", { ascending: true })

    if (error) {
      alert(`Error al cargar eventos: ${error.message}`)
      return
    }

    setEventos(data || [])
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void cargarEventos()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [])

  const resetForm = () => {
    setFormData(initialForm)
    setEditingEvento(null)
    setIsFormOpen(false)
    setSaveError("")
  }

  const handleEdit = (evento: Evento) => {
    setEditingEvento(evento)
    setFormData({
      titulo: evento.titulo || "",
      categoria: evento.categoria || "Evento",
      fecha: evento.fecha || "",
      fechaFin: evento.fecha_fin || "",
      ubicacion: evento.ubicacion || "",
      descripcion: evento.descripcion || "",
      imagen: evento.imagen || "",
    })
    setIsFormOpen(true)
  }

  const handleDelete = async (id: number) => {
    const evento = eventos.find((item) => item.id === id)
    if (!evento) return

    const { error } = await supabase.from("eventos").delete().eq("id", id)

    if (error) {
      setSaveError(`Error al eliminar evento: ${error.message}`)
      return
    }

    setEventos((prev) => prev.filter((item) => item.id !== id))
    setDeletingEvento(null)
    await logAdminActivity({
      action: "Eliminar",
      section: "Eventos",
      target: evento?.titulo || `ID ${id}`,
    })
  }

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const imageDataUrl = await fileToDataUrl(file)
      setFormData((prev) => ({ ...prev, imagen: imageDataUrl }))
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "No se pudo cargar la imagen."
      )
    }
  }

  const toggleVisibility = async (evento: Evento) => {
    const nextEstado = evento.estado === "oculto" ? "activo" : "oculto"

    const { error } = await supabase
      .from("eventos")
      .update({ estado: nextEstado })
      .eq("id", evento.id)

    if (error) {
      setSaveError(`Error al cambiar visibilidad: ${error.message}`)
      return
    }

    setEventos((prev) =>
      prev.map((item) =>
        item.id === evento.id ? { ...item, estado: nextEstado } : item
      )
    )

    await logAdminActivity({
      action: nextEstado === "activo" ? "Mostrar" : "Ocultar",
      section: "Eventos",
      target: evento.titulo,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setSaveError("")

    if (!editingEvento && !formData.imagen) {
      setSaveError("Tenes que cargar una foto para crear un evento.")
      setLoading(false)
      return
    }

    if (formData.fecha < today) {
      setSaveError("La fecha del evento no puede ser anterior a hoy.")
      setLoading(false)
      return
    }

    if (formData.fechaFin && formData.fechaFin < formData.fecha) {
      setSaveError("La fecha final no puede ser anterior a la fecha inicial.")
      setLoading(false)
      return
    }

    const payload = {
      titulo: formData.titulo,
      categoria: formData.categoria,
      fecha: formData.fecha,
      fecha_fin: formData.fechaFin || null,
      ubicacion: formData.ubicacion,
      descripcion: formData.descripcion,
      imagen: formData.imagen || null,
      estado: editingEvento?.estado || "activo",
    }

    if (editingEvento) {
      const { error } = await supabase
        .from("eventos")
        .update(payload)
        .eq("id", editingEvento.id)

      if (error) {
        setSaveError(`Error al actualizar evento: ${error.message}`)
        setLoading(false)
        return
      }

      await logAdminActivity({
        action: "Editar",
        section: "Eventos",
        target: formData.titulo,
      })
    } else {
      const { error } = await supabase.from("eventos").insert([payload])

      if (error) {
        setSaveError(`Error al guardar evento: ${error.message}`)
        setLoading(false)
        return
      }

      await logAdminActivity({
        action: "Crear",
        section: "Eventos",
        target: formData.titulo,
      })
    }

    await cargarEventos()
    resetForm()
    setLoading(false)
  }

  return (
    <div className="mx-auto max-w-7xl">
      <AdminConfirmModal
        isOpen={Boolean(deletingEvento)}
        title="Eliminar evento"
        description={`Vas a eliminar "${deletingEvento?.titulo || ""}". Esta accion no se puede deshacer.`}
        confirmLabel="Eliminar"
        onCancel={() => setDeletingEvento(null)}
        onConfirm={() => {
          if (deletingEvento) {
            void handleDelete(deletingEvento.id)
          }
        }}
      />

      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="mb-2 text-3xl font-semibold text-slate-900">Eventos</h1>
          <p className="text-slate-500">Gestiona los eventos de la ciudad</p>
        </div>

        <button
          onClick={() => setIsFormOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 font-medium text-white transition hover:bg-emerald-500"
        >
          <Plus className="h-5 w-5" />
          Agregar Evento
        </button>
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
              <h2 className="text-xl font-semibold text-slate-900">
                {editingEvento ? "Editar Evento" : "Agregar Evento"}
              </h2>
              <button
                onClick={resetForm}
                className="text-slate-500 transition hover:text-slate-900"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 p-6">
              {saveError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {saveError}
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-900">
                  Titulo del Evento *
                </label>
                <input
                  type="text"
                  value={formData.titulo}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, titulo: e.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-900">
                  Categoria *
                </label>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {categoriasEvento.map((categoria) => (
                    <label
                      key={categoria}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition ${
                        formData.categoria === categoria
                          ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                          : "border-slate-200 text-slate-700 hover:border-emerald-300 hover:bg-emerald-50/40"
                      }`}
                    >
                      <input
                        type="radio"
                        name="categoria"
                        value={categoria}
                        checked={formData.categoria === categoria}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            categoria: e.target.value,
                          }))
                        }
                        className="h-4 w-4 border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>{categoria}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-900">
                    Fecha desde *
                  </label>
                  <input
                    type="date"
                    value={formData.fecha}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, fecha: e.target.value }))
                    }
                    min={today}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-900">
                    Fecha hasta
                  </label>
                  <input
                    type="date"
                    value={formData.fechaFin}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, fechaFin: e.target.value }))
                    }
                    min={formData.fecha || today}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-emerald-500"
                  />
                  <p className="mt-2 text-sm text-slate-500">
                    Opcional. Ejemplo: del 12 al 14 de mayo.
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-900">
                    Ubicacion *
                  </label>
                  <input
                    type="text"
                    value={formData.ubicacion}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        ubicacion: e.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-900">
                  Descripcion *
                </label>
                <textarea
                  value={formData.descripcion}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      descripcion: e.target.value,
                    }))
                  }
                  className="h-32 w-full resize-none rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-900">
                  Imagen desde tu computadora
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition file:mr-4 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-4 file:py-2 file:font-medium file:text-emerald-600 hover:file:bg-emerald-100"
                  required={!editingEvento && !formData.imagen}
                />
                <p className="mt-2 text-sm text-slate-500">
                  Selecciona una foto para el evento.
                </p>
                {formData.imagen && (
                  <div className="mt-4 space-y-3">
                    <img
                      src={formData.imagen}
                      alt="Vista previa del evento"
                      className="h-40 w-full rounded-2xl object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, imagen: "" }))}
                      className="text-sm font-medium text-red-600 transition hover:text-red-500"
                    >
                      Quitar imagen
                    </button>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 rounded-xl bg-emerald-600 py-3 font-medium text-white transition hover:bg-emerald-500 disabled:opacity-60"
                >
                  {loading
                    ? "Guardando..."
                    : editingEvento
                      ? "Guardar Cambios"
                      : "Agregar Evento"}
                </button>

                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-xl border border-slate-200 px-6 py-3 text-slate-700 transition hover:bg-slate-50"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {eventos.map((evento) => (
          <div
            key={evento.id}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
          >
            {evento.imagen && (
              <div className="aspect-video w-full overflow-hidden bg-slate-100">
                <img
                  src={evento.imagen}
                  alt={evento.titulo}
                  className="h-full w-full object-cover"
                />
              </div>
            )}

            <div className="p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm text-emerald-600">
                  <Calendar className="h-4 w-4" />
                  <span>{formatEventDateRange(evento.fecha, evento.fecha_fin)}</span>
                </div>

                <div
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    evento.estado === "oculto"
                      ? "bg-slate-200 text-slate-700"
                      : "bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {evento.estado === "oculto" ? "oculto" : "visible"}
                </div>
              </div>

              <h3 className="mb-2 text-lg font-medium text-slate-900">
                {evento.titulo}
              </h3>
              <div className="mb-3 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                {evento.categoria || "Evento"}
              </div>
              <p className="mb-1 text-sm text-slate-500">{evento.ubicacion}</p>
              <p className="mb-4 line-clamp-2 text-sm text-slate-500">
                {evento.descripcion}
              </p>

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  onClick={() => toggleVisibility(evento)}
                  className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100"
                  title={evento.estado === "oculto" ? "Mostrar" : "Ocultar"}
                >
                  {evento.estado === "oculto" ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4" />
                  )}
                </button>

                <button
                  onClick={() => handleEdit(evento)}
                  className="rounded-lg p-2 text-emerald-600 transition hover:bg-emerald-50"
                  title="Editar"
                >
                  <Pencil className="h-4 w-4" />
                </button>

                <button
                  onClick={() => setDeletingEvento(evento)}
                  className="rounded-lg p-2 text-red-600 transition hover:bg-red-50"
                  title="Eliminar"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {eventos.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white py-12 text-center shadow-sm">
          <Calendar className="mx-auto mb-3 h-12 w-12 text-slate-300" />
          <h3 className="mb-2 text-lg font-medium text-slate-900">
            No hay eventos
          </h3>
          <p className="mb-4 text-slate-500">
            Comienza agregando tu primer evento
          </p>
          <button
            onClick={() => setIsFormOpen(true)}
            className="rounded-xl bg-emerald-600 px-6 py-3 font-medium text-white transition hover:bg-emerald-500"
          >
            Agregar Evento
          </button>
        </div>
      )}
    </div>
  )
}
