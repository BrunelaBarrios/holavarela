'use client'

import { useEffect, useMemo, useState } from "react"
import { Mail, MessageSquare, Phone, Search, Trash2, UserRound } from "lucide-react"
import { AdminConfirmModal } from "../../components/AdminConfirmModal"
import { supabase } from "../../supabase"
import { logAdminActivity } from "../../lib/adminActivity"

type ContactoSolicitud = {
  id: number
  nombre: string
  email: string
  telefono: string
  mensaje: string
  created_at: string
}

type ContactFilter = "all" | "alta" | "contacto"

function isAltaSolicitud(item: ContactoSolicitud) {
  return item.mensaje.startsWith("Solicitud de alta desde /sumate")
}

export default function AdminContactosPage() {
  const [solicitudes, setSolicitudes] = useState<ContactoSolicitud[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<ContactFilter>("all")
  const [deletingSolicitud, setDeletingSolicitud] = useState<ContactoSolicitud | null>(null)

  useEffect(() => {
    const cargarSolicitudes = async () => {
      const { data, error } = await supabase
        .from("contacto_solicitudes")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) {
        setError(`No se pudieron cargar las solicitudes: ${error.message}`)
        setLoading(false)
        return
      }

      setSolicitudes(data || [])
      setLoading(false)
    }

    void cargarSolicitudes()
  }, [])

  const solicitudesFiltradas = useMemo(() => {
    const term = search.trim().toLowerCase()
    return solicitudes.filter((item) => {
      const matchesFilter =
        filter === "all"
          ? true
          : filter === "alta"
            ? isAltaSolicitud(item)
            : !isAltaSolicitud(item)

      if (!matchesFilter) return false
      if (!term) return true

      const content = `${item.nombre} ${item.email} ${item.telefono} ${item.mensaje}`.toLowerCase()
      return content.includes(term)
    })
  }, [filter, search, solicitudes])

  const altasCount = useMemo(
    () => solicitudes.filter((item) => isAltaSolicitud(item)).length,
    [solicitudes]
  )

  const contactosCount = solicitudes.length - altasCount

  const formatearFecha = (fecha: string) => {
    const date = new Date(fecha)
    if (Number.isNaN(date.getTime())) return fecha

    return date.toLocaleString("es-UY", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const handleDelete = async (id: number) => {
    const solicitud = solicitudes.find((item) => item.id === id)
    if (!solicitud) return

    const { error } = await supabase.from("contacto_solicitudes").delete().eq("id", id)

    if (error) {
      setError(`No se pudo eliminar la solicitud: ${error.message}`)
      return
    }

    setSolicitudes((prev) => prev.filter((item) => item.id !== id))
    setDeletingSolicitud(null)
    await logAdminActivity({
      action: "Eliminar",
      section: "Contactos",
      target: solicitud.nombre,
      details: solicitud.email,
    })
  }

  return (
    <div className="mx-auto max-w-6xl">
      <AdminConfirmModal
        isOpen={Boolean(deletingSolicitud)}
        title="Eliminar solicitud"
        description={`Vas a eliminar la solicitud de "${deletingSolicitud?.nombre || ""}". Esta accion no se puede deshacer.`}
        confirmLabel="Eliminar"
        onCancel={() => setDeletingSolicitud(null)}
        onConfirm={() => {
          if (deletingSolicitud) {
            void handleDelete(deletingSolicitud.id)
          }
        }}
      />

      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-semibold text-slate-900">Contactos</h1>
        <p className="text-slate-500">Solicitudes enviadas desde el formulario de Hola Varela.</p>
      </div>

      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-3">
            <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Total recibidos: <span className="font-semibold text-slate-900">{solicitudes.length}</span>
            </div>
            <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              Altas: <span className="font-semibold">{altasCount}</span>
            </div>
            <div className="rounded-xl bg-sky-50 px-4 py-3 text-sm text-sky-700">
              Contactos: <span className="font-semibold">{contactosCount}</span>
            </div>
          </div>

          <div className="flex flex-col gap-3 md:w-[420px]">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setFilter("all")}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  filter === "all"
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Todas
              </button>
              <button
                type="button"
                onClick={() => setFilter("alta")}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  filter === "alta"
                    ? "bg-emerald-600 text-white"
                    : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                }`}
              >
                Altas
              </button>
              <button
                type="button"
                onClick={() => setFilter("contacto")}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  filter === "contacto"
                    ? "bg-sky-600 text-white"
                    : "bg-sky-50 text-sky-700 hover:bg-sky-100"
                }`}
              >
                Contacto
              </button>
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre, email, numero o mensaje"
                className="w-full bg-transparent text-sm outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-500 shadow-sm">
          Cargando contactos...
        </div>
      ) : solicitudesFiltradas.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-500 shadow-sm">
          No hay solicitudes para mostrar.
        </div>
      ) : (
        <div className="space-y-4">
          {solicitudesFiltradas.map((item) => {
            const isAlta = isAltaSolicitud(item)

            return (
              <article
                key={item.id}
                className={`rounded-2xl border bg-white p-5 shadow-sm ${
                  isAlta ? "border-emerald-200" : "border-slate-200"
                }`}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2 text-slate-900">
                      <UserRound className="h-5 w-5 text-sky-600" />
                      <h2 className="text-xl font-semibold">{item.nombre}</h2>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${
                          isAlta
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {isAlta ? "Alta / Sumate" : "Contacto"}
                      </span>
                    </div>

                    <div className="flex flex-col gap-2 text-sm text-slate-600 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
                      <a
                        href={`mailto:${item.email}`}
                        className="inline-flex items-center gap-2 transition hover:text-sky-700"
                      >
                        <Mail className="h-4 w-4" />
                        <span>{item.email}</span>
                      </a>

                      <a
                        href={`tel:${item.telefono}`}
                        className="inline-flex items-center gap-2 transition hover:text-sky-700"
                      >
                        <Phone className="h-4 w-4" />
                        <span>{item.telefono}</span>
                      </a>
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-500">
                    {formatearFecha(item.created_at)}
                  </div>
                </div>

                <div className={`mt-4 rounded-2xl p-4 ${isAlta ? "bg-emerald-50/70" : "bg-slate-50"}`}>
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                    <MessageSquare className={`h-4 w-4 ${isAlta ? "text-emerald-600" : "text-sky-600"}`} />
                    {isAlta ? "Detalle de alta" : "Mensaje"}
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-7 text-slate-600">
                    {item.mensaje}
                  </p>
                </div>

                <div className="mt-4 flex justify-end border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={() => setDeletingSolicitud(item)}
                    className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    Borrar
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
