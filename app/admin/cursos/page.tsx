'use client'

import { useEffect, useMemo, useState } from "react"
import { Eye, EyeOff, GraduationCap, MessageCircle, Pencil, Phone, Plus, Share2, Star, Trash2, UserRound, X } from "lucide-react"
import { OptimizedImage } from "../../components/OptimizedImage"
import { supabase } from "../../supabase"
import { fileToDataUrl } from "../../lib/fileToDataUrl"
import { AdminConfirmModal } from "../../components/AdminConfirmModal"
import { buildShareCountMap } from "../../lib/shareTracking"
import { buildWhatsappCountMap } from "../../lib/whatsappTracking"
import { postAdminAction } from "../lib/adminActions"

type Curso = {
  id: number
  nombre: string
  descripcion: string
  institucion_id?: number | null
  servicio_id?: number | null
  edad_destino?: string | null
  responsable: string
  contacto: string
  web_url?: string | null
  instagram_url?: string | null
  facebook_url?: string | null
  imagen?: string | null
  premium_galeria?: string[] | null
  destacado?: boolean | null
  estado?: string | null
  usa_whatsapp?: boolean | null
  share_count?: number
  whatsapp_count?: number
}

type CursoForm = Omit<
  Curso,
  "id" | "share_count" | "whatsapp_count" | "premium_galeria" | "edad_destino"
> & {
  edad_destino: string[]
  premium_galeria: string
}

type InstitucionOption = {
  id: number
  nombre: string
}

type ServicioOption = {
  id: number
  nombre: string
}

const initialForm: CursoForm = {
  nombre: "",
  descripcion: "",
  edad_destino: ["todas_las_edades"],
  responsable: "",
  contacto: "",
  web_url: "",
  instagram_url: "",
  facebook_url: "",
  imagen: "",
  premium_galeria: "",
  usa_whatsapp: true,
  institucion_id: null,
  servicio_id: null,
}

const courseAgeOptions = [
  { value: "todas_las_edades", label: "Todas las edades" },
  { value: "adultos", label: "Adultos" },
  { value: "ninos", label: "Niños" },
  { value: "adolescentes", label: "Adolescentes" },
]

const courseAgeLabel = (value?: string | null) =>
  courseAgeOptions.find((option) => option.value === value)?.label || "Todas las edades"

const parseCourseAgeGroups = (value?: string | null) => {
  const groups = (value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => courseAgeOptions.some((option) => option.value === item))

  return groups.length ? groups : ["todas_las_edades"]
}

const courseAgeLabels = (value?: string | null) =>
  parseCourseAgeGroups(value).map(courseAgeLabel).join(", ")

