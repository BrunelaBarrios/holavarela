'use client'

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ArrowRight, MapPin, Phone, Search } from "lucide-react"
import { PublicDetailModal } from "../components/PublicDetailModal"
import { supabase } from "../supabase"

type Institucion = {
  id: number
  nombre: string
  descripcion: string | null
  direccion: string | null
  telefono: string | null
  foto: string | null
}

export default function InstitucionesPage() {
  const [instituciones, setInstituciones] = useState<Institucion[]>([])
  const [search, setSearch] = useState("")
  const [selectedInstitucion, setSelectedInstitucion] = useState<Institucion | null>(null)

  useEffect(() => {
    const cargarInstituciones = async () => {
      const { data, error } = await supabase
        .from("instituciones")
        .select("*")
        .order("id", { ascending: false })

      if (error) {
        console.error("Error al cargar instituciones:", error)
        return
      }

      setInstituciones(data || [])
    }

    void cargarInstituciones()
  }, [])

  const institucionesFiltradas = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return instituciones

    return instituciones.filter((institucion) =>
      `${institucion.nombre} ${institucion.descripcion || ""} ${institucion.direccion || ""} ${institucion.telefono || ""}`
        .toLowerCase()
        .includes(term)
    )
  }, [instituciones, search])

  return (
    <main className="min-h-screen bg-white">
      <PublicDetailModal
        open={Boolean(selectedInstitucion)}
        onClose={() => setSelectedInstitucion(null)}
        title={selectedInstitucion?.nombre || ""}
        imageSrc={selectedInstitucion?.foto || null}
        imageAlt={selectedInstitucion?.nombre || "Logo de la institución"}
        badge="Institución"
        description={selectedInstitucion?.descripcion || null}
        meta={[
          ...(selectedInstitucion?.direccion
            ? [{ icon: MapPin, text: selectedInstitucion.direccion }]
            : []),
          ...(selectedInstitucion?.telefono
            ? [{ icon: Phone, text: selectedInstitucion.telefono }]
            : []),
        ]}
      />

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
            <Link href="/comercios" className="hover:text-blue-500">
              Comercios
            </Link>
            <Link href="/eventos" className="hover:text-blue-500">
              Eventos
            </Link>
            <Link href="/servicios" className="hover:text-blue-500">
              Servicios
            </Link>
            <Link href="/instituciones" className="text-blue-500">
              Instituciones
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
        <h1 className="text-3xl font-bold text-gray-900">Instituciones</h1>
        <p className="mt-2 text-gray-600">
          Conocé instituciones y espacios de referencia en la ciudad
        </p>

        <div className="mt-6 max-w-xl">
          <div className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-3">
            <Search className="h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, dirección o descripción"
              className="w-full text-sm outline-none"
            />
          </div>
        </div>

        {institucionesFiltradas.length === 0 ? (
          <div className="mt-10 rounded-xl border border-gray-200 bg-gray-50 p-8 text-center">
            <p className="text-gray-600">
              {instituciones.length === 0
                ? "Todavía no hay instituciones cargadas."
                : "No se encontraron instituciones con esa búsqueda."}
            </p>
          </div>
        ) : (
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {institucionesFiltradas.map((institucion) => (
              <div
                key={institucion.id}
                className="overflow-hidden rounded-xl border border-gray-200 shadow-sm"
              >
                {institucion.foto && (
                  <img
                    src={institucion.foto}
                    alt={`Logo de ${institucion.nombre}`}
                    className="h-56 w-full bg-slate-50 object-contain p-4"
                  />
                )}

                <div className="p-5">
                  <div className="mb-3 inline-flex rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700">
                    Institución
                  </div>

                  <h2 className="text-xl font-semibold text-gray-900">
                    {institucion.nombre}
                  </h2>

                  {institucion.descripcion && (
                    <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-gray-700">
                      {institucion.descripcion}
                    </p>
                  )}

                  {institucion.direccion && (
                    <p className="mt-2 text-sm text-gray-600">
                      Dirección: {institucion.direccion}
                    </p>
                  )}

                  {institucion.telefono && (
                    <p className="mt-1 text-sm text-gray-600">
                      Teléfono: {institucion.telefono}
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={() => setSelectedInstitucion(institucion)}
                    className="mt-5 inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
                  >
                    Ver más
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
