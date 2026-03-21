'use client'

import { useEffect, useState } from "react"
import { Eye, EyeOff, Pencil, Phone, Plus, ShieldAlert, Star, Trash2, UserRound, X } from "lucide-react"
import { AdminConfirmModal } from "../../components/AdminConfirmModal"
import { supabase } from "../../supabase"
import { logAdminActivity } from "../../lib/adminActivity"
import { fileToDataUrl } from "../../lib/fileToDataUrl"

type Servicio = {
  id: number
  nombre: string
  categoria: string
  descripcion: string | null
  responsable: string | null
  contacto: string | null
  direccion: string | null
  imagen: string | null
  destacado?: boolean | null
  estado?: string | null
  usa_whatsapp?: boolean | null
}

type ServicioForm = {
  nombre: string
  categoria: string
  descripcion: string
  responsable: string
  contacto: string
  direccion: string
  imagen: string
  usa_whatsapp: boolean
}

const initialForm: ServicioForm = {
  nombre: "",
  categoria: "Profesionales",
  descripcion: "",
  responsable: "",
  contacto: "",
  direccion: "",
  imagen: "",
  usa_whatsapp: true,
}

const categoriasServicio = [
  "Profesionales",
  "Alojamientos",
  "Oficios",
  "Servicios varios",
]

