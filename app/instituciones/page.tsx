'use client'

import { useEffect, useMemo, useState, type KeyboardEvent } from "react"
import { ArrowRight, GraduationCap, MapPin, Phone, Search } from "lucide-react"
import { ContactActionLink } from "../components/ContactActionLink"
import { ExternalLinksButtons } from "../components/ExternalLinksButtons"
import { OptimizedImage } from "../components/OptimizedImage"
import { PublicDetailModal } from "../components/PublicDetailModal"
import { PublicHeader } from "../components/PublicHeader"
import { ShareButton } from "../components/ShareButton"
import { recordContentVisit, recordSiteVisit } from "../lib/contentVisits"
import { buildPublicNav } from "../lib/publicNav"
import { recordViewMore } from "../lib/viewMoreTracking"
import { supabase } from "../supabase"

type Institucion = {
  id: number
  nombre: string
  descripcion: string | null
  direccion: string | null
  telefono: string | null
  web_url?: string | null
  instagram_url?: string | null
  facebook_url?: string | null
  foto: string | null
  estado?: string | null
  usa_whatsapp?: boolean | null
  premium_detalle?: string | null
  premium_extra_titulo?: string | null
  premium_extra_detalle?: string | null
  premium_activo?: boolean | null
}

type CursoRelacion = {
  id: number
  nombre: string
  descripcion: string | null
  responsable: string | null
  institucion_id?: number | null
}

