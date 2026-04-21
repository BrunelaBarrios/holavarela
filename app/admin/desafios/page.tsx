'use client'

import { useEffect, useMemo, useState } from "react"
import { Copy, Download, ExternalLink, QrCode, RotateCcw, Search, Shuffle, Trash2, Trophy } from "lucide-react"
import { AdminConfirmModal } from "../../components/AdminConfirmModal"
import { supabase } from "../../supabase"
import { logAdminActivity } from "../../lib/adminActivity"
import { isMissingChallengesSchemaError } from "../../lib/challengeGame"
import { printCouponsPdf } from "../../lib/couponPrint"

type ChallengeEntry = {
  id: number
  nombre: string
  telefono: string
  puntajeTotal: number
  puntosSopa: number
  puntosMemoria: number
  puntosPelicula: number
  sopaNombre: string | null
  memoriaNombre: string | null
  peliculaNombre: string | null
  createdAt: string | null
}

type ChallengeWinner = {
  id: number
  sorteoId: number
  participacionId: number
  entregado: boolean
  entregadoAt: string | null
  createdAt: string | null
}

type ChallengeDraw = {
  id: number
  cantidadGanadores: number
  createdAt: string | null
}

const PUBLIC_SITE_URL = "https://www.holavarela.uy"

function buildChallengePublicUrl() {
  return `${PUBLIC_SITE_URL}/juga-y-gana`
}

function buildChallengeQrUrl() {
  return `https://api.qrserver.com/v1/create-qr-code/?size=1200x1200&data=${encodeURIComponent(
    buildChallengePublicUrl()
  )}`
}

function shuffleEntries<T>(items: T[]) {
  const copy = [...items]
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]]
  }
  return copy
}

