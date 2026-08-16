'use client'

import Link from "next/link"
import { useEffect, useMemo, useState, type KeyboardEvent } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Building2, MapPin, MessageCircle, Phone, Search, Sparkles } from "lucide-react"
import { ContactActionLink } from "../ContactActionLink"
import { ExternalLinksButtons } from "../ExternalLinksButtons"
import { OptimizedImage } from "../OptimizedImage"
import { PublicDetailModal } from "../PublicDetailModal"
import { PublicHeader } from "../PublicHeader"
import { ShareButton } from "../ShareButton"
import { PublicAddButton } from "./PublicAddButton"
import { recordContentVisit, recordSiteVisit } from "../../lib/contentVisits"
import { buildPublicNav } from "../../lib/publicNav"
import { recordViewMore } from "../../lib/viewMoreTracking"

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

function hasInstitutionPremium(institucion: Institucion | null | undefined) {
  return Boolean(institucion?.premium_activo)
}

export function InstitucionesPageClient({
  initialInstituciones,
}: {
  initialInstituciones: Institucion[]
}) {
  const router = useRouter()
  const [instituciones] = useState<Institucion[]>(initialInstituciones)
  const [search, setSearch] = useState("")
  const [selectedInstitucion, setSelectedInstitucion] = useState<Institucion | null>(null)

  useEffect(() => {
    void recordSiteVisit("instituciones-page", "Listado de instituciones")
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
    router.replace(`/instituciones/${institution.id}`)
  }, [instituciones, router])

  const institucionesFiltradas = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return instituciones

    return instituciones.filter((institucion) =>
      `${institucion.nombre} ${institucion.descripcion || ""} ${institucion.direccion || ""} ${institucion.telefono || ""}`
        .toLowerCase()
        .includes(term)
    )
  }, [instituciones, search])

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
    handleOpenPremiumProfile(institucion)
  }

  const handleOpenPremiumProfile = (institucion: Institucion) => {
    void recordViewMore("instituciones", String(institucion.id), institucion.nombre)
    void recordContentVisit("instituciones", String(institucion.id), institucion.nombre)
    router.push(`/instituciones/${institucion.id}`)
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
    <main className="min-h-screen bg-[#f7fafc]">
      <PublicDetailModal
        open={Boolean(selectedInstitucion && !hasInstitutionPremium(selectedInstitucion))}
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
              {hasInstitutionPremium(selectedInstitucion) && selectedInstitucion.premium_detalle ? (
                <div className="rounded-[24px] border border-sky-100 bg-sky-50/70 p-5">
                  <div className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">
                    Información ampliada
                  </div>
                  <p className="whitespace-pre-line text-sm leading-7 text-slate-700">
                    {selectedInstitucion.premium_detalle}
                  </p>
                </div>
              ) : null}

              {hasInstitutionPremium(selectedInstitucion) &&
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
            {selectedInstitucion && hasInstitutionPremium(selectedInstitucion) ? (
              <Link
                href={`/instituciones/${selectedInstitucion.id}`}
                onClick={() => handleOpenPremiumProfile(selectedInstitucion)}
                className="inline-flex items-center gap-2 rounded-2xl border border-violet-200 bg-violet-50 px-5 py-3 font-semibold text-violet-700 transition hover:border-violet-300 hover:bg-violet-100"
              >
                Ver perfil completo
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : null}
          </>
        }
      />

      <PublicHeader items={buildPublicNav("instituciones")} />

      <section className="relative overflow-hidden border-b border-cyan-100 bg-[linear-gradient(135deg,#ecfeff_0%,#eff6ff_50%,#f5f3ff_100%)]">
        <div className="pointer-events-none absolute -right-24 -top-28 h-80 w-80 rounded-full bg-cyan-300/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-[18%] h-72 w-72 rounded-full bg-violet-300/20 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:py-20">
          <div className="grid items-end gap-8 lg:grid-cols-[1fr_auto]">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-white/80 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-cyan-700 shadow-sm backdrop-blur">
                <Sparkles className="h-4 w-4" />
                Espacios que hacen comunidad
              </div>
              <h1 className="max-w-3xl text-4xl font-black tracking-[-0.04em] text-slate-950 sm:text-5xl lg:text-6xl">
                Lugares que acompañan,
                <span className="block text-cyan-700">enseñan y conectan.</span>
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                Encontrá instituciones, organizaciones y espacios de referencia de José Pedro Varela.
              </p>
            </div>
            <div className="flex flex-col items-start gap-3 lg:items-end">
              <div className="inline-flex items-center gap-3 rounded-2xl border border-white/80 bg-white/75 px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700">
                  <Building2 className="h-5 w-5" />
                </span>
                <span><strong className="block text-lg leading-none text-slate-950">{instituciones.length}</strong> instituciones para conocer</span>
              </div>
              <PublicAddButton href="/sumate/institucion" label="Sumar mi institución" />
            </div>
          </div>
          <div className="mt-9 max-w-3xl">
            <label htmlFor="buscar-institucion" className="sr-only">Buscar instituciones</label>
            <div className="flex items-center gap-3 rounded-2xl border border-white bg-white p-2 pl-5 shadow-[0_18px_45px_-24px_rgba(8,145,178,0.45)] transition focus-within:border-cyan-300 focus-within:ring-4 focus-within:ring-cyan-100/70">
              <Search className="h-5 w-5 shrink-0 text-cyan-700" />
              <input
                id="buscar-institucion"
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="¿Qué institución estás buscando?"
                className="min-w-0 flex-1 bg-transparent py-3 text-base text-slate-900 outline-none placeholder:text-slate-400"
              />
              <span className="hidden rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white sm:block">Buscar</span>
            </div>
            <p className="mt-3 pl-1 text-xs font-medium text-slate-500">Buscá por nombre, dirección o palabra clave</p>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-700">Guía de instituciones</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              {search ? <>Resultados para “{search}”</> : "Conocé los espacios de nuestra ciudad"}
            </h2>
          </div>
          <span className="hidden text-sm font-medium text-slate-500 sm:block">{institucionesFiltradas.length} resultados</span>
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
          <div className="mt-7 grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {institucionesFiltradas.map((institucion) => (
              <div
                key={institucion.id}
                role="button"
                tabIndex={0}
                onClick={() => handleOpenInstitucion(institucion)}
                onKeyDown={(event) =>
                  handleCardKeyDown(event, () => handleOpenInstitucion(institucion))
                }
                className="group flex cursor-pointer flex-col overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-[0_12px_35px_-26px_rgba(15,23,42,0.45)] transition duration-300 hover:-translate-y-1.5 hover:border-cyan-200 hover:shadow-[0_24px_50px_-28px_rgba(8,145,178,0.38)] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
              >
                {institucion.foto ? (
                  <div className="relative h-52 w-full border-b border-slate-100 bg-[radial-gradient(circle_at_top,#ffffff_0%,#f8fafc_100%)]">
                    <OptimizedImage
                      src={institucion.foto}
                      alt={institucion.nombre}
                      sizes="(max-width: 768px) 100vw, (max-width: 1280px) 33vw, 20vw"
                      className="object-contain p-5 transition duration-500 group-hover:scale-[1.04]"
                    />
                  </div>
                ) : (
                  <div className="flex h-52 w-full items-center justify-center border-b border-cyan-100 bg-[linear-gradient(135deg,#ecfeff_0%,#eff6ff_50%,#f8fafc_100%)]">
                    <div className="flex flex-col items-center text-center">
                      <div className="flex h-20 w-20 items-center justify-center rounded-[28px] border border-cyan-100 bg-white text-cyan-700 shadow-sm">
                        <Building2 className="h-10 w-10" />
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex flex-1 flex-col p-5">
                  <h3 className="text-xl font-bold leading-snug text-slate-950 transition group-hover:text-cyan-700">
                    {institucion.nombre}
                  </h3>

                  {institucion.direccion ? (
                    <p className="mt-3 flex items-start gap-2 text-sm text-slate-500">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-cyan-700" />
                      <span className="line-clamp-2">{institucion.direccion}</span>
                    </p>
                  ) : null}

                  {institucion.descripcion ? (
                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">
                      {institucion.descripcion}
                    </p>
                  ) : null}

                  {institucion.telefono ? (
                    <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                      {institucion.usa_whatsapp === false ? <Phone className="h-4 w-4 text-sky-600" /> : <MessageCircle className="h-4 w-4 text-emerald-600" />}
                      {institucion.telefono}
                    </p>
                  ) : null}

                  {hasInstitutionPremium(institucion) ? (
                    <Link
                      href={`/instituciones/${institucion.id}`}
                      onClick={(event) => {
                        event.stopPropagation()
                        handleOpenPremiumProfile(institucion)
                      }}
                      className="mt-auto inline-flex w-full items-center justify-between gap-2 rounded-xl bg-violet-50 px-4 py-3 pt-3 text-sm font-bold text-violet-700 transition hover:bg-violet-100"
                    >
                      Ver perfil completo
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        handleOpenInstitucion(institucion)
                      }}
                      className="mt-auto inline-flex w-full items-center justify-between gap-2 rounded-xl bg-slate-50 px-4 py-3 pt-3 text-sm font-bold text-slate-700 transition group-hover:bg-cyan-50 group-hover:text-cyan-700"
                    >
                      Ver más
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
