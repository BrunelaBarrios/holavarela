'use client'

import { useEffect, useMemo, useState } from "react"
import { Megaphone, Radio } from "lucide-react"
import { supabase } from "../../supabase"
import {
  DELAYED_PROMO_STORAGE_KEY,
  RADIO_STORAGE_KEY,
} from "../../lib/localStorageKeys"

type RadioConfig = {
  title: string
  description: string
  streamUrl: string
  isLive: boolean
}

type PromoConfig = {
  enabled: boolean
  delaySeconds: number
  itemKey: string
}

type PromoOption = {
  key: string
  label: string
}

const defaultConfig: RadioConfig = {
  title: "Delta FM 88.3",
  description: "Escucha Delta FM 88.3 en vivo desde Jose Pedro Varela.",
  streamUrl: "https://radios.com.uy/delta/?utm_source=chatgpt.com",
  isLive: true,
}

const DELAYED_PROMO_UPDATE_EVENT = "delayed-promo-config-updated"
const defaultPromoConfig: PromoConfig = {
  enabled: true,
  delaySeconds: 60,
  itemKey: "",
}

export default function AdminRadioPage() {
  const [config, setConfig] = useState<RadioConfig>(() => {
    if (typeof window === "undefined") return defaultConfig

    const raw = window.localStorage.getItem(RADIO_STORAGE_KEY)
    if (!raw) return defaultConfig

    try {
      const parsed = JSON.parse(raw) as RadioConfig
      return { ...defaultConfig, ...parsed }
    } catch {
      window.localStorage.removeItem(RADIO_STORAGE_KEY)
      return defaultConfig
    }
  })
  const [saved, setSaved] = useState(false)
  const [promoConfig, setPromoConfig] = useState<PromoConfig>(() => {
    if (typeof window === "undefined") return defaultPromoConfig

    const raw = window.localStorage.getItem(DELAYED_PROMO_STORAGE_KEY)
    if (!raw) return defaultPromoConfig

    try {
      const parsed = JSON.parse(raw) as Partial<PromoConfig>
      return {
        enabled: parsed.enabled ?? defaultPromoConfig.enabled,
        delaySeconds:
          typeof parsed.delaySeconds === "number" && Number.isFinite(parsed.delaySeconds)
            ? Math.max(5, parsed.delaySeconds)
            : defaultPromoConfig.delaySeconds,
        itemKey: parsed.itemKey?.trim() || "",
      }
    } catch {
      window.localStorage.removeItem(DELAYED_PROMO_STORAGE_KEY)
      return defaultPromoConfig
    }
  })
  const [promoSaved, setPromoSaved] = useState(false)
  const [promoOptions, setPromoOptions] = useState<PromoOption[]>([])

  useEffect(() => {
    const loadPromoOptions = async () => {
      const [comerciosResult, serviciosResult, cursosResult] = await Promise.all([
        supabase
          .from("comercios")
          .select("id, nombre")
          .or("estado.is.null,estado.eq.activo")
          .order("nombre", { ascending: true }),
        supabase
          .from("servicios")
          .select("id, nombre")
          .or("estado.is.null,estado.eq.activo")
          .order("nombre", { ascending: true }),
        supabase
          .from("cursos")
          .select("id, nombre")
          .eq("estado", "activo")
          .order("nombre", { ascending: true }),
      ])

      const nextOptions: PromoOption[] = [
        ...((comerciosResult.data || []) as Array<{ id: number; nombre: string }>).map((item) => ({
          key: `comercio:${item.id}`,
          label: `Comercio: ${item.nombre}`,
        })),
        ...((serviciosResult.data || []) as Array<{ id: number; nombre: string }>).map((item) => ({
          key: `servicio:${item.id}`,
          label: `Servicio: ${item.nombre}`,
        })),
        ...((cursosResult.data || []) as Array<{ id: number; nombre: string }>).map((item) => ({
          key: `curso:${item.id}`,
          label: `Curso: ${item.nombre}`,
        })),
      ]

      setPromoOptions(nextOptions)
    }

    void loadPromoOptions()
  }, [])

  const selectedPromoLabel = useMemo(
    () =>
      promoOptions.find((item) => item.key === promoConfig.itemKey)?.label ||
      "Primer comercio o servicio disponible",
    [promoConfig.itemKey, promoOptions]
  )

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    window.localStorage.setItem(RADIO_STORAGE_KEY, JSON.stringify(config))
    setSaved(true)
    window.dispatchEvent(new Event("radio-config-updated"))
    window.setTimeout(() => setSaved(false), 2000)
  }

  const handlePromoSave = (e: React.FormEvent) => {
    e.preventDefault()
    window.localStorage.setItem(DELAYED_PROMO_STORAGE_KEY, JSON.stringify(promoConfig))
    window.dispatchEvent(new Event(DELAYED_PROMO_UPDATE_EVENT))
    setPromoSaved(true)
    window.setTimeout(() => setPromoSaved(false), 2000)
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
              className="rounded-xl bg-slate-800 px-5 py-3 font-medium text-white transition hover:bg-slate-700"
            >
              Guardar configuracion
            </button>

            {saved && (
              <span className="text-sm font-medium text-emerald-600">
                Configuracion guardada
              </span>
            )}
          </div>
        </form>
      </div>

      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-xl bg-amber-500 p-3 text-white">
            <Megaphone className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              Publicidad diferida en la home
            </h2>
            <p className="text-sm text-slate-500">
              Configura la promo que aparece luego de unos segundos, separada del sorteo.
            </p>
          </div>
        </div>

        <form onSubmit={handlePromoSave} className="space-y-4">
          <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3">
            <input
              type="checkbox"
              checked={promoConfig.enabled}
              onChange={(e) =>
                setPromoConfig((prev) => ({ ...prev, enabled: e.target.checked }))
              }
            />
            <span className="text-sm text-slate-700">Mostrar promo diferida</span>
          </label>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-900">
              Espera en segundos
            </label>
            <input
              type="number"
              min={5}
              value={promoConfig.delaySeconds}
              onChange={(e) =>
                setPromoConfig((prev) => ({
                  ...prev,
                  delaySeconds: Math.max(5, Number(e.target.value) || 5),
                }))
              }
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-amber-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-900">
              Comercio, servicio o curso a mostrar
            </label>
            <select
              value={promoConfig.itemKey}
              onChange={(e) =>
                setPromoConfig((prev) => ({ ...prev, itemKey: e.target.value }))
              }
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-amber-500"
            >
              <option value="">Automatico</option>
              {promoOptions.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.label}
                </option>
              ))}
            </select>
            <p className="mt-2 text-sm text-slate-500">
              Seleccion actual: {selectedPromoLabel}.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
            La promo aparece identificada como publicidad y muestra dos acciones claras:
            <span className="font-semibold"> Ver comercio</span> o
            <span className="font-semibold"> Cerrar</span>.
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              className="rounded-xl bg-amber-500 px-5 py-3 font-medium text-white transition hover:bg-amber-400"
            >
              Guardar publicidad
            </button>

            {promoSaved && (
              <span className="text-sm font-medium text-emerald-600">
                Publicidad guardada
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
