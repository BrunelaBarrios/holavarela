'use client'

import { useState } from "react"
import { ArrowRightLeft, X } from "lucide-react"

type EntityType = "comercio" | "servicio" | "institucion"

const labels: Record<EntityType, string> = {
  comercio: "Comercio",
  servicio: "Servicio",
  institucion: "Institución",
}

export function MoveCategoryButton({
  sourceType,
  sourceId,
  name,
  onMoved,
}: {
  sourceType: EntityType
  sourceId: number
  name: string
  onMoved: () => void | Promise<void>
}) {
  const destinations = (Object.keys(labels) as EntityType[]).filter((type) => type !== sourceType)
  const [open, setOpen] = useState(false)
  const [targetType, setTargetType] = useState<EntityType>(destinations[0])
  const [serviceCategory, setServiceCategory] = useState("Servicios")
  const [moving, setMoving] = useState(false)
  const [error, setError] = useState("")

  const move = async () => {
    setMoving(true)
    setError("")
    try {
      const response = await fetch("/api/admin/mover-categoria", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceType, sourceId, targetType, serviceCategory }),
      })
      const result = (await response.json()) as { error?: string }
      if (!response.ok) throw new Error(result.error || "No pudimos mover la publicación.")
      setOpen(false)
      await onMoved()
    } catch (moveError) {
      setError(moveError instanceof Error ? moveError.message : "No pudimos mover la publicación.")
    } finally {
      setMoving(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg p-2 text-violet-600 transition hover:bg-violet-50"
        title="Mover a otra categoría"
      >
        <ArrowRightLeft className="h-4 w-4" />
      </button>

      {open ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Mover de categoría</h2>
                <p className="mt-1 text-sm text-slate-500">{name}</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Cerrar">
                <X className="h-5 w-5" />
              </button>
            </div>

            <label className="mt-5 block text-sm font-semibold text-slate-700">
              Nueva categoría
              <select value={targetType} onChange={(event) => setTargetType(event.target.value as EntityType)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3">
                {destinations.map((type) => <option key={type} value={type}>{labels[type]}</option>)}
              </select>
            </label>

            {targetType === "servicio" ? (
              <label className="mt-4 block text-sm font-semibold text-slate-700">
                Tipo de servicio
                <input value={serviceCategory} onChange={(event) => setServiceCategory(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3" placeholder="Ej.: Profesionales" />
              </label>
            ) : null}

            <p className="mt-4 rounded-xl bg-violet-50 p-3 text-sm text-violet-800">
              Se conservarán los datos disponibles y dejará de aparecer en {labels[sourceType]}.
            </p>
            {error ? <p className="mt-3 text-sm font-medium text-red-600">{error}</p> : null}

            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setOpen(false)} disabled={moving} className="rounded-xl border border-slate-200 px-4 py-2.5 font-semibold text-slate-700">Cancelar</button>
              <button type="button" onClick={() => void move()} disabled={moving} className="rounded-xl bg-violet-600 px-4 py-2.5 font-semibold text-white disabled:opacity-60">
                {moving ? "Moviendo..." : `Mover a ${labels[targetType]}`}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
