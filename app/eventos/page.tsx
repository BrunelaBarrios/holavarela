'use client'

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { Radio, Search } from "lucide-react"
import { supabase } from "../supabase"

type Evento = {
  id: string
  titulo: string
  descripcion: string
  fecha: string
  ubicacion: string
  imagen: string
  estado: string
}

export default function EventosPage() {
  const [eventos, setEventos] = useState<Evento[]>([])
  const [search, setSearch] = useState("")

  useEffect(() => {
    const cargarEventos = async () => {
      const today = new Date().toISOString().slice(0, 10)

      const { data, error } = await supabase
        .from("eventos")
        .select("*")
        .eq("estado", "activo")
        .gte("fecha", today)
        .order("fecha", { ascending: true })

      if (error) {
        console.error("Error al cargar eventos:", error)
        return
      }

      setEventos(data || [])
    }

    cargarEventos()
  }, [])

  const formatearFecha = (fecha: string) => {
    if (!fecha) return ""

    const partes = fecha.split("-")
    if (partes.length !== 3) return fecha

    const [anio, mes, dia] = partes
    return `${dia}/${mes}/${anio}`
  }

  const eventosFiltrados = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return eventos

    return eventos.filter((evento) =>
      `${evento.titulo} ${evento.descripcion || ""} ${evento.ubicacion || ""} ${evento.fecha || ""}`
        .toLowerCase()
        .includes(term)
    )
  }, [eventos, search])

  return (
    <main className="min-h-screen bg-white">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <img
              src="/logo-varela-chico.png"
              alt="Hola Varela"
              className="h-10 w-auto"
            />
            <span className="text-[20px] font-semibold tracking-tight">
              Hola Varela!
            </span>
          </Link>

          <nav className="hidden items-center gap-8 text-[15px] font-medium text-slate-700 md:flex">
            <Link href="/#inicio" className="hover:text-blue-500">
              Inicio
            </Link>
            <Link href="/#radio" className="hover:text-blue-500">
              Radio en Vivo
            </Link>
            <Link href="/comercios" className="hover:text-blue-500">
              Comercios
            </Link>
            <Link href="/eventos" className="text-blue-500">
              Eventos
            </Link>
            <Link href="/servicios" className="hover:text-blue-500">
              Servicios
            </Link>
            <Link href="/cursos" className="hover:text-blue-500">
              Cursos y Clases
            </Link>
            <Link href="/#contacto" className="hover:text-blue-500">
              Contacto
            </Link>
          </nav>
        </div>
      </header>

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

                <p className="mt-2 text-sm text-gray-600">
                  Fecha: {formatearFecha(evento.fecha)}
                </p>

                <p className="mt-1 text-sm text-gray-600">
                  Ubicacion: {evento.ubicacion}
                </p>

                <p className="mt-3 text-sm leading-relaxed text-gray-700">
                  {evento.descripcion}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
