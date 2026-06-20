'use client'

import { useCallback, useEffect, useState } from "react"
import {
  CalendarClock,
  FileText,
  ImageIcon,
  Megaphone,
  Pencil,
  QrCode,
  Save,
  Star,
  Trash2,
} from "lucide-react"
import { OptimizedImage } from "../../components/OptimizedImage"
import { supabase } from "../../supabase"
import { fileToDataUrl } from "../../lib/fileToDataUrl"

const PUBLIC_SITE_URL = "https://www.holavarela.uy"
const PUBLIC_SITE_QR_URL = `https://api.qrserver.com/v1/create-qr-code/?size=1200x1200&data=${encodeURIComponent(
  PUBLIC_SITE_URL
)}`

type SitioForm = {
  titulo: string
  texto_1: string
  texto_2: string
  texto_3: string
  imagen_url: string
  mostrar_juegos_home: boolean
  mostrar_ranking_juego_home: boolean
}

type PopupInicioForm = {
  activo: boolean
  titulo: string
  descripcion: string
  visible_desde: string
  visible_hasta: string
}

type HighlightEntityType = "comercio" | "servicio" | "institucion"

type HomeHighlightForm = {
  id: number | null
  imagen_url: string
  entityKey: string
  activo: boolean
  delay_seconds: number
}

type HomeHighlight = {
  id: number
  imagen_url: string
  entidad_tipo: HighlightEntityType
  entidad_id: number
  activo: boolean
  delay_seconds: number
  created_at?: string | null
  updated_at?: string | null
}

type HomeHighlightOption = {
  key: string
  type: HighlightEntityType
  id: number
  label: string
}

type SitioConfigRow = {
  titulo?: string | null
  texto_1?: string | null
  texto_2?: string | null
  texto_3?: string | null
  imagen_url?: string | null
  mostrar_juegos_home?: boolean | null
  mostrar_ranking_juego_home?: boolean | null
  burbuja_home_activa?: boolean | null
  burbuja_home_titulo?: string | null
  burbuja_home_texto?: string | null
  burbuja_home_visible_desde?: string | null
  burbuja_home_visible_hasta?: string | null
}

const initialForm: SitioForm = {
  titulo: "José Pedro Varela",
  texto_1:
    "José Pedro Varela es una ciudad del departamento de Lavalleja, Uruguay. Conocida por su rica historia y su comunidad vibrante, es un importante centro agropecuario de la región.",
  texto_2:
    "La ciudad cuenta con todos los servicios esenciales y una amplia variedad de comercios locales que sirven a la comunidad y sus alrededores.",
  texto_3:
    "Cartelera online de José Pedro Varela: encontrá acá eventos, cursos, clases, servicios y más.",
  imagen_url: "",
  mostrar_juegos_home: true,
  mostrar_ranking_juego_home: false,
}

const initialPopupForm: PopupInicioForm = {
  activo: false,
  titulo: "Como participar",
  descripcion: "Te contamos como participar en las propuestas de Hola Varela.",
  visible_desde: "",
  visible_hasta: "",
}

const initialHighlightForm: HomeHighlightForm = {
  id: null,
  imagen_url: "",
  entityKey: "",
  activo: true,
  delay_seconds: 12,
}

function toDateTimeLocal(value?: string | null) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""

  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return offsetDate.toISOString().slice(0, 16)
}

function fromDateTimeLocal(value: string) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