export default function AdminDesafiosPage() {
  const [loading, setLoading] = useState(true)
  const [schemaReady, setSchemaReady] = useState(true)
  const [schemaMessage, setSchemaMessage] = useState("")
  const [entries, setEntries] = useState<ChallengeEntry[]>([])
  const [draws, setDraws] = useState<ChallengeDraw[]>([])
  const [winners, setWinners] = useState<ChallengeWinner[]>([])
  const [search, setSearch] = useState("")
  const [sortBy, setSortBy] = useState<"recent" | "score_desc">("recent")
  const [winnersCount, setWinnersCount] = useState("1")
  const [drawing, setDrawing] = useState(false)
  const [resettingDraws, setResettingDraws] = useState(false)
  const [message, setMessage] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const [shareMessage, setShareMessage] = useState("")
  const [entryToDelete, setEntryToDelete] = useState<ChallengeEntry | null>(null)
  const [deletingEntry, setDeletingEntry] = useState(false)
  const [showResetDrawsConfirm, setShowResetDrawsConfirm] = useState(false)

  const challengePublicUrl = buildChallengePublicUrl()
  const challengeQrUrl = buildChallengeQrUrl()

  const loadData = async () => {
    const [
      { data: entriesRows, error: entriesError },
      { data: drawsRows, error: drawsError },
      { data: winnersRows, error: winnersError },
    ] = await Promise.all([
      supabase
        .from("desafio_participaciones")
        .select(
          "id, nombre, telefono, puntaje_total, puntos_sopa, puntos_memoria, puntos_pelicula, sopa_nombre, memoria_nombre, pelicula_nombre, created_at"
        )
        .order("created_at", { ascending: false }),
      supabase
        .from("desafio_sorteos")
        .select("id, cantidad_ganadores, created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("desafio_sorteo_ganadores")
        .select("id, sorteo_id, participacion_id, entregado, entregado_at, created_at")
        .order("created_at", { ascending: false }),
    ])

    const schemaError = entriesError || drawsError || winnersError
    if (schemaError) {
      if (isMissingChallengesSchemaError(schemaError)) {
        setSchemaReady(false)
        setSchemaMessage(schemaError.message || "Falta actualizar las tablas de desafios.")
      } else {
        setErrorMessage(`No se pudieron cargar los desafios: ${schemaError.message}`)
      }
      setLoading(false)
      return
    }

    setSchemaReady(true)
    setSchemaMessage("")
    setEntries(
      ((entriesRows || []) as Array<Record<string, unknown>>).map((entry) => ({
        id: Number(entry.id),
        nombre: String(entry.nombre || ""),
        telefono: String(entry.telefono || ""),
        puntajeTotal: Number(entry.puntaje_total || 0),
        puntosSopa: Number(entry.puntos_sopa || 0),
        puntosMemoria: Number(entry.puntos_memoria || 0),
        puntosPelicula: Number(entry.puntos_pelicula || 0),
        sopaNombre: entry.sopa_nombre ? String(entry.sopa_nombre) : null,
        memoriaNombre: entry.memoria_nombre ? String(entry.memoria_nombre) : null,
        peliculaNombre: entry.pelicula_nombre ? String(entry.pelicula_nombre) : null,
        createdAt: entry.created_at ? String(entry.created_at) : null,
      }))
    )
    setDraws(
      ((drawsRows || []) as Array<Record<string, unknown>>).map((draw) => ({
        id: Number(draw.id),
        cantidadGanadores: Number(draw.cantidad_ganadores || 0),
        createdAt: draw.created_at ? String(draw.created_at) : null,
      }))
    )
    setWinners(
      ((winnersRows || []) as Array<Record<string, unknown>>).map((winner) => ({
        id: Number(winner.id),
        sorteoId: Number(winner.sorteo_id),
        participacionId: Number(winner.participacion_id),
        entregado: winner.entregado === true,
        entregadoAt: winner.entregado_at ? String(winner.entregado_at) : null,
        createdAt: winner.created_at ? String(winner.created_at) : null,
      }))
    )
    setLoading(false)
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadData()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [])

  const visibleEntries = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    const filteredEntries =
      !normalizedSearch
        ? entries
        : entries.filter((entry) =>
            `${entry.nombre} ${entry.telefono}`.toLowerCase().includes(normalizedSearch)
          )

    return [...filteredEntries].sort((left, right) => {
      if (sortBy === "score_desc") {
        if (right.puntajeTotal !== left.puntajeTotal) {
          return right.puntajeTotal - left.puntajeTotal
        }
      }

      const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0
      const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0
      return rightTime - leftTime
    })
  }, [entries, search, sortBy])

  const latestDraw = draws[0] || null
  const latestWinnerRows = useMemo(
    () => (latestDraw ? winners.filter((winner) => winner.sorteoId === latestDraw.id) : []),
    [latestDraw, winners]
  )

  const latestWinners = useMemo(() => {
    if (!latestDraw) return []

    return latestWinnerRows
      .map((winnerRow) => {
        const entry = entries.find((item) => item.id === winnerRow.participacionId)
        if (!entry) return null

        return {
          ...entry,
          winnerRowId: winnerRow.id,
          entregado: winnerRow.entregado,
          entregadoAt: winnerRow.entregadoAt,
        }
      })
      .filter(Boolean) as Array<
      ChallengeEntry & {
        winnerRowId: number
        entregado: boolean
        entregadoAt: string | null
      }
    >
  }, [entries, latestDraw, latestWinnerRows])

  const handleCopyPublicLink = async () => {
    try {
      await navigator.clipboard.writeText(challengePublicUrl)
      setShareMessage("Link del juego copiado.")
    } catch {
      setShareMessage(`Copia manualmente este link: ${challengePublicUrl}`)
    }
  }

  const handleDownloadQr = () => {
    if (typeof window === "undefined") return

    const link = window.document.createElement("a")
    link.href = challengeQrUrl
    link.download = "qr-juga-y-gana-hola-varela.png"
    link.target = "_blank"
    link.rel = "noopener noreferrer"
    link.click()
    setShareMessage("Se abrio el QR del juego para descargar.")
  }

  const handleExportCsv = () => {
    if (typeof window === "undefined" || visibleEntries.length === 0) return

    const escapeCsv = (value: string | number | null | undefined) =>
      `"${String(value ?? "").replace(/"/g, '""')}"`

    const rows = [
      [
        "nombre",
        "telefono",
        "puntaje_total",
        "puntos_sopa",
        "puntos_memoria",
        "puntos_pelicula",
        "sopa",
        "memoria",
        "pelicula",
        "fecha",
      ],
      ...visibleEntries.map((entry) => [
        entry.nombre,
        entry.telefono,
        entry.puntajeTotal,
        entry.puntosSopa,
        entry.puntosMemoria,
        entry.puntosPelicula,
        entry.sopaNombre || "",
        entry.memoriaNombre || "",
        entry.peliculaNombre || "",
        entry.createdAt
          ? new Date(entry.createdAt).toLocaleString("sv-SE", { hour12: false })
          : "",
      ]),
    ]

    const csvContent = rows.map((row) => row.map(escapeCsv).join(",")).join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = window.URL.createObjectURL(blob)
    const link = window.document.createElement("a")
    link.href = url
    link.download = "desafios-hola-varela.csv"
    link.click()
    window.URL.revokeObjectURL(url)
  }

  const handlePrintCoupons = () => {
    if (visibleEntries.length === 0) return

    printCouponsPdf({
      documentTitle: "cupones-desafios-hola-varela",
      heading: "Cupones de participantes - Desafios Hola Varela",
      subheading:
        "Listos para imprimir o guardar como PDF y recortar para el sorteo.",
      items: visibleEntries.map((entry) => ({
        title: entry.nombre,
        subtitle: entry.telefono,
        meta: `Puntaje total: ${entry.puntajeTotal}\nSopa: ${entry.puntosSopa} | Memoria: ${entry.puntosMemoria} | Pelicula: ${entry.puntosPelicula}`,
        footer: "Hola Varela - Desafios",
      })),
    })
  }

  const handleDraw = async () => {
    const parsedCount = Number(winnersCount)
    if (!Number.isInteger(parsedCount) || parsedCount <= 0) {
      setErrorMessage("Ingresa una cantidad valida de ganadores.")
      return
    }

    if (visibleEntries.length === 0) {
      setErrorMessage("No hay participantes disponibles para sortear.")
      return
    }

    setDrawing(true)
    setErrorMessage("")
    setMessage("")
    setShareMessage("")

    const selectedWinners = shuffleEntries(visibleEntries).slice(
      0,
      Math.min(parsedCount, visibleEntries.length)
    )

    const { data: drawRow, error: drawError } = await supabase
      .from("desafio_sorteos")
      .insert([{ cantidad_ganadores: selectedWinners.length }])
      .select("id")
      .single()

    if (drawError) {
      setErrorMessage(`No se pudo guardar el sorteo: ${drawError.message}`)
      setDrawing(false)
      return
    }

    const { error: winnersError } = await supabase
      .from("desafio_sorteo_ganadores")
      .insert(
        selectedWinners.map((winner) => ({
          sorteo_id: Number(drawRow.id),
          participacion_id: winner.id,
        }))
      )

    if (winnersError) {
      setErrorMessage(`No se pudieron guardar los ganadores: ${winnersError.message}`)
      setDrawing(false)
      return
    }

    await logAdminActivity({
      action: "Sortear",
      section: "Desafios",
      target: `Sorteo de ${selectedWinners.length} ganadores`,
      details: "Realizo un sorteo aleatorio desde los participantes de desafios.",
    })

    await loadData()
    setMessage(`Sorteo realizado con ${selectedWinners.length} ganador(es).`)
    setDrawing(false)
  }

  const handleResetDraws = async () => {
    setResettingDraws(true)
    setErrorMessage("")
    setMessage("")

    const { error: deleteWinnersError } = await supabase
      .from("desafio_sorteo_ganadores")
      .delete()
      .gte("id", 0)

    if (deleteWinnersError) {
      setErrorMessage(`No se pudieron reiniciar los ganadores: ${deleteWinnersError.message}`)
      setResettingDraws(false)
      return
    }

    const { error: deleteDrawsError } = await supabase
      .from("desafio_sorteos")
      .delete()
      .gte("id", 0)

    if (deleteDrawsError) {
      setErrorMessage(`No se pudieron reiniciar los sorteos: ${deleteDrawsError.message}`)
      setResettingDraws(false)
      return
    }

    setDraws([])
    setWinners([])
    setShowResetDrawsConfirm(false)
    setMessage("Se reiniciaron los sorteos y ganadores de desafios.")

    await logAdminActivity({
      action: "Reiniciar sorteos",
      section: "Desafios",
      target: "Sorteos de desafios",
      details: "Elimino sorteos y ganadores para volver a empezar desde cero.",
    })

    setResettingDraws(false)
  }

  const handleToggleDelivered = async (
    winnerRowId: number,
    delivered: boolean,
    winnerName: string
  ) => {
    setErrorMessage("")
    setMessage("")

    const payload = delivered
      ? { entregado: false, entregado_at: null }
      : { entregado: true, entregado_at: new Date().toISOString() }

    const { error } = await supabase
      .from("desafio_sorteo_ganadores")
      .update(payload)
      .eq("id", winnerRowId)

    if (error) {
      setErrorMessage(`No se pudo actualizar la entrega del premio: ${error.message}`)
      return
    }

    setWinners((prev) =>
      prev.map((winner) =>
        winner.id === winnerRowId
          ? {
              ...winner,
              entregado: !delivered,
              entregadoAt: delivered ? null : payload.entregado_at,
            }
          : winner
      )
    )

    setMessage(
      delivered
        ? `Quitaste la marca de premio entregado para ${winnerName}.`
        : `Marcaste como premio entregado a ${winnerName}.`
    )

    await logAdminActivity({
      action: delivered ? "Quitar entrega" : "Marcar entrega",
      section: "Desafios",
      target: winnerName,
      details: "Actualizo el estado de entrega del premio de un ganador de desafios.",
    })
  }

  const handleDeleteEntry = async () => {
    if (!entryToDelete) return

    setDeletingEntry(true)
    setErrorMessage("")
    setMessage("")

    const { error: deleteWinnerLinksError } = await supabase
      .from("desafio_sorteo_ganadores")
      .delete()
      .eq("participacion_id", entryToDelete.id)

    if (deleteWinnerLinksError) {
      setErrorMessage(
        `No se pudieron quitar los sorteos del participante: ${deleteWinnerLinksError.message}`
      )
      setDeletingEntry(false)
      return
    }

    const { error: deleteEntryError } = await supabase
      .from("desafio_participaciones")
      .delete()
      .eq("id", entryToDelete.id)

    if (deleteEntryError) {
      setErrorMessage(`No se pudo eliminar el participante: ${deleteEntryError.message}`)
      setDeletingEntry(false)
      return
    }

    setEntries((prev) => prev.filter((entry) => entry.id !== entryToDelete.id))
    setWinners((prev) => prev.filter((winner) => winner.participacionId !== entryToDelete.id))
    setEntryToDelete(null)
    setMessage(`Eliminaste a ${entryToDelete.nombre} de los desafios.`)

    await logAdminActivity({
      action: "Eliminar participante",
      section: "Desafios",
      target: entryToDelete.nombre,
      details: "Elimino un participante de desafios desde admin.",
    })

    setDeletingEntry(false)
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-600 shadow-sm">
        Cargando desafios...
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl">
      <AdminConfirmModal
        isOpen={Boolean(entryToDelete)}
        title="Eliminar participante"
        description={`Vas a eliminar a "${entryToDelete?.nombre || ""}" de los desafios. Tambien se quitaran sus registros de sorteos.`}
        confirmLabel="Eliminar"
        onCancel={() => setEntryToDelete(null)}
        onConfirm={() => {
          void handleDeleteEntry()
        }}
        isLoading={deletingEntry}
      />
      <AdminConfirmModal
        isOpen={showResetDrawsConfirm}
        title="Reiniciar sorteos"
        description="Vas a borrar los sorteos y ganadores registrados en desafios para volver a empezar desde cero. Los participantes quedan guardados."
        confirmLabel="Reiniciar"
        confirmVariant="primary"
        onCancel={() => setShowResetDrawsConfirm(false)}
        onConfirm={() => {
          void handleResetDraws()
        }}
        isLoading={resettingDraws}
      />

      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-slate-900">Desafios</h1>
        <p className="mt-2 text-slate-500">
          Aqui ves participantes, puntajes, telefonos y puedes realizar sorteos aleatorios.
        </p>
      </div>

      {!schemaReady ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
          {schemaMessage
            ? `Falta actualizar el esquema de desafios en Supabase: ${schemaMessage}`
            : "Primero corre el SQL actualizado en Supabase para crear las tablas de desafios."}
        </div>
      ) : (
        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Acceso rapido
                </div>
                <h2 className="mt-1 text-xl font-semibold text-slate-900">
                  Link y QR del juego
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  Usa este acceso para compartir la experiencia de desafios en ferias, eventos o actividades.
                </p>
                <div className="mt-3 break-all rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  {challengePublicUrl}
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => void handleCopyPublicLink()}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <Copy className="h-4 w-4" />
                  Copiar link
                </button>
                <button
                  type="button"
                  onClick={handleDownloadQr}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <QrCode className="h-4 w-4" />
                  Descargar QR
                </button>
                <a
                  href={challengePublicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <ExternalLink className="h-4 w-4" />
                  Ver pagina publica
                </a>
              </div>
            </div>

            {shareMessage ? (
              <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700">
                {shareMessage}
              </div>
            ) : null}
          </section>

          <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Participantes
                  </div>
                  <div className="mt-1 text-2xl font-semibold text-slate-900">
                    {entries.length}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleExportCsv}
                  disabled={visibleEntries.length === 0}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Download className="h-4 w-4" />
                  Exportar CSV
                </button>
                <button
                  type="button"
                  onClick={handlePrintCoupons}
                  disabled={visibleEntries.length === 0}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Download className="h-4 w-4" />
                  Descargar PDF cupones
                </button>
              </div>

              <div className="mb-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_240px]">
                <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                  <Search className="h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Buscar por nombre o telefono"
                    className="w-full outline-none"
                  />
                </label>

                <select
                  value={sortBy}
                  onChange={(event) =>
                    setSortBy(event.target.value === "score_desc" ? "score_desc" : "recent")
                  }
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-emerald-500"
                >
                  <option value="recent">Ordenar por mas recientes</option>
                  <option value="score_desc">Ordenar por mayor puntaje</option>
                </select>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr className="text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        <th className="px-4 py-3">Nombre</th>
                        <th className="px-4 py-3">Telefono</th>
                        <th className="px-4 py-3">Puntos</th>
                        <th className="px-4 py-3">Detalle</th>
                        <th className="px-4 py-3">Fecha</th>
                        <th className="px-4 py-3">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {visibleEntries.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-6 text-sm text-slate-500">
                            No encontramos participantes con ese filtro.
                          </td>
                        </tr>
                      ) : (
                        visibleEntries.map((entry) => (
                          <tr key={entry.id} className="text-sm text-slate-700">
                            <td className="px-4 py-3 font-medium text-slate-900">{entry.nombre}</td>
                            <td className="px-4 py-3">{entry.telefono}</td>
                            <td className="px-4 py-3 font-semibold">{entry.puntajeTotal}</td>
                            <td className="px-4 py-3 text-xs leading-6 text-slate-500">
                              <div>Sopa: {entry.puntosSopa}</div>
                              <div>Memoria: {entry.puntosMemoria}</div>
                              <div>Pelicula: {entry.puntosPelicula}</div>
                            </td>
                            <td className="px-4 py-3">
                              {entry.createdAt
                                ? new Date(entry.createdAt).toLocaleString("es-UY", {
                                    dateStyle: "short",
                                    timeStyle: "short",
                                  })
                                : "-"}
                            </td>
                            <td className="px-4 py-3">
                              <button
                                type="button"
                                onClick={() => setEntryToDelete(entry)}
                                className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                                Eliminar
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <aside className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-emerald-600 p-3 text-white">
                    <Shuffle className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">Sorteo aleatorio</h2>
                    <p className="text-sm text-slate-500">
                      Elige cuantas personas quieres sacar como ganadoras.
                    </p>
                  </div>
                </div>

                {errorMessage ? (
                  <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {errorMessage}
                  </div>
                ) : null}

                {message ? (
                  <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    {message}
                  </div>
                ) : null}

                <div className="mt-5">
                  <label className="mb-2 block text-sm font-medium text-slate-900">
                    Cantidad de ganadores
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={Math.max(1, visibleEntries.length)}
                    value={winnersCount}
                    onChange={(event) => setWinnersCount(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-emerald-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => void handleDraw()}
                  disabled={drawing || visibleEntries.length === 0}
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Trophy className="h-5 w-5" />
                  {drawing ? "Sorteando..." : "Realizar sorteo"}
                </button>

                <button
                  type="button"
                  onClick={() => setShowResetDrawsConfirm(true)}
                  disabled={resettingDraws || (draws.length === 0 && winners.length === 0)}
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RotateCcw className="h-5 w-5" />
                  {resettingDraws ? "Reiniciando..." : "Reiniciar sorteos"}
                </button>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Ultimo sorteo
                </div>
                {latestDraw ? (
                  <>
                    <div className="mt-2 text-lg font-semibold text-slate-900">
                      {latestDraw.cantidadGanadores} ganador(es)
                    </div>
                    <div className="mt-1 text-sm text-slate-500">
                      {latestDraw.createdAt
                        ? new Date(latestDraw.createdAt).toLocaleString("es-UY", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })
                        : "-"}
                    </div>
                    <div className="mt-5 space-y-3">
                      {latestWinners.map((winner) => (
                        <div
                          key={winner.id}
                          className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <div className="font-semibold text-slate-900">{winner.nombre}</div>
                              <div className="text-sm text-slate-600">{winner.telefono}</div>
                              <div className="text-sm text-emerald-700">
                                Puntaje: {winner.puntajeTotal}
                              </div>
                              <div
                                className={`mt-2 text-xs font-semibold uppercase tracking-[0.16em] ${
                                  winner.entregado ? "text-emerald-700" : "text-amber-700"
                                }`}
                              >
                                {winner.entregado ? "Premio entregado" : "Pendiente de entrega"}
                              </div>
                              {winner.entregadoAt ? (
                                <div className="mt-1 text-xs text-slate-500">
                                  {new Date(winner.entregadoAt).toLocaleString("es-UY", {
                                    dateStyle: "short",
                                    timeStyle: "short",
                                  })}
                                </div>
                              ) : null}
                            </div>
                            <div className="flex flex-col gap-2 sm:items-end">
                              <button
                                type="button"
                                onClick={() =>
                                  void handleToggleDelivered(
                                    winner.winnerRowId,
                                    winner.entregado,
                                    winner.nombre
                                  )
                                }
                                className={`inline-flex items-center justify-center rounded-xl px-3 py-2 text-xs font-semibold transition ${
                                  winner.entregado
                                    ? "border border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-100"
                                    : "bg-emerald-600 text-white hover:bg-emerald-500"
                                }`}
                              >
                                {winner.entregado ? "Quitar marca" : "Marcar entregado"}
                              </button>
                              <button
                                type="button"
                                onClick={() => setEntryToDelete(winner)}
                                className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                                Eliminar participante
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="mt-3 text-sm text-slate-500">
                    Todavia no realizaste ningun sorteo desde este panel.
                  </div>
                )}
              </div>
            </aside>
          </section>
        </div>
      )}
    </div>
  )
}
