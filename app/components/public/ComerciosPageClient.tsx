'use client'

import Link from "next/link"
import { useEffect, useMemo, useState, type KeyboardEvent } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, MapPin, Phone, Search } from "lucide-react"
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

  const comerciosDestacados = useMemo(
    () => comercios.filter((comercio) => comercio.premium_activo).slice(0, 3),
    [comercios]
  )

  const showComerciosDestacados =
    search.trim().length === 0 && comerciosDestacados.length > 0

  return (
    <main className="min-h-screen bg-white">
      <PublicDetailModal
        open={Boolean(selectedComercio)}
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

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Comercios</h1>
            <p className="mt-2 max-w-2xl text-gray-600">
              Encontrá negocios locales, datos de contacto y perfiles completos.
            </p>
          </div>

          <PublicAddButton href="/?sumate=comercio" label="Sumar mi comercio" />
        </div>
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

        {showComerciosDestacados ? (
          <section className="mt-8 rounded-3xl border border-violet-100 bg-violet-50/60 p-5 sm:p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-950">
                  Comercios destacados
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Perfiles con más información, fotos y acceso rápido de contacto.
                </p>
              </div>
              <Link
                href="/comercios"
                className="inline-flex w-fit items-center gap-2 rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-500"
              >
                Ver todos
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {comerciosDestacados.map((comercio) => {
                const imagenSrc = comercio.imagen || comercio.imagen_url

                return (
                  <Link
                    key={comercio.id}
                    href={`/comercios/${comercio.id}`}
                    onClick={() => handleOpenPremiumProfile(comercio)}
                    className="group overflow-hidden rounded-2xl border border-white/80 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
                  >
                    {imagenSrc ? (
                      <div className="relative aspect-[16/9] w-full overflow-hidden bg-white">
                        <OptimizedImage
                          src={imagenSrc}
                          alt={comercio.nombre}
                          sizes="(max-width: 768px) 100vw, 33vw"
                          quality={62}
                          className="object-contain p-3 transition duration-300 group-hover:scale-105"
                        />
                      </div>
                    ) : null}
                    <div className="p-4">
                      <h3 className="line-clamp-2 text-base font-bold text-slate-950 group-hover:text-violet-700">
                        {comercio.nombre}
                      </h3>
                      {comercio.direccion ? (
                        <p className="mt-2 line-clamp-2 text-sm text-slate-600">
                          {comercio.direccion}
                        </p>
                      ) : null}
                      <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-violet-700">
                        Ver perfil completo
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        ) : null}

        {comerciosFiltrados.length === 0 ? (
          <div className="mt-10 rounded-xl border border-gray-200 bg-gray-50 p-8 text-center">
            <p className="text-gray-600">
              {comercios.length === 0
                ? "Todavía no hay comercios cargados."
                : "No se encontraron comercios con esa búsqueda."}
            </p>
          </div>
        ) : (
          <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
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
                  className={`cursor-pointer rounded-2xl border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${comercio.premium_activo ? "border-violet-200" : "border-gray-200 hover:border-blue-200"}`}
                >
                  {imagenSrc && (
                    <div className="relative mb-3 h-40 w-full overflow-hidden rounded-lg border border-slate-100 bg-white">
                      <OptimizedImage
                        src={imagenSrc}
                        alt={comercio.nombre}
                        sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 25vw"
                        className="object-contain p-3"
                      />
                    </div>
                  )}

                  <h2 className="text-lg font-semibold text-gray-900">
                    {comercio.nombre}
                  </h2>

                  {comercio.direccion ? (
                    <p className="mt-2 line-clamp-2 text-sm text-gray-600">
                      {comercio.direccion}
                    </p>
                  ) : null}

                  {comercio.descripcion ? (
                    <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-gray-700">
                      {comercio.descripcion}
                    </p>
                  ) : null}

                  {comercio.telefono ? (
                    <p className="mt-3 text-sm font-medium text-slate-700">
                      {comercio.usa_whatsapp === false ? "Teléfono" : "WhatsApp"}:{" "}
                      {comercio.telefono}
                    </p>
                  ) : null}

                  <div className="mt-4 flex flex-wrap gap-3">
                    {comercio.premium_activo ? (
                      <Link
                        href={`/comercios/${comercio.id}`}
                        onClick={(event) => {
                          event.stopPropagation()
                          handleOpenPremiumProfile(comercio)
                        }}
                        className="inline-flex items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-medium text-violet-700 transition hover:border-violet-300 hover:bg-violet-100"
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
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
                      >
                        Ver más
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    )}

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
