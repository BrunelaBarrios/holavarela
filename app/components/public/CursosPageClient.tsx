'use client'

import { useEffect, useMemo, useState, type KeyboardEvent } from "react"
import { ArrowRight, GraduationCap, Phone, Search } from "lucide-react"
import { ContactActionLink } from "../ContactActionLink"
import { ExternalLinksButtons } from "../ExternalLinksButtons"
import { PrimaryExternalLinkButton } from "../PrimaryExternalLinkButton"
import { PublicDetailModal } from "../PublicDetailModal"
import { PublicHeader } from "../PublicHeader"
import { ShareButton } from "../ShareButton"
import { PublicAddButton } from "./PublicAddButton"
import { recordContentVisit, recordSiteVisit } from "../../lib/contentVisits"
import { buildPublicNav } from "../../lib/publicNav"
import { recordViewMore } from "../../lib/viewMoreTracking"

export type Curso = {
  id: number
  nombre: string
  descripcion: string
  responsable: string
  contacto: string
  edad_destino?: string | null
  web_url?: string | null
  instagram_url?: string | null
  facebook_url?: string | null
  estado?: string | null
  usa_whatsapp?: boolean | null
}

const courseAgeOptions = [
  { value: "todas_las_edades", label: "Todas las edades" },
  { value: "adultos", label: "Adultos" },
  { value: "ninos", label: "Niños" },
  { value: "adolescentes", label: "Adolescentes" },
]

const courseAgeLabel = (value?: string | null) =>
  courseAgeOptions.find((option) => option.value === value)?.label || "Todas las edades"

const parseCourseAgeGroups = (value?: string | null) => {
  const groups = (value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => courseAgeOptions.some((option) => option.value === item))

  return groups.length ? groups : ["todas_las_edades"]
}

const courseAgeLabels = (value?: string | null) =>
  parseCourseAgeGroups(value).map(courseAgeLabel).join(" ")

const courseMatchesAgeFilter = (curso: Curso, filter: string) => {
  if (filter === "todos") return true

  const groups = parseCourseAgeGroups(curso.edad_destino)
  return groups.includes("todas_las_edades") || groups.includes(filter)
}

const ageFilterOptions = [
  { value: "todos", label: "Todos" },
  ...courseAgeOptions,
]