export default function InstitucionesPage() {
  const [instituciones, setInstituciones] = useState<Institucion[]>([])
  const [cursosRelacionados, setCursosRelacionados] = useState<CursoRelacion[]>([])
  const [search, setSearch] = useState("")
  const [selectedInstitucion, setSelectedInstitucion] = useState<Institucion | null>(null)

  useEffect(() => {
    void recordSiteVisit("instituciones-page", "Listado de instituciones")
  }, [])

  useEffect(() => {
    const cargarInstituciones = async () => {
      const [{ data, error }, { data: cursosData, error: cursosError }] = await Promise.all([
        supabase
          .from("instituciones")
          .select("*")
          .or("estado.is.null,estado.eq.activo")
          .order("id", { ascending: false }),
        supabase
          .from("cursos")
          .select("id, nombre, descripcion, responsable, institucion_id")
          .or("estado.is.null,estado.eq.activo")
          .not("institucion_id", "is", null)
          .order("id", { ascending: false }),
      ])

      if (error) {
        console.error("Error al cargar instituciones:", error)
        return
      }

      if (cursosError) {
        console.error("Error al cargar cursos relacionados:", cursosError)
        return
      }

      setInstituciones(data || [])
      setCursosRelacionados((cursosData || []) as CursoRelacion[])
    }

    void cargarInstituciones()
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return

    const selectedId = new URLSearchParams(window.location.search).get("item")
    if (!selectedId || instituciones.length === 0) return

    const institution = instituciones.find(
      (item) => String(item.id) === selectedId
    )

    if (!institution) return

    void recordViewMore("instituciones", String(institution.id), institution.nombre)
    void recordContentVisit("instituciones", String(institution.id), institution.nombre)
    const timeoutId = window.setTimeout(() => {
      setSelectedInstitucion(institution)
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [instituciones])

  const institucionesFiltradas = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return instituciones

    return instituciones.filter((institucion) =>
      `${institucion.nombre} ${institucion.descripcion || ""} ${institucion.direccion || ""} ${institucion.telefono || ""}`
        .toLowerCase()
        .includes(term)
    )
  }, [instituciones, search])

  const cursosPorInstitucion = useMemo(() => {
    const map = new Map<number, CursoRelacion[]>()

    cursosRelacionados.forEach((curso) => {
      if (!curso.institucion_id) return
      const current = map.get(curso.institucion_id) || []
      current.push(curso)
      map.set(curso.institucion_id, current)
    })

    return map
  }, [cursosRelacionados])

  const whatsappLink = (telefono: string | null) => {
    if (!telefono) return "#"
    const limpio = telefono.replace(/\D/g, "")
    const numero = limpio.startsWith("598")
      ? limpio
      : `598${limpio.replace(/^0+/, "")}`

    return `https://wa.me/${numero}`
  }

  const getContactHref = (
    telefono: string | null,
    usaWhatsapp?: boolean | null
  ) => {
    if (!telefono) return "#"
    return usaWhatsapp === false ? `tel:${telefono}` : whatsappLink(telefono)
  }

  const getShareUrl = (id: number) => {
    if (typeof window === "undefined") return ""
    return `${window.location.origin}/instituciones/${id}`
  }

  const handleOpenInstitucion = (institucion: Institucion) => {
    void recordViewMore("instituciones", String(institucion.id), institucion.nombre)
    void recordContentVisit("instituciones", String(institucion.id), institucion.nombre)
    setSelectedInstitucion(institucion)
  }

  const handleCardKeyDown = (
    event: KeyboardEvent<HTMLElement>,
    action: () => void
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      action()
    }
  }

  return (
    <main className="min-h-screen bg-white">
      <PublicDetailModal
        open={Boolean(selectedInstitucion)}
        onClose={() => setSelectedInstitucion(null)}
        title={selectedInstitucion?.nombre || ""}
        imageSrc={selectedInstitucion?.foto || null}
        imageAlt={selectedInstitucion?.nombre || "Institución"}
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
        extraContent={
          selectedInstitucion ? (
            <div className="space-y-5">
              {selectedInstitucion.premium_activo && selectedInstitucion.premium_detalle ? (
                <div className="rounded-[24px] border border-sky-100 bg-sky-50/70 p-5">
                  <div className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">
                    Informacion ampliada
                  </div>
                  <p className="whitespace-pre-line text-sm leading-7 text-slate-700">
                    {selectedInstitucion.premium_detalle}
                  </p>
                </div>
              ) : null}

              {selectedInstitucion.premium_activo &&
              (selectedInstitucion.premium_extra_titulo ||
                selectedInstitucion.premium_extra_detalle) ? (
                <div className="rounded-[24px] border border-violet-100 bg-violet-50/70 p-5">
                  <div className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-violet-700">
                    Contenido extra
                  </div>
                  {selectedInstitucion.premium_extra_titulo ? (
                    <h3 className="text-lg font-semibold text-slate-950">
                      {selectedInstitucion.premium_extra_titulo}
                    </h3>
                  ) : null}
                  {selectedInstitucion.premium_extra_detalle ? (
                    <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-700">
                      {selectedInstitucion.premium_extra_detalle}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {(cursosPorInstitucion.get(selectedInstitucion.id) || []).length > 0 ? (
                <div className="rounded-[24px] border border-emerald-100 bg-emerald-50/70 p-5">
                  <div className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">
                    Cursos de esta institucion
                  </div>
                  <div className="space-y-3">
                    {(cursosPorInstitucion.get(selectedInstitucion.id) || []).map((curso) => (
                      <div
                        key={curso.id}
                        className="rounded-2xl border border-emerald-200 bg-white px-4 py-3"
                      >
                        <div className="flex items-start gap-3">
                          <GraduationCap className="mt-1 h-4 w-4 text-emerald-600" />
                          <div>
                            <div className="font-semibold text-slate-900">{curso.nombre}</div>
                            {curso.responsable ? (
                              <div className="mt-1 text-sm text-slate-500">
                                Responsable: {curso.responsable}
                              </div>
                            ) : null}
                            {curso.descripcion ? (
                              <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">
                                {curso.descripcion}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null
        }
        actions={
          <>
            {selectedInstitucion?.telefono?.trim() ? (
              <ContactActionLink
                href={getContactHref(
                  selectedInstitucion.telefono,
                  selectedInstitucion.usa_whatsapp
                )}
                mode={selectedInstitucion.usa_whatsapp === false ? "phone" : "whatsapp"}
                section="instituciones"
                itemId={String(selectedInstitucion.id)}
                itemTitle={selectedInstitucion.nombre}
                target="_blank"
                rel="noopener noreferrer"
                className={
                  selectedInstitucion.usa_whatsapp === false
                    ? "inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
                    : "inline-flex items-center gap-2 rounded-2xl bg-green-500 px-5 py-3 font-semibold text-white transition hover:bg-green-600"
                }
              >
                <Phone className="h-4 w-4" />
                {selectedInstitucion.usa_whatsapp === false ? "Llamar" : "WhatsApp"}
              </ContactActionLink>
            ) : null}
            <ExternalLinksButtons
              webUrl={selectedInstitucion?.web_url}
              instagramUrl={selectedInstitucion?.instagram_url}
              facebookUrl={selectedInstitucion?.facebook_url}
              section="instituciones"
              itemId={selectedInstitucion ? String(selectedInstitucion.id) : undefined}
              itemTitle={selectedInstitucion?.nombre}
            />
            {selectedInstitucion ? (
              <ShareButton
                title={selectedInstitucion.nombre}
                text={selectedInstitucion.descripcion || "Conoce esta institución en Hola Varela."}
                url={getShareUrl(selectedInstitucion.id)}
                section="instituciones"
                itemId={String(selectedInstitucion.id)}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 font-semibold text-slate-700 transition hover:border-sky-300 hover:text-sky-600"
              />
            ) : null}
          </>
        }
      />

      <PublicHeader items={buildPublicNav("instituciones")} />

      <div className="mx-auto max-w-7xl px-6 py-16">
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
          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {institucionesFiltradas.map((institucion) => (
              <div
                key={institucion.id}
                role="button"
                tabIndex={0}
                onClick={() => handleOpenInstitucion(institucion)}
                onKeyDown={(event) =>
                  handleCardKeyDown(event, () => handleOpenInstitucion(institucion))
                }
                className="cursor-pointer overflow-hidden rounded-xl border border-gray-200 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
              >
                {institucion.foto && (
                  <div className="relative h-56 w-full">
                    <OptimizedImage
                      src={institucion.foto}
                      alt={institucion.nombre}
                      sizes="(max-width: 768px) 100vw, (max-width: 1280px) 33vw, 20vw"
                      className="object-cover"
                    />
                  </div>
                )}

                <div className="p-5">
                  <h2 className="text-xl font-semibold text-gray-900">
                    {institucion.nombre}
                  </h2>

                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      handleOpenInstitucion(institucion)
                    }}
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
