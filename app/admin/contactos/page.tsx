'use client'

import { useEffect, useMemo, useState } from "react"
import { Mail, MessageSquare, Phone, Search, UserRound } from "lucide-react"
import { supabase } from "../../supabase"

type ContactoSolicitud = {
  id: number
  nombre: string
  email: string
  telefono: string
  mensaje: string
  created_at: string
}

export default function AdminContactosPage() {
  const [solicitudes, setSolicitudes] = useState<ContactoSolicitud[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")

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
    if (!term) return solicitudes

    return solicitudes.filter((item) => {
      const content = `${item.nombre} ${item.email} ${item.telefono} ${item.mensaje}`.toLowerCase()
      return content.includes(term)
    })
  }, [solicitudes, search])

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

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-semibold text-slate-900">Contactos</h1>
        <p className="text-slate-500">
          Solicitudes enviadas desde el formulario de Hola Varela.
        </p>
      </div>

      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Total recibidos:{" "}
            <span className="font-semibold text-slate-900">{solicitudes.length}</span>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 md:w-[360px]">
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
          {solicitudesFiltradas.map((item) => (
            <article
              key={item.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-slate-900">
                    <UserRound className="h-5 w-5 text-sky-600" />
                    <h2 className="text-xl font-semibold">{item.nombre}</h2>
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

              <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                  <MessageSquare className="h-4 w-4 text-sky-600" />
                  Mensaje
                </div>
                <p className="whitespace-pre-wrap text-sm leading-7 text-slate-600">
                  {item.mensaje}
                </p>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
