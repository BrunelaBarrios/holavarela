'use client'

import { useEffect, useMemo, useState } from "react"
import { FileText, ImageIcon, Save } from "lucide-react"
import { OptimizedImage } from "../../components/OptimizedImage"
import { supabase } from "../../supabase"
import { logAdminActivity } from "../../lib/adminActivity"
import { fileToDataUrl } from "../../lib/fileToDataUrl"
import { isMissingSweepstakesSchemaError } from "../../lib/sweepstakes"

type SitioForm = {
  titulo: string
  texto_1: string
  texto_2: string
  texto_3: string
  imagen_url: string
}

type SorteoPopupForm = {
  activo: boolean
  descripcion: string
  comercio1Id: string
  comercio2Id: string
}

type ComercioOption = {
  id: number
  nombre: string
  imagen: string | null
  imagen_url?: string | null
}

const initialForm: SitioForm = {
  titulo: "Jose Pedro Varela",
  texto_1:
    "Jose Pedro Varela es una ciudad del departamento de Lavalleja, Uruguay. Conocida por su rica historia y su comunidad vibrante, es un importante centro agropecuario de la region.",
  texto_2:
    "La ciudad cuenta con todos los servicios esenciales y una amplia variedad de comercios locales que sirven a la comunidad y sus alrededores.",
  texto_3:
    "Cartelera online de Jose Pedro Varela: encontra aca eventos, cursos, clases, servicios y mas.",
  imagen_url: "",
}

const initialSorteoForm: SorteoPopupForm = {
  activo: false,
  descripcion: "",
  comercio1Id: "",
  comercio2Id: "",
}

