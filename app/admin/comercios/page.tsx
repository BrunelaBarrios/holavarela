'use client'

import { useEffect, useMemo, useState } from "react"
import { Eye, EyeOff, Pencil, Plus, Star, Store, Trash2, X } from "lucide-react"
import { AdminConfirmModal } from "../../components/AdminConfirmModal"
import { supabase } from "../../supabase"
import { logAdminActivity } from "../../lib/adminActivity"
import { fileToDataUrl } from "../../lib/fileToDataUrl"

type Comercio = {
  id: number
  nombre: string
  descripcion: string | null
  direccion: string | null
  telefono: string | null
  imagen?: string | null
  imagen_url?: string | null
  estado?: string | null
  destacado?: boolean | null
  usa_whatsapp?: boolean | null
}

type ComercioForm = {
  nombre: string
  direccion: string
  telefono: string
  descripcion: string
  imagen_url: string
  usa_whatsapp: boolean
}

const initialForm: ComercioForm = {
  nombre: "",
  direccion: "",
  telefono: "",
  descripcion: "",
  imagen_url: "",
  usa_whatsapp: true,
}

const ITEMS_PER_PAGE = 6

export default function AdminComerciosPage() {
  const [comercios, setComercios] = useState<Comercio[]>([])
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingComercio, setEditingComercio] = useState<Comercio | null>(null)
  const [formData, setFormData] = useState<ComercioForm>(initialForm)
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE)
  const [loading, setLoading] = useState(false)
  const [saveError, setSaveError] = useState("")
  const [deletingComercio, setDeletingComercio] = useState<Comercio | null>(null)

  const comerciosVisibles = useMemo(
    () => comercios.slice(0, visibleCount),
    [comercios, visibleCount]
  )

  const cargarComercios = async () => {
    const { data, error } = await supabase
      .from("comercios")
      .select("*")
      .order("id", { ascending: false })

    if (error) {
      alert(`Error al cargar comercios: ${error.message}`)
      return
    }

    setComercios(data || [])
  }

  useEffect(() => {
    cargarComercios()
  }, [])

  const resetForm = () => {
    setFormData(initialForm)
    setEditingComercio(null)
    setIsFormOpen(false)
    setSaveError("")
  }

  const handleEdit = (comercio: Comercio) => {
    setEditingComercio(comercio)
    setFormData({
      nombre: comercio.nombre || "",
      direccion: comercio.direccion || "",
      telefono: comercio.telefono || "",
      descripcion: comercio.descripcion || "",
      imagen_url: comercio.imagen_url || comercio.imagen || "",
      usa_whatsapp: comercio.usa_whatsapp ?? true,
    })
    setIsFormOpen(true)
  }

  const handleDelete = async (id: number) => {
    const comercio = comercios.find((item) => item.id === id)
    if (!comercio) return

    const { error } = await supabase.from("comercios").delete().eq("id", id)

    if (error) {
      setSaveError(`Error al eliminar comercio: ${error.message}`)
      return
    }

    setComercios((prev) => prev.filter((item) => item.id !== id))
    setDeletingComercio(null)
    await logAdminActivity({
      action: "Eliminar",
      section: "Comercios",
      target: comercio?.nombre || `ID ${id}`,
    })
  }

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const imageDataUrl = await fileToDataUrl(file)
      setFormData((prev) => ({ ...prev, imagen_url: imageDataUrl }))
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "No se pudo cargar la imagen."
      )
    }
  }

  const toggleFeatured = async (comercio: Comercio) => {
    if (!comercio.destacado) {
      const destacadosActuales = comercios.filter((item) => item.destacado).length
      if (destacadosActuales >= 8) {
        alert("Solo podes tener hasta 8 comercios destacados.")
        return
      }
    }

    const { error } = await supabase
      .from("comercios")
      .update({ destacado: !comercio.destacado })
      .eq("id", comercio.id)

    if (error) {
      alert(`Error al cambiar destacado: ${error.message}`)
      return
    }

    setComercios((prev) =>
      prev.map((item) =>
        item.id === comercio.id
          ? { ...item, destacado: !comercio.destacado }
          : item
      )
    )

    await logAdminActivity({
      action: !comercio.destacado ? "Destacar" : "Quitar destacado",
      section: "Comercios",
      target: comercio.nombre,
    })
  }

  const toggleVisibility = async (comercio: Comercio) => {
    const nextEstado = comercio.estado === "oculto" ? "activo" : "oculto"

    const { error } = await supabase
      .from("comercios")
      .update({ estado: nextEstado })
      .eq("id", comercio.id)

    if (error) {
      setSaveError(`Error al cambiar visibilidad: ${error.message}`)
      return
    }

    setComercios((prev) =>
      prev.map((item) =>
        item.id === comercio.id ? { ...item, estado: nextEstado } : item
      )
    )

    await logAdminActivity({
      action: nextEstado === "activo" ? "Mostrar" : "Ocultar",
      section: "Comercios",
      target: comercio.nombre,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setSaveError("")

    if (!editingComercio && !formData.imagen_url) {
      setSaveError("Tenes que cargar una foto para crear un comercio.")
      setLoading(false)
      return
    }

    const payload = {
      nombre: formData.nombre,
      direccion: formData.direccion || null,
      telefono: formData.telefono || null,
      descripcion: formData.descripcion || null,
      imagen_url: formData.imagen_url || null,
      estado: editingComercio?.estado || "activo",
      destacado: editingComercio?.destacado ?? false,
      usa_whatsapp: formData.usa_whatsapp,
    }

    if (editingComercio) {
      const { error } = await supabase
        .from("comercios")
        .update(payload)
        .eq("id", editingComercio.id)

      if (error) {
        const message = `Error al actualizar comercio: ${error.message}${error.details ? ` - ${error.details}` : ""}`
        setSaveError(message)
        setLoading(false)
        return
      }

      await logAdminActivity({
        action: "Editar",
        section: "Comercios",
        target: formData.nombre,
      })
    } else {
      const { error } = await supabase.from("comercios").insert([payload])

      if (error) {
        const message = `Error al guardar comercio: ${error.message}${error.details ? ` - ${error.details}` : ""}`
        setSaveError(message)
        setLoading(false)
        return
      }

      await logAdminActivity({
        action: "Crear",
        section: "Comercios",
        target: formData.nombre,
      })
    }

    await cargarComercios()
    setVisibleCount((prev) => Math.max(prev, ITEMS_PER_PAGE))
    resetForm()
    setLoading(false)
  }

  return (
    <div className="mx-auto max-w-7xl">
      <AdminConfirmModal
        isOpen={Boolean(deletingComercio)}
        title="Eliminar comercio"
        description={`Vas a eliminar "${deletingComercio?.nombre || ""}". Esta accion no se puede deshacer.`}
        confirmLabel="Eliminar"
        onCancel={() => setDeletingComercio(null)}
        onConfirm={() => {
          if (deletingComercio) {
            void handleDelete(deletingComercio.id)
          }
        }}
      />

      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="mb-2 text-3xl font-semibold text-slate-900">Comercios</h1>
          <p className="text-slate-500">Gestiona los comercios locales</p>
          <p className="mt-1 text-sm text-slate-400">
            Podes marcar hasta 8 como destacados para la home.
          </p>
        </div>

        <button
          onClick={() => setIsFormOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-medium text-white transition hover:bg-blue-500"
        >
          <Plus className="h-5 w-5" />
          Agregar Comercio
        </button>
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
              <h2 className="text-xl font-semibold text-slate-900">
                {editingComercio ? "Editar Comercio" : "Agregar Comercio"}
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
                  Nombre del Comercio *
                </label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, nombre: e.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-900">
                  Direccion
                </label>
                <input
                  type="text"
                  value={formData.direccion}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, direccion: e.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-900">
                  Telefono *
                </label>
                <input
                  type="text"
                  value={formData.telefono}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, telefono: e.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500"
                  required
                />
              </div>

              <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={formData.usa_whatsapp}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      usa_whatsapp: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>Este numero tiene WhatsApp</span>
              </label>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-900">
                  Descripcion
                </label>
                <textarea
                  value={formData.descripcion}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      descripcion: e.target.value,
                    }))
                  }
                  className="h-28 w-full resize-none rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500"
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
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:font-medium file:text-blue-600 hover:file:bg-blue-100"
                  required={!editingComercio && !formData.imagen_url}
                />
                <p className="mt-2 text-sm text-slate-500">
                  Selecciona una foto para el comercio.
                </p>
                {formData.imagen_url && (
                  <div className="mt-4 space-y-3">
                    <img
                      src={formData.imagen_url}
                      alt="Vista previa del comercio"
                      className="h-40 w-full rounded-2xl object-cover"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({ ...prev, imagen_url: "" }))
                      }
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
                  className="flex-1 rounded-xl bg-blue-600 py-3 font-medium text-white transition hover:bg-blue-500 disabled:opacity-60"
                >
                  {loading
                    ? "Guardando..."
                    : editingComercio
                      ? "Guardar Cambios"
                      : "Agregar Comercio"}
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
        {comerciosVisibles.map((comercio) => {
          const imagenSrc = comercio.imagen_url || comercio.imagen

          return (
            <div
              key={comercio.id}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
            >
              {imagenSrc && (
                <img
                  src={imagenSrc}
                  alt={comercio.nombre}
                  className="h-48 w-full object-cover"
                />
              )}

              <div className="p-5">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900">
                      {comercio.nombre}
                    </h3>
                    {comercio.direccion && (
                      <p className="mt-1 text-sm text-slate-500">
                        {comercio.direccion}
                      </p>
                    )}
                  </div>

                  <div
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      comercio.estado === "oculto"
                        ? "bg-slate-200 text-slate-700"
                        : "bg-blue-50 text-blue-600"
                    }`}
                  >
                    {comercio.estado === "oculto" ? "oculto" : "visible"}
                  </div>
                </div>

                {comercio.destacado && (
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-600">
                    <Star className="h-3.5 w-3.5 fill-current" />
                    Destacado en home
                  </div>
                )}

                {comercio.telefono && (
                  <p className="mb-2 text-sm text-slate-500">{comercio.telefono}</p>
                )}

                {comercio.descripcion && (
                  <p className="mb-4 line-clamp-2 text-sm text-slate-500">
                    {comercio.descripcion}
                  </p>
                )}

                <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                  <button
                    onClick={() => toggleVisibility(comercio)}
                    className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100"
                    title={comercio.estado === "oculto" ? "Mostrar" : "Ocultar"}
                  >
                    {comercio.estado === "oculto" ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <EyeOff className="h-4 w-4" />
                    )}
                  </button>

                  <button
                    onClick={() => toggleFeatured(comercio)}
                    className={`rounded-lg p-2 transition ${
                      comercio.destacado
                        ? "bg-amber-50 text-amber-600"
                        : "text-slate-500 hover:bg-slate-100"
                    }`}
                    title="Destacar en home"
                  >
                    <Star
                      className={`h-4 w-4 ${
                        comercio.destacado ? "fill-current" : ""
                      }`}
                    />
                  </button>

                  <button
                    onClick={() => handleEdit(comercio)}
                    className="rounded-lg p-2 text-blue-600 transition hover:bg-blue-50"
                    title="Editar"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>

                  <button
                    onClick={() => setDeletingComercio(comercio)}
                    className="rounded-lg p-2 text-red-600 transition hover:bg-red-50"
                    title="Eliminar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {comercios.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white py-12 text-center shadow-sm">
          <Store className="mx-auto mb-3 h-12 w-12 text-slate-300" />
          <h3 className="mb-2 text-lg font-medium text-slate-900">
            No hay comercios
          </h3>
          <p className="mb-4 text-slate-500">
            Comienza agregando tu primer comercio
          </p>
          <button
            onClick={() => setIsFormOpen(true)}
            className="rounded-xl bg-blue-600 px-6 py-3 font-medium text-white transition hover:bg-blue-500"
          >
            Agregar Comercio
          </button>
        </div>
      )}

      {visibleCount < comercios.length && (
        <div className="mt-8 flex justify-center">
          <button
            onClick={() => setVisibleCount((prev) => prev + ITEMS_PER_PAGE)}
            className="rounded-xl bg-blue-600 px-6 py-3 font-medium text-white transition hover:bg-blue-500"
          >
            Ver mas comercios ({comercios.length - visibleCount} restantes)
          </button>
        </div>
      )}
    </div>
  )
}
