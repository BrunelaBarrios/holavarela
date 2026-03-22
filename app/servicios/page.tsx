'use client'

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ArrowRight, MapPin, Phone, Search, UserRound } from "lucide-react"
import { PublicDetailModal } from "../components/PublicDetailModal"
import { supabase } from "../supabase"

type Servicio = {
  id: number
  nombre: string
  categoria: string
  descripcion: string | null
  responsable: string | null
  contacto: string | null
  direccion: string | null
  imagen: string | null
  estado?: string | null
  usa_whatsapp?: boolean | null
}

export default function ServiciosPage() {
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [search, setSearch] = useState("")
  const [selectedServicio, setSelectedServicio] = useState<Servicio | null>(null)

  useEffect(() => {
    const cargarServicios = async () => {
      const { data, error } = await supabase
        .from("servicios")
        .select("*")
        .or("estado.is.null,estado.eq.activo")
        .order("id", { ascending: false })

      if (error) {
        console.error("Error al cargar servicios:", error)
        return
      }

      setServicios(data || [])
    }

    cargarServicios()
  }, [])

  const whatsappLink = (telefono: string | null) => {
    if (!telefono) return "#"
    return `https://wa.me/${telefono.replace(/\D/g, "")}`
  }

  const getContactHref = (contacto: string | null, usaWhatsapp?: boolean | null) => {
    if (!contacto) return "#"
    return usaWhatsapp === false ? `tel:${contacto}` : whatsappLink(contacto)
  }

  const serviciosFiltrados = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return servicios

    return servicios.filter((servicio) =>
      `${servicio.nombre} ${servicio.categoria} ${servicio.descripcion || ""} ${servicio.responsable || ""} ${servicio.contacto || ""} ${servicio.direccion || ""}`
        .toLowerCase()
        .includes(term)
    )
  }, [servicios, search])

  const serviciosAgrupados = useMemo(() => {
    return serviciosFiltrados.reduce<Record<string, Servicio[]>>((acc, servicio) => {
      const categoria = servicio.categoria?.trim() || "Otros"
      if (!acc[categoria]) {
        acc[categoria] = []
      }
      acc[categoria].push(servicio)
      return acc
    }, {})
  }, [serviciosFiltrados])

  return (
    <main className="min-h-screen bg-white">
      <PublicDetailModal
        open={Boolean(selectedServicio)}
        onClose={() => setSelectedServicio(null)}
        title={selectedServicio?.nombre || ""}
        imageSrc={selectedServicio?.imagen || null}
        imageAlt={selectedServicio?.nombre || "Servicio"}
        badge={selectedServicio?.categoria || null}
        description={selectedServicio?.descripcion || null}
        meta={[
          ...(selectedServicio?.responsable
            ? [{ icon: UserRound, text: selectedServicio.responsable }]
            : []),
          ...(selectedServicio?.contacto
            ? [{ icon: Phone, text: selectedServicio.contacto }]
            : []),
          ...(selectedServicio?.direccion
            ? [{ icon: MapPin, text: selectedServicio.direccion }]
            : []),
        ]}
        actions={
          selectedServicio?.contacto ? (
            <a
              href={getContactHref(
                selectedServicio.contacto,
                selectedServicio.usa_whatsapp
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-500"
            >
              <Phone className="h-4 w-4" />
              {selectedServicio.usa_whatsapp === false ? "Llamar" : "Contactar"}
            </a>
          ) : null
        }
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
            <Link href="/#radio" className="hover:text-blue-500">
              Radio en Vivo
            </Link>
            <Link href="/comercios" className="hover:text-blue-500">
              Comercios
            </Link>
            <Link href="/eventos" className="hover:text-blue-500">
              Eventos
            </Link>
            <Link href="/servicios" className="text-blue-500">
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
        <h1 className="text-3xl font-bold text-gray-900">Servicios y Profesionales</h1>
        <p className="mt-2 text-gray-600">
          Profesionales, alojamientos y otros servicios disponibles en la ciudad
        </p>

        <div className="mt-6 max-w-xl">
          <div className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-3">
            <Search className="h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, categoria o responsable"
              className="w-full text-sm outline-none"
            />
          </div>
        </div>

        {serviciosFiltrados.length === 0 ? (
          <div className="mt-10 rounded-xl border border-gray-200 bg-gray-50 p-8 text-center">
            <p className="text-gray-600">
              {servicios.length === 0
                ? "Todavia no hay servicios cargados."
                : "No se encontraron servicios con esa busqueda."}
            </p>
          </div>
        ) : (
          <div className="mt-8 space-y-10">
            {Object.entries(serviciosAgrupados).map(([categoria, items]) => (
              <section key={categoria}>
                <div className="mb-4 flex items-center gap-3">
                  <div className="h-px flex-1 bg-amber-100" />
                  <h2 className="rounded-full bg-amber-50 px-4 py-2 text-sm font-semibold uppercase tracking-[0.18em] text-amber-700">
                    {categoria}
                  </h2>
                  <div className="h-px flex-1 bg-amber-100" />
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  {items.map((servicio) => (
                    <div
                      key={servicio.id}
                      className="overflow-hidden rounded-xl border border-gray-200 shadow-sm"
                    >
                      {servicio.imagen && (
                        <img
                          src={servicio.imagen}
                          alt={servicio.nombre}
                          className="h-56 w-full object-cover"
                        />
                      )}

                      <div className="p-5">
                        <h3 className="text-xl font-semibold text-gray-900">
                          {servicio.nombre}
                        </h3>

                        {servicio.descripcion && (
                          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-gray-700">
                            {servicio.descripcion}
                          </p>
                        )}

                        <div className="mt-4 space-y-2 text-sm text-gray-600">
                          {servicio.responsable && (
                            <div className="flex items-center gap-2">
                              <UserRound className="h-4 w-4" />
                              <span>{servicio.responsable}</span>
                            </div>
                          )}

                          {servicio.contacto && (
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4" />
                              <span>{servicio.contacto}</span>
                            </div>
                          )}

                          {servicio.direccion && (
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4" />
                              <span>{servicio.direccion}</span>
                            </div>
                          )}
                        </div>

                        <div className="mt-5 flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={() => setSelectedServicio(servicio)}
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
                          >
                            Ver mas
                            <ArrowRight className="h-4 w-4" />
                          </button>

                          {servicio.contacto && (
                            <a
                              href={getContactHref(servicio.contacto, servicio.usa_whatsapp)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500"
                            >
                              {servicio.usa_whatsapp === false ? "Llamar" : "Contactar"}
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
