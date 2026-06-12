'use client'

import { useEffect, useState } from "react"
import { CalendarClock, FileText, ImageIcon, QrCode, Save } from "lucide-react"
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
  id: number | null
  activo: boolean
  titulo: string
  descripcion: string
  boton_texto: string
  visible_desde: string
  visible_hasta: string
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
  id: null,
  activo: false,
  titulo: "Como participar",
  descripcion: "Te contamos como participar del sorteo de Hola Varela.",
  boton_texto: "Entendido",
  visible_desde: "",
  visible_hasta: "",
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

  useEffect(() => {
    const cargarConfiguracion = async () => {
      const [result, popupResult] = await Promise.all([
        supabase
          .from("sitio")
          .select("titulo, texto_1, texto_2, texto_3, imagen_url, mostrar_juegos_home, mostrar_ranking_juego_home")
          .eq("id", 1)
          .maybeSingle(),
        supabase
          .from("sorteo_popup_config")
          .select("id, titulo, activo, mostrar_popup_home, descripcion, boton_texto, visible_desde, visible_hasta, updated_at")
          .order("activo", { ascending: false })
          .order("updated_at", { ascending: false })
          .limit(1),
      ])
      const { data, error } =
        result.error?.code === "42703"
          ? await supabase
              .from("sitio")
              .select("titulo, texto_1, texto_2, texto_3, imagen_url")
              .eq("id", 1)
              .maybeSingle()
          : result

      if (!error && data) {
        setFormData({
          titulo: data.titulo || initialForm.titulo,
          texto_1: data.texto_1 || initialForm.texto_1,
          texto_2: data.texto_2 || initialForm.texto_2,
          texto_3: data.texto_3 || initialForm.texto_3,
          imagen_url: data.imagen_url || "",
          mostrar_juegos_home:
            "mostrar_juegos_home" in data ? data.mostrar_juegos_home !== false : true,
          mostrar_ranking_juego_home:
            "mostrar_ranking_juego_home" in data
              ? data.mostrar_ranking_juego_home === true
              : false,
        })
      }

      if (popupResult.error?.code === "42P01") {
        setPopupSchemaReady(false)
      } else if (popupResult.error?.code === "42703") {
        setPopupSchemaReady(false)
        const legacyPopupResult = await supabase
          .from("sorteo_popup_config")
          .select("id, titulo, activo, descripcion, updated_at")
          .order("activo", { ascending: false })
          .order("updated_at", { ascending: false })
          .limit(1)

        const legacyPopup = ((legacyPopupResult.data || []) as Array<{
          id: number
          titulo?: string | null
          activo?: boolean | null
          descripcion?: string | null
        }>)[0]

        if (legacyPopup) {
          setPopupData({
            id: legacyPopup.id,
            activo: true,
            titulo: legacyPopup.titulo || initialPopupForm.titulo,
            descripcion: legacyPopup.descripcion || initialPopupForm.descripcion,
            boton_texto: initialPopupForm.boton_texto,
            visible_desde: "",
            visible_hasta: "",
          })
        }
      } else if (!popupResult.error) {
        const popup = ((popupResult.data || []) as Array<{
          id: number
          titulo?: string | null
          activo?: boolean | null
          mostrar_popup_home?: boolean | null
          descripcion?: string | null
          boton_texto?: string | null
          visible_desde?: string | null
          visible_hasta?: string | null
        }>)[0]

        if (popup) {
          setPopupData({
            id: popup.id,
            activo: popup.mostrar_popup_home !== false,
            titulo: popup.titulo || initialPopupForm.titulo,
            descripcion: popup.descripcion || initialPopupForm.descripcion,
            boton_texto: popup.boton_texto || initialPopupForm.boton_texto,
            visible_desde: toDateTimeLocal(popup.visible_desde),
            visible_hasta: toDateTimeLocal(popup.visible_hasta),
          })
        }
      }

      setIsInitialLoading(false)
    }

    void cargarConfiguracion()
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

    const popupPayload = {
      titulo: popupData.titulo.trim() || initialPopupForm.titulo,
      mostrar_popup_home: popupData.activo,
      descripcion: popupData.descripcion.trim(),
      boton_texto: popupData.boton_texto.trim() || initialPopupForm.boton_texto,
      visible_desde: fromDateTimeLocal(popupData.visible_desde),
      visible_hasta: fromDateTimeLocal(popupData.visible_hasta),
      updated_at: new Date().toISOString(),
    }

    if (popupSchemaReady) {
      const popupQuery = popupData.id
        ? supabase.from("sorteo_popup_config").update(popupPayload).eq("id", popupData.id).select("id").single()
        : supabase.from("sorteo_popup_config").insert(popupPayload).select("id").single()
      const { data: savedPopup, error: popupError } = await popupQuery

      if (popupError?.code === "42703" || popupError?.code === "42P01") {
        savedPopupSettings = false
        setPopupSchemaReady(false)
      } else if (popupError) {
        setSaveError(`No se pudo guardar el popup: ${popupError.message}`)
        setLoading(false)
        return
      } else if (savedPopup?.id) {
        setPopupData((prev) => ({ ...prev, id: Number(savedPopup.id) }))
      }
    } else {
      savedPopupSettings = false
    }

    const pendingMessages = [
      !savedHomeGamesVisibility
        ? "Para mostrar u ocultar juegos y ranking falta aplicar las columnas nuevas de sitio en Supabase."
        : "",
      !savedPopupSettings
        ? "Para programar el popup falta aplicar las columnas nuevas de sorteo_popup_config en Supabase."
        : "",
    ].filter(Boolean)

    setSaveMessage(
      pendingMessages.length
        ? `Cambios guardados parcialmente. ${pendingMessages.join(" ")}`
        : "Cambios guardados correctamente."
    )
    setLoading(false)
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
                    Falta aplicar las columnas nuevas en Supabase para guardar programación, botón y fechas.
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
                      Título del popup
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
                      Texto del popup
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

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-900">
                      Texto del botón de cierre
                    </label>
                    <input
                      type="text"
                      value={popupData.boton_texto}
                      onChange={(e) =>
                        setPopupData((prev) => ({
                          ...prev,
                          boton_texto: e.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-amber-100 bg-white px-4 py-3 outline-none transition focus:border-amber-500"
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
              <div className="mt-3 inline-flex rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white">
                {popupData.boton_texto || "Entendido"}
              </div>
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
