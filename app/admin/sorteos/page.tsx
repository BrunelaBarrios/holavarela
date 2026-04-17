'use client'

import { useEffect, useMemo, useState } from "react"
import { Copy, Download, Gift, Plus, QrCode, Save, Search } from "lucide-react"
import { supabase } from "../../supabase"
import { logAdminActivity } from "../../lib/adminActivity"
import { isMissingSweepstakesSchemaError } from "../../lib/sweepstakes"

type SorteoParticipantType = "comercio" | "servicio" | "institucion"

type SorteoForm = {
  titulo: string
  activo: boolean
  descripcion: string
  participante1Key: string
  participante2Key: string
}

type SorteoCampaign = {
  id: number
  titulo: string
  activo: boolean
  descripcion: string
  participante1Key: string
  participante2Key: string
  updatedAt: string | null
  entriesCount: number
}

type SweepstakesEntry = {
  id: number
  sorteoId: number | null
  nombre: string
  telefono: string
  totalLikes: number
  createdAt: string | null
}

type ParticipantOption = {
  key: string
  type: SorteoParticipantType
  id: number
  nombre: string
  label: string
}

const createEmptyForm = (): SorteoForm => ({
  titulo: "",
  activo: false,
  descripcion: "",
  participante1Key: "",
  participante2Key: "",
})

const PUBLIC_SITE_URL = "https://www.holavarela.uy"

function buildSweepstakesPublicUrl(sorteoId?: number | null) {
  return sorteoId ? `${PUBLIC_SITE_URL}/sorteo/${sorteoId}` : `${PUBLIC_SITE_URL}/sorteo`
}

function buildSweepstakesQrUrl(sorteoId?: number | null) {
  const publicUrl = buildSweepstakesPublicUrl(sorteoId)
  return `https://api.qrserver.com/v1/create-qr-code/?size=1200x1200&data=${encodeURIComponent(publicUrl)}`
}

function buildCampaign(item: {
  id: number
  titulo?: string | null
  activo?: boolean | null
  descripcion?: string | null
  participante_tipo_1?: SorteoParticipantType | null
  participante_id_1?: number | null
  participante_tipo_2?: SorteoParticipantType | null
  participante_id_2?: number | null
  comercio_id_1?: number | null
  comercio_id_2?: number | null
  updated_at?: string | null
  entriesCount?: number
}): SorteoCampaign {
  const participante1Key =
    item.participante_tipo_1 && item.participante_id_1
      ? `${item.participante_tipo_1}:${item.participante_id_1}`
      : item.comercio_id_1
        ? `comercio:${item.comercio_id_1}`
        : ""

  const participante2Key =
    item.participante_tipo_2 && item.participante_id_2
      ? `${item.participante_tipo_2}:${item.participante_id_2}`
      : item.comercio_id_2
        ? `comercio:${item.comercio_id_2}`
        : ""

  return {
    id: item.id,
    titulo: item.titulo?.trim() || `Sorteo #${item.id}`,
    activo: Boolean(item.activo),
    descripcion: item.descripcion || "",
    participante1Key,
    participante2Key,
    updatedAt: item.updated_at || null,
    entriesCount: item.entriesCount || 0,
  }
}

function buildParticipantKey(type: SorteoParticipantType, id: number) {
  return `${type}:${id}`
}

function parseParticipantKey(
  value: string
): { type: SorteoParticipantType; id: number } | null {
  const [type, rawId] = value.split(":")
  if (
    (type !== "comercio" && type !== "servicio" && type !== "institucion") ||
    !rawId
  ) {
    return null
  }

  const id = Number(rawId)
  if (!Number.isFinite(id)) return null

  return { type, id }
}