export default function AdminCursosPage() {
  const [cursos, setCursos] = useState<Curso[]>([])
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingCurso, setEditingCurso] = useState<Curso | null>(null)
  const [formData, setFormData] = useState<CursoForm>(initialForm)
  const [loading, setLoading] = useState(false)
  const [saveError, setSaveError] = useState("")
  const [deletingCurso, setDeletingCurso] = useState<Curso | null>(null)
  const [submitMode, setSubmitMode] = useState<"publish" | "draft">("publish")
  const [instituciones, setInstituciones] = useState<InstitucionOption[]>([])
  const [servicios, setServicios] = useState<ServicioOption[]>([])

  const runAdminAction = (body: unknown) =>
    postAdminAction<{ record?: Curso }>(
      "/api/admin/cursos",
      body,
      "No pudimos guardar el curso o clase."
    )

  const cargarCursos = async () => {
    const [
      { data, error },
      { data: shareRows, error: shareError },
      { data: whatsappRows, error: whatsappError },
    ] = await Promise.all([
      supabase
        .from("cursos")
        .select("id, nombre, descripcion, institucion_id, servicio_id, edad_destino, responsable, contacto, web_url, instagram_url, facebook_url, premium_galeria, destacado, estado, usa_whatsapp")
        .order("id", { ascending: false }),
      supabase.from("share_events").select("item_id").eq("section", "cursos"),
      supabase.from("whatsapp_clicks").select("item_id").eq("section", "cursos"),
    ])

    if (error) {
      setSaveError(`Error al cargar cursos: ${error.message}`)
      return
    }

    const warnings: string[] = []
    if (shareError) {
      warnings.push(`No se pudieron cargar los compartidos de cursos: ${shareError.message}`)
    }

    if (whatsappError) {
      warnings.push(`No se pudieron cargar los clics de WhatsApp: ${whatsappError.message}`)
    }

    const shareMap = buildShareCountMap(shareRows || [])
    const whatsappMap = buildWhatsappCountMap(whatsappRows || [])
    setSaveError(warnings.join(" "))
    setCursos(
      (data || []).map((curso) => ({
        ...curso,
        share_count: shareMap[String(curso.id)] || 0,
        whatsapp_count: whatsappMap[String(curso.id)] || 0,
      }))
    )
  }

  const cargarInstituciones = async () => {
    const { data, error } = await supabase
      .from("instituciones")
      .select("id, nombre")
      .order("nombre", { ascending: true })

    if (error) {
      setSaveError(`Error al cargar instituciones: ${error.message}`)
      return
    }

    setInstituciones((data || []) as InstitucionOption[])
  }

  const cargarServicios = async () => {
    const { data, error } = await supabase
      .from("servicios")
      .select("id, nombre")
      .order("nombre", { ascending: true })

    if (error) {
      setSaveError(`Error al cargar servicios: ${error.message}`)
      return
    }

    setServicios((data || []) as ServicioOption[])
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void Promise.all([cargarCursos(), cargarInstituciones(), cargarServicios()])
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
    try {
      const result = await runAdminAction({
        action: "toggle_featured",
        id: curso.id,
      })

      const updated = result.record as Curso
      setCursos((prev) =>
        prev.map((item) =>
          item.id === curso.id
            ? {
                ...updated,
                share_count: item.share_count || 0,
                whatsapp_count: item.whatsapp_count || 0,
              }
            : item
        )
      )
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "No se pudo cambiar el destacado."
      )
      return
    }
  }

  const toggleVisibility = async (curso: Curso) => {
    try {
      const result = await runAdminAction({
        action: "toggle_visibility",
        id: curso.id,
      })

      const updated = result.record as Curso
      setCursos((prev) =>
        prev.map((item) =>
          item.id === curso.id
            ? {
                ...updated,
                share_count: item.share_count || 0,
                whatsapp_count: item.whatsapp_count || 0,
              }
            : item
        )
      )
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "No se pudo cambiar la visibilidad."
      )
      return
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setSaveError("")
    const isDraft = submitMode === "draft"
    const hasContact = formData.contacto.trim().length > 0

    const payload = {
      nombre: formData.nombre,
      descripcion: formData.descripcion,
      edad_destino: formData.edad_destino,
      responsable: formData.responsable,
      contacto: formData.contacto,
      institucion_id: formData.institucion_id || null,
      servicio_id: formData.servicio_id || null,
      web_url: formData.web_url?.trim() || null,
      instagram_url: formData.instagram_url?.trim() || null,
      facebook_url: formData.facebook_url?.trim() || null,
      imagen: formData.imagen || null,
      premium_galeria: formData.premium_galeria
        .split(/\r?\n/)
        .map((item) => item.trim())
        .filter(Boolean),
      destacado: editingCurso?.destacado ?? false,
        estado: isDraft
          ? "borrador"
          : editingCurso?.estado === "oculto"
            ? "oculto"
            : "activo",
        usa_whatsapp: hasContact ? formData.usa_whatsapp : false,
      }

    try {
      const result = await runAdminAction({
        action: "save",
        id: editingCurso?.id,
        payload,
      })
      const data = result.record as Curso | undefined

      if (editingCurso && data) {
        setCursos((prev) =>
          prev.map((item) =>
            item.id === editingCurso.id
              ? {
                  ...data,
                  share_count: item.share_count || 0,
                  whatsapp_count: item.whatsapp_count || 0,
                }
              : item
          )
        )
      } else if (data) {
        setCursos((prev) => [{ ...data, share_count: 0, whatsapp_count: 0 }, ...prev])
      } else {
        await cargarCursos()
      }

      resetForm()
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "No se pudo guardar el curso o clase."
      )
    } finally {
      setLoading(false)
    }
  }

  const hasContact = formData.contacto.trim().length > 0
  const institutionNameById = useMemo(
    () => new Map(instituciones.map((institucion) => [institucion.id, institucion.nombre])),
    [instituciones]
  )
  const serviceNameById = useMemo(
    () => new Map(servicios.map((servicio) => [servicio.id, servicio.nombre])),
    [servicios]
  )

  const handleEdit = async (curso: Curso) => {
    const { data, error } = await supabase
      .from("cursos")
      .select("imagen")
      .eq("id", curso.id)
      .maybeSingle()

    if (error) {
      setSaveError(`No se pudo cargar la imagen del curso: ${error.message}`)
    }

    setEditingCurso(curso)
    setFormData({
      nombre: curso.nombre,
      descripcion: curso.descripcion,
      edad_destino: parseCourseAgeGroups(curso.edad_destino),
      responsable: curso.responsable,
      contacto: curso.contacto,
      institucion_id: curso.institucion_id ?? null,
      servicio_id: curso.servicio_id ?? null,
      web_url: curso.web_url || "",
      instagram_url: curso.instagram_url || "",
      facebook_url: curso.facebook_url || "",
      imagen: data?.imagen || null,
      premium_galeria: (curso.premium_galeria || []).join("\n"),
      usa_whatsapp: curso.usa_whatsapp ?? true,
    })
    setIsFormOpen(true)
  }

  const toggleAgeGroup = (value: string) => {
    setFormData((prev) => {
      const current = prev.edad_destino.length
        ? prev.edad_destino
        : ["todas_las_edades"]

      if (value === "todas_las_edades") {
        return { ...prev, edad_destino: ["todas_las_edades"] }
      }

      const withoutAllAges = current.filter((item) => item !== "todas_las_edades")
      const next = withoutAllAges.includes(value)
        ? withoutAllAges.filter((item) => item !== value)
        : [...withoutAllAges, value]

      return {
        ...prev,
        edad_destino: next.length ? next : ["todas_las_edades"],
      }
    })
  }

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const imageDataUrl = await fileToDataUrl(file, {
        maxWidth: 1200,
        maxHeight: 1600,
        targetFileSizeBytes: 320 * 1024,
      })
      setFormData((prev) => ({ ...prev, imagen: imageDataUrl }))
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "No se pudo cargar la imagen."
      )
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await runAdminAction({ action: "delete", id })
      setCursos((prev) => prev.filter((item) => item.id !== id))
      setDeletingCurso(null)
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "No se pudo eliminar el curso."
      )
      return
    }
  }

  const handleGalleryChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    try {
      const nextImages = await Promise.all(
        files.map((file) =>
          fileToDataUrl(file, {
            maxWidth: 900,
            maxHeight: 1400,
            targetFileSizeBytes: 240 * 1024,
          })
        )
      )
      setFormData((prev) => {
        const currentImages = prev.premium_galeria
          .split(/\r?\n/)
          .map((item) => item.trim())
          .filter(Boolean)

        return {
          ...prev,
          premium_galeria: [...currentImages, ...nextImages].join("\n"),
        }
      })
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "No se pudieron cargar las fotos del curso."
      )
    } finally {
      e.target.value = ""
    }
  }

  return (
    <div className="mx-auto max-w-7xl">
      <AdminConfirmModal
        isOpen={Boolean(deletingCurso)}
        title="Eliminar curso o clase"
        description={`Vas a eliminar "${deletingCurso?.nombre || ""}". Esta acción no se puede deshacer.`}
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

      {saveError && !isFormOpen && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {saveError}
        </div>
      )}

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
                  Descripción *
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

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-900">
                  Público del curso
                </label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {courseAgeOptions.map((option) => (
                    <label
                      key={option.value}
                      className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 transition hover:border-violet-200 hover:bg-violet-50"
                    >
                      <input
                        type="checkbox"
                        checked={formData.edad_destino.includes(option.value)}
                        onChange={() => toggleAgeGroup(option.value)}
                        className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Puedes marcar mas de un publico. "Todas las edades" reemplaza a los demas filtros.
                </p>
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
                    Institución
                  </label>
                  <select
                    value={formData.institucion_id || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        institucion_id: e.target.value ? Number(e.target.value) : null,
                        servicio_id: e.target.value ? null : prev.servicio_id,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-violet-500"
                  >
                    <option value="">Sin institución asociada</option>
                    {instituciones.map((institucion) => (
                      <option key={institucion.id} value={institucion.id}>
                        {institucion.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-900">
                    Servicio
                  </label>
                  <select
                    value={formData.servicio_id || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        servicio_id: e.target.value ? Number(e.target.value) : null,
                        institucion_id: e.target.value ? null : prev.institucion_id,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-violet-500"
                  >
                    <option value="">Sin servicio asociado</option>
                    {servicios.map((servicio) => (
                      <option key={servicio.id} value={servicio.id}>
                        {servicio.nombre}
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-xs text-slate-500">
                    Elige una institución o un servicio si quieres que el curso aparezca dentro de ese perfil premium.
                  </p>
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
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-violet-500"
                  />
                </div>
              </div>

                <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={hasContact && (formData.usa_whatsapp ?? true)}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        usa_whatsapp: e.target.checked,
                      }))
                    }
                    disabled={!hasContact}
                    className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                  />
                  <span>
                    {hasContact
                      ? "Este contacto tiene WhatsApp"
                      : "Completa un contacto si quieres habilitar WhatsApp"}
                  </span>
                </label>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-900">
                    Sitio web
                  </label>
                  <input
                    type="url"
                    value={formData.web_url || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, web_url: e.target.value }))
                    }
                    placeholder="https://..."
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-violet-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-900">
                    Instagram
                  </label>
                  <input
                    type="url"
                    value={formData.instagram_url || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, instagram_url: e.target.value }))
                    }
                    placeholder="https://instagram.com/..."
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-violet-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-900">
                    Facebook
                  </label>
                  <input
                    type="url"
                    value={formData.facebook_url || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, facebook_url: e.target.value }))
                    }
                    placeholder="https://facebook.com/..."
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-violet-500"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-900">
                  Imagen desde tu computadora
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition file:mr-4 file:rounded-lg file:border-0 file:bg-violet-50 file:px-4 file:py-2 file:font-medium file:text-violet-700 hover:file:bg-violet-100"
                />
                <p className="mt-2 text-sm text-slate-500">
                  Opcional. En la pagina de cursos se mostrara el nombre del curso en grande, sin imagen.
                </p>
                {formData.imagen && (
                  <div className="mt-4 space-y-3">
                    <div className="relative h-52 w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                      <OptimizedImage
                        src={formData.imagen}
                        alt="Vista previa del curso"
                        sizes="100vw"
                        className="object-contain p-3"
                      />
                    </div>
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

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-900">
                  Fotos adicionales del curso
                </label>
                <textarea
                  value={formData.premium_galeria}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      premium_galeria: e.target.value,
                    }))
                  }
                  rows={4}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-xs outline-none transition focus:border-violet-500"
                  placeholder="Las fotos cargadas aparecen aca, una por linea."
                />
                <div className="mt-3">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleGalleryChange}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition file:mr-4 file:rounded-lg file:border-0 file:bg-violet-50 file:px-4 file:py-2 file:font-medium file:text-violet-700 hover:file:bg-violet-100"
                  />
                  <p className="mt-2 text-sm text-slate-500">
                    Puedes seleccionar varias fotos; se van a mostrar dentro del detalle del curso.
                  </p>
                </div>
                {formData.premium_galeria.trim() ? (
                  <div className="mt-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      {formData.premium_galeria
                        .split(/\r?\n/)
                        .map((item) => item.trim())
                        .filter(Boolean)
                        .map((image, index) => (
                          <div
                            key={`${image}-${index}`}
                            className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
                          >
                            <OptimizedImage
                              src={image}
                              alt={`Foto adicional ${index + 1}`}
                              sizes="(max-width: 768px) 50vw, 25vw"
                              className="object-contain p-2"
                            />
                          </div>
                        ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, premium_galeria: "" }))}
                      className="text-sm font-medium text-red-600 transition hover:text-red-500"
                    >
                      Limpiar fotos adicionales
                    </button>
                  </div>
                ) : null}
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
              <div className="relative h-56 w-full border-b border-slate-100 bg-slate-50">
                <OptimizedImage
                  src={curso.imagen}
                  alt={curso.nombre}
                  sizes="(max-width: 1280px) 50vw, 33vw"
                  className="object-contain p-3"
                />
              </div>
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
                  <span>{courseAgeLabels(curso.edad_destino)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <UserRound className="h-4 w-4" />
                  <span>{curso.responsable}</span>
                </div>
                {curso.institucion_id ? (
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4" />
                    <span>
                      Institución: {institutionNameById.get(curso.institucion_id) || `ID ${curso.institucion_id}`}
                    </span>
                  </div>
                ) : null}
                {curso.servicio_id ? (
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4" />
                    <span>
                      Servicio: {serviceNameById.get(curso.servicio_id) || `ID ${curso.servicio_id}`}
                    </span>
                  </div>
                ) : null}
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
              {curso.premium_galeria?.length ? (
                <div className="mt-4 ml-2 inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                  {curso.premium_galeria.length} fotos
                </div>
              ) : null}
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
                  onClick={() => void handleEdit(curso)}
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
