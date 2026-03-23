'use client'

import { useEffect, useState } from "react"
import { Building2, Pencil, Plus, Trash2, X } from "lucide-react"
import { AdminConfirmModal } from "../../components/AdminConfirmModal"
import { supabase } from "../../supabase"
import { logAdminActivity } from "../../lib/adminActivity"
import { fileToDataUrl } from "../../lib/fileToDataUrl"

type Institucion = {
  id: number
  nombre: string
  descripcion: string | null
  direccion: string | null
  telefono: string | null
  foto: string | null
}

type InstitucionForm = Omit<Institucion, "id">

const initialForm: InstitucionForm = {
  nombre: "",
  descripcion: "",
  direccion: "",
  telefono: "",
  foto: "",
}

export default function AdminInstitucionesPage() {
  const [instituciones, setInstituciones] = useState<Institucion[]>([])
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingInstitucion, setEditingInstitucion] = useState<Institucion | null>(null)
  const [formData, setFormData] = useState<InstitucionForm>(initialForm)
  const [loading, setLoading] = useState(false)
  const [saveError, setSaveError] = useState("")
  const [deletingInstitucion, setDeletingInstitucion] = useState<Institucion | null>(null)

  const cargarInstituciones = async () => {
    const { data, error } = await supabase
      .from("instituciones")
      .select("*")
      .order("id", { ascending: false })

    if (error) {
      setSaveError(`Error al cargar instituciones: ${error.message}`)
      return
    }

    setInstituciones(data || [])
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void cargarInstituciones()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [])

  const resetForm = () => {
    setFormData(initialForm)
    setEditingInstitucion(null)
    setIsFormOpen(false)
    setSaveError("")
  }

  const handleEdit = (institucion: Institucion) => {
    setEditingInstitucion(institucion)
    setFormData({
      nombre: institucion.nombre || "",
      descripcion: institucion.descripcion || "",
      direccion: institucion.direccion || "",
      telefono: institucion.telefono || "",
      foto: institucion.foto || "",
    })
    setIsFormOpen(true)
  }

  const handleDelete = async (id: number) => {
    const institucion = instituciones.find((item) => item.id === id)
    const { error } = await supabase.from("instituciones").delete().eq("id", id)

    if (error) {
      setSaveError(`Error al eliminar institución: ${error.message}`)
      return
    }

    setInstituciones((prev) => prev.filter((item) => item.id !== id))
    setDeletingInstitucion(null)
    await logAdminActivity({
      action: "Eliminar",
      section: "Instituciones",
      target: institucion?.nombre || `ID ${id}`,
    })
  }

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const imageDataUrl = await fileToDataUrl(file)
      setFormData((prev) => ({ ...prev, foto: imageDataUrl }))
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "No se pudo cargar el logo."
      )
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setSaveError("")

    const payload = {
      nombre: formData.nombre,
      descripcion: formData.descripcion || null,
      direccion: formData.direccion || null,
      telefono: formData.telefono || null,
      foto: formData.foto || null,
    }

    if (editingInstitucion) {
      const { error } = await supabase
        .from("instituciones")
        .update(payload)
        .eq("id", editingInstitucion.id)

      if (error) {
      setSaveError(`Error al actualizar institución: ${error.message}`)
        setLoading(false)
        return
      }

      await logAdminActivity({
        action: "Editar",
        section: "Instituciones",
        target: formData.nombre,
      })
    } else {
      const { error } = await supabase.from("instituciones").insert([payload])

      if (error) {
        setSaveError(`Error al guardar institución: ${error.message}`)
        setLoading(false)
        return
      }

      await logAdminActivity({
        action: "Crear",
        section: "Instituciones",
        target: formData.nombre,
      })
    }

    await cargarInstituciones()
    resetForm()
    setLoading(false)
  }

  return (
    <div className="mx-auto max-w-7xl">
      <AdminConfirmModal
        isOpen={Boolean(deletingInstitucion)}
        title="Eliminar institución"
        description={`Vas a eliminar "${deletingInstitucion?.nombre || ""}". Esta accion no se puede deshacer.`}
        confirmLabel="Eliminar"
        onCancel={() => setDeletingInstitucion(null)}
        onConfirm={() => {
          if (deletingInstitucion) {
            void handleDelete(deletingInstitucion.id)
          }
        }}
      />

      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="mb-2 text-3xl font-semibold text-slate-900">Instituciones</h1>
          <p className="text-slate-500">Gestiona instituciones destacadas de la ciudad</p>
        </div>

        <button
          onClick={() => setIsFormOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-3 font-medium text-white transition hover:bg-cyan-500"
        >
          <Plus className="h-5 w-5" />
          Agregar institución
        </button>
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
              <h2 className="text-xl font-semibold text-slate-900">
                {editingInstitucion ? "Editar institución" : "Agregar institución"}
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
                  Nombre *
                </label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, nombre: e.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-cyan-500"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-900">
                  Dirección
                </label>
                <input
                  type="text"
                  value={formData.direccion || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, direccion: e.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-900">
                  Teléfono
                </label>
                <input
                  type="text"
                  value={formData.telefono || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, telefono: e.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-900">
                  Descripción
                </label>
                <textarea
                  value={formData.descripcion || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      descripcion: e.target.value,
                    }))
                  }
                  className="h-28 w-full resize-none rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-900">
                  Logo de la institución
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition file:mr-4 file:rounded-lg file:border-0 file:bg-cyan-50 file:px-4 file:py-2 file:font-medium file:text-cyan-700 hover:file:bg-cyan-100"
                />
                {formData.foto && (
                  <div className="mt-4 space-y-3">
                    <img
                      src={formData.foto}
                      alt="Vista previa del logo de la institución"
                      className="h-40 w-full rounded-2xl bg-slate-50 object-contain p-4"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, foto: "" }))}
                      className="text-sm font-medium text-red-600 transition hover:text-red-500"
                    >
                      Quitar logo
                    </button>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 rounded-xl bg-cyan-600 py-3 font-medium text-white transition hover:bg-cyan-500 disabled:opacity-60"
                >
                  {loading
                    ? "Guardando..."
                    : editingInstitucion
                      ? "Guardar Cambios"
                      : "Agregar institución"}
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
        {instituciones.map((institucion) => (
          <div
            key={institucion.id}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
          >
            {institucion.foto && (
              <img
                src={institucion.foto}
                alt={institucion.nombre}
                className="h-48 w-full bg-slate-50 object-contain p-4"
              />
            )}

            <div className="p-5">
              <h3 className="text-xl font-semibold text-slate-900">{institucion.nombre}</h3>
              {institucion.direccion && (
                <p className="mt-2 text-sm text-slate-500">{institucion.direccion}</p>
              )}
              {institucion.telefono && (
                <p className="mt-1 text-sm text-slate-500">{institucion.telefono}</p>
              )}
              {institucion.descripcion && (
                <p className="mt-3 line-clamp-3 whitespace-pre-line text-sm text-slate-500">
                  {institucion.descripcion}
                </p>
              )}

              <div className="mt-4 flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  onClick={() => handleEdit(institucion)}
                  className="rounded-lg p-2 text-cyan-600 transition hover:bg-cyan-50"
                  title="Editar"
                >
                  <Pencil className="h-4 w-4" />
                </button>

                <button
                  onClick={() => setDeletingInstitucion(institucion)}
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

      {instituciones.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white py-12 text-center shadow-sm">
          <Building2 className="mx-auto mb-3 h-12 w-12 text-slate-300" />
          <h3 className="mb-2 text-lg font-medium text-slate-900">
            No hay instituciones
          </h3>
          <p className="mb-4 text-slate-500">
            Comenzá agregando la primera institución
          </p>
          <button
            onClick={() => setIsFormOpen(true)}
            className="rounded-xl bg-cyan-600 px-6 py-3 font-medium text-white transition hover:bg-cyan-500"
          >
            Agregar institución
          </button>
        </div>
      )}
    </div>
  )
}
