'use client'

import Link from "next/link"
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { ArrowLeft, CalendarDays, ChevronLeft, ChevronRight, MapPin, Phone, UserRound } from "lucide-react"
import { ContactActionLink } from "../ContactActionLink"
import { ExternalLinksButtons } from "../ExternalLinksButtons"
import { OptimizedImage } from "../OptimizedImage"
import { PublicHeader } from "../PublicHeader"
import { ShareButton } from "../ShareButton"
import { recordContentVisit, recordSiteVisit } from "../../lib/contentVisits"
import { formatEventDateRange } from "../../lib/eventDates"
import { buildJosePedroVarelaDirectionsUrl } from "../../lib/mapLinks"
import { parseEventDescription } from "../../lib/eventSubmissionMeta"
import { buildPublicNav } from "../../lib/publicNav"

type RelatedEvent = {
  id: number
  titulo: string
  categoria?: string | null
  fecha: string
  fecha_fin?: string | null
  fecha_solo_mes?: boolean | null
  descripcion?: string | null
  imagen?: string | null
}

type RelatedCourse = {
  id: number
  nombre: string
  descripcion?: string | null
  responsable?: string | null
  contacto?: string | null
  imagen?: string | null
}

type PremiumListingPageProps = {
  kind: "comercio" | "servicio" | "institucion"
  id: number
  title: string
  imageSrc?: string | null
  description?: string | null
  premiumDetail?: string | null
  premiumGallery?: string[] | null
  premiumExtraTitle?: string | null
  premiumExtraDetail?: string | null
  premiumExtraGallery?: string[] | null
  address?: string | null
  directionsAddress?: string | null
  phone?: string | null
  contactName?: string | null
  category?: string | null
  webUrl?: string | null
  instagramUrl?: string | null
  facebookUrl?: string | null
  usesWhatsapp?: boolean | null
  relatedEvents?: RelatedEvent[]
  relatedCourses?: RelatedCourse[]
  relatedCoursesTitle?: string | null
}

type GalleryKind = "main" | "extra"