export default function AdminSitioPage() {
  const [formData, setFormData] = useState<SitioForm>(initialForm)
  const [sorteoForm, setSorteoForm] = useState<SorteoPopupForm>(initialSorteoForm)
  const [comercios, setComercios] = useState<ComercioOption[]>([])
  const [loading, setLoading] = useState(false)
  const [savingSorteo, setSavingSorteo] = useState(false)
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [saveMessage, setSaveMessage] = useState("")
  const [saveError, setSaveError] = useState("")
  const [sorteoSaveMessage, setSorteoSaveMessage] = useState("")
  const [sorteoSaveError, setSorteoSaveError] = useState("")
  const [sorteoSchemaReady, setSorteoSchemaReady] = useState(true)
  const [sorteoEntriesCount, setSorteoEntriesCount] = useState<number | null>(null)

  const selectedSorteoComercios = useMemo(() => {
    const ids = Array.from(
      new Set([sorteoForm.comercio1Id, sorteoForm.comercio2Id].filter(Boolean))
    )
    const byId = new Map(comercios.map((comercio) => [String(comercio.id), comercio]))
    return ids
      .map((id) => byId.get(id))
      .filter((value): value is ComercioOption => Boolean(value))
  }, [comercios, sorteoForm.comercio1Id, sorteoForm.comercio2Id])

  useEffect(() => {
    const cargarConfiguracion = async () => {
      const [
        { data, error },
        { data: configData, error: configError },
        { data: comerciosData, error: comerciosError },
        { count: entriesCount, error: entriesError },
      ] = await Promise.all([
        supabase
          .from("sitio")
          .select("titulo, texto_1, texto_2, texto_3, imagen_url")
          .eq("id", 1)
          .maybeSingle(),
        supabase
          .from("sorteo_popup_config")
          .select("activo, descripcion, comercio_id_1, comercio_id_2")
          .eq("id", 1)
          .maybeSingle(),
        supabase
          .from("comercios")
          .select("id, nombre, imagen, imagen_url")
          .or("estado.is.null,estado.eq.activo")
          .order("nombre", { ascending: true }),
        supabase
          .from("sorteo_participaciones")
          .select("*", { count: "exact", head: true }),
      ])

      if (!error && data) {
        setFormData({
          titulo: data.titulo || initialForm.titulo,
          texto_1: data.texto_1 || initialForm.texto_1,
          texto_2: data.texto_2 || initialForm.texto_2,
          texto_3: data.texto_3 || initialForm.texto_3,
          imagen_url: data.imagen_url || "",
        })
      }

      if (!comerciosError) {
        setComercios((comerciosData || []) as ComercioOption[])
      }

      if (configError) {
        if (isMissingSweepstakesSchemaError(configError)) {
          setSorteoSchemaReady(false)
        } else {
          setSorteoSaveError(`No se pudo cargar el popup del sorteo: ${configError.message}`)
        }
      } else if (configData) {
        setSorteoForm({
          activo: Boolean(configData.activo),
          descripcion: configData.descripcion || "",
          comercio1Id: configData.comercio_id_1 ? String(configData.comercio_id_1) : "",
          comercio2Id: configData.comercio_id_2 ? String(configData.comercio_id_2) : "",
        })
      }

      if (entriesError) {
        if (isMissingSweepstakesSchemaError(entriesError)) {
          setSorteoSchemaReady(false)
        }
      } else {
        setSorteoEntriesCount(entriesCount || 0)
      }

      setIsInitialLoading(false)
    }

    cargarConfiguracion()
  }, [])

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const imageDataUrl = await fileToDataUrl(file)
      setFormData((prev) => ({ ...prev, imagen_url: imageDataUrl }))
      setSaveError("")
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "No se pudo cargar la imagen."
      )
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setSaveMessage("")
    setSaveError("")

    const { error } = await supabase.from("sitio").upsert({
      id: 1,
      titulo: formData.titulo,
      texto_1: formData.texto_1,
      texto_2: formData.texto_2,
      texto_3: formData.texto_3,
      imagen_url: formData.imagen_url || null,
    })

    if (error) {
      setSaveError(`No se pudo guardar la configuracion: ${error.message}`)
      setLoading(false)
      return
    }

    await logAdminActivity({
      action: "Editar",
      section: "Sitio",
      target: "Contenido principal",
      details: "Actualizo textos o imagen del bloque institucional.",
    })

    setSaveMessage("Cambios guardados correctamente.")
    setLoading(false)
  }

  const handleSorteoSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingSorteo(true)
    setSorteoSaveMessage("")
    setSorteoSaveError("")

    if (!sorteoSchemaReady) {
      setSorteoSaveError("Primero necesitas correr el SQL del sorteo en Supabase para activar este bloque.")
      setSavingSorteo(false)
      return
    }

    const comercio1Id = sorteoForm.comercio1Id ? Number(sorteoForm.comercio1Id) : null
    const comercio2Id =
      sorteoForm.comercio2Id && sorteoForm.comercio2Id !== sorteoForm.comercio1Id
        ? Number(sorteoForm.comercio2Id)
        : null

    const { error } = await supabase.from("sorteo_popup_config").upsert({
      id: 1,
      activo: sorteoForm.activo,
      descripcion: sorteoForm.descripcion.trim(),
      comercio_id_1: comercio1Id,
      comercio_id_2: comercio2Id,
    })

    if (error) {
      setSorteoSaveError(`No se pudo guardar el popup del sorteo: ${error.message}`)
      setSavingSorteo(false)
      return
    }

    await logAdminActivity({
      action: "Editar",
      section: "Sitio",
      target: "Popup del sorteo",
      details: "Actualizó la descripción del popup y los comercios participantes.",
    })

    setSorteoSaveMessage("Popup del sorteo guardado correctamente.")
    setSavingSorteo(false)
  }

  if (isInitialLoading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-600 shadow-sm">
        Cargando configuracion del sitio...
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-semibold text-slate-900">
          Contenido del Sitio
        </h1>
        <p className="text-slate-500">
          Edita el bloque sobre Jose Pedro Varela que aparece en la home.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-xl bg-blue-600 p-3 text-white">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                Sobre Varela
              </h2>
              <p className="text-sm text-slate-500">
                Cambia el texto y la imagen del bloque institucional.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {saveError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {saveError}
              </div>
            )}

            {saveMessage && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {saveMessage}
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-900">
                Titulo
              </label>
              <input
                type="text"
                value={formData.titulo}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, titulo: e.target.value }))
                }
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-900">
                Primer parrafo
              </label>
              <textarea
                value={formData.texto_1}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, texto_1: e.target.value }))
                }
                className="h-28 w-full resize-none rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-900">
                Segundo parrafo
              </label>
              <textarea
                value={formData.texto_2}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, texto_2: e.target.value }))
                }
                className="h-28 w-full resize-none rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-900">
                Tercer parrafo
              </label>
              <textarea
                value={formData.texto_3}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, texto_3: e.target.value }))
                }
                className="h-28 w-full resize-none rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-900">
                Foto desde tu computadora
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:font-medium file:text-blue-600 hover:file:bg-blue-100"
              />
              <p className="mt-2 text-sm text-slate-500">
                Selecciona la imagen que queres mostrar en la home.
              </p>
              {formData.imagen_url && (
                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({ ...prev, imagen_url: "" }))
                  }
                  className="mt-3 text-sm font-medium text-red-600 transition hover:text-red-500"
                >
                  Quitar foto
                </button>
              )}
            </div>
          </div>

            <div className="mt-6">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-medium text-white transition hover:bg-blue-500 disabled:opacity-60"
              >
                <Save className="h-5 w-5" />
                {loading ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </form>

          <form
            onSubmit={handleSorteoSubmit}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-xl bg-emerald-600 p-3 text-white">
                <ImageIcon className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  Popup del sorteo
                </h2>
                <p className="text-sm text-slate-500">
                  Se muestra cuando una persona suma 3 corazones en eventos.
                </p>
              </div>
            </div>

            {!sorteoSchemaReady ? (
              <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Este bloque necesita que corras el SQL nuevo del sorteo en Supabase.
              </div>
            ) : null}

            <div className="space-y-4">
              {sorteoSaveError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {sorteoSaveError}
                </div>
              ) : null}

              {sorteoSaveMessage ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {sorteoSaveMessage}
                </div>
              ) : null}

              <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={sorteoForm.activo}
                  onChange={(event) =>
                    setSorteoForm((prev) => ({ ...prev, activo: event.target.checked }))
                  }
                  className="h-4 w-4 border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span>Activar popup del sorteo</span>
              </label>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-900">
                  Descripción del popup
                </label>
                <textarea
                  value={sorteoForm.descripcion}
                  onChange={(event) =>
                    setSorteoForm((prev) => ({ ...prev, descripcion: event.target.value }))
                  }
                  className="h-32 w-full resize-none rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-emerald-500"
                  placeholder="Ejemplo: Participá del sorteo de Hola Varela completando tu nombre y teléfono. Estos comercios son parte de la propuesta."
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-900">
                    Comercio participante 1
                  </label>
                  <select
                    value={sorteoForm.comercio1Id}
                    onChange={(event) =>
                      setSorteoForm((prev) => ({ ...prev, comercio1Id: event.target.value }))
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-emerald-500"
                  >
                    <option value="">Sin seleccionar</option>
                    {comercios.map((comercio) => (
                      <option key={`sorteo-comercio-1-${comercio.id}`} value={comercio.id}>
                        {comercio.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-900">
                    Comercio participante 2
                  </label>
                  <select
                    value={sorteoForm.comercio2Id}
                    onChange={(event) =>
                      setSorteoForm((prev) => ({ ...prev, comercio2Id: event.target.value }))
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-emerald-500"
                  >
                    <option value="">Sin seleccionar</option>
                    {comercios.map((comercio) => (
                      <option key={`sorteo-comercio-2-${comercio.id}`} value={comercio.id}>
                        {comercio.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Participaciones registradas:{" "}
                <span className="font-semibold text-slate-900">
                  {sorteoEntriesCount ?? 0}
                </span>
              </div>
            </div>

            <div className="mt-6">
              <button
                type="submit"
                disabled={savingSorteo}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 font-medium text-white transition hover:bg-emerald-500 disabled:opacity-60"
              >
                <Save className="h-5 w-5" />
                {savingSorteo ? "Guardando..." : "Guardar popup"}
              </button>
            </div>
          </form>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-xl bg-slate-900 p-3 text-white">
              <ImageIcon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Vista previa</h2>
              <p className="text-sm text-slate-500">
                Asi se vera el bloque en la home.
              </p>
            </div>
          </div>

          {formData.imagen_url ? (
            <div className="relative mb-5 h-64 w-full overflow-hidden rounded-2xl">
              <OptimizedImage
                src={formData.imagen_url}
                alt={formData.titulo}
                sizes="100vw"
                className="object-cover"
              />
            </div>
          ) : (
            <div className="mb-5 flex h-64 w-full items-center justify-center rounded-2xl bg-slate-100 text-center text-slate-500">
              Sin foto cargada
            </div>
          )}

          <h3 className="text-2xl font-semibold text-slate-900">{formData.titulo}</h3>
          <div className="mt-4 space-y-4 text-sm leading-7 text-slate-500">
            <p>{formData.texto_1}</p>
            <p>{formData.texto_2}</p>
            <p>{formData.texto_3}</p>
          </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-xl bg-emerald-600 p-3 text-white">
                <ImageIcon className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Vista previa del popup</h2>
                <p className="text-sm text-slate-500">
                  Así se verá cuando alguien llegue al tercer corazón.
                </p>
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,#d7f0db_0%,#e9f7ef_35%,#edf5ff_100%)] p-5">
              <div className="inline-flex rounded-full bg-white/85 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                Sorteo Hola Varela
              </div>
              <h3 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">
                Participá con tus corazones
              </h3>
              <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-700">
                {sorteoForm.descripcion || "Todavía no agregaste una descripción para el popup del sorteo."}
              </p>

              {selectedSorteoComercios.length ? (
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  {selectedSorteoComercios.map((comercio) => {
                    const imageSrc = comercio.imagen_url || comercio.imagen || null

                    return (
                      <div
                        key={`preview-sorteo-${comercio.id}`}
                        className="overflow-hidden rounded-[24px] border border-white/80 bg-white/90 shadow-sm"
                      >
                        <div className="relative h-32 w-full bg-slate-100">
                          {imageSrc ? (
                            <OptimizedImage
                              src={imageSrc}
                              alt={comercio.nombre}
                              sizes="(max-width: 768px) 100vw, 25vw"
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-sm text-slate-400">
                              Sin foto
                            </div>
                          )}
                        </div>
                        <div className="p-4 text-sm font-semibold text-slate-900">
                          {comercio.nombre}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-white/80 px-4 py-6 text-center text-sm text-slate-500">
                  Selecciona uno o dos comercios para mostrarlos dentro del popup.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
