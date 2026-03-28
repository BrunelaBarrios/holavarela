'use client'

import { useEffect, useState } from "react"
import { Eye, EyeOff, GraduationCap, MessageCircle, Pencil, Phone, Plus, Share2, Star, Trash2, UserRound, X } from "lucide-react"
import { supabase } from "../../supabase"
import { logAdminActivity } from "../../lib/adminActivity"
import { fileToDataUrl } from "../../lib/fileToDataUrl"
import { AdminConfirmModal } from "../../components/AdminConfirmModal"
import { buildShareCountMap } from "../../lib/shareTracking"
import { buildWhatsappCountMap } from "../../lib/whatsappTracking"

type Curso = {
  id: number
  nombre: string
  descripcion: string
  responsable: string
  contacto: string
  imagen: string | null
  destacado?: boolean | null
  estado?: string | null
  usa_whatsapp?: boolean | null
  share_count?: number
  whatsapp_count?: number
}

type CursoForm = Omit<Curso, "id">

const initialForm: CursoForm = {
  nombre: "",
  descripcion: "",
  responsable: "",
  contacto: "",
  imagen: "",
  usa_whatsapp: true,
}

export default function AdminCursosPage() {
  const [cursos, setCursos] = useState<Curso[]>([])
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingCurso, setEditingCurso] = useState<Curso | null>(null)
  const [formData, setFormData] = useState<CursoForm>(initialForm)
  const [loading, setLoading] = useState(false)
  const [saveError, setSaveError] = useState("")
  const [deletingCurso, setDeletingCurso] = useState<Curso | null>(null)
  const [submitMode, setSubmitMode] = useState<"publish" | "draft">("publish")

  const cargarCursos = async () => {
    const [
      { data, error },
      { data: shareRows, error: shareError },
      { data: whatsappRows, error: whatsappError },
    ] = await Promise.all([
      supabase
        .from("cursos")
        .select("*")
        .order("id", { ascending: false }),
      supabase.from("share_events").select("item_id").eq("section", "cursos"),
      supabase.from("whatsapp_clicks").select("item_id").eq("section", "cursos"),
    ])

    if (error) {
      setSaveError(`Error al cargar cursos: ${error.message}`)
      return
    }

    if (shareError) {
      setSaveError(`Error al cargar compartidos de cursos: ${shareError.message}`)
      return
    }

    if (whatsappError) {
      setSaveError(`Error al cargar clics de WhatsApp: ${whatsappError.message}`)
      return
    }

    const shareMap = buildShareCountMap(shareRows || [])
    const whatsappMap = buildWhatsappCountMap(whatsappRows || [])
    setCursos(
      (data || []).map((curso) => ({
        ...curso,
        share_count: shareMap[String(curso.id)] || 0,
        whatsapp_count: whatsappMap[String(curso.id)] || 0,
      }))
    )
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void cargarCursos()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [])

  const resetForm = () => {
    setFormData(initialForm)
    setEditingCurso(null)
    setIsFormOpen(false)
    setSaveError("")
    setSubmitMode("publish")
  }

  const toggleFeatured = async (curso: Curso) => {
    const { error } = await supabase
      .from("cursos")
      .update({ destacado: !curso.destacado })
      .eq("id", curso.id)

    if (error) {
      setSaveError(`Error al cambiar destacado: ${error.message}`)
      return
    }

    setCursos((prev) =>
      prev.map((item) =>
        item.id === curso.id ? { ...item, destacado: !curso.destacado } : item
      )
    )

    await logAdminActivity({
      action: !curso.destacado ? "Destacar" : "Quitar destacado",
      section: "Cursos",
      target: curso.nombre,
    })
  }

  const toggleVisibility = async (curso: Curso) => {
    const nextEstado =
      curso.estado === "oculto" || curso.estado === "borrador"
        ? "activo"
        : "oculto"

    const { error } = await supabase
      .from("cursos")
      .update({ estado: nextEstado })
      .eq("id", curso.id)

    if (error) {
      setSaveError(`Error al cambiar visibilidad: ${error.message}`)
      return
    }

    setCursos((prev) =>
      prev.map((item) =>
        item.id === curso.id ? { ...item, estado: nextEstado } : item
      )
    )

    await logAdminActivity({
      action:
        nextEstado === "activo"
          ? curso.estado === "borrador"
            ? "Publicar borrador"
            : "Mostrar"
          : "Ocultar",
      section: "Cursos",
      target: curso.nombre,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setSaveError("")
    const isDraft = submitMode === "draft"

    if (!isDraft && !editingCurso && !formData.imagen) {
      setSaveError("Tenes que cargar una foto para crear un curso o clase.")
      setLoading(false)
      return
    }

    const payload = {
      nombre: formData.nombre,
      descripcion: formData.descripcion,
      responsable: formData.responsable,
      contacto: formData.contacto,
      imagen: formData.imagen || null,
      destacado: editingCurso?.destacado ?? false,
      estado: isDraft
        ? "borrador"
        : editingCurso?.estado === "oculto"
          ? "oculto"
          : "activo",
      usa_whatsapp: formData.usa_whatsapp,
    }

    if (editingCurso) {
      const { error } = await supabase
        .from("cursos")
        .update(payload)
        .eq("id", editingCurso.id)

      if (error) {
        setSaveError(`Error al actualizar curso: ${error.message}`)
        setLoading(false)
        return
      }

      await logAdminActivity({
        action: isDraft ? "Guardar borrador" : "Editar",
        section: "Cursos",
        target: formData.nombre || "Sin nombre",
      })
    } else {
      const { error } = await supabase.from("cursos").insert([payload])

      if (error) {
        setSaveError(`Error al guardar curso: ${error.message}`)
        setLoading(false)
        return
      }

      await logAdminActivity({
        action: isDraft ? "Crear borrador" : "Crear",
        section: "Cursos",
        target: formData.nombre || "Sin nombre",
      })
    }

    await cargarCursos()
    resetForm()
    setLoading(false)
  }

  const handleEdit = (curso: Curso) => {
    setEditingCurso(curso)
    setFormData({
      nombre: curso.nombre,
      descripcion: curso.descripcion,
      responsable: curso.responsable,
      contacto: curso.contacto,
      imagen: curso.imagen,
      usa_whatsapp: curso.usa_whatsapp ?? true,
    })
    setIsFormOpen(true)
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

  const handleDelete = async (id: number) => {
    const curso = cursos.find((item) => item.id === id)

    const { error } = await supabase.from("cursos").delete().eq("id", id)

    if (error) {
      setSaveError(`Error al eliminar curso: ${error.message}`)
      return
    }

    setCursos((prev) => prev.filter((item) => item.id !== id))
    setDeletingCurso(null)
    await logAdminActivity({
      action: "Eliminar",
      section: "Cursos",
      target: curso?.nombre || `ID ${id}`,
    })
  }

  return (
    <div className="mx-auto max-w-7xl">
      <AdminConfirmModal
        isOpen={Boolean(deletingCurso)}
        title="Eliminar curso o clase"
        description={`Vas a eliminar "${deletingCurso?.nombre || ""}". Esta accion no se puede deshacer.`}
        confirmLabel="Eliminar"
        onCancel={() => setDeletingCurso(null)}
        onConfirm={() => {
          if (deletingCurso) {
            void handleDelete(deletingCurso.id)
          }
        }}
      />

      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="mb-2 text-3xl font-semibold text-slate-900">
            Cursos y Clases
          </h1>
          <p className="text-slate-500">
            Gestiona propuestas educativas y clases de la ciudad
          </p>
          <p className="mt-1 text-sm text-slate-400">
            Marca como destacado los cursos que queres mostrar al ingresar.
          </p>
        </div>

        <button
          onClick={() => setIsFormOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-3 font-medium text-white transition hover:bg-violet-500"
        >
          <Plus className="h-5 w-5" />
          Agregar Curso/Clase
        </button>
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
              <h2 className="text-xl font-semibold text-slate-900">
                {editingCurso ? "Editar Curso/Clase" : "Agregar Curso/Clase"}
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
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-violet-500"
                  required
                />
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
                  className="h-28 w-full resize-none rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-violet-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-900">
                    Responsable *
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
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-violet-500"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-900">
                    Contacto *
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
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-violet-500"
                    required
                  />
                </div>
              </div>

              <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={formData.usa_whatsapp ?? true}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      usa_whatsapp: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                />
                <span>Este contacto tiene WhatsApp</span>
              </label>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-900">
                  Imagen desde tu computadora
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition file:mr-4 file:rounded-lg file:border-0 file:bg-violet-50 file:px-4 file:py-2 file:font-medium file:text-violet-700 hover:file:bg-violet-100"
                  required={!editingCurso && !formData.imagen}
                />
                <p className="mt-2 text-sm text-slate-500">
                  Selecciona una foto para el curso o clase.
                </p>
                {formData.imagen && (
                  <div className="mt-4 space-y-3">
                    <img
                      src={formData.imagen}
                      alt="Vista previa del curso"
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
                  onClick={() => setSubmitMode("publish")}
                  disabled={loading}
                  className="flex-1 rounded-xl bg-violet-600 py-3 font-medium text-white transition hover:bg-violet-500 disabled:opacity-60"
                >
                  {loading
                    ? "Guardando..."
                    : editingCurso
                      ? "Guardar Cambios"
                      : "Guardar y publicar"}
                </button>

                <button
                  type="submit"
                  formNoValidate
                  onClick={() => setSubmitMode("draft")}
                  disabled={loading}
                  className="rounded-xl border border-slate-200 px-6 py-3 text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                >
                  Guardar borrador
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
        {cursos.map((curso) => (
          <div
            key={curso.id}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
          >
            {curso.imagen && (
              <img
                src={curso.imagen}
                alt={curso.nombre}
                className="h-56 w-full object-cover"
              />
            )}

            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-xl font-semibold text-slate-900">{curso.nombre}</h3>
                <div
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    curso.estado === "borrador"
                      ? "bg-amber-100 text-amber-700"
                      : curso.estado === "oculto"
                        ? "bg-slate-200 text-slate-700"
                        : "bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {curso.estado === "borrador"
                    ? "borrador"
                    : curso.estado === "oculto"
                      ? "oculto"
                      : "visible"}
                </div>
              </div>
              <p className="mt-3 line-clamp-3 text-sm leading-7 text-slate-500">
                {curso.descripcion}
              </p>

              <div className="mt-4 space-y-2 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <UserRound className="h-4 w-4" />
                  <span>{curso.responsable}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  <span>{curso.contacto}</span>
                </div>
              </div>

              {curso.destacado && (
                <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
                  <Star className="h-3.5 w-3.5 fill-current" />
                  Destacado
                </div>
              )}

              <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                <Share2 className="h-3.5 w-3.5" />
                {curso.share_count || 0} compartidos
              </div>

              <div className="mt-4 ml-2 inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                <MessageCircle className="h-3.5 w-3.5" />
                {curso.whatsapp_count || 0} WhatsApp
              </div>

              <div className="mt-4 flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                  <button
                    onClick={() => toggleVisibility(curso)}
                    className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100"
                    title={
                      curso.estado === "borrador"
                        ? "Publicar borrador"
                        : curso.estado === "oculto"
                          ? "Mostrar"
                          : "Ocultar"
                    }
                  >
                  {curso.estado === "oculto" ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4" />
                  )}
                </button>

                <button
                  onClick={() => toggleFeatured(curso)}
                  className={`rounded-lg p-2 transition ${
                    curso.destacado
                      ? "bg-violet-50 text-violet-700"
                      : "text-slate-500 hover:bg-slate-100"
                  }`}
                  title="Destacar"
                >
                  <Star className={`h-4 w-4 ${curso.destacado ? "fill-current" : ""}`} />
                </button>

                <button
                  onClick={() => handleEdit(curso)}
                  className="rounded-lg p-2 text-violet-600 transition hover:bg-violet-50"
                  title="Editar"
                >
                  <Pencil className="h-4 w-4" />
                </button>

                <button
                  onClick={() => setDeletingCurso(curso)}
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

      {cursos.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white py-12 text-center shadow-sm">
          <GraduationCap className="mx-auto mb-3 h-12 w-12 text-slate-300" />
          <h3 className="mb-2 text-lg font-medium text-slate-900">
            No hay cursos o clases
          </h3>
          <p className="mb-4 text-slate-500">
            Comienza agregando tu primera propuesta educativa
          </p>
          <button
            onClick={() => setIsFormOpen(true)}
            className="rounded-xl bg-violet-600 px-6 py-3 font-medium text-white transition hover:bg-violet-500"
          >
            Agregar Curso/Clase
          </button>
        </div>
      )}
    </div>
  )
}