export default function AdminServiciosPage() {
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingServicio, setEditingServicio] = useState<Servicio | null>(null)
  const [formData, setFormData] = useState<ServicioForm>(initialForm)
  const [loading, setLoading] = useState(false)
  const [saveError, setSaveError] = useState("")
  const [deletingServicio, setDeletingServicio] = useState<Servicio | null>(null)

  const cargarServicios = async () => {
    const { data, error } = await supabase
      .from("servicios")
      .select("*")
      .order("id", { ascending: false })

    if (error) {
      setSaveError(`Error al cargar servicios: ${error.message}`)
      return
    }

    setServicios(data || [])
  }

  useEffect(() => {
    cargarServicios()
  }, [])

  const resetForm = () => {
    setFormData(initialForm)
    setEditingServicio(null)
    setIsFormOpen(false)
    setSaveError("")
  }

  const handleEdit = (servicio: Servicio) => {
    setEditingServicio(servicio)
    setFormData({
      nombre: servicio.nombre || "",
      categoria: servicio.categoria || "",
      descripcion: servicio.descripcion || "",
      responsable: servicio.responsable || "",
      contacto: servicio.contacto || "",
      direccion: servicio.direccion || "",
      imagen: servicio.imagen || "",
      usa_whatsapp: servicio.usa_whatsapp ?? true,
    })
    setIsFormOpen(true)
  }

  const handleDelete = async (id: number) => {
    const servicio = servicios.find((item) => item.id === id)
    if (!servicio) return

    const { error } = await supabase.from("servicios").delete().eq("id", id)

    if (error) {
      setSaveError(`Error al eliminar servicio: ${error.message}`)
      return
    }

    setServicios((prev) => prev.filter((item) => item.id !== id))
    setDeletingServicio(null)
    await logAdminActivity({
      action: "Eliminar",
      section: "Servicios",
      target: servicio?.nombre || `ID ${id}`,
    })
  }

  const toggleFeatured = async (servicio: Servicio) => {
    const { error } = await supabase
      .from("servicios")
      .update({ destacado: !servicio.destacado })
      .eq("id", servicio.id)

    if (error) {
      setSaveError(`Error al cambiar destacado: ${error.message}`)
      return
    }

    setServicios((prev) =>
      prev.map((item) =>
        item.id === servicio.id
          ? { ...item, destacado: !servicio.destacado }
          : item
      )
    )

    await logAdminActivity({
      action: !servicio.destacado ? "Destacar" : "Quitar destacado",
      section: "Servicios",
      target: servicio.nombre,
    })
  }

  const toggleVisibility = async (servicio: Servicio) => {
    const nextEstado = servicio.estado === "oculto" ? "activo" : "oculto"

    const { error } = await supabase
      .from("servicios")
      .update({ estado: nextEstado })
      .eq("id", servicio.id)

    if (error) {
      setSaveError(`Error al cambiar visibilidad: ${error.message}`)
      return
    }

    setServicios((prev) =>
      prev.map((item) =>
        item.id === servicio.id ? { ...item, estado: nextEstado } : item
      )
    )

    await logAdminActivity({
      action: nextEstado === "activo" ? "Mostrar" : "Ocultar",
      section: "Servicios",
      target: servicio.nombre,
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setSaveError("")

    if (!editingServicio && !formData.imagen) {
      setSaveError("Tenes que cargar una foto para crear un servicio.")
      setLoading(false)
      return
    }

    const payload = {
      nombre: formData.nombre,
      categoria: formData.categoria,
      descripcion: formData.descripcion || null,
      responsable: formData.responsable || null,
      contacto: formData.contacto || null,
      direccion: formData.direccion || null,
      imagen: formData.imagen || null,
      destacado: editingServicio?.destacado ?? false,
      estado: editingServicio?.estado || "activo",
      usa_whatsapp: formData.usa_whatsapp,
    }

    if (editingServicio) {
      const { error } = await supabase
        .from("servicios")
        .update(payload)
        .eq("id", editingServicio.id)

      if (error) {
        setSaveError(`Error al actualizar servicio: ${error.message}`)
        setLoading(false)
        return
      }

      await logAdminActivity({
        action: "Editar",
        section: "Servicios",
        target: formData.nombre,
      })
    } else {
      const { error } = await supabase.from("servicios").insert([payload])

      if (error) {
        setSaveError(`Error al guardar servicio: ${error.message}`)
        setLoading(false)
        return
      }

      await logAdminActivity({
        action: "Crear",
        section: "Servicios",
        target: formData.nombre,
      })
    }

    await cargarServicios()
    resetForm()
    setLoading(false)
  }

  return (
    <div className="mx-auto max-w-7xl">
      <AdminConfirmModal
        isOpen={Boolean(deletingServicio)}
        title="Eliminar servicio"
        description={`Vas a eliminar "${deletingServicio?.nombre || ""}". Esta accion no se puede deshacer.`}
        confirmLabel="Eliminar"
        onCancel={() => setDeletingServicio(null)}
        onConfirm={() => {
          if (deletingServicio) {
            void handleDelete(deletingServicio.id)
          }
        }}
      />

      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="mb-2 text-3xl font-semibold text-slate-900">Servicios</h1>
          <p className="text-slate-500">
            Gestiona profesionales, alojamientos y otros servicios
          </p>
          <p className="mt-1 text-sm text-slate-400">
            Marca como destacado los que queres usar en la ventana de bienvenida.
          </p>
        </div>

        <button
          onClick={() => setIsFormOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-3 font-medium text-white transition hover:bg-amber-500"
        >
          <Plus className="h-5 w-5" />
          Agregar Servicio
        </button>
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
              <h2 className="text-xl font-semibold text-slate-900">
                {editingServicio ? "Editar Servicio" : "Agregar Servicio"}
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
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-900">
                  Categoria *
                </label>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {categoriasServicio.map((categoria) => (
                    <label
                      key={categoria}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition ${
                        formData.categoria === categoria
                          ? "border-amber-500 bg-amber-50 text-amber-800"
                          : "border-slate-200 text-slate-700 hover:border-amber-300 hover:bg-amber-50/40"
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
                        className="h-4 w-4 border-slate-300 text-amber-600 focus:ring-amber-500"
                      />
                      <span>{categoria}</span>
                    </label>
                  ))}
                </div>
              </div>

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
                  className="h-28 w-full resize-none rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-900">
                    Responsable
                  </label>
                  <input
                    type="text"
                    value={formData.responsable}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        responsable: e.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-900">
                    Contacto
                  </label>
                  <input
                    type="text"
                    value={formData.contacto}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        contacto: e.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-amber-500"
                  />
                </div>
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
                  className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                />
                <span>Este contacto tiene WhatsApp</span>
              </label>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-900">
                  Direccion
                </label>
                <input
                  type="text"
                  value={formData.direccion}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      direccion: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-amber-500"
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
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition file:mr-4 file:rounded-lg file:border-0 file:bg-amber-50 file:px-4 file:py-2 file:font-medium file:text-amber-700 hover:file:bg-amber-100"
                  required={!editingServicio && !formData.imagen}
                />
                <p className="mt-2 text-sm text-slate-500">
                  Selecciona una foto para el servicio.
                </p>
                {formData.imagen && (
                  <div className="mt-4 space-y-3">
                    <img
                      src={formData.imagen}
                      alt="Vista previa del servicio"
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
                  className="flex-1 rounded-xl bg-amber-600 py-3 font-medium text-white transition hover:bg-amber-500 disabled:opacity-60"
                >
                  {loading
                    ? "Guardando..."
                    : editingServicio
                      ? "Guardar Cambios"
                      : "Agregar Servicio"}
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
        {servicios.map((servicio) => (
          <div
            key={servicio.id}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
          >
            {servicio.imagen && (
              <img
                src={servicio.imagen}
                alt={servicio.nombre}
                className="h-56 w-full object-cover"
              />
            )}

            <div className="p-5">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-xl font-semibold text-slate-900">
                    {servicio.nombre}
                  </h3>
                  <p className="text-sm text-amber-600">{servicio.categoria}</p>
                </div>

                <div
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    servicio.estado === "oculto"
                      ? "bg-slate-200 text-slate-700"
                      : "bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {servicio.estado === "oculto" ? "oculto" : "visible"}
                </div>
              </div>

              {servicio.descripcion && (
                <p className="line-clamp-3 text-sm leading-7 text-slate-500">
                  {servicio.descripcion}
                </p>
              )}

              <div className="mt-4 space-y-2 text-sm text-slate-600">
                {servicio.responsable && (
                  <div className="flex items-center gap-2">
                    <UserRound className="h-4 w-4" />
                    <span>{servicio.responsable}</span>
                  </div>
                )}

                {servicio.contacto && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    <span>{servicio.contacto}</span>
                  </div>
                )}
              </div>

              {servicio.destacado && (
                <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                  <Star className="h-3.5 w-3.5 fill-current" />
                  Destacado
                </div>
              )}

              <div className="mt-4 flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  onClick={() => toggleVisibility(servicio)}
                  className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100"
                  title={servicio.estado === "oculto" ? "Mostrar" : "Ocultar"}
                >
                  {servicio.estado === "oculto" ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4" />
                  )}
                </button>

                <button
                  onClick={() => toggleFeatured(servicio)}
                  className={`rounded-lg p-2 transition ${
                    servicio.destacado
                      ? "bg-amber-50 text-amber-700"
                      : "text-slate-500 hover:bg-slate-100"
                  }`}
                  title="Destacar"
                >
                  <Star
                    className={`h-4 w-4 ${servicio.destacado ? "fill-current" : ""}`}
                  />
                </button>

                <button
                  onClick={() => handleEdit(servicio)}
                  className="rounded-lg p-2 text-amber-600 transition hover:bg-amber-50"
                  title="Editar"
                >
                  <Pencil className="h-4 w-4" />
                </button>

                <button
                  onClick={() => setDeletingServicio(servicio)}
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

      {servicios.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white py-12 text-center shadow-sm">
          <ShieldAlert className="mx-auto mb-3 h-12 w-12 text-slate-300" />
          <h3 className="mb-2 text-lg font-medium text-slate-900">
            No hay servicios
          </h3>
          <p className="mb-4 text-slate-500">
            Agrega profesionales, alojamientos u otros servicios
          </p>
          <button
            onClick={() => setIsFormOpen(true)}
            className="rounded-xl bg-amber-600 px-6 py-3 font-medium text-white transition hover:bg-amber-500"
          >
            Agregar Servicio
          </button>
        </div>
      )}
    </div>
  )
}
