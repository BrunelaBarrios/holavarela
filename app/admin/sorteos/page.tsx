'use client'

import { useEffect, useMemo, useState } from "react"
import { Gift, Plus, Save } from "lucide-react"
import { supabase } from "../../supabase"
import { logAdminActivity } from "../../lib/adminActivity"
import { isMissingSweepstakesSchemaError } from "../../lib/sweepstakes"

type SorteoForm = {
  titulo: string
  activo: boolean
  descripcion: string
  comercio1Id: string
  comercio2Id: string
}

type SorteoCampaign = {
  id: number
  titulo: string
  activo: boolean
  descripcion: string
  comercio1Id: string
  comercio2Id: string
  updatedAt: string | null
}

type ComercioOption = {
  id: number
  nombre: string
}

const createEmptyForm = (): SorteoForm => ({
  titulo: "",
  activo: false,
  descripcion: "",
  comercio1Id: "",
  comercio2Id: "",
})

function buildCampaign(item: {
  id: number
  titulo?: string | null
  activo?: boolean | null
  descripcion?: string | null
  comercio_id_1?: number | null
  comercio_id_2?: number | null
  updated_at?: string | null
}): SorteoCampaign {
  return {
    id: item.id,
    titulo: item.titulo?.trim() || `Sorteo #${item.id}`,
    activo: Boolean(item.activo),
    descripcion: item.descripcion || "",
    comercio1Id: item.comercio_id_1 ? String(item.comercio_id_1) : "",
    comercio2Id: item.comercio_id_2 ? String(item.comercio_id_2) : "",
    updatedAt: item.updated_at || null,
  }
}

export default function AdminSorteosPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [schemaReady, setSchemaReady] = useState(true)
  const [campaigns, setCampaigns] = useState<SorteoCampaign[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [form, setForm] = useState<SorteoForm>(createEmptyForm())
  const [comercios, setComercios] = useState<ComercioOption[]>([])
  const [entriesCount, setEntriesCount] = useState<number>(0)
  const [saveMessage, setSaveMessage] = useState("")
  const [saveError, setSaveError] = useState("")

  const selectedCampaign = useMemo(
    () => campaigns.find((item) => item.id === selectedId) || null,
    [campaigns, selectedId]
  )

  const selectedComercioLabels = useMemo(() => {
    const byId = new Map(comercios.map((item) => [String(item.id), item.nombre]))
    return [form.comercio1Id, form.comercio2Id]
      .filter((value, index, array) => Boolean(value) && array.indexOf(value) === index)
      .map((id) => byId.get(id) || "Comercio")
  }, [comercios, form.comercio1Id, form.comercio2Id])

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
      comercio1Id: campaign.comercio1Id,
      comercio2Id: campaign.comercio2Id,
    })
  }

  const loadData = async (preferredId?: number | null) => {
    const [
      { data: configRows, error: configError },
      { data: comerciosRows, error: comerciosError },
      { count, error: entriesError },
    ] = await Promise.all([
      supabase
        .from("sorteo_popup_config")
        .select("id, titulo, activo, descripcion, comercio_id_1, comercio_id_2, updated_at")
        .order("updated_at", { ascending: false }),
      supabase
        .from("comercios")
        .select("id, nombre")
        .or("estado.is.null,estado.eq.activo")
        .order("nombre", { ascending: true }),
      supabase
        .from("sorteo_participaciones")
        .select("*", { count: "exact", head: true }),
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
    setComercios((comerciosRows || []) as ComercioOption[])

    if (comerciosError) {
      setSaveError(`No se pudo cargar comercios: ${comerciosError.message}`)
    }

    if (!entriesError) {
      setEntriesCount(count || 0)
    }

    const nextCampaigns = ((configRows || []) as Array<{
      id: number
      titulo?: string | null
      activo?: boolean | null
      descripcion?: string | null
      comercio_id_1?: number | null
      comercio_id_2?: number | null
      updated_at?: string | null
    }>).map(buildCampaign)

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
    void loadData()
  }, [])

  const handleNew = () => {
    setSaveMessage("")
    setSaveError("")
    applyCampaign(null)
  }

  const handleSelect = (campaign: SorteoCampaign) => {
    setSaveMessage("")
    setSaveError("")
    applyCampaign(campaign)
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

    const selectedComercio1 = form.comercio1Id ? Number(form.comercio1Id) : null
    const selectedComercio2 =
      form.comercio2Id && form.comercio2Id !== form.comercio1Id
        ? Number(form.comercio2Id)
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
      comercio_id_1: selectedComercio1,
      comercio_id_2: selectedComercio2,
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
          Crea campañas, activa una sola a la vez y define qué comercios aparecen en el popup.
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
                    Comercio participante 1
                  </label>
                  <select
                    value={form.comercio1Id}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, comercio1Id: event.target.value }))
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-emerald-500"
                  >
                    <option value="">Sin seleccionar</option>
                    {comercios.map((comercio) => (
                      <option key={`comercio-1-${comercio.id}`} value={comercio.id}>
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
                    value={form.comercio2Id}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, comercio2Id: event.target.value }))
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-emerald-500"
                  >
                    <option value="">Sin seleccionar</option>
                    {comercios.map((comercio) => (
                      <option key={`comercio-2-${comercio.id}`} value={comercio.id}>
                        {comercio.nombre}
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

                {selectedComercioLabels.length ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {selectedComercioLabels.map((label) => (
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
          </section>
        </div>
      )}
    </div>
  )
}
