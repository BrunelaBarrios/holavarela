'use client'

import { useEffect, useState } from "react"
import { Building2, Eye, EyeOff, Pencil, Plus, Star, Trash2, X } from "lucide-react"
import { AdminConfirmModal } from "../../components/AdminConfirmModal"
import { OptimizedImage } from "../../components/OptimizedImage"
import { supabase } from "../../supabase"
import { fileToDataUrl } from "../../lib/fileToDataUrl"
import { MoveCategoryButton } from "../components/MoveCategoryButton"

type Institucion = {
  id: number
  nombre: string
  descripcion: string | null
  direccion: string | null
  telefono: string | null
  web_url?: string | null
  instagram_url?: string | null
  facebook_url?: string | null
  foto?: string | null
  estado?: string | null
  usa_whatsapp?: boolean | null
  destacado?: boolean | null
  premium_detalle?: string | null
  premium_galeria?: string[] | null
  premium_extra_titulo?: string | null
  premium_extra_detalle?: string | null
  premium_extra_galeria?: string[] | null
  premium_activo?: boolean | null
  premium_cursos_activo?: boolean | null
  premium_cursos_titulo?: string | null
}

type InstitucionForm = Omit<
  Institucion,
  "id" | "premium_galeria" | "premium_extra_galeria"
> & {
  premium_galeria: string
  premium_extra_galeria: string
}

const initialForm: InstitucionForm = {
  nombre: "",
  descripcion: "",
  direccion: "",
  telefono: "",
  web_url: "",
  instagram_url: "",
  facebook_url: "",
  foto: "",
  usa_whatsapp: true,
  destacado: false,
  premium_detalle: "",
  premium_galeria: "",
  premium_extra_titulo: "",
  premium_extra_detalle: "",
  premium_extra_galeria: "",
  premium_activo: false,
  premium_cursos_activo: false,
  premium_cursos_titulo: "",
}

