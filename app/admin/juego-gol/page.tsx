'use client'

import { useEffect, useMemo, useState } from "react"
import { Power, Save, Trash2, Trophy } from "lucide-react"
import { AdminConfirmModal } from "../../components/AdminConfirmModal"
import {
  DEFAULT_GOAL_GAME_CONFIG,
  type GoalGameRankingEntry,
  normalizeGoalGameBanner,
  normalizeGoalGameTitle,
} from "../../lib/goalGame"

type AdminGoalConfig = {
  activo: boolean
  titulo: string
  textoBanner: string
  mostrarRankingHome: boolean
}

export default function AdminJuegoGolPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [schemaReady, setSchemaReady] = useState(true)
  const [message, setMessage] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const [config, setConfig] = useState<AdminGoalConfig>(DEFAULT_GOAL_GAME_CONFIG)
  const [ranking, setRanking] = useState<GoalGameRankingEntry[]>([])
  const [totalParticipants, setTotalParticipants] = useState(0)
  const [entryToDelete, setEntryToDelete] = useState<GoalGameRankingEntry | null>(null)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)

  const topScore = useMemo(
    () => ranking.reduce((highest, entry) => Math.max(highest, entry.puntaje), 0),
    [ranking]
  )

  const loadData = async () => {
    setLoading(true)
    setMessage("")
    setErrorMessage("")

    try {
      const response = await fetch("/api/admin/juego-gol")
      const result = (await response.json()) as {
        config?: AdminGoalConfig
        ranking?: GoalGameRankingEntry[]
        totalParticipants?: number
        schemaReady?: boolean
        warning?: string
        error?: string
      }

      if (!response.ok) {
        setErrorMessage(result.error || "No se pudo cargar el Desafio del Gol.")
        return
      }

      setSchemaReady(result.schemaReady !== false)
      setConfig(result.config || DEFAULT_GOAL_GAME_CONFIG)
      setRanking(result.ranking || [])
      setTotalParticipants(result.totalParticipants || 0)
      setSelectedIds([])
      if (result.warning) setMessage(result.warning)
    } catch {
      setErrorMessage("No se pudo cargar el Desafio del Gol.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  const saveConfig = async () => {
    setSaving(true)
    setMessage("")
    setErrorMessage("")

    try {
      const response = await fetch("/api/admin/juego-gol", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activo: config.activo,
          titulo: config.titulo,
          textoBanner: config.textoBanner,
          mostrarRankingHome: config.mostrarRankingHome,
        }),
      })
      const result = (await response.json()) as {
        config?: AdminGoalConfig
        error?: string
      }

      if (!response.ok) {
        setErrorMessage(result.error || "No se pudo guardar la configuracion.")
        return
      }

      setConfig(result.config || config)
      setSchemaReady(true)
      setMessage(config.activo ? "Desafio del Gol activo." : "Desafio del Gol pausado.")
    } catch {
      setErrorMessage("No se pudo guardar la configuracion.")
    } finally {
      setSaving(false)
    }
  }

  const deleteEntry = async () => {
    if (!entryToDelete) return

    setDeleting(true)
    setMessage("")
    setErrorMessage("")

    try {
      const response = await fetch(`/api/admin/juego-gol?id=${entryToDelete.id}`, {
        method: "DELETE",
      })
      const result = (await response.json()) as {
        ranking?: GoalGameRankingEntry[]
        totalParticipants?: number
        error?: string
      }

      if (!response.ok) {
        setErrorMessage(result.error || "No se pudo borrar el participante.")
        return
      }

      setRanking(result.ranking || ranking.filter((entry) => entry.id !== entryToDelete.id))
      setTotalParticipants(
        result.totalParticipants ?? Math.max(0, totalParticipants - 1)
      )
      setSelectedIds((current) => current.filter((id) => id !== entryToDelete.id))
      setMessage(`Eliminaste a ${entryToDelete.nombre} del ranking.`)
      setEntryToDelete(null)
    } catch {
      setErrorMessage("No se pudo borrar el participante.")
    } finally {
      setDeleting(false)
    }
  }

  const deleteSelectedEntries = async () => {
    if (selectedIds.length === 0) return

    setDeleting(true)
    setMessage("")
    setErrorMessage("")

    try {
      const response = await fetch("/api/admin/juego-gol", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds }),
      })
      const result = (await response.json()) as {
        ranking?: GoalGameRankingEntry[]
        deletedCount?: number
        totalParticipants?: number
        error?: string
      }

      if (!response.ok) {
        setErrorMessage(result.error || "No se pudieron borrar los participantes.")
        return
      }

      const selectedSet = new Set(selectedIds)
      setRanking(result.ranking || ranking.filter((entry) => !selectedSet.has(entry.id)))
      const deletedCount = result.deletedCount ?? selectedIds.length
      setTotalParticipants(
        result.totalParticipants ?? Math.max(0, totalParticipants - deletedCount)
      )
      setMessage(`Eliminaste ${deletedCount} participantes del ranking.`)
      setSelectedIds([])
      setBulkDeleteOpen(false)
    } catch {
      setErrorMessage("No se pudieron borrar los participantes.")
    } finally {
      setDeleting(false)
    }
  }

  const allSelected = ranking.length > 0 && selectedIds.length === ranking.length

  const toggleAllEntries = () => {
    setSelectedIds(allSelected ? [] : ranking.map((entry) => entry.id))
  }

  const toggleEntry = (id: number) => {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((selectedId) => selectedId !== id)
        : [...current, id]
    )
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-600 shadow-sm">
        Cargando Desafio del Gol...
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl">
      <AdminConfirmModal
        isOpen={Boolean(entryToDelete)}
        title="Eliminar participante"
        description={`Vas a eliminar a "${entryToDelete?.nombre || ""}" del ranking del Desafio del Gol.`}
        confirmLabel="Eliminar"
        onCancel={() => setEntryToDelete(null)}
        onConfirm={() => {
          void deleteEntry()
        }}
        isLoading={deleting}
      />
      <AdminConfirmModal
        isOpen={bulkDeleteOpen}
        title="Eliminar participantes seleccionados"
        description={`Vas a eliminar ${selectedIds.length} participantes del ranking del Desafio del Gol. Esta accion no se puede deshacer.`}
        confirmLabel={`Eliminar ${selectedIds.length}`}
        onCancel={() => setBulkDeleteOpen(false)}
        onConfirm={() => {
          void deleteSelectedEntries()
        }}
        isLoading={deleting}
      />

      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-slate-900">Desafio del Gol</h1>
        <p className="mt-2 max-w-3xl text-slate-500">
          Activa el mini juego temporal, ajusta el texto de la home y administra participantes.
        </p>
      </div>

      {!schemaReady ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-800">
          Primero corre el SQL actualizado en Supabase para crear las tablas juego_gol_config y juego_gol_participaciones.
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">
                  Configuracion
                </div>
                <h2 className="mt-1 text-xl font-semibold text-slate-900">
                  Estado del juego
                </h2>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={config.activo}
                onClick={() => setConfig((current) => ({ ...current, activo: !current.activo }))}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                  config.activo
                    ? "bg-emerald-600 text-white hover:bg-emerald-500"
                    : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <Power className="h-4 w-4" />
                {config.activo ? "Activo" : "Pausado"}
              </button>
            </div>

            <div className="mt-6 grid gap-5">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-900">
                  Titulo del juego
                </span>
                <input
                  type="text"
                  value={config.titulo}
                  onChange={(event) =>
                    setConfig((current) => ({
                      ...current,
                      titulo: normalizeGoalGameTitle(event.target.value),
                    }))
                  }
                  maxLength={80}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-emerald-500"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-900">
                  Texto del banner de la home
                </span>
                <input
                  type="text"
                  value={config.textoBanner}
                  onChange={(event) =>
                    setConfig((current) => ({
                      ...current,
                      textoBanner: normalizeGoalGameBanner(event.target.value),
                    }))
                  }
                  maxLength={90}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-emerald-500"
                />
              </label>

              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <input
                  type="checkbox"
                  checked={config.mostrarRankingHome}
                  onChange={(event) =>
                    setConfig((current) => ({
                      ...current,
                      mostrarRankingHome: event.target.checked,
                    }))
                  }
                  className="mt-1 h-4 w-4"
                />
                <span>
                  <span className="block text-sm font-semibold text-slate-900">
                    Mostrar ranking en la home
                  </span>
                  <span className="mt-1 block text-sm leading-6 text-slate-500">
                    Si el juego esta activo, se muestran los mejores puntajes debajo del banner.
                  </span>
                </span>
              </label>

              <button
                type="button"
                onClick={() => void saveConfig()}
                disabled={saving}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                <Save className="h-4 w-4" />
                {saving ? "Guardando..." : "Guardar cambios"}
              </button>

              {message ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  {message}
                </div>
              ) : null}
              {errorMessage ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {errorMessage}
                </div>
              ) : null}
            </div>
          </section>

          <aside className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                  <Trophy className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-sm text-slate-500">Participantes</div>
                  <div className="text-2xl font-black text-slate-950">{totalParticipants}</div>
                </div>
              </div>
              <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                <div className="text-sm text-slate-500">Mejor puntaje</div>
                <div className="mt-1 text-3xl font-black text-slate-950">{topScore}</div>
              </div>
            </div>
          </aside>

          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm lg:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 p-6">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Ranking de participantes</h2>
                <p className="mt-2 text-sm text-slate-500">
                  Se muestran los mejores 100 de {totalParticipants} participantes. En empate queda primero quien llego antes.
                </p>
              </div>
              {selectedIds.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setBulkDeleteOpen(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                  Borrar seleccionados ({selectedIds.length})
                </button>
              ) : null}
            </div>

            {ranking.length === 0 ? (
              <div className="p-6 text-sm text-slate-500">
                Todavia no hay participantes.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    <tr>
                      <th className="w-12 px-4 py-3">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={toggleAllEntries}
                          aria-label="Seleccionar todos los participantes"
                          className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-red-600"
                        />
                      </th>
                      <th className="px-6 py-3">Puesto</th>
                      <th className="px-6 py-3">Nombre</th>
                      <th className="px-6 py-3">Puntaje</th>
                      <th className="px-6 py-3">Fecha</th>
                      <th className="px-6 py-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {ranking.map((entry, index) => (
                      <tr
                        key={entry.id}
                        className={selectedIds.includes(entry.id) ? "bg-red-50/70" : ""}
                      >
                        <td className="px-4 py-4">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(entry.id)}
                            onChange={() => toggleEntry(entry.id)}
                            aria-label={`Seleccionar a ${entry.nombre}`}
                            className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-red-600"
                          />
                        </td>
                        <td className="px-6 py-4 font-black text-slate-950">{index + 1}</td>
                        <td className="px-6 py-4 font-semibold text-slate-900">{entry.nombre}</td>
                        <td className="px-6 py-4 font-black text-emerald-700">{entry.puntaje}</td>
                        <td className="px-6 py-4 text-slate-500">
                          {entry.createdAt
                            ? new Date(entry.createdAt).toLocaleString("es-UY")
                            : "Sin fecha"}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => setEntryToDelete(entry)}
                            className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                            Borrar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