export function PremiumListingPage({
  kind,
  id,
  title,
  imageSrc,
  description,
  premiumDetail,
  premiumGallery,
  premiumExtraTitle,
  premiumExtraDetail,
  premiumExtraGallery,
  address,
  directionsAddress,
  phone,
  contactName,
  category,
  webUrl,
  instagramUrl,
  facebookUrl,
  usesWhatsapp,
  relatedEvents = [],
  relatedCourses = [],
  relatedCoursesTitle,
}: PremiumListingPageProps) {
  const basePath =
    kind === "comercio"
      ? "/comercios"
      : kind === "servicio"
        ? "/servicios"
        : "/instituciones"
  const section =
    kind === "comercio"
      ? "comercios"
      : kind === "servicio"
        ? "servicios"
        : "instituciones"
  const shareUrl =
    typeof window === "undefined"
      ? `${basePath}/${id}`
      : `${window.location.origin}${basePath}/${id}`

  const whatsappLink = (telefono: string) => {
    const limpio = telefono.replace(/\D/g, "")
    const numero = limpio.startsWith("598")
      ? limpio
      : `598${limpio.replace(/^0+/, "")}`

    return `https://wa.me/${numero}`
  }

  const contactHref = phone
    ? usesWhatsapp === false
      ? `tel:${phone}`
      : whatsappLink(phone)
    : null
  const directionsUrl = address || directionsAddress
    ? buildJosePedroVarelaDirectionsUrl(address, directionsAddress)
    : null

  const mainGalleryImages = useMemo(
    () => {
      const uniqueImages = Array.from(
        new Set(
          [imageSrc, ...(premiumGallery || [])].filter(
            Boolean
          ) as string[]
        )
      )

      return uniqueImages
    },
    [imageSrc, premiumGallery]
  )
  const extraGalleryImages = useMemo(
    () =>
      Array.from(new Set((premiumExtraGallery || []).filter(Boolean) as string[])),
    [premiumExtraGallery]
  )
  const [activeGallery, setActiveGallery] = useState<GalleryKind>("main")
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [zoomedImage, setZoomedImage] = useState<string | null>(null)
  const touchStartXRef = useRef<number | null>(null)
  const touchDeltaXRef = useRef(0)
  const currentGalleryImages = activeGallery === "extra" ? extraGalleryImages : mainGalleryImages
  const selectedImage =
    currentGalleryImages[selectedImageIndex] ||
    mainGalleryImages[0] ||
    extraGalleryImages[0] ||
    null
  const eventsSectionEyebrow = kind === "institucion" ? "Actividades" : "Actividad del local"
  const eventsSectionTitle =
    kind === "institucion"
      ? `Proximos eventos y actividades de ${title}`
      : `Proximos eventos de ${title}`
  const emptyEventsTitle =
    kind === "institucion" ? "Todavia no tiene actividades activas" : "Todavia no tiene eventos activos"
  const emptyEventsDescription =
    kind === "institucion"
      ? "Cuando esta institucion publique actividades o eventos activos en Hola Varela, van a aparecer en esta seccion."
      : "Cuando este perfil publique eventos y queden activos en Hola Varela, van a aparecer en esta seccion."
  const coursesSectionEyebrow = kind === "institucion" ? "Cursos y talleres" : "Cursos del perfil"
  const coursesSectionTitle =
    relatedCoursesTitle ||
    (kind === "institucion"
      ? `Cursos y talleres de ${title}`
      : `Cursos y clases de ${title}`)

  const openImageAt = (index: number, gallery: GalleryKind = "main") => {
    const images = gallery === "extra" ? extraGalleryImages : mainGalleryImages
    const safeIndex =
      index < 0
        ? Math.max(images.length - 1, 0)
        : index >= images.length
          ? 0
          : index

    setActiveGallery(gallery)
    setSelectedImageIndex(safeIndex)
    setZoomedImage(images[safeIndex] || null)
  }

  useEffect(() => {
    void recordSiteVisit(
      kind === "comercio"
        ? `comercio-premium-${id}`
        : kind === "servicio"
          ? `servicio-premium-${id}`
          : `institucion-premium-${id}`,
      title
    )
    void recordContentVisit(section, String(id), title)
  }, [id, kind, section, title])

  const goToPrevious = () => {
    openImageAt(
      selectedImageIndex === 0 ? currentGalleryImages.length - 1 : selectedImageIndex - 1,
      activeGallery
    )
  }

  const goToNext = () => {
    openImageAt(
      selectedImageIndex >= currentGalleryImages.length - 1 ? 0 : selectedImageIndex + 1,
      activeGallery
    )
  }

  const handleZoomTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    touchStartXRef.current = event.touches[0]?.clientX ?? null
    touchDeltaXRef.current = 0
  }

  const handleZoomTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartXRef.current === null) return
    touchDeltaXRef.current = (event.touches[0]?.clientX ?? 0) - touchStartXRef.current
  }

  const handleZoomTouchEnd = () => {
    if (touchStartXRef.current === null || currentGalleryImages.length <= 1) {
      touchStartXRef.current = null
      touchDeltaXRef.current = 0
      return
    }

    if (touchDeltaXRef.current <= -50) {
      goToNext()
    } else if (touchDeltaXRef.current >= 50) {
      goToPrevious()
    }

    touchStartXRef.current = null
    touchDeltaXRef.current = 0
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fbff_0%,#eef7f2_45%,#ffffff_100%)]">
      {zoomedImage ? (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/88 p-4"
          onClick={() => setZoomedImage(null)}
        >
          <button
            type="button"
            onClick={() => setZoomedImage(null)}
            className="absolute right-5 top-5 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
          >
            Cerrar
          </button>
          <div
            className="relative h-[78vh] w-full max-w-6xl overflow-hidden rounded-[28px] border border-white/10 bg-white/5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
            onTouchStart={handleZoomTouchStart}
            onTouchMove={handleZoomTouchMove}
            onTouchEnd={handleZoomTouchEnd}
          >
            {currentGalleryImages.length > 1 ? (
              <>
                <button
                  type="button"
                  onClick={goToPrevious}
                  className="absolute left-4 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/20 bg-slate-950/45 p-3 text-white transition hover:bg-slate-950/70"
                  aria-label="Ver imagen anterior"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  type="button"
                  onClick={goToNext}
                  className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/20 bg-slate-950/45 p-3 text-white transition hover:bg-slate-950/70"
                  aria-label="Ver siguiente imagen"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
                <div className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-full border border-white/20 bg-slate-950/55 px-4 py-2 text-sm font-medium text-white">
                  {selectedImageIndex + 1} / {currentGalleryImages.length}
                </div>
              </>
            ) : null}
            <OptimizedImage
              src={zoomedImage}
              alt={title}
              sizes="100vw"
              priority
              className="object-contain bg-transparent p-3 sm:p-6"
            />
          </div>
        </div>
      ) : null}

      <PublicHeader items={buildPublicNav(section)} />

      <div className="mx-auto max-w-[1520px] px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <Link
            href={basePath}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a {kind === "comercio" ? "comercios" : kind === "servicio" ? "servicios" : "instituciones"}
          </Link>
        </div>

        <section className="overflow-hidden rounded-[36px] border border-slate-200 bg-white shadow-[0_24px_80px_-36px_rgba(15,23,42,0.35)]">
          <div className="grid lg:grid-cols-[minmax(0,0.94fr)_minmax(0,1.06fr)]">
            <div className="bg-[radial-gradient(circle_at_top_left,#e8f6ec_0%,#f4f9ff_38%,#eef4ff_100%)] p-5 sm:p-7 lg:p-8">
              <div className="overflow-hidden rounded-[30px] border border-white/80 bg-white/90 shadow-[0_28px_80px_-36px_rgba(15,23,42,0.45)]">
                {selectedImage ? (
                  <button
                    type="button"
                    onClick={() => openImageAt(selectedImageIndex)}
                    className="relative block aspect-[4/3] w-full transition hover:scale-[1.01]"
                    aria-label="Ver imagen más grande"
                  >
                    <OptimizedImage
                      src={selectedImage}
                      alt={title}
                      sizes="(max-width: 1280px) 100vw, 55vw"
                      priority
                      className="object-contain bg-white p-2 sm:p-4"
                    />
                  </button>
                ) : (
                  <div className="flex min-h-[320px] items-center justify-center text-slate-400">
                    Sin imagen principal
                  </div>
                )}
              </div>

              {mainGalleryImages.length > 1 ? (
                <div className="mt-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                        Imagenes
                      </div>
                      <p className="mt-2 text-sm text-slate-500">
                        Toca una miniatura para verla grande y recorre las imagenes.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={goToPrevious}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Anterior
                      </button>
                      <button
                        type="button"
                        onClick={goToNext}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
                      >
                        Siguiente
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
                    {mainGalleryImages.map((image, index) => (
                      <button
                        type="button"
                        key={`${image}-${index}`}
                        onClick={() => openImageAt(index, "main")}
                        className={`relative aspect-[4/3] overflow-hidden rounded-[24px] border bg-white shadow-sm transition ${
                          activeGallery === "main" && selectedImageIndex === index
                            ? "border-blue-400 ring-2 ring-blue-100"
                            : "border-slate-200 hover:border-blue-300"
                        }`}
                      >
                        <OptimizedImage
                          src={image}
                          alt={`${title} ${index + 1}`}
                          sizes="(max-width: 768px) 50vw, 25vw"
                          className="object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {premiumExtraTitle || premiumExtraDetail || premiumExtraGallery?.length ? (
                <div className="mt-6 rounded-[24px] border border-amber-100 bg-amber-50/80 p-6">
                  {premiumExtraTitle ? (
                    <h3 className="text-2xl font-semibold tracking-tight text-slate-950">
                      {premiumExtraTitle}
                    </h3>
                  ) : null}
                  {premiumExtraDetail ? (
                    <p className="mt-3 whitespace-pre-line text-base leading-8 text-slate-700">
                      {premiumExtraDetail}
                    </p>
                  ) : null}
                  {extraGalleryImages.length ? (
                    <div className="mt-5 grid grid-cols-2 gap-4">
                      {extraGalleryImages.map((image, index) => (
                        <button
                          type="button"
                          key={`${image}-${index}`}
                          onClick={() => openImageAt(index, "extra")}
                          className={`relative aspect-[4/3] overflow-hidden rounded-[22px] border bg-white ${
                            activeGallery === "extra" && selectedImageIndex === index
                              ? "border-amber-400 ring-2 ring-amber-100"
                              : "border-amber-200"
                          }`}
                        >
                          <OptimizedImage
                            src={image}
                            alt={`${premiumExtraTitle || title} ${index + 1}`}
                            sizes="(max-width: 768px) 50vw, 33vw"
                            className="object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="bg-white p-6 sm:p-8 lg:p-8">
              <div className="rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-6">
                {category ? (
                  <div className="inline-flex rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">
                    {category}
                  </div>
                ) : null}

                <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                  {title}
                </h1>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {address ? <InfoPill icon={<MapPin className="h-4 w-4" />} text={address} /> : null}
                  {phone ? <InfoPill icon={<Phone className="h-4 w-4" />} text={phone} /> : null}
                  {contactName ? (
                    <InfoPill icon={<UserRound className="h-4 w-4" />} text={contactName} />
                  ) : null}
                </div>

                <div className="mt-8">
                  <div className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                    Acciones
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {contactHref ? (
                      <ContactActionLink
                        href={contactHref}
                        mode={usesWhatsapp === false ? "phone" : "whatsapp"}
                        section={section}
                        itemId={String(id)}
                        itemTitle={title}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-2xl bg-green-600 px-5 py-3 font-semibold text-white transition hover:bg-green-500"
                      >
                        <Phone className="h-4 w-4" />
                        {usesWhatsapp === false ? "Llamar" : "WhatsApp"}
                      </ContactActionLink>
                    ) : null}

                    {directionsUrl ? (
                      <a
                        href={directionsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-5 py-3 font-semibold text-sky-700 transition hover:border-sky-300 hover:bg-sky-100"
                      >
                        <MapPin className="h-4 w-4" />
                        Como llegar
                      </a>
                    ) : null}

                    <ShareButton
                      title={title}
                      text={description || premiumDetail || undefined}
                      url={shareUrl}
                      section={section}
                      itemId={String(id)}
                      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
                    />

                    <ExternalLinksButtons
                      webUrl={webUrl}
                      instagramUrl={instagramUrl}
                      facebookUrl={facebookUrl}
                      section={section}
                      itemId={String(id)}
                      itemTitle={title}
                    />
                  </div>
                </div>
              </div>

              {description ? (
                <div className="mt-6 rounded-[24px] border border-slate-100 bg-slate-50/80 p-6">
                  <div className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                    Sobre este perfil
                  </div>
                  <p className="whitespace-pre-line text-base leading-8 text-slate-700">
                    {description}
                  </p>
                </div>
              ) : null}

              {premiumDetail ? (
                <div className="mt-5 rounded-[24px] border border-sky-100 bg-sky-50/70 p-6">
                  <div className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">
                    Informacion ampliada
                  </div>
                  <p className="whitespace-pre-line text-base leading-8 text-slate-700">
                    {premiumDetail}
                  </p>
                </div>
              ) : null}

            </div>
          </div>
        </section>

        <section id="eventos-del-local" className="mt-8 rounded-[36px] border border-slate-200 bg-white p-6 shadow-[0_24px_80px_-36px_rgba(15,23,42,0.2)] sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  {eventsSectionEyebrow}
                </div>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                  {eventsSectionTitle}
                </h2>
              </div>
              <Link
                href="/eventos"
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
              >
                Ver todos los eventos
              </Link>
            </div>

            {relatedEvents.length === 0 ? (
              <div className="mt-6 rounded-[28px] border border-dashed border-slate-200 bg-[linear-gradient(135deg,#f8fbff_0%,#f4faf6_100%)] p-8">
                <h3 className="text-lg font-semibold text-slate-900">{emptyEventsTitle}</h3>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
                  {emptyEventsDescription}
                </p>
              </div>
            ) : (
              <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {relatedEvents.map((event) => (
                  <article key={event.id} className="overflow-hidden rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] shadow-sm">
                    {event.imagen ? (
                      <div className="relative h-48 w-full">
                        <OptimizedImage
                          src={event.imagen}
                          alt={event.titulo}
                          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="flex h-48 items-center justify-center bg-slate-100 text-slate-400">
                        Sin imagen
                      </div>
                    )}
                    <div className="p-5">
                      {event.categoria ? (
                        <div className="mb-3 inline-flex rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">
                          {event.categoria}
                        </div>
                      ) : null}
                      <h3 className="text-xl font-semibold text-slate-900">{event.titulo}</h3>
                      <div className="mt-3 flex items-center gap-2 text-sm text-slate-600">
                        <CalendarDays className="h-4 w-4 text-slate-400" />
                        <span>{formatEventDateRange(event.fecha, event.fecha_fin, event.fecha_solo_mes ?? false)}</span>
                      </div>
                      {event.descripcion ? (
                        <p className="mt-4 line-clamp-4 whitespace-pre-line text-sm leading-7 text-slate-500">
                          {parseEventDescription(event.descripcion).baseDescription}
                        </p>
                      ) : null}
                      <div className="mt-5">
                        <Link
                          href={`/eventos?item=${event.id}`}
                          className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:border-blue-300 hover:bg-blue-100"
                        >
                          Ver evento
                        </Link>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

        {relatedCourses.length > 0 ? (
          <section className="mt-8 rounded-[36px] border border-slate-200 bg-white p-6 shadow-[0_24px_80px_-36px_rgba(15,23,42,0.2)] sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  {coursesSectionEyebrow}
                </div>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                  {coursesSectionTitle}
                </h2>
              </div>
              <Link
                href="/cursos"
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
              >
                Ver todos los cursos
              </Link>
            </div>

            <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {relatedCourses.map((course) => (
                <article
                  key={course.id}
                  className="overflow-hidden rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] shadow-sm"
                >
                  {course.imagen ? (
                    <div className="relative h-48 w-full">
                      <OptimizedImage
                        src={course.imagen}
                        alt={course.nombre}
                        sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex h-48 items-center justify-center bg-slate-100 text-slate-400">
                      Sin imagen
                    </div>
                  )}
                  <div className="p-5">
                    <h3 className="text-xl font-semibold text-slate-900">{course.nombre}</h3>
                    {course.responsable ? (
                      <div className="mt-3 flex items-center gap-2 text-sm text-slate-600">
                        <UserRound className="h-4 w-4 text-slate-400" />
                        <span>{course.responsable}</span>
                      </div>
                    ) : null}
                    {course.descripcion ? (
                      <p className="mt-4 line-clamp-4 whitespace-pre-line text-sm leading-7 text-slate-500">
                        {course.descripcion}
                      </p>
                    ) : null}
                    <div className="mt-5">
                      <Link
                        href={`/cursos?item=${course.id}`}
                        className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:border-blue-300 hover:bg-blue-100"
                      >
                        Ver curso
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  )
}

function InfoPill({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="flex min-h-[68px] items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-700">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-sky-600 shadow-sm">
        {icon}
      </div>
      <span className="leading-6">{text}</span>
    </div>
  )
}
