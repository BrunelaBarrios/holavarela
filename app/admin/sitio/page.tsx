'use client'

import { useEffect, useState } from "react"
import { FileText, ImageIcon, QrCode, Save } from "lucide-react"
import { OptimizedImage } from "../../components/OptimizedImage"
import { supabase } from "../../supabase"
import { logAdminActivity } from "../../lib/adminActivity"
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

export default function AdminSitioPage() {
  const [formData, setFormData] = useState<SitioForm>(initialForm)
  const [loading, setLoading] = useState(false)
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [saveMessage, setSaveMessage] = useState("")
  const [saveError, setSaveError] = useState("")

  useEffect(() => {
    const cargarConfiguracion = async () => {
      const result = await supabase
        .from("sitio")
        .select("titulo, texto_1, texto_2, texto_3, imagen_url, mostrar_juegos_home, mostrar_ranking_juego_home")
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
      id: 1,
      titulo: formData.titulo,
      texto_1: formData.texto_1,
      texto_2: formData.texto_2,
      texto_3: formData.texto_3,
      imagen_url: formData.imagen_url || null,
      mostrar_juegos_home: formData.mostrar_juegos_home,
      mostrar_ranking_juego_home: formData.mostrar_ranking_juego_home,
    }
    let { error } = await supabase.from("sitio").upsert(sitioPayload)
    let savedHomeGamesVisibility = true

    if (error?.code === "42703") {
      const legacyPayload = {
        id: sitioPayload.id,
        titulo: sitioPayload.titulo,
        texto_1: sitioPayload.texto_1,
        texto_2: sitioPayload.texto_2,
        texto_3: sitioPayload.texto_3,
        imagen_url: sitioPayload.imagen_url,
      }
      const legacyResult = await supabase.from("sitio").upsert(legacyPayload)
      error = legacyResult.error
      savedHomeGamesVisibility = false
    }

    if (error) {
      setSaveError(`No se pudo guardar la configuracion: ${error.message}`)
      setLoading(false)
      return
    }

    await logAdminActivity({
      action: "Editar",
      section: "Sitio",
      target: "Contenido principal",
      details: "Actualizo textos, imagen o bloques visibles de la home.",
    })

    setSaveMessage(
      savedHomeGamesVisibility
        ? "Cambios guardados correctamente."
        : "Cambios guardados. Para mostrar u ocultar juegos y ranking falta aplicar las columnas nuevas en Supabase."
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
          </div>
        </div>
      </div>
    </div>
  )
}