export function CursosPageClient({ initialCursos }: { initialCursos: Curso[] }) {
  const [cursos] = useState<Curso[]>(initialCursos)
  const [search, setSearch] = useState("")
  const [ageFilter, setAgeFilter] = useState("todos")
  const [selectedCursoId, setSelectedCursoId] = useState<string | null>(() =>
    typeof window === "undefined"
      ? null
      : new URLSearchParams(window.location.search).get("item")
  )

  const getShareUrl = (id: number) => {
    if (typeof window === "undefined") return `/cursos/${id}`
    return `${window.location.origin}/cursos/${id}`
  }
  const selectedCurso = useMemo(
    () => cursos.find((curso) => String(curso.id) === selectedCursoId) || null,
    [cursos, selectedCursoId]
  )

  useEffect(() => {
    void recordSiteVisit("cursos-page", "Listado de cursos y clases")
  }, [])

  useEffect(() => {
    const url = new URL(window.location.href)
    if (selectedCursoId) {
      url.searchParams.set("item", selectedCursoId)
    } else {
      url.searchParams.delete("item")
    }
    window.history.replaceState({}, "", url)
  }, [selectedCursoId])

  const whatsappLink = (telefono: string) => {
    const limpio = telefono.replace(/\D/g, "")
    const numero = limpio.startsWith("598")
      ? limpio
      : `598${limpio.replace(/^0+/, "")}`

    return `https://wa.me/${numero}`
  }

  const getContactHref = (contacto: string, usaWhatsapp?: boolean | null) =>
    usaWhatsapp === false ? `tel:${contacto}` : whatsappLink(contacto)

  const cursosFiltrados = useMemo(() => {
    const term = search.trim().toLowerCase()
    const filteredByAge =
      ageFilter === "todos"
        ? cursos
        : cursos.filter((curso) => courseMatchesAgeFilter(curso, ageFilter))

    if (!term) return filteredByAge

    return filteredByAge.filter((curso) =>
      `${curso.nombre} ${curso.descripcion || ""} ${curso.responsable || ""} ${curso.contacto || ""} ${courseAgeLabels(curso.edad_destino)}`
        .toLowerCase()
        .includes(term)
    )
  }, [ageFilter, cursos, search])

  const handleOpenCurso = (curso: Curso) => {
    void recordViewMore("cursos", String(curso.id), curso.nombre)
    void recordContentVisit("cursos", String(curso.id), curso.nombre)
    setSelectedCursoId(String(curso.id))
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
        open={Boolean(selectedCurso)}
        onClose={() => setSelectedCursoId(null)}
        title={selectedCurso?.nombre || ""}
        imageSrc={null}
        imageAlt={selectedCurso?.nombre || "Curso"}
        description={selectedCurso?.descripcion || null}
        extraContent={null}
        meta={[
          ...(selectedCurso?.responsable
            ? [{ icon: GraduationCap, text: selectedCurso.responsable }]
            : []),
          ...(selectedCurso?.contacto
            ? [{ icon: Phone, text: selectedCurso.contacto }]
            : []),
        ]}
        actions={
          selectedCurso ? (
            <>
              {selectedCurso.contacto?.trim() ? (
                <ContactActionLink
                  href={getContactHref(
                    selectedCurso.contacto,
                    selectedCurso.usa_whatsapp
                  )}
                  mode={selectedCurso.usa_whatsapp === false ? "phone" : "whatsapp"}
                  section="cursos"
                  itemId={String(selectedCurso.id)}
                  itemTitle={selectedCurso.nombre}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-500"
                >
                  <Phone className="h-4 w-4" />
                  {selectedCurso.usa_whatsapp === false ? "Llamar" : "Contactar"}
                </ContactActionLink>
              ) : null}
              <ShareButton
                title={selectedCurso.nombre}
                text={selectedCurso.descripcion}
                url={getShareUrl(selectedCurso.id)}
                section="cursos"
                itemId={String(selectedCurso.id)}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
              />
              <ExternalLinksButtons
                webUrl={selectedCurso.web_url}
                instagramUrl={selectedCurso.instagram_url}
                facebookUrl={selectedCurso.facebook_url}
                section="cursos"
                itemId={String(selectedCurso.id)}
                itemTitle={selectedCurso.nombre}
              />
            </>
          ) : null
        }
      />

      <PublicHeader items={buildPublicNav("cursos")} />

      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Cursos y Clases</h1>
            <p className="mt-2 text-gray-600">
              Descubri propuestas de aprendizaje, talleres y clases disponibles en la ciudad
            </p>
          </div>

          <PublicAddButton href="/sumate/curso" label="Sumar mi curso" />
        </div>
        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,36rem)_auto] lg:items-center">
          <div className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-3">
            <Search className="h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por curso, responsable o descripcion"
              className="w-full text-sm outline-none"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {ageFilterOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setAgeFilter(option.value)}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  ageFilter === option.value
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:text-blue-700"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {cursosFiltrados.length === 0 ? (
          <div className="mt-10 rounded-xl border border-gray-200 bg-gray-50 p-8 text-center">
            <p className="text-gray-600">
              {cursos.length === 0
                ? "Todavía no hay cursos o clases cargados."
                : "No se encontraron cursos o clases con esa búsqueda."}
            </p>
          </div>
        ) : (
          <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {cursosFiltrados.map((curso) => (
              <div
                key={curso.id}
                role="button"
                tabIndex={0}
                onClick={() => handleOpenCurso(curso)}
                onKeyDown={(event) => handleCardKeyDown(event, () => handleOpenCurso(curso))}
                className="cursor-pointer overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
              >
                <div className="border-b border-blue-100 bg-[linear-gradient(135deg,#eff6ff_0%,#eefdf7_100%)] p-5">
                  <h2 className="text-3xl font-bold leading-tight text-gray-950">
                    {curso.nombre}
                  </h2>
                </div>

                <div className="p-5">
                  <p className="line-clamp-3 mt-3 whitespace-pre-line text-sm leading-relaxed text-gray-700">
                    {curso.descripcion}
                  </p>

                  <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
                    <GraduationCap className="h-4 w-4" />
                    <span>{curso.responsable}</span>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        handleOpenCurso(curso)
                      }}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
                    >
                      Ver más
                      <ArrowRight className="h-4 w-4" />
                    </button>

                      {curso.contacto?.trim() && curso.usa_whatsapp !== false ? (
                        <ContactActionLink
                          href={getContactHref(curso.contacto, curso.usa_whatsapp)}
                          mode="whatsapp"
                          section="cursos"
                          itemId={String(curso.id)}
                          itemTitle={curso.nombre}
                          onClick={(event) => event.stopPropagation()}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500"
                        >
                          <Phone className="h-4 w-4" />
                          Contactar
                        </ContactActionLink>
                      ) : (
                        <PrimaryExternalLinkButton
                          webUrl={curso.web_url}
                          instagramUrl={curso.instagram_url}
                          facebookUrl={curso.facebook_url}
                          section="cursos"
                          itemId={String(curso.id)}
                          itemTitle={curso.nombre}
                          onClick={(event) => event.stopPropagation()}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 transition hover:border-blue-300 hover:bg-blue-100"
                        />
                      )}

                    <div onClick={(event) => event.stopPropagation()}>
                      <ShareButton
                        title={curso.nombre}
                        text={curso.descripcion}
                        url={getShareUrl(curso.id)}
                        section="cursos"
                        itemId={String(curso.id)}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
