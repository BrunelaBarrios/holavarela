'use client'

import Link from "next/link"
import { useEffect, useMemo, useState, type KeyboardEvent } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, BriefcaseBusiness, MapPin, MessageCircle, Phone, Search, Sparkles, UserRound } from "lucide-react"
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

export type Servicio = {
  id: number
  nombre: string
  categoria: string
  descripcion: string | null
  premium_detalle?: string | null
  premium_galeria?: string[] | null
  premium_activo?: boolean | null
  responsable: string | null
  contacto: string | null
  direccion: string | null
  web_url?: string | null
  instagram_url?: string | null
  facebook_url?: string | null
  imagen: string | null
  estado?: string | null
  usa_whatsapp?: boolean | null
}

export function ServiciosPageClient({
  initialServicios,
}: {
  initialServicios: Servicio[]
}) {
  const router = useRouter()
  const [servicios] = useState<Servicio[]>(initialServicios)
  const [search, setSearch] = useState("")
  const [selectedServicioId, setSelectedServicioId] = useState<string | null>(() =>
    typeof window === "undefined"
      ? null
      : new URLSearchParams(window.location.search).get("item")
  )

  const getShareUrl = (id: number) => {
    if (typeof window === "undefined") return `/servicios/${id}`
    return `${window.location.origin}/servicios/${id}`
  }
  const selectedServicio = useMemo(
    () =>
      servicios.find((servicio) => String(servicio.id) === selectedServicioId) ||
      null,
    [servicios, selectedServicioId]
  )

  useEffect(() => {
    if (!selectedServicio?.premium_activo) return

    router.replace(`/servicios/${selectedServicio.id}`)
  }, [router, selectedServicio])

  useEffect(() => {
    void recordSiteVisit("servicios-page", "Listado de servicios")
  }, [])

  useEffect(() => {
    const url = new URL(window.location.href)
    if (selectedServicioId) {
      url.searchParams.set("item", selectedServicioId)
    } else {
      url.searchParams.delete("item")
    }
    window.history.replaceState({}, "", url)
  }, [selectedServicioId])

  const whatsappLink = (telefono: string | null) => {
    if (!telefono) return "#"
    const limpio = telefono.replace(/\D/g, "")
    const numero = limpio.startsWith("598")
      ? limpio
      : `598${limpio.replace(/^0+/, "")}`

    return `https://wa.me/${numero}`
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

  const handleOpenServicio = (servicio: Servicio) => {
    void recordViewMore("servicios", String(servicio.id), servicio.nombre)
    void recordContentVisit("servicios", String(servicio.id), servicio.nombre)
    setSelectedServicioId(String(servicio.id))
  }

  const handleOpenPremiumProfile = (servicio: Servicio) => {
    void recordViewMore("servicios", String(servicio.id), servicio.nombre)
    void recordContentVisit("servicios", String(servicio.id), servicio.nombre)
    router.push(`/servicios/${servicio.id}`)
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
    <main className="min-h-screen bg-[#fcfaf7]">
      <PublicDetailModal
        open={Boolean(selectedServicio && !selectedServicio.premium_activo)}
        onClose={() => setSelectedServicioId(null)}
        title={selectedServicio?.nombre || ""}
        imageSrc={selectedServicio?.imagen || null}
        imageAlt={selectedServicio?.nombre || "Servicio"}
        badge={selectedServicio?.categoria || null}
        description={selectedServicio?.descripcion || null}
        extraContent={
          selectedServicio?.premium_activo ? (
            <div className="space-y-4">
              {selectedServicio.premium_detalle ? (
                <div className="rounded-[24px] border border-violet-100 bg-violet-50/70 p-5">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-violet-600">
                    Perfil ampliado
                  </div>
                  <p className="whitespace-pre-line text-sm leading-7 text-slate-700">
                    {selectedServicio.premium_detalle}
                  </p>
                </div>
              ) : null}
              {selectedServicio.premium_galeria?.length ? (
                <div>
                  <div className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Galeria
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {selectedServicio.premium_galeria.map((image, index) => (
                      <div key={`${image}-${index}`} className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                        <OptimizedImage
                          src={image}
                          alt={`${selectedServicio.nombre} ${index + 1}`}
                          sizes="(max-width: 768px) 50vw, 25vw"
                          className="object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null
        }
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
          selectedServicio ? (
            <>
              {selectedServicio.contacto ? (
                <ContactActionLink
                  href={getContactHref(
                    selectedServicio.contacto,
                    selectedServicio.usa_whatsapp
                  )}
                  mode={selectedServicio.usa_whatsapp === false ? "phone" : "whatsapp"}
                  section="servicios"
                  itemId={String(selectedServicio.id)}
                  itemTitle={selectedServicio.nombre}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-500"
                >
                  <Phone className="h-4 w-4" />
                  {selectedServicio.usa_whatsapp === false ? "Llamar" : "Contactar"}
                </ContactActionLink>
              ) : null}
              <ShareButton
                title={selectedServicio.nombre}
                text={selectedServicio.descripcion || undefined}
                url={getShareUrl(selectedServicio.id)}
                section="servicios"
                itemId={String(selectedServicio.id)}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
              />
              <ExternalLinksButtons
                webUrl={selectedServicio.web_url}
                instagramUrl={selectedServicio.instagram_url}
                facebookUrl={selectedServicio.facebook_url}
                section="servicios"
                itemId={String(selectedServicio.id)}
                itemTitle={selectedServicio.nombre}
              />
              {selectedServicio.premium_activo ? (
                <Link
                  href={`/servicios/${selectedServicio.id}`}
                  onClick={() => handleOpenPremiumProfile(selectedServicio)}
                  className="inline-flex items-center gap-2 rounded-2xl border border-violet-200 bg-violet-50 px-5 py-3 font-semibold text-violet-700 transition hover:border-violet-300 hover:bg-violet-100"
                >
                  Ver perfil completo
                  <ArrowRight className="h-4 w-4" />
                </Link>
              ) : null}
            </>
          ) : null
        }
      />

      <PublicHeader items={buildPublicNav("servicios")} />

      <section className="relative overflow-hidden border-b border-amber-100 bg-[linear-gradient(135deg,#fff7ed_0%,#fffbeb_48%,#fef2f2_100%)]">
        <div className="pointer-events-none absolute -right-24 -top-28 h-80 w-80 rounded-full bg-orange-300/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-[18%] h-72 w-72 rounded-full bg-rose-300/15 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:py-20">
          <div className="grid items-end gap-8 lg:grid-cols-[1fr_auto]">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-white/80 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-amber-800 shadow-sm backdrop-blur">
                <Sparkles className="h-4 w-4" />
                Talento y soluciones locales
              </div>
              <h1 className="max-w-3xl text-4xl font-black tracking-[-0.04em] text-slate-950 sm:text-5xl lg:text-6xl">
                La ayuda que necesitás,
                <span className="block text-orange-600">a un mensaje de distancia.</span>
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                Encontrá profesionales, oficios, alojamientos y servicios disponibles en José Pedro Varela.
              </p>
            </div>
            <div className="flex flex-col items-start gap-3 lg:items-end">
              <div className="inline-flex items-center gap-3 rounded-2xl border border-white/80 bg-white/75 px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
                  <BriefcaseBusiness className="h-5 w-5" />
                </span>
                <span><strong className="block text-lg leading-none text-slate-950">{servicios.length}</strong> servicios disponibles</span>
              </div>
              <PublicAddButton href="/sumate/servicio" label="Sumar mi servicio" />
            </div>
          </div>
          <div className="mt-9 max-w-3xl">
            <label htmlFor="buscar-servicio" className="sr-only">Buscar servicios</label>
            <div className="flex items-center gap-3 rounded-2xl border border-white bg-white p-2 pl-5 shadow-[0_18px_45px_-24px_rgba(234,88,12,0.38)] transition focus-within:border-amber-300 focus-within:ring-4 focus-within:ring-amber-100/70">
              <Search className="h-5 w-5 shrink-0 text-orange-600" />
              <input
                id="buscar-servicio"
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="¿Qué servicio necesitás?"
                className="min-w-0 flex-1 bg-transparent py-3 text-base text-slate-900 outline-none placeholder:text-slate-400"
              />
              <span className="hidden rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white sm:block">Buscar</span>
            </div>
            <p className="mt-3 pl-1 text-xs font-medium text-slate-500">Buscá por nombre, categoría, responsable o palabra clave</p>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-700">Guía de servicios</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              {search ? <>Resultados para “{search}”</> : "Profesionales y servicios cerca tuyo"}
            </h2>
          </div>
          <span className="hidden text-sm font-medium text-slate-500 sm:block">{serviciosFiltrados.length} resultados</span>
        </div>

        {serviciosFiltrados.length === 0 ? (
          <div className="mt-10 rounded-xl border border-gray-200 bg-gray-50 p-8 text-center">
            <p className="text-gray-600">
              {servicios.length === 0
                ? "Todavía no hay servicios cargados."
                : "No se encontraron servicios con esa búsqueda."}
            </p>
          </div>
        ) : (
          <div className="mt-7 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {serviciosFiltrados.map((servicio) => (
              <div
                key={servicio.id}
                role="button"
                tabIndex={0}
                onClick={() => {
                  if (servicio.premium_activo) {
                    handleOpenPremiumProfile(servicio)
                    return
                  }

                  handleOpenServicio(servicio)
                }}
                onKeyDown={(event) =>
                  handleCardKeyDown(event, () => {
                    if (servicio.premium_activo) {
                      handleOpenPremiumProfile(servicio)
                      return
                    }

                    handleOpenServicio(servicio)
                  })
                }
                className={`group flex cursor-pointer flex-col overflow-hidden rounded-[24px] border bg-white shadow-[0_12px_35px_-26px_rgba(15,23,42,0.45)] transition duration-300 hover:-translate-y-1.5 hover:shadow-[0_24px_50px_-28px_rgba(234,88,12,0.32)] focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 ${servicio.premium_activo ? "border-violet-200" : "border-slate-200/80 hover:border-amber-200"}`}
              >
                {servicio.imagen && (
                  <div className="relative h-52 w-full border-b border-slate-100 bg-[radial-gradient(circle_at_top,#ffffff_0%,#fffbeb_100%)]">
                    <OptimizedImage
                      src={servicio.imagen}
                      alt={servicio.nombre}
                      sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 25vw"
                      className="object-contain p-5 transition duration-500 group-hover:scale-[1.04]"
                    />
                    {servicio.premium_activo ? (
                      <span className="absolute right-3 top-3 rounded-full border border-violet-200 bg-white/90 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-violet-700 shadow-sm backdrop-blur">
                        Destacado
                      </span>
                    ) : null}
                  </div>
                )}

                <div className="flex flex-1 flex-col p-5">
                  <span className="mb-3 w-fit rounded-full bg-amber-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-amber-800">
                    {servicio.categoria}
                  </span>
                  <h3 className="text-xl font-bold leading-snug text-slate-950 transition group-hover:text-orange-700">
                    {servicio.nombre}
                  </h3>

                  {servicio.responsable ? (
                    <p className="mt-3 flex items-center gap-2 text-sm text-slate-500">
                      <UserRound className="h-4 w-4 shrink-0 text-orange-600" />
                      <span className="line-clamp-1">{servicio.responsable}</span>
                    </p>
                  ) : null}

                  {servicio.direccion ? (
                    <p className="mt-3 flex items-start gap-2 text-sm text-slate-500">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" />
                      <span className="line-clamp-2">{servicio.direccion}</span>
                    </p>
                  ) : null}

                  {servicio.descripcion ? (
                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">
                      {servicio.descripcion}
                    </p>
                  ) : null}

                  {servicio.contacto ? (
                    <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                      {servicio.usa_whatsapp === false ? <Phone className="h-4 w-4 text-sky-600" /> : <MessageCircle className="h-4 w-4 text-emerald-600" />}
                      {servicio.contacto}
                    </p>
                  ) : null}

                  <div className="mt-auto pt-5">
                    {servicio.premium_activo ? (
                      <Link
                        href={`/servicios/${servicio.id}`}
                        onClick={(event) => {
                          event.stopPropagation()
                          handleOpenPremiumProfile(servicio)
                        }}
                        className="inline-flex w-full items-center justify-between gap-2 rounded-xl bg-violet-50 px-4 py-3 text-sm font-bold text-violet-700 transition hover:bg-violet-100"
                      >
                        Ver perfil completo
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          handleOpenServicio(servicio)
                        }}
                        className="inline-flex w-full items-center justify-between gap-2 rounded-xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 transition group-hover:bg-amber-50 group-hover:text-orange-700"
                      >
                        Ver más
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    )}

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