export default function AdminSorteosPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [schemaReady, setSchemaReady] = useState(true)
  const [campaigns, setCampaigns] = useState<SorteoCampaign[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [form, setForm] = useState<SorteoForm>(createEmptyForm())
  const [participantOptions, setParticipantOptions] = useState<ParticipantOption[]>([])
  const [entriesCount, setEntriesCount] = useState<number>(0)
  const [entries, setEntries] = useState<SweepstakesEntry[]>([])
  const [entrySearch, setEntrySearch] = useState("")
  const [entryScope, setEntryScope] = useState<"selected" | "all">("selected")
  const [saveMessage, setSaveMessage] = useState("")
  const [saveError, setSaveError] = useState("")
  const [shareMessage, setShareMessage] = useState("")

  const selectedCampaign = useMemo(
    () => campaigns.find((item) => item.id === selectedId) || null,
    [campaigns, selectedId]
  )

  const selectedParticipantLabels = useMemo(() => {
    const byKey = new Map(participantOptions.map((item) => [item.key, item.label]))
    return [form.participante1Key, form.participante2Key]
      .filter((value, index, array) => Boolean(value) && array.indexOf(value) === index)
      .map((key) => byKey.get(key) || "Participante")
  }, [participantOptions, form.participante1Key, form.participante2Key])
  const selectedSweepstakesPublicUrl = useMemo(
    () => buildSweepstakesPublicUrl(selectedId),
    [selectedId]
  )
  const selectedSweepstakesQrUrl = useMemo(
    () => buildSweepstakesQrUrl(selectedId),
    [selectedId]
  )
  const visibleEntries = useMemo(() => {
    const normalizedSearch = entrySearch.trim().toLowerCase()

    return entries.filter((entry) => {
      const matchesScope =
        entryScope === "all" || !selectedCampaign || entry.sorteoId === selectedCampaign.id
      if (!matchesScope) return false

      if (!normalizedSearch) return true

      return `${entry.nombre} ${entry.telefono}`.toLowerCase().includes(normalizedSearch)
    })
  }, [entries, entryScope, entrySearch, selectedCampaign])

  const applyCampaign = (campaign: SorteoCampaign | null) => {
    if (!campaign) {
      setSelectedId(null)
      setForm(createEmptyForm())
      return
    }

    setSelectedId(campaign.id)
    setForm({
      titulo: campaign.titulo,
      activo: campaign.activo,
      descripcion: campaign.descripcion,
      participante1Key: campaign.participante1Key,
      participante2Key: campaign.participante2Key,
    })
  }

  const loadData = async (preferredId?: number | null) => {
    const [
      { data: configRows, error: configError },
      { data: comerciosRows, error: comerciosError },
      { data: serviciosRows, error: serviciosError },
      { data: institucionesRows, error: institucionesError },
      { data: entriesRows, count, error: entriesError },
    ] = await Promise.all([
      supabase
        .from("sorteo_popup_config")
        .select("id, titulo, activo, descripcion, participante_tipo_1, participante_id_1, participante_tipo_2, participante_id_2, comercio_id_1, comercio_id_2, updated_at")
        .order("updated_at", { ascending: false }),
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
        .from("instituciones")
        .select("id, nombre")
        .or("estado.is.null,estado.eq.activo")
        .order("nombre", { ascending: true }),
      supabase
        .from("sorteo_participaciones")
        .select("id, sorteo_id, nombre, telefono, total_likes, created_at", {
          count: "exact",
        })
        .order("created_at", { ascending: false }),
    ])

    if (configError) {
      if (isMissingSweepstakesSchemaError(configError)) {
        setSchemaReady(false)
      } else {
        setSaveError(`No se pudo cargar sorteos: ${configError.message}`)
      }
      setLoading(false)
      return
    }

    setSchemaReady(true)
    const nextParticipantOptions: ParticipantOption[] = [
      ...((comerciosRows || []) as Array<{ id: number; nombre: string }>).map((item) => ({
        key: buildParticipantKey("comercio", item.id),
        type: "comercio" as const,
        id: item.id,
        nombre: item.nombre,
        label: `Comercio: ${item.nombre}`,
      })),
      ...((serviciosRows || []) as Array<{ id: number; nombre: string }>).map((item) => ({
        key: buildParticipantKey("servicio", item.id),
        type: "servicio" as const,
        id: item.id,
        nombre: item.nombre,
        label: `Servicio: ${item.nombre}`,
      })),
      ...((institucionesRows || []) as Array<{ id: number; nombre: string }>).map((item) => ({
        key: buildParticipantKey("institucion", item.id),
        type: "institucion" as const,
        id: item.id,
        nombre: item.nombre,
        label: `Institucion: ${item.nombre}`,
      })),
    ]
    setParticipantOptions(nextParticipantOptions)

    const loadErrors = [comerciosError, serviciosError, institucionesError]
      .filter(Boolean)
      .map((error) => error?.message)
      .join(" | ")

    if (loadErrors) {
      setSaveError(`No se pudieron cargar participantes: ${loadErrors}`)
    }

    if (!entriesError) {
      setEntriesCount(count || 0)
      setEntries(
        ((entriesRows || []) as Array<{
          id: number
          sorteo_id: number | null
          nombre: string
          telefono: string
          total_likes: number
          created_at: string | null
        }>).map((entry) => ({
          id: entry.id,
          sorteoId: entry.sorteo_id,
          nombre: entry.nombre,
          telefono: entry.telefono,
          totalLikes: entry.total_likes,
          createdAt: entry.created_at,
        }))
      )
    }

    const entryCountByCampaign = new Map<number, number>()
    ;((entriesRows || []) as Array<{ sorteo_id: number | null }>).forEach((entry) => {
      if (!entry.sorteo_id) return
      entryCountByCampaign.set(
        entry.sorteo_id,
        (entryCountByCampaign.get(entry.sorteo_id) || 0) + 1
      )
    })

    const nextCampaigns = ((configRows || []) as Array<{
      id: number
      titulo?: string | null
      activo?: boolean | null
      descripcion?: string | null
      participante_tipo_1?: SorteoParticipantType | null
      participante_id_1?: number | null
      participante_tipo_2?: SorteoParticipantType | null
      participante_id_2?: number | null
      comercio_id_1?: number | null
      comercio_id_2?: number | null
      updated_at?: string | null
    }>).map((item) =>
      buildCampaign({
        ...item,
        entriesCount: entryCountByCampaign.get(item.id) || 0,
      })
    )

    setCampaigns(nextCampaigns)

    const nextSelected =
      nextCampaigns.find((item) => item.id === preferredId) ||
      nextCampaigns.find((item) => item.id === selectedId) ||
      nextCampaigns[0] ||
      null

    applyCampaign(nextSelected)
    setLoading(false)
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadData()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [])

  const handleNew = () => {
    setSaveMessage("")
    setSaveError("")
    applyCampaign(null)
  }

  const handleSelect = (campaign: SorteoCampaign) => {
    setSaveMessage("")
    setSaveError("")
    setShareMessage("")
    applyCampaign(campaign)
  }

  const handleCopyPublicLink = async () => {
    try {
      await navigator.clipboard.writeText(selectedSweepstakesPublicUrl)
      setShareMessage(
        selectedId ? `Link del sorteo #${selectedId} copiado.` : "Link del sorteo copiado."
      )
    } catch {
      setShareMessage(`Copia manualmente este link: ${selectedSweepstakesPublicUrl}`)
    }
  }

  const handleDownloadQr = () => {
    if (typeof window === "undefined") return

    const link = window.document.createElement("a")
    link.href = selectedSweepstakesQrUrl
    link.download = selectedId
      ? `qr-sorteo-hola-varela-${selectedId}.png`
      : "qr-sorteo-hola-varela.png"
    link.target = "_blank"
    link.rel = "noopener noreferrer"
    link.click()
    setShareMessage(
      selectedId
        ? `Se abrio el QR del sorteo #${selectedId} para descargar.`
        : "Se abrio el QR del sorteo para descargar."
    )
  }

  const handleExportEntriesCsv = () => {
    if (typeof window === "undefined" || visibleEntries.length === 0) return

    const campaignTitleById = new Map(campaigns.map((campaign) => [campaign.id, campaign.titulo]))
    const escapeCsv = (value: string | number | null | undefined) =>
      `"${String(value ?? "").replace(/"/g, '""')}"`

    const rows = [
      ["sorteo_id", "sorteo", "nombre", "telefono", "corazones", "fecha"],
      ...visibleEntries.map((entry) => [
        entry.sorteoId ?? "",
        entry.sorteoId
          ? campaignTitleById.get(entry.sorteoId) || `Sorteo #${entry.sorteoId}`
          : "",
        entry.nombre,
        entry.telefono,
        entry.totalLikes,
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
    link.download =
      entryScope === "all" || !selectedCampaign
        ? "cupones-hola-varela-todos.csv"
        : `cupones-hola-varela-sorteo-${selectedCampaign.id}.csv`
    link.click()
    window.URL.revokeObjectURL(url)
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setSaveMessage("")
    setSaveError("")

    if (!schemaReady) {
      setSaveError("Primero corre el SQL de sorteos en Supabase.")
      setSaving(false)
      return
    }

    const selectedParticipant1 = parseParticipantKey(form.participante1Key)
    const selectedParticipant2 =
      form.participante2Key && form.participante2Key !== form.participante1Key
        ? parseParticipantKey(form.participante2Key)
        : null

    if (form.activo) {
      const { error: deactivateError } = await supabase
        .from("sorteo_popup_config")
        .update({ activo: false })
        .neq("id", selectedId || -1)

      if (deactivateError && !isMissingSweepstakesSchemaError(deactivateError)) {
        setSaveError(`No se pudieron desactivar otros sorteos: ${deactivateError.message}`)
        setSaving(false)
        return
      }
    }

    const payload = {
      titulo: form.titulo.trim() || "Sorteo Hola Varela",
      activo: form.activo,
      descripcion: form.descripcion.trim(),
      participante_tipo_1: selectedParticipant1?.type || null,
      participante_id_1: selectedParticipant1?.id || null,
      participante_tipo_2: selectedParticipant2?.type || null,
      participante_id_2: selectedParticipant2?.id || null,
      comercio_id_1: selectedParticipant1?.type === "comercio" ? selectedParticipant1.id : null,
      comercio_id_2: selectedParticipant2?.type === "comercio" ? selectedParticipant2.id : null,
      updated_at: new Date().toISOString(),
    }

    const query = selectedId
      ? supabase.from("sorteo_popup_config").update(payload).eq("id", selectedId).select("id").single()
      : supabase.from("sorteo_popup_config").insert(payload).select("id").single()

    const { data, error } = await query

    if (error) {
      setSaveError(`No se pudo guardar el sorteo: ${error.message}`)
      setSaving(false)
      return
    }

    await logAdminActivity({
      action: selectedId ? "Editar" : "Crear",
      section: "Sorteos",
      target: payload.titulo,
      details: selectedId
        ? "Actualizo una campaña de sorteo."
        : "Creo una nueva campaña de sorteo.",
    })

    const nextId = Number(data?.id || selectedId || 0)
    await loadData(nextId)
    setSaveMessage(selectedId ? "Sorteo actualizado." : "Sorteo creado.")
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-600 shadow-sm">
        Cargando sorteos...
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-slate-900">Sorteos</h1>
        <p className="mt-2 text-slate-500">
          Crea campañas, activa una sola a la vez y define qué fichas aparecen en el popup.
        </p>
      </div>

      {!schemaReady ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
          Todavía no está creada la estructura de sorteos en Supabase. Cuando pegues el SQL, este panel queda operativo.
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Campañas
                  </div>
                  <div className="mt-1 text-lg font-semibold text-slate-900">
                    {campaigns.length} sorteos
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleNew}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-600"
                >
                  <Plus className="h-4 w-4" />
                  Nuevo
                </button>
              </div>
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Participaciones registradas: <span className="font-semibold text-slate-900">{entriesCount}</span>
              </div>
              <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-800">
                Puedes crear un sorteo nuevo en inactivo sin tocar el activo actual. Solo se desactiva el resto si marcas
                <span className="font-semibold"> Activar este sorteo</span>.
              </div>
            </div>

            <div className="space-y-3">
              {campaigns.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-sm">
                  Aún no hay sorteos creados.
                </div>
              ) : (
                campaigns.map((campaign) => (
                  <button
                    key={campaign.id}
                    type="button"
                    onClick={() => handleSelect(campaign)}
                    className={`w-full rounded-2xl border p-4 text-left shadow-sm transition ${
                      selectedId === campaign.id
                        ? "border-blue-300 bg-blue-50"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-slate-900">{campaign.titulo}</div>
                        <div className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-400">
                          ID {campaign.id}
                        </div>
                        <div className="mt-2 text-xs text-slate-500 break-all">
                          {buildSweepstakesPublicUrl(campaign.id)}
                        </div>
                        <div className="mt-3 text-sm font-medium text-slate-600">
                          Cupones: <span className="text-slate-900">{campaign.entriesCount}</span>
                        </div>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          campaign.activo
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {campaign.activo ? "Activo" : "Inactivo"}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </aside>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-xl bg-emerald-600 p-3 text-white">
                <Gift className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  {selectedCampaign ? "Editar sorteo" : "Nuevo sorteo"}
                </h2>
                <p className="text-sm text-slate-500">
                  Este popup se muestra cuando una persona suma 3 corazones en eventos.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
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

              {shareMessage ? (
                <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700">
                  {shareMessage}
                </div>
              ) : null}

              <div className="flex flex-wrap gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <button
                  type="button"
                  onClick={() => void handleCopyPublicLink()}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
                >
                  <Copy className="h-4 w-4" />
                  Copiar link sorteo
                </button>
                <button
                  type="button"
                  onClick={handleDownloadQr}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
                >
                  <QrCode className="h-4 w-4" />
                  Descargar QR
                </button>
                <a
                  href={selectedSweepstakesPublicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
                >
                  Ver pagina publica
                </a>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-900">
                  Título
                </label>
                <input
                  type="text"
                  value={form.titulo}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, titulo: event.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-emerald-500"
                  placeholder="Ejemplo: Sorteo Día de la Madre"
                />
              </div>

              <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.activo}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, activo: event.target.checked }))
                  }
                  className="h-4 w-4 border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span>Activar este sorteo</span>
              </label>
              <p className="text-sm leading-6 text-slate-500">
                Si este casillero queda apagado, el sorteo se guarda como inactivo y el sorteo activo actual sigue igual.
              </p>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-900">
                  Descripción del popup
                </label>
                <textarea
                  value={form.descripcion}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, descripcion: event.target.value }))
                  }
                  rows={5}
                  className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-emerald-500"
                  placeholder="Participá del sorteo dejando tu nombre y teléfono..."
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-900">
                    Participante 1
                  </label>
                  <select
                    value={form.participante1Key}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, participante1Key: event.target.value }))
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-emerald-500"
                  >
                    <option value="">Sin seleccionar</option>
                    {participantOptions.map((participant) => (
                      <option key={`participant-1-${participant.key}`} value={participant.key}>
                        {participant.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-900">
                    Participante 2
                  </label>
                  <select
                    value={form.participante2Key}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, participante2Key: event.target.value }))
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-emerald-500"
                  >
                    <option value="">Sin seleccionar</option>
                    {participantOptions.map((participant) => (
                      <option key={`participant-2-${participant.key}`} value={participant.key}>
                        {participant.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-[radial-gradient(circle_at_top_left,#d7f0db_0%,#e9f7ef_35%,#edf5ff_100%)] p-5">
                <div className="inline-flex rounded-full bg-white/85 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                  Sorteo Hola Varela
                </div>
                <h3 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">
                  {form.titulo.trim() || "Participá con tus corazones"}
                </h3>
                <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-700">
                  {form.descripcion.trim() || "Todavía no agregaste una descripción para este popup."}
                </p>

                {selectedParticipantLabels.length ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {selectedParticipantLabels.map((label) => (
                      <span
                        key={label}
                        className="rounded-full border border-white/80 bg-white/90 px-3 py-2 text-sm font-medium text-slate-700"
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 font-medium text-white transition hover:bg-emerald-500 disabled:opacity-60"
              >
                <Save className="h-5 w-5" />
                {saving ? "Guardando..." : selectedCampaign ? "Guardar cambios" : "Crear sorteo"}
              </button>
            </form>

            <div className="mt-8 border-t border-slate-200 pt-8">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-semibold text-slate-900">
                    Cupones cargados
                  </h3>
                  <p className="text-sm text-slate-500">
                    {selectedCampaign
                      ? `Participaciones registradas para ${selectedCampaign.titulo}.`
                      : "Selecciona un sorteo para ver sus participaciones."}
                  </p>
                </div>
                {selectedCampaign ? (
                  <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
                    {entryScope === "all"
                      ? `${visibleEntries.length} cupones`
                      : `${entries.filter((entry) => entry.sorteoId === selectedCampaign.id).length} cupones`}
                  </div>
                ) : null}
              </div>

              <div className="mb-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_auto]">
                <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                  <Search className="h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={entrySearch}
                    onChange={(event) => setEntrySearch(event.target.value)}
                    placeholder="Buscar por nombre o telefono"
                    className="w-full outline-none"
                  />
                </label>

                <select
                  value={entryScope}
                  onChange={(event) =>
                    setEntryScope(event.target.value === "all" ? "all" : "selected")
                  }
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-emerald-500"
                >
                  <option value="selected">Solo este sorteo</option>
                  <option value="all">Todos los sorteos</option>
                </select>

                <button
                  type="button"
                  onClick={handleExportEntriesCsv}
                  disabled={visibleEntries.length === 0}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Download className="h-4 w-4" />
                  Exportar CSV
                </button>
              </div>

              {!selectedCampaign && entryScope !== "all" ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
                  Elige un sorteo de la lista para ver quienes fueron completando el cupon.
                </div>
              ) : entries.filter((entry) => entry.sorteoId === selectedCampaign.id).length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
                  Todavia no hay participaciones para este sorteo.
                </div>
              ) : visibleEntries.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
                  No encontramos cupones con ese filtro.
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-slate-200">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-slate-50">
                        <tr className="text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                          <th className="px-4 py-3">Nombre</th>
                          <th className="px-4 py-3">Telefono</th>
                          <th className="px-4 py-3">Corazones</th>
                          <th className="px-4 py-3">Sorteo</th>
                          <th className="px-4 py-3">Fecha</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {visibleEntries.map((entry) => (
                            <tr key={entry.id} className="text-sm text-slate-700">
                              <td className="px-4 py-3 font-medium text-slate-900">{entry.nombre}</td>
                              <td className="px-4 py-3">{entry.telefono}</td>
                              <td className="px-4 py-3">{entry.totalLikes}</td>
                              <td className="px-4 py-3">
                                {entry.sorteoId
                                  ? campaigns.find((campaign) => campaign.id === entry.sorteoId)?.titulo || `Sorteo #${entry.sorteoId}`
                                  : "-"}
                              </td>
                              <td className="px-4 py-3">
                                {entry.createdAt
                                  ? new Date(entry.createdAt).toLocaleString("es-UY", {
                                      dateStyle: "short",
                                      timeStyle: "short",
                                    })
                                  : "-"}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
