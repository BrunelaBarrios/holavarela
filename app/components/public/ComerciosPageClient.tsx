'use client'

import Link from "next/link"
import { useEffect, useMemo, useState, type KeyboardEvent } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, MapPin, MessageCircle, Phone, Search, Sparkles, Store } from "lucide-react"
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

export type Comercio = {
  id: number
  nombre: string
  descripcion: string
  premium_detalle?: string | null
  premium_galeria?: string[] | null
  premium_activo?: boolean | null
  direccion: string
  telefono: string
  web_url?: string | null
  instagram_url?: string | null
  facebook_url?: string | null
  imagen?: string | null
  imagen_url?: string | null
  usa_whatsapp?: boolean | null
}

export function ComerciosPageClient({
  initialComercios,
}: {
  initialComercios: Comercio[]
}) {
  const router = useRouter()
  const [comercios] = useState<Comercio[]>(initialComercios)
  const [search, setSearch] = useState("")
  const [selectedComercioId, setSelectedComercioId] = useState<string | null>(() =>
    typeof window === "undefined"
      ? null
      : new URLSearchParams(window.location.search).get("item")
  )

  const getShareUrl = (id: number) => {
    if (typeof window === "undefined") return `/comercios/${id}`
    return `${window.location.origin}/comercios/${id}`
  }
  const selectedComercio = useMemo(
    () =>
      comercios.find((comercio) => String(comercio.id) === selectedComercioId) || null,
    [comercios, selectedComercioId]
  )

  useEffect(() => {
    if (!selectedComercio?.premium_activo) return

    router.replace(`/comercios/${selectedComercio.id}`)
  }, [router, selectedComercio])

  useEffect(() => {
    void recordSiteVisit("comercios-page", "Listado de comercios")
  }, [])

  useEffect(() => {
    const url = new URL(window.location.href)
    if (selectedComercioId) {
      url.searchParams.set("item", selectedComercioId)
    } else {
      url.searchParams.delete("item")
    }
    window.history.replaceState({}, "", url)
  }, [selectedComercioId])

  const getWhatsappLink = (telefono: string) => {
    const limpio = telefono.replace(/\D/g, "")
    const numero = limpio.startsWith("598")
      ? limpio
      : `598${limpio.replace(/^0+/, "")}`

    return `https://wa.me/${numero}`
  }

  const getContactHref = (telefono: string, usaWhatsapp?: boolean | null) =>
    usaWhatsapp === false ? `tel:${telefono}` : getWhatsappLink(telefono)

  const getContactLabel = (usaWhatsapp?: boolean | null) =>
    usaWhatsapp === false ? "Llamar por telefono" : "Contactar por WhatsApp"

  const handleOpenComercio = (comercio: Comercio) => {
    void recordViewMore("comercios", String(comercio.id), comercio.nombre)
    void recordContentVisit("comercios", String(comercio.id), comercio.nombre)
    setSelectedComercioId(String(comercio.id))
  }

  const handleOpenPremiumProfile = (comercio: Comercio) => {
    void recordViewMore("comercios", String(comercio.id), comercio.nombre)
    void recordContentVisit("comercios", String(comercio.id), comercio.nombre)
    router.push(`/comercios/${comercio.id}`)
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

  const comerciosFiltrados = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return comercios

    return comercios.filter((comercio) =>
      `${comercio.nombre} ${comercio.descripcion || ""} ${comercio.direccion || ""} ${comercio.telefono || ""}`
        .toLowerCase()
        .includes(term)
    )
  }, [comercios, search])

  return (
    <main className="min-h-screen bg-[#f7faf8]">
      <PublicDetailModal
        open={Boolean(selectedComercio && !selectedComercio.premium_activo)}
        onClose={() => setSelectedComercioId(null)}
        title={selectedComercio?.nombre || ""}
        imageSrc={
          selectedComercio
            ? selectedComercio.imagen || selectedComercio.imagen_url || null
            : null
        }
        imageAlt={selectedComercio?.nombre || "Comercio"}
        description={selectedComercio?.descripcion || null}
        extraContent={
          selectedComercio?.premium_activo ? (
            <div className="space-y-4">
              {selectedComercio.premium_detalle ? (
                <div className="rounded-[24px] border border-violet-100 bg-violet-50/70 p-5">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-violet-600">
                    Perfil ampliado
                  </div>
                  <p className="whitespace-pre-line text-sm leading-7 text-slate-700">
                    {selectedComercio.premium_detalle}
                  </p>
                </div>
              ) : null}

              {selectedComercio.premium_galeria?.length ? (
                <div>
                  <div className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Galeria
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {selectedComercio.premium_galeria.map((image, index) => (
                      <div key={`${image}-${index}`} className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                        <OptimizedImage
                          src={image}
                          alt={`${selectedComercio.nombre} ${index + 1}`}
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
          ...(selectedComercio?.direccion
            ? [{ icon: MapPin, text: selectedComercio.direccion }]
            : []),
          ...(selectedComercio?.telefono
            ? [{ icon: Phone, text: selectedComercio.telefono }]
            : []),
        ]}
        actions={
          selectedComercio ? (
            <>
              {selectedComercio.telefono ? (
                <ContactActionLink
                  href={getContactHref(
                    selectedComercio.telefono,
                    selectedComercio.usa_whatsapp
                  )}
                  mode={selectedComercio.usa_whatsapp === false ? "phone" : "whatsapp"}
                  section="comercios"
                  itemId={String(selectedComercio.id)}
                  itemTitle={selectedComercio.nombre}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-2xl bg-green-600 px-5 py-3 font-semibold text-white transition hover:bg-green-500"
                >
                  <Phone className="h-4 w-4" />
                  {getContactLabel(selectedComercio.usa_whatsapp)}
                </ContactActionLink>
              ) : null}
              <ShareButton
                title={selectedComercio.nombre}
                text={selectedComercio.descripcion}
                url={getShareUrl(selectedComercio.id)}
                section="comercios"
                itemId={String(selectedComercio.id)}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
              />
              <ExternalLinksButtons
                webUrl={selectedComercio.web_url}
                instagramUrl={selectedComercio.instagram_url}
                facebookUrl={selectedComercio.facebook_url}
                section="comercios"
                itemId={String(selectedComercio.id)}
                itemTitle={selectedComercio.nombre}
              />
              {selectedComercio.premium_activo ? (
                <Link
                  href={`/comercios/${selectedComercio.id}`}
                  onClick={() => handleOpenPremiumProfile(selectedComercio)}
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

      <PublicHeader items={buildPublicNav("comercios")} />

      <section className="relative overflow-hidden border-b border-emerald-100 bg-[linear-gradient(135deg,#ecfdf5_0%,#f0f9ff_52%,#fff7ed_100%)]">
        <div className="pointer-events-none absolute -right-24 -top-28 h-80 w-80 rounded-full bg-emerald-300/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-[18%] h-72 w-72 rounded-full bg-sky-300/20 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:py-20">
          <div className="grid items-end gap-8 lg:grid-cols-[1fr_auto]">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-emerald-700 shadow-sm backdrop-blur">
                <Sparkles className="h-4 w-4" />
                Elegí local, elegí Varela
              </div>
              <h1 className="max-w-3xl text-4xl font-black tracking-[-0.04em] text-slate-950 sm:text-5xl lg:text-6xl">
                Todo lo que buscás,
                <span className="block text-emerald-600">más cerca de casa.</span>
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                Descubrí comercios de José Pedro Varela, conocé sus propuestas y contactalos directamente.
              </p>
            </div>

            <div className="flex flex-col items-start gap-3 lg:items-end">
              <div className="inline-flex items-center gap-3 rounded-2xl border border-white/80 bg-white/75 px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                  <Store className="h-5 w-5" />
                </span>
                <span><strong className="block text-lg leading-none text-slate-950">{comercios.length}</strong> comercios para descubrir</span>
              </div>
              <PublicAddButton href="/?sumate=comercio" label="Sumar mi comercio" />
            </div>
          </div>

          <div className="mt-9 max-w-3xl">
            <label htmlFor="buscar-comercio" className="sr-only">Buscar comercios</label>
            <div className="flex items-center gap-3 rounded-2xl border border-white bg-white p-2 pl-5 shadow-[0_18px_45px_-24px_rgba(15,118,110,0.45)] transition focus-within:border-emerald-300 focus-within:ring-4 focus-within:ring-emerald-100/70">
              <Search className="h-5 w-5 shrink-0 text-emerald-600" />
              <input
                id="buscar-comercio"
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="¿Qué estás buscando hoy?"
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
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Guía local</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              {search ? <>Resultados para “{search}”</> : "Conocé los comercios de la ciudad"}
            </h2>
          </div>
          <span className="hidden text-sm font-medium text-slate-500 sm:block">{comerciosFiltrados.length} resultados</span>
        </div>

        {comerciosFiltrados.length === 0 ? (
          <div className="mt-10 rounded-xl border border-gray-200 bg-gray-50 p-8 text-center">
            <p className="text-gray-600">
              {comercios.length === 0
                ? "Todavía no hay comercios cargados."
                : "No se encontraron comercios con esa búsqueda."}
            </p>
          </div>
        ) : (
          <div className="mt-7 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {comerciosFiltrados.map((comercio) => {
              const imagenSrc = comercio.imagen || comercio.imagen_url

              return (
                <div
                  key={comercio.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    if (comercio.premium_activo) {
                      handleOpenPremiumProfile(comercio)
                      return
                    }

                    handleOpenComercio(comercio)
                  }}
                  onKeyDown={(event) =>
                    handleCardKeyDown(event, () => {
                      if (comercio.premium_activo) {
                        handleOpenPremiumProfile(comercio)
                        return
                      }

                      handleOpenComercio(comercio)
                    })
                  }
                  className={`group flex cursor-pointer flex-col overflow-hidden rounded-[24px] border bg-white shadow-[0_12px_35px_-26px_rgba(15,23,42,0.45)] transition duration-300 hover:-translate-y-1.5 hover:shadow-[0_24px_50px_-28px_rgba(15,118,110,0.38)] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${comercio.premium_activo ? "border-violet-200" : "border-slate-200/80 hover:border-emerald-200"}`}
                >
                  {imagenSrc && (
                    <div className="relative h-48 w-full overflow-hidden border-b border-slate-100 bg-[radial-gradient(circle_at_top,#ffffff_0%,#f8fafc_100%)]">
                      <OptimizedImage
                        src={imagenSrc}
                        alt={comercio.nombre}
                        sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 25vw"
                        className="object-contain p-5 transition duration-500 group-hover:scale-[1.04]"
                      />
                      {comercio.premium_activo ? (
                        <span className="absolute right-3 top-3 rounded-full border border-violet-200 bg-white/90 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-violet-700 shadow-sm backdrop-blur">
                          Destacado
                        </span>
                      ) : null}
                    </div>
                  )}

                  <div className="flex flex-1 flex-col p-5">
                  <h3 className="text-lg font-bold leading-snug text-slate-950 transition group-hover:text-emerald-700">
                    {comercio.nombre}
                  </h3>

                  {comercio.direccion ? (
                    <p className="mt-3 flex items-start gap-2 text-sm text-slate-500">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                      <span className="line-clamp-2">{comercio.direccion}</span>
                    </p>
                  ) : null}

                  {comercio.descripcion ? (
                    <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-gray-700">
                      {comercio.descripcion}
                    </p>
                  ) : null}

                  {comercio.telefono ? (
                    <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                      {comercio.usa_whatsapp === false ? <Phone className="h-4 w-4 text-sky-600" /> : <MessageCircle className="h-4 w-4 text-emerald-600" />}
                      {comercio.telefono}
                    </p>
                  ) : null}

                  <div className="mt-auto pt-5">
                    {comercio.premium_activo ? (
                      <Link
                        href={`/comercios/${comercio.id}`}
                        onClick={(event) => {
                          event.stopPropagation()
                          handleOpenPremiumProfile(comercio)
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
                          handleOpenComercio(comercio)
                        }}
                        className="inline-flex w-full items-center justify-between gap-2 rounded-xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 transition group-hover:bg-emerald-50 group-hover:text-emerald-700"
                      >
                        Ver más
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    )}

                  </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