export default function AdminInstitucionesPage() {
  const [instituciones, setInstituciones] = useState<Institucion[]>([])
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingInstitucion, setEditingInstitucion] = useState<Institucion | null>(null)
  const [formData, setFormData] = useState<InstitucionForm>(initialForm)
  const [fotoTouched, setFotoTouched] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saveError, setSaveError] = useState("")
  const [deletingInstitucion, setDeletingInstitucion] = useState<Institucion | null>(null)
  const [featuredSchemaReady, setFeaturedSchemaReady] = useState(true)

  const cargarInstituciones = async () => {
    let result: any = await supabase
      .from("instituciones")
      .select("id, nombre, descripcion, direccion, telefono, web_url, instagram_url, facebook_url, estado, usa_whatsapp, destacado, premium_detalle, premium_galeria, premium_extra_titulo, premium_extra_detalle, premium_extra_galeria, premium_activo, premium_cursos_activo, premium_cursos_titulo")
      .order("id", { ascending: false })

    if (result.error?.code === "42703" && result.error.message.includes("destacado")) {
      setFeaturedSchemaReady(false)
      result = await supabase
        .from("instituciones")
        .select("id, nombre, descripcion, direccion, telefono, web_url, instagram_url, facebook_url, estado, usa_whatsapp, premium_detalle, premium_galeria, premium_extra_titulo, premium_extra_detalle, premium_extra_galeria, premium_activo, premium_cursos_activo, premium_cursos_titulo")
        .order("id", { ascending: false })
    } else {
      setFeaturedSchemaReady(true)
    }

    const { data, error } = result

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
    setFotoTouched(false)
    setEditingInstitucion(null)
    setIsFormOpen(false)
    setSaveError("")
  }

  const handleEdit = async (institucion: Institucion) => {
    const { data, error } = await supabase
      .from("instituciones")
      .select("foto")
      .eq("id", institucion.id)
      .maybeSingle()

    if (error) {
      setSaveError(`No se pudo cargar la imagen de la institución: ${error.message}`)
    }

    setEditingInstitucion(institucion)
    setFormData({
      nombre: institucion.nombre || "",
      descripcion: institucion.descripcion || "",
      direccion: institucion.direccion || "",
      telefono: institucion.telefono || "",
      web_url: institucion.web_url || "",
      instagram_url: institucion.instagram_url || "",
      facebook_url: institucion.facebook_url || "",
      foto: data?.foto || "",
      usa_whatsapp: institucion.usa_whatsapp ?? true,
      destacado: institucion.destacado ?? false,
      premium_detalle: institucion.premium_detalle || "",
      premium_galeria: (institucion.premium_galeria || []).join("\n"),
      premium_extra_titulo: institucion.premium_extra_titulo || "",
      premium_extra_detalle: institucion.premium_extra_detalle || "",
      premium_extra_galeria: (institucion.premium_extra_galeria || []).join("\n"),
      premium_activo: institucion.premium_activo ?? false,
      premium_cursos_activo: institucion.premium_cursos_activo ?? false,
      premium_cursos_titulo: institucion.premium_cursos_titulo || "",
    })
    setFotoTouched(false)
    setIsFormOpen(true)
  }

  const handleDelete = async (id: number) => {
    const response = await fetch("/api/admin/instituciones", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "delete",
        id,
      }),
    })
    const result = (await response.json()) as { error?: string }

    if (!response.ok) {
      setSaveError(result.error || "No pudimos eliminar la institución.")
      return
    }

    setInstituciones((prev) => prev.filter((item) => item.id !== id))
    setDeletingInstitucion(null)
  }

  const toggleVisibility = async (institucion: Institucion) => {
    const response = await fetch("/api/admin/instituciones", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "toggle_visibility",
        id: institucion.id,
      }),
    })
    const result = (await response.json()) as { error?: string; record?: Institucion }

    if (!response.ok || !result.record) {
      setSaveError(result.error || "No pudimos cambiar la visibilidad.")
      return
    }

    setInstituciones((prev) =>
      prev.map((item) => (item.id === institucion.id ? result.record! : item))
    )
  }

  const toggleFeatured = async (institucion: Institucion) => {
    const response = await fetch("/api/admin/instituciones", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "toggle_featured",
        id: institucion.id,
      }),
    })
    const result = (await response.json()) as { error?: string; record?: Institucion }

    if (!response.ok || !result.record) {
      setSaveError(result.error || "No pudimos cambiar el destacado.")
      return
    }

    setInstituciones((prev) =>
      prev.map((item) => (item.id === institucion.id ? result.record! : item))
    )
  }

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      // Main images are compressed before saving to reduce payload and reads.
      const imageDataUrl = await fileToDataUrl(file, {
        maxWidth: 720,
        maxHeight: 1440,
        targetFileSizeBytes: 160 * 1024,
      })
      setFotoTouched(true)
      setFormData((prev) => ({ ...prev, foto: imageDataUrl }))
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "No se pudo cargar la imagen."
      )
    } finally {
      e.target.value = ""
    }
  }

  const handlePremiumGalleryChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    field: "premium_galeria" | "premium_extra_galeria" = "premium_galeria"
  ) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    try {
      const nextImages = await Promise.all(
        files.map((file) =>
          fileToDataUrl(file, {
            maxWidth: 560,
            maxHeight: 1120,
            targetFileSizeBytes: 120 * 1024,
          })
        )
      )
      setFormData((prev) => {
        const currentImages = prev[field]
          .split(/\r?\n/)
          .map((item) => item.trim())
          .filter(Boolean)

        return {
          ...prev,
          [field]: [...currentImages, ...nextImages].join("\n"),
        }
      })
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "No se pudieron cargar las fotos premium."
      )
    } finally {
      e.target.value = ""
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
      web_url: formData.web_url?.trim() || null,
      instagram_url: formData.instagram_url?.trim() || null,
      facebook_url: formData.facebook_url?.trim() || null,
      estado: editingInstitucion?.estado ?? "activo",
      usa_whatsapp: formData.usa_whatsapp,
      ...(featuredSchemaReady ? { destacado: formData.destacado ?? false } : {}),
      premium_detalle: formData.premium_detalle?.trim() || null,
      premium_galeria: formData.premium_galeria
        .split(/\r?\n/)
        .map((item) => item.trim())
        .filter(Boolean),
      premium_extra_titulo: formData.premium_extra_titulo?.trim() || null,
      premium_extra_detalle: formData.premium_extra_detalle?.trim() || null,
      premium_extra_galeria: formData.premium_extra_galeria
        .split(/\r?\n/)
        .map((item) => item.trim())
        .filter(Boolean),
      premium_activo: formData.premium_activo ?? false,
      premium_cursos_activo: formData.premium_cursos_activo ?? false,
      premium_cursos_titulo: formData.premium_cursos_titulo?.trim() || null,
      ...(fotoTouched ? { foto: formData.foto || null } : {}),
    }

    const response = await fetch("/api/admin/instituciones", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "save",
        id: editingInstitucion?.id,
        payload,
      }),
    })
    const result = (await response.json().catch(() => ({}))) as { error?: string; record?: Institucion }

    if (!response.ok || !result.record) {
      setSaveError(
        result.error ||
          (editingInstitucion
            ? "No pudimos actualizar la institución."
            : "No pudimos guardar la institución.")
      )
      setLoading(false)
      return
    }

    if (editingInstitucion) {
      setInstituciones((prev) =>
        prev.map((item) => (item.id === editingInstitucion.id ? result.record! : item))
      )
    } else {
      setInstituciones((prev) => [result.record!, ...prev])
    }

    resetForm()
    setLoading(false)
  }

  return (
    <div className="mx-auto max-w-7xl">
      <AdminConfirmModal
        isOpen={Boolean(deletingInstitucion)}
        title="Eliminar institución"
        description={`Vas a eliminar "${deletingInstitucion?.nombre || ""}". Esta acción no se puede deshacer.`}
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
                  className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                />
                <span>Este numero tiene WhatsApp</span>
              </label>

              <label className="flex items-center gap-3 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-800">
                <input
                  type="checkbox"
                  checked={formData.premium_activo ?? false}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      premium_activo: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-violet-300 text-violet-600 focus:ring-violet-500"
                />
                <span>Perfil premium activo para esta institución</span>
              </label>

              <div className="rounded-2xl border border-violet-200 bg-violet-50/70 p-4">
                <div className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-violet-700">
                  Bloques premium
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-900">
                      Descripcion ampliada
                    </label>
                    <textarea
                      value={formData.premium_detalle || ""}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          premium_detalle: e.target.value,
                        }))
                      }
                      disabled={!formData.premium_activo}
                      className="h-28 w-full resize-none rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-violet-500 disabled:cursor-not-allowed disabled:bg-slate-100"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-900">
                      Fotos del bloque premium
                    </label>
                    <textarea
                      value={formData.premium_galeria}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          premium_galeria: e.target.value,
                        }))
                      }
                      disabled={!formData.premium_activo}
                      placeholder={"Una URL por linea\nhttps://..."}
                      className="h-24 w-full resize-none rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-violet-500 disabled:cursor-not-allowed disabled:bg-slate-100"
                    />
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      disabled={!formData.premium_activo}
                      onChange={handlePremiumGalleryChange}
                      className="mt-3 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition file:mr-4 file:rounded-lg file:border-0 file:bg-violet-100 file:px-4 file:py-2 file:font-medium file:text-violet-700 hover:file:bg-violet-200 disabled:cursor-not-allowed disabled:bg-slate-100"
                    />

                    {formData.premium_galeria.trim() ? (
                      <div className="mt-4 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          {formData.premium_galeria
                            .split(/\r?\n/)
                            .map((item) => item.trim())
                            .filter(Boolean)
                            .map((image, index) => (
                              <div key={`${image}-${index}`} className="relative h-28 w-full overflow-hidden rounded-2xl">
                                <OptimizedImage
                                  src={image}
                                  alt={`Foto premium ${index + 1}`}
                                  sizes="(max-width: 768px) 100vw, 50vw"
                                  className="object-cover"
                                />
                              </div>
                            ))}
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setFormData((prev) => ({ ...prev, premium_galeria: "" }))
                          }
                          className="text-sm font-medium text-red-600 transition hover:text-red-500"
                        >
                          Limpiar fotos premium
                        </button>
                      </div>
                    ) : null}
                  </div>

                  <div className="rounded-2xl border border-white/80 bg-white/70 p-4">
                    <div className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-violet-700">
                      Bloque extra
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-900">
                          Titulo del bloque extra
                        </label>
                        <input
                          type="text"
                          value={formData.premium_extra_titulo || ""}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              premium_extra_titulo: e.target.value,
                            }))
                          }
                          disabled={!formData.premium_activo}
                          className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-violet-500 disabled:cursor-not-allowed disabled:bg-slate-100"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-900">
                          Descripcion del bloque extra
                        </label>
                        <textarea
                          value={formData.premium_extra_detalle || ""}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              premium_extra_detalle: e.target.value,
                            }))
                          }
                          disabled={!formData.premium_activo}
                          className="h-24 w-full resize-none rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-violet-500 disabled:cursor-not-allowed disabled:bg-slate-100"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-900">
                          Fotos del bloque extra
                        </label>
                        <textarea
                          value={formData.premium_extra_galeria}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              premium_extra_galeria: e.target.value,
                            }))
                          }
                          disabled={!formData.premium_activo}
                          placeholder={"Una URL por linea\nhttps://..."}
                          className="h-24 w-full resize-none rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-violet-500 disabled:cursor-not-allowed disabled:bg-slate-100"
                        />
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          disabled={!formData.premium_activo}
                          onChange={(e) => void handlePremiumGalleryChange(e, "premium_extra_galeria")}
                          className="mt-3 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition file:mr-4 file:rounded-lg file:border-0 file:bg-violet-100 file:px-4 file:py-2 file:font-medium file:text-violet-700 hover:file:bg-violet-200 disabled:cursor-not-allowed disabled:bg-slate-100"
                        />

                        {formData.premium_extra_galeria.trim() ? (
                          <div className="mt-4 space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              {formData.premium_extra_galeria
                                .split(/\r?\n/)
                                .map((item) => item.trim())
                                .filter(Boolean)
                                .map((image, index) => (
                                  <div key={`${image}-${index}`} className="relative h-28 w-full overflow-hidden rounded-2xl">
                                    <OptimizedImage
                                      src={image}
                                      alt={`Foto extra ${index + 1}`}
                                      sizes="(max-width: 768px) 100vw, 50vw"
                                      className="object-cover"
                                    />
                                  </div>
                                ))}
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                setFormData((prev) => ({
                                  ...prev,
                                  premium_extra_galeria: "",
                                }))
                              }
                              className="text-sm font-medium text-red-600 transition hover:text-red-500"
                            >
                              Limpiar fotos extra
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
                <label className="flex items-center gap-3 text-sm text-emerald-800">
                  <input
                    type="checkbox"
                    checked={formData.premium_cursos_activo ?? false}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        premium_cursos_activo: e.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Mostrar cursos relacionados en el perfil premium</span>
                </label>

                <div className="mt-4">
                  <label className="mb-2 block text-sm font-medium text-slate-900">
                    Titulo del bloque de cursos
                  </label>
                  <input
                    type="text"
                    value={formData.premium_cursos_titulo || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        premium_cursos_titulo: e.target.value,
                      }))
                    }
                    placeholder="Cursos de esta institución"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-emerald-500"
                  />
                  <p className="mt-2 text-xs text-slate-500">
                    Si lo dejas vacio, se usa el titulo por defecto.
                  </p>
                </div>
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
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-cyan-500"
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
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-cyan-500"
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
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-cyan-500"
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
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition file:mr-4 file:rounded-lg file:border-0 file:bg-cyan-50 file:px-4 file:py-2 file:font-medium file:text-cyan-700 hover:file:bg-cyan-100"
                />
                {formData.foto && (
                  <div className="mt-4 space-y-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={formData.foto}
                      alt="Vista previa de la institución"
                      className="h-40 w-full rounded-2xl object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setFotoTouched(true)
                        setFormData((prev) => ({ ...prev, foto: "" }))
                      }}
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
                  className="flex-1 rounded-xl bg-cyan-600 py-3 font-medium text-white transition hover:bg-cyan-500 disabled:opacity-60"
                >
                  {loading
                    ? "Guardando..."
                    : editingInstitucion
                      ? "Guardar cambios"
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

      <div className="space-y-3 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        {instituciones.map((institucion) => (
          <div
            key={institucion.id}
            className="flex min-w-[980px] items-center gap-4 rounded-xl border border-slate-100 bg-white p-3 transition hover:bg-slate-50"
          >
            {institucion.foto ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={institucion.foto}
                  alt={institucion.nombre}
                  className="h-14 w-20 shrink-0 rounded-xl border border-slate-100 object-cover"
                />
              </>
            ) : (
              <div className="flex h-14 w-20 shrink-0 items-center justify-center rounded-xl border border-slate-100 bg-slate-50">
                <Building2 className="h-5 w-5 text-slate-300" />
              </div>
            )}

            <div className="grid flex-1 grid-cols-[1.25fr_1.25fr_0.75fr_auto] items-center gap-4">
              <div className="min-w-0">
                <h3 className="truncate text-base font-semibold text-slate-900">{institucion.nombre}</h3>
                <p className="truncate text-xs text-slate-500">{institucion.descripcion || "Sin descripción"}</p>
              </div>
              <div className="min-w-0 text-sm text-slate-600">
                <div className="truncate">{institucion.direccion || "Sin dirección"}</div>
                <div className="truncate text-xs text-slate-400">{institucion.telefono || "Sin teléfono"}</div>
              </div>
              <div>
                <div
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    institucion.estado === "borrador"
                      ? "bg-amber-100 text-amber-700"
                      : institucion.estado === "oculto"
                        ? "bg-slate-200 text-slate-700"
                        : "bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {institucion.estado === "borrador"
                    ? "borrador"
                    : institucion.estado === "oculto"
                      ? "oculto"
                      : "visible"}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2">
                {institucion.premium_activo ? (
                  <span className="mr-auto inline-flex rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">
                    Premium
                  </span>
                ) : null}
                {institucion.destacado ? (
                  <span className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                    Destacado
                  </span>
                ) : null}
                {institucion.premium_cursos_activo ? (
                  <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                    Cursos en premium
                  </span>
                ) : null}
                <button
                  onClick={() => toggleVisibility(institucion)}
                  className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100"
                  title={
                    institucion.estado === "borrador"
                      ? "Publicar borrador"
                      : institucion.estado === "oculto"
                        ? "Mostrar"
                        : "Ocultar"
                  }
                >
                  {institucion.estado === "oculto" ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4" />
                  )}
                </button>

                {featuredSchemaReady ? (
                  <button
                    onClick={() => toggleFeatured(institucion)}
                    className={`rounded-lg p-2 transition ${
                      institucion.destacado
                        ? "bg-amber-50 text-amber-700"
                        : "text-slate-500 hover:bg-slate-100"
                    }`}
                    title="Destacar"
                  >
                    <Star className={`h-4 w-4 ${institucion.destacado ? "fill-current" : ""}`} />
                  </button>
                ) : null}

                <button
                  onClick={() => void handleEdit(institucion)}
                  className="rounded-lg p-2 text-cyan-600 transition hover:bg-cyan-50"
                  title="Editar"
                >
                  <Pencil className="h-4 w-4" />
                </button>

                <MoveCategoryButton
                  sourceType="institucion"
                  sourceId={institucion.id}
                  name={institucion.nombre}
                  onMoved={cargarInstituciones}
                />

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
            Comenza agregando la primera institución
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