export default function AdminSitioPage() {
  const [formData, setFormData] = useState<SitioForm>(initialForm)
  const [popupData, setPopupData] = useState<PopupInicioForm>(initialPopupForm)
  const [loading, setLoading] = useState(false)
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [saveMessage, setSaveMessage] = useState("")
  const [saveError, setSaveError] = useState("")
  const [popupSchemaReady, setPopupSchemaReady] = useState(true)
  const [highlightForm, setHighlightForm] =
    useState<HomeHighlightForm>(initialHighlightForm)
  const [highlights, setHighlights] = useState<HomeHighlight[]>([])
  const [highlightOptions, setHighlightOptions] = useState<HomeHighlightOption[]>([])
  const [highlightLoading, setHighlightLoading] = useState(false)
  const [highlightMessage, setHighlightMessage] = useState("")
  const [highlightError, setHighlightError] = useState("")

  const loadHighlights = useCallback(async () => {
    const response = await fetch("/api/admin/destacados", {
      method: "GET",
      cache: "no-store",
    })
    const result = (await response.json().catch(() => null)) as
      | {
          error?: string
          highlights?: HomeHighlight[]
          options?: HomeHighlightOption[]
        }
      | null

    if (!response.ok || result?.error) {
      setHighlightError(result?.error || "No se pudieron cargar los destacados.")
      return
    }

    setHighlights(result?.highlights || [])
    setHighlightOptions(result?.options || [])
  }, [])

  useEffect(() => {
    const cargarConfiguracion = async () => {
      const result = await supabase
        .from("sitio")
        .select("titulo, texto_1, texto_2, texto_3, imagen_url, mostrar_juegos_home, mostrar_ranking_juego_home, burbuja_home_activa, burbuja_home_titulo, burbuja_home_texto, burbuja_home_visible_desde, burbuja_home_visible_hasta")
        .eq("id", 1)
        .maybeSingle()
      const { data, error } =
        result.error?.code === "42703"
          ? await supabase
              .from("sitio")
              .select("titulo, texto_1, texto_2, texto_3, imagen_url")
              .eq("id", 1)
              .maybeSingle()
          : result

      if (!error && data) {
        const siteData = data as SitioConfigRow

        setFormData({
          titulo: siteData.titulo || initialForm.titulo,
          texto_1: siteData.texto_1 || initialForm.texto_1,
          texto_2: siteData.texto_2 || initialForm.texto_2,
          texto_3: siteData.texto_3 || initialForm.texto_3,
          imagen_url: siteData.imagen_url || "",
          mostrar_juegos_home:
            "mostrar_juegos_home" in siteData
              ? siteData.mostrar_juegos_home !== false
              : true,
          mostrar_ranking_juego_home:
            "mostrar_ranking_juego_home" in siteData
              ? siteData.mostrar_ranking_juego_home === true
              : false,
        })

        if ("burbuja_home_activa" in siteData) {
          setPopupData({
            activo: siteData.burbuja_home_activa === true,
            titulo: siteData.burbuja_home_titulo || initialPopupForm.titulo,
            descripcion: siteData.burbuja_home_texto || initialPopupForm.descripcion,
            visible_desde: toDateTimeLocal(siteData.burbuja_home_visible_desde),
            visible_hasta: toDateTimeLocal(siteData.burbuja_home_visible_hasta),
          })
        } else {
          setPopupSchemaReady(false)
        }
      }

      setIsInitialLoading(false)
    }

    void cargarConfiguracion()
  }, [])

  useEffect(() => {
    void loadHighlights()
  }, [loadHighlights])

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

  const handleHighlightImageChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const imageDataUrl = await fileToDataUrl(file)
      setHighlightForm((prev) => ({ ...prev, imagen_url: imageDataUrl }))
      setHighlightError("")
    } catch (error) {
      setHighlightError(
        error instanceof Error ? error.message : "No se pudo cargar la imagen."
      )
    }
  }

  const resetHighlightForm = () => {
    setHighlightForm(initialHighlightForm)
    setHighlightError("")
    setHighlightMessage("")
  }

  const handleEditHighlight = (highlight: HomeHighlight) => {
    setHighlightForm({
      id: highlight.id,
      imagen_url: highlight.imagen_url,
      entityKey: `${highlight.entidad_tipo}:${highlight.entidad_id}`,
      activo: highlight.activo,
      delay_seconds: highlight.delay_seconds || initialHighlightForm.delay_seconds,
    })
    setHighlightError("")
    setHighlightMessage("")
  }

  const handleHighlightSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setHighlightLoading(true)
    setHighlightMessage("")
    setHighlightError("")

    const [entityType, rawEntityId] = highlightForm.entityKey.split(":")
    const response = await fetch("/api/admin/destacados", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "save",
        id: highlightForm.id || undefined,
        payload: {
          imagen_url: highlightForm.imagen_url,
          entidad_tipo: entityType,
          entidad_id: Number(rawEntityId || 0),
          activo: highlightForm.activo,
          delay_seconds: highlightForm.delay_seconds,
        },
      }),
    })
    const result = (await response.json().catch(() => null)) as
      | { error?: string }
      | null

    if (!response.ok || result?.error) {
      setHighlightError(result?.error || "No se pudo guardar el destacado.")
      setHighlightLoading(false)
      return
    }

    await loadHighlights()
    setHighlightForm(initialHighlightForm)
    setHighlightMessage("Destacado guardado correctamente.")
    setHighlightLoading(false)
  }

  const handleToggleHighlight = async (highlight: HomeHighlight) => {
    setHighlightLoading(true)
    setHighlightError("")
    setHighlightMessage("")

    const response = await fetch("/api/admin/destacados", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle_active", id: highlight.id }),
    })
    const result = (await response.json().catch(() => null)) as
      | { error?: string }
      | null

    if (!response.ok || result?.error) {
      setHighlightError(result?.error || "No se pudo cambiar el estado.")
      setHighlightLoading(false)
      return
    }

    await loadHighlights()
    setHighlightMessage(
      highlight.activo ? "Destacado desactivado." : "Destacado activado."
    )
    setHighlightLoading(false)
  }

  const handleDeleteHighlight = async (highlight: HomeHighlight) => {
    if (!window.confirm("Eliminar este destacado?")) return

    setHighlightLoading(true)
    setHighlightError("")
    setHighlightMessage("")

    const response = await fetch("/api/admin/destacados", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id: highlight.id }),
    })
    const result = (await response.json().catch(() => null)) as
      | { error?: string }
      | null

    if (!response.ok || result?.error) {
      setHighlightError(result?.error || "No se pudo eliminar el destacado.")
      setHighlightLoading(false)
      return
    }

    await loadHighlights()
    if (highlightForm.id === highlight.id) {
      setHighlightForm(initialHighlightForm)
    }
    setHighlightMessage("Destacado eliminado.")
    setHighlightLoading(false)
  }

  const handleDownloadSiteQr = () => {
    if (typeof window === "undefined") return

    const link = window.document.createElement("a")
    link.href = PUBLIC_SITE_QR_URL
    link.download = "qr-hola-varela-web.png"
    link.target = "_blank"
    link.rel = "noopener noreferrer"
    link.click()
    setSaveError("")
    setSaveMessage("Se abrio el QR de www.holavarela.uy para descargar.")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setSaveMessage("")
    setSaveError("")

    const sitioPayload = {
      titulo: formData.titulo,
      texto_1: formData.texto_1,
      texto_2: formData.texto_2,
      texto_3: formData.texto_3,
      imagen_url: formData.imagen_url || null,
      mostrar_juegos_home: formData.mostrar_juegos_home,
      mostrar_ranking_juego_home: formData.mostrar_ranking_juego_home,
      burbuja_home_activa: popupData.activo,
      burbuja_home_titulo: popupData.titulo.trim() || initialPopupForm.titulo,
      burbuja_home_texto: popupData.descripcion.trim(),
      burbuja_home_visible_desde: fromDateTimeLocal(popupData.visible_desde),
      burbuja_home_visible_hasta: fromDateTimeLocal(popupData.visible_hasta),
    }
    let savedHomeGamesVisibility = true
    let savedPopupSettings = true

    const siteResponse = await fetch("/api/admin/sitio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "save", payload: sitioPayload }),
    })
    const siteResult = (await siteResponse.json().catch(() => null)) as {
      error?: string
      savedHomeGamesVisibility?: boolean
      savedHomeBubbleSettings?: boolean
    } | null

    if (!siteResponse.ok || siteResult?.error) {
      setSaveError(
        `No se pudo guardar la configuracion: ${
          siteResult?.error || "intentalo nuevamente."
        }`
      )
      setLoading(false)
      return
    }

    savedHomeGamesVisibility = siteResult?.savedHomeGamesVisibility !== false
    savedPopupSettings = siteResult?.savedHomeBubbleSettings !== false
    setPopupSchemaReady(savedPopupSettings)

    const pendingMessages = [
      !savedHomeGamesVisibility
        ? "Para mostrar u ocultar juegos y ranking falta aplicar las columnas nuevas de sitio en Supabase."
        : "",
      !savedPopupSettings
        ? "Para programar la burbuja falta aplicar las columnas nuevas burbuja_home_* en Supabase."
        : "",
    ].filter(Boolean)

    setSaveMessage(
      pendingMessages.length
        ? `Cambios guardados parcialmente. ${pendingMessages.join(" ")}`
        : "Cambios guardados correctamente."
    )
    setLoading(false)
  }

  const getHighlightLabel = (highlight: HomeHighlight) =>
    highlightOptions.find(
      (option) => option.key === `${highlight.entidad_tipo}:${highlight.entidad_id}`
    )?.label || `${highlight.entidad_tipo}:${highlight.entidad_id}`

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
          Edita el bloque sobre José Pedro Varela que aparece en la home.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
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
              {saveError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {saveError}
                </div>
              ) : null}

              {saveMessage ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {saveMessage}
                </div>
              ) : null}

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
                  Selecciona la imagen que quieres mostrar en la home.
                </p>
                {formData.imagen_url ? (
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({ ...prev, imagen_url: "" }))
                    }
                    className="mt-3 text-sm font-medium text-red-600 transition hover:text-red-500"
                  >
                    Quitar foto
                  </button>
                ) : null}
              </div>

              <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <span>
                  <span className="block text-sm font-medium text-slate-900">
                    Mostrar juegos en la Home
                  </span>
                  <span className="mt-1 block text-sm text-slate-500">
                    Apagalo para sacar el bloque de Desafio Hola Varela de la pagina inicial.
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={formData.mostrar_juegos_home}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      mostrar_juegos_home: e.target.checked,
                    }))
                  }
                  className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
              </label>

              <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <span>
                  <span className="block text-sm font-medium text-slate-900">
                    Mostrar top 3 del juego en la Home
                  </span>
                  <span className="mt-1 block text-sm text-slate-500">
                    Prendelo para destacar los tres mejores puntajes del desafio activo.
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={formData.mostrar_ranking_juego_home}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      mostrar_ranking_juego_home: e.target.checked,
                    }))
                  }
                  className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
              </label>

              <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4">
                <div className="mb-4 flex items-center gap-3">
                  <div className="rounded-xl bg-amber-500 p-3 text-white">
                    <CalendarClock className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-950">
                      Burbuja de inicio
                    </h3>
                    <p className="text-sm text-slate-600">
                      Programa cuándo aparece en la Home y qué texto muestra.
                    </p>
                  </div>
                </div>

                {!popupSchemaReady ? (
                  <div className="mb-4 rounded-xl border border-amber-200 bg-white px-4 py-3 text-sm text-amber-800">
                    Falta aplicar las columnas nuevas en Supabase para guardar la burbuja informativa de la Home.
                  </div>
                ) : null}

                <div className="space-y-4">
                  <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-amber-100 bg-white px-4 py-3">
                    <span>
                      <span className="block text-sm font-medium text-slate-900">
                        Activar burbuja informativa en la Home
                      </span>
                      <span className="mt-1 block text-sm text-slate-500">
                        Si está apagada, no aparece aunque tenga fechas cargadas.
                      </span>
                    </span>
                    <input
                      type="checkbox"
                      checked={popupData.activo}
                      onChange={(e) =>
                        setPopupData((prev) => ({
                          ...prev,
                          activo: e.target.checked,
                        }))
                      }
                      className="h-5 w-5 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                    />
                  </label>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-900">
                      Título de la burbuja
                    </label>
                    <input
                      type="text"
                      value={popupData.titulo}
                      onChange={(e) =>
                        setPopupData((prev) => ({ ...prev, titulo: e.target.value }))
                      }
                      className="w-full rounded-xl border border-amber-100 bg-white px-4 py-3 outline-none transition focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-900">
                      Texto de la burbuja
                    </label>
                    <textarea
                      value={popupData.descripcion}
                      onChange={(e) =>
                        setPopupData((prev) => ({
                          ...prev,
                          descripcion: e.target.value,
                        }))
                      }
                      className="h-28 w-full resize-none rounded-xl border border-amber-100 bg-white px-4 py-3 outline-none transition focus:border-amber-500"
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-900">
                        Mostrar desde
                      </label>
                      <input
                        type="datetime-local"
                        value={popupData.visible_desde}
                        onChange={(e) =>
                          setPopupData((prev) => ({
                            ...prev,
                            visible_desde: e.target.value,
                          }))
                        }
                        className="w-full rounded-xl border border-amber-100 bg-white px-4 py-3 outline-none transition focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-900">
                        Mostrar hasta
                      </label>
                      <input
                        type="datetime-local"
                        value={popupData.visible_hasta}
                        onChange={(e) =>
                          setPopupData((prev) => ({
                            ...prev,
                            visible_hasta: e.target.value,
                          }))
                        }
                        className="w-full rounded-xl border border-amber-100 bg-white px-4 py-3 outline-none transition focus:border-amber-500"
                      />
                    </div>
                  </div>
                </div>
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

          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-xl bg-amber-500 p-3 text-white">
                <Megaphone className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  Publicidad destacada
                </h2>
                <p className="text-sm text-slate-500">
                  Carga una imagen y relacionala internamente con una ficha existente.
                </p>
              </div>
            </div>

            {highlightError ? (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {highlightError}
              </div>
            ) : null}

            {highlightMessage ? (
              <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {highlightMessage}
              </div>
            ) : null}

            <form onSubmit={handleHighlightSubmit} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-900">
                  Imagen del destacado
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleHighlightImageChange}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition file:mr-4 file:rounded-lg file:border-0 file:bg-amber-50 file:px-4 file:py-2 file:font-medium file:text-amber-700 hover:file:bg-amber-100"
                />
                {highlightForm.imagen_url ? (
                  <div className="relative mt-3 h-56 w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                    <OptimizedImage
                      src={highlightForm.imagen_url}
                      alt="Vista previa del destacado"
                      sizes="100vw"
                      className="object-contain"
                    />
                  </div>
                ) : (
                  <div className="mt-3 flex h-40 w-full items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">
                    Sin imagen para el destacado
                  </div>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-900">
                  Ficha relacionada
                </label>
                <select
                  value={highlightForm.entityKey}
                  onChange={(e) =>
                    setHighlightForm((prev) => ({
                      ...prev,
                      entityKey: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-amber-500"
                  required
                >
                  <option value="">Seleccionar institucion, servicio o comercio</option>
                  {highlightOptions.map((option) => (
                    <option key={option.key} value={option.key}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-900">
                    Espera en segundos
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={180}
                    value={highlightForm.delay_seconds}
                    onChange={(e) =>
                      setHighlightForm((prev) => ({
                        ...prev,
                        delay_seconds: Math.max(5, Number(e.target.value) || 5),
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-amber-500"
                  />
                </div>

                <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <span>
                    <span className="block text-sm font-medium text-slate-900">
                      Incluir en rotacion
                    </span>
                    <span className="mt-1 block text-sm text-slate-500">
                      Puede haber varios activos; la Home va alternando entre ellos.
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    checked={highlightForm.activo}
                    onChange={(e) =>
                      setHighlightForm((prev) => ({
                        ...prev,
                        activo: e.target.checked,
                      }))
                    }
                    className="h-5 w-5 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                  />
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={highlightLoading}
                  className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-3 font-medium text-white transition hover:bg-amber-400 disabled:opacity-60"
                >
                  <Save className="h-5 w-5" />
                  {highlightLoading
                    ? "Guardando..."
                    : highlightForm.id
                      ? "Guardar destacado"
                      : "Crear destacado"}
                </button>
                {highlightForm.id ? (
                  <button
                    type="button"
                    onClick={resetHighlightForm}
                    className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Cancelar edicion
                  </button>
                ) : null}
              </div>
            </form>

            <div className="mt-6 space-y-3">
              <h3 className="text-sm font-semibold uppercase text-slate-500">
                Destacados cargados
              </h3>
              <p className="text-sm text-slate-500">
                {highlights.filter((highlight) => highlight.activo).length} activos en rotacion.
              </p>
              {highlights.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                  Aun no hay publicidades destacadas cargadas.
                </div>
              ) : (
                highlights.map((highlight) => (
                  <div
                    key={highlight.id}
                    className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[120px_1fr]"
                  >
                    <div className="relative h-24 overflow-hidden rounded-xl bg-white">
                      <OptimizedImage
                        src={highlight.imagen_url}
                        alt={getHighlightLabel(highlight)}
                        sizes="120px"
                        className="object-contain"
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-slate-950">
                          {getHighlightLabel(highlight)}
                        </span>
                        {highlight.activo ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                            <Star className="h-3.5 w-3.5 fill-current" />
                            Activo
                          </span>
                        ) : (
                          <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600">
                            Inactivo
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-slate-500">
                        Aparece luego de {highlight.delay_seconds || 12} segundos.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleEditHighlight(highlight)}
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                        >
                          <Pencil className="h-4 w-4" />
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleHighlight(highlight)}
                          disabled={highlightLoading}
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
                        >
                          <Star
                            className={`h-4 w-4 ${
                              highlight.activo ? "fill-current text-emerald-600" : ""
                            }`}
                          />
                          {highlight.activo ? "Desactivar" : "Activar"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteHighlight(highlight)}
                          disabled={highlightLoading}
                          className="inline-flex items-center gap-2 rounded-xl border border-red-100 bg-white px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                        >
                          <Trash2 className="h-4 w-4" />
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <div>
          <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-xl bg-slate-900 p-3 text-white">
                <QrCode className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-900">QR del sitio</h2>
                <p className="text-sm text-slate-500">
                  Codigo para abrir la web publica.
                </p>
              </div>
            </div>

            <div className="break-all rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              {PUBLIC_SITE_URL}
            </div>

            <button
              type="button"
              onClick={handleDownloadSiteQr}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              <QrCode className="h-4 w-4" />
              Descargar QR
            </button>
          </div>

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
            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
              Juegos en Home: {formData.mostrar_juegos_home ? "visible" : "oculto"}
            </div>
            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
              Top 3 del juego: {formData.mostrar_ranking_juego_home ? "visible" : "oculto"}
            </div>
            <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-slate-700">
              <div className="font-semibold text-slate-900">
                Burbuja de inicio: {popupData.activo ? "activa" : "apagada"}
              </div>
              <div className="mt-2 font-semibold">{popupData.titulo}</div>
              <p className="mt-2 whitespace-pre-line leading-6">{popupData.descripcion}</p>
              <div className="mt-3 text-xs text-slate-500">
                Desde: {popupData.visible_desde || "sin fecha"} | Hasta: {popupData.visible_hasta || "sin fecha"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

