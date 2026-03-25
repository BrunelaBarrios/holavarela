'use client'

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ArrowRight, CalendarDays, MapPin, Search } from "lucide-react"
import { PublicDetailModal } from "../components/PublicDetailModal"
import { PublicHeader } from "../components/PublicHeader"
import { buildActiveEventsFilter, formatEventDateRange } from "../lib/eventDates"
import { supabase } from "../supabase"

type Evento = {
  id: string
  titulo: string
  categoria?: string | null
  descripcion: string
  fecha: string
  fecha_fin?: string | null
  ubicacion: string
  imagen: string
  estado: string
}

const normalizeEventCategory = (categoria?: string | null) => {
  const value = categoria?.trim()
  if (!value || value.toUpperCase() === "NOT NULL") return "Evento"
  return value
}

export default function EventosPage() {
  const [eventos, setEventos] = useState<Evento[]>([])
  const [search, setSearch] = useState("")
  const [categoria, setCategoria] = useState("Todos")
  const [selectedEvento, setSelectedEvento] = useState<Evento | null>(null)

  useEffect(() => {
    const cargarEventos = async () => {
      const today = new Date().toISOString().slice(0, 10)

      const { data, error } = await supabase
        .from("eventos")
        .select("*")
        .eq("estado", "activo")
        .or(buildActiveEventsFilter(today))
        .order("fecha", { ascending: true })

      if (error) {
        console.error("Error al cargar eventos:", error)
        return
      }

      setEventos(data || [])
    }

    const timeoutId = window.setTimeout(() => {
      void cargarEventos()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [])

  const eventosFiltrados = useMemo(() => {
    const term = search.trim().toLowerCase()
    return eventos.filter((evento) => {
      const matchesCategoria =
        categoria === "Todos" ||
        normalizeEventCategory(evento.categoria) === categoria
      const matchesSearch =
        !term ||
        `${evento.titulo} ${evento.descripcion || ""} ${evento.ubicacion || ""} ${evento.fecha || ""} ${normalizeEventCategory(evento.categoria)}`
        .toLowerCase()
        .includes(term)

      return matchesCategoria && matchesSearch
    })
  }, [categoria, eventos, search])

  return (
    <main className="min-h-screen bg-white">
      <PublicDetailModal
        open={Boolean(selectedEvento)}
        onClose={() => setSelectedEvento(null)}
        title={selectedEvento?.titulo || ""}
        imageSrc={selectedEvento?.imagen || null}
        imageAlt={selectedEvento?.titulo || "Evento"}
        badge={selectedEvento ? normalizeEventCategory(selectedEvento.categoria) : null}
        description={selectedEvento?.descripcion || null}
        meta={[
          ...(selectedEvento?.fecha
            ? [{
                icon: CalendarDays,
                text: formatEventDateRange(
                  selectedEvento.fecha,
                  selectedEvento.fecha_fin
                ),
              }]
            : []),
          ...(selectedEvento?.ubicacion
            ? [{ icon: MapPin, text: selectedEvento.ubicacion }]
            : []),
        ]}
        actions={
          <Link
            href="/eventos"
            className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-500"
          >
            Ver todos los eventos
            <ArrowRight className="h-4 w-4" />
          </Link>
        }
      />

      <PublicHeader
        items={[
          { href: "/#inicio", label: "Inicio" },
          { href: "/comercios", label: "Comercios" },
          { href: "/eventos", label: "Eventos", active: true },
          { href: "/servicios", label: "Servicios" },
          { href: "/cursos", label: "Cursos y Clases" },
          { href: "/#contacto", label: "Contacto" },
        ]}
      />

      <div className="mx-auto max-w-6xl px-6 py-16">
        <h1 className="text-3xl font-bold text-gray-900">Eventos</h1>
        <p className="mt-2 text-gray-600">
          Descubri los proximos eventos de Hola Varela
        </p>

        <div className="mt-6 max-w-xl">
          <div className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-3">
            <Search className="h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por evento, ubicacion o descripcion"
              className="w-full text-sm outline-none"
            />
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {["Todos", "Evento", "Promocion", "Sorteo", "Beneficios"].map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCategoria(item)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                categoria === item
                  ? "bg-blue-600 text-white"
                  : "border border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:text-blue-600"
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        {eventosFiltrados.length === 0 ? (
          <div className="mt-10 rounded-xl border border-gray-200 bg-gray-50 p-8 text-center">
            <p className="text-gray-600">
              {eventos.length === 0
                ? "Todavia no hay eventos cargados."
                : "No se encontraron eventos con esa busqueda."}
            </p>
          </div>
        ) : (
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {eventosFiltrados.map((evento) => (
              <div
                key={evento.id}
                className="rounded-xl border border-gray-200 p-5 shadow-sm"
              >
                {evento.imagen && (
                  <img
                    src={evento.imagen}
                    alt={evento.titulo}
                    className="mb-4 h-48 w-full rounded-lg object-cover"
                  />
                )}

                <h2 className="text-xl font-semibold text-gray-900">
                  {evento.titulo}
                </h2>
                <div className="mt-3 inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                  {normalizeEventCategory(evento.categoria)}
                </div>

                <p className="mt-2 text-sm text-gray-600">
                  Fecha: {formatEventDateRange(evento.fecha, evento.fecha_fin)}
                </p>

                <p className="mt-1 text-sm text-gray-600">
                  Ubicacion: {evento.ubicacion}
                </p>

                <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-gray-700">
                  {evento.descripcion}
                </p>

                <button
                  type="button"
                  onClick={() => setSelectedEvento(evento)}
                  className="mt-5 inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
                >
                  Ver mas
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
