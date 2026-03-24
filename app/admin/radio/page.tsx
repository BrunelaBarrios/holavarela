'use client'

import { useEffect, useState } from "react"
import { Radio, Save } from "lucide-react"
import { supabase } from "../../supabase"
import { logAdminActivity } from "../../lib/adminActivity"

type RadioConfig = {
  title: string
  description: string
  streamUrl: string
  isLive: boolean
}

const defaultConfig: RadioConfig = {
  title: "Delta FM 88.3",
  description: "Escucha Delta FM 88.3 en vivo desde Jose Pedro Varela.",
  streamUrl: "https://radios.com.uy/delta/?utm_source=chatgpt.com",
  isLive: true,
}

export default function AdminRadioPage() {
  const [config, setConfig] = useState<RadioConfig>(defaultConfig)
  const [saved, setSaved] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [isInitialLoading, setIsInitialLoading] = useState(true)

  useEffect(() => {
    const loadConfig = async () => {
      const { data, error } = await supabase
        .from("sitio")
        .select("radio_titulo, radio_descripcion, radio_stream_url, radio_is_live")
        .eq("id", 1)
        .maybeSingle()

      if (!error && data) {
        setConfig({
          title: data.radio_titulo || defaultConfig.title,
          description: data.radio_descripcion || defaultConfig.description,
          streamUrl: data.radio_stream_url || defaultConfig.streamUrl,
          isLive: data.radio_is_live ?? defaultConfig.isLive,
        })
      }

      setIsInitialLoading(false)
    }

    loadConfig()
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setSaved(false)
    setErrorMessage("")

    const { error } = await supabase.from("sitio").upsert({
      id: 1,
      radio_titulo: config.title,
      radio_descripcion: config.description,
      radio_stream_url: config.streamUrl || null,
      radio_is_live: config.isLive,
    })

    if (error) {
      setErrorMessage(`No se pudo guardar la configuracion: ${error.message}`)
      setLoading(false)
      return
    }

    await logAdminActivity({
      action: "Editar",
      section: "Radio",
      target: config.title,
      details: config.isLive
        ? "Actualizo la radio visible en la home."
        : "Actualizo la configuracion de radio y la dejo oculta en la home.",
    })

    setSaved(true)
    setLoading(false)
    window.setTimeout(() => setSaved(false), 2000)
  }

  if (isInitialLoading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-600 shadow-sm">
        Cargando configuracion de radio...
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-semibold text-slate-900">Radio</h1>
        <p className="text-slate-500">
          Configura la transmision que se escucha en la home
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-xl bg-slate-800 p-3 text-white">
            <Radio className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              Configuracion de Radio
            </h2>
            <p className="text-sm text-slate-500">
              Guarda una URL de streaming o una pagina para escuchar la radio
            </p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          {errorMessage && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-900">
              Titulo
            </label>
            <input
              type="text"
              value={config.title}
              onChange={(e) =>
                setConfig((prev) => ({ ...prev, title: e.target.value }))
              }
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-slate-700"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-900">
              Descripcion
            </label>
            <input
              type="text"
              value={config.description}
              onChange={(e) =>
                setConfig((prev) => ({ ...prev, description: e.target.value }))
              }
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-slate-700"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-900">
              URL de streaming o enlace
            </label>
            <input
              type="url"
              value={config.streamUrl}
              onChange={(e) =>
                setConfig((prev) => ({ ...prev, streamUrl: e.target.value }))
              }
              placeholder="https://..."
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-slate-700"
            />
          </div>

          <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3">
            <input
              type="checkbox"
              checked={config.isLive}
              onChange={(e) =>
                setConfig((prev) => ({ ...prev, isLive: e.target.checked }))
              }
            />
            <span className="text-sm text-slate-700">Mostrar radio en vivo</span>
          </label>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-800 px-5 py-3 font-medium text-white transition hover:bg-slate-700 disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {loading ? "Guardando..." : "Guardar configuracion"}
            </button>

            {saved && (
              <span className="text-sm font-medium text-emerald-600">
                Configuracion guardada
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
