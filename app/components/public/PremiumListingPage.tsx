'use client'

import Link from "next/link"
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import {
  ArrowLeft,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  Sparkles,
  UserRound,
} from "lucide-react"
import { ContactActionLink } from "../ContactActionLink"
import { ExternalLinksButtons } from "../ExternalLinksButtons"
import { OptimizedImage } from "../OptimizedImage"
import { PublicHeader } from "../PublicHeader"
import { ShareButton } from "../ShareButton"
import { recordContentVisit, recordSiteVisit } from "../../lib/contentVisits"
import { formatEventDateRange } from "../../lib/eventDates"
import { buildJosePedroVarelaDirectionsUrl } from "../../lib/mapLinks"
import { parseEventDescription, shouldHideEventDate } from "../../lib/eventSubmissionMeta"
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

  const mainGalleryImages = useMemo(() => {
    return Array.from(
      new Set(
        [imageSrc, ...(premiumGallery || [])].filter(Boolean) as string[]
      )
    )
  }, [imageSrc, premiumGallery])

  const extraGalleryImages = useMemo(
    () => Array.from(new Set((premiumExtraGallery || []).filter(Boolean) as string[])),
    [premiumExtraGallery]
  )

  const [activeGallery, setActiveGallery] = useState<GalleryKind>("main")
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [zoomedImage, setZoomedImage] = useState<string | null>(null)
  const touchStartXRef = useRef<number | null>(null)
  const touchDeltaXRef = useRef(0)

  const currentGalleryImages = activeGallery === "extra" ? extraGalleryImages : mainGalleryImages
  const logoImage = imageSrc || mainGalleryImages[0] || extraGalleryImages[0] || null

  const eventsSectionEyebrow = kind === "institucion" ? "Actividades" : "Actividad del local"

  const eventsSectionTitle =
    kind === "institucion"
      ? `Próximos eventos y actividades de ${title}`
      : `Próximos eventos de ${title}`

  const coursesSectionEyebrow = kind === "institucion" ? "Cursos y talleres" : "Cursos del perfil"

  const coursesSectionTitle =
    relatedCoursesTitle ||
    (kind === "institucion"
      ? `Cursos y talleres de ${title}`
      : `Cursos y clases de ${title}`)

  const getSafeImageIndex = (index: number, gallery: GalleryKind = "main") => {
    const images = gallery === "extra" ? extraGalleryImages : mainGalleryImages
    if (images.length === 0) return 0
    if (index < 0) return images.length - 1
    if (index >= images.length) return 0
    return index
  }

  const selectImageAt = (index: number, gallery: GalleryKind = "main") => {
    const safeIndex = getSafeImageIndex(index, gallery)
    setActiveGallery(gallery)
    setSelectedImageIndex(safeIndex)
  }

  const openImageAt = (index: number, gallery: GalleryKind = "main") => {
    const images = gallery === "extra" ? extraGalleryImages : mainGalleryImages
    const safeIndex = getSafeImageIndex(index, gallery)
    selectImageAt(safeIndex, gallery)
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

  const goToPrevious = (openZoom = false) => {
    const nextIndex = getSafeImageIndex(selectedImageIndex - 1, activeGallery)
    if (openZoom) {
      openImageAt(nextIndex, activeGallery)
      return
    }
    selectImageAt(nextIndex, activeGallery)
  }

  const goToNext = (openZoom = false) => {
    const nextIndex = getSafeImageIndex(selectedImageIndex + 1, activeGallery)
    if (openZoom) {
      openImageAt(nextIndex, activeGallery)
      return
    }
    selectImageAt(nextIndex, activeGallery)
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
      goToNext(true)
    } else if (touchDeltaXRef.current >= 50) {
      goToPrevious(true)
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
                  onClick={() => goToPrevious(true)}
                  className="absolute left-4 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/20 bg-slate-950/45 p-3 text-white transition hover:bg-slate-950/70"
                  aria-label="Ver imagen anterior"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>

                <button
                  type="button"
                  onClick={() => goToNext(true)}
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
              className="bg-transparent object-contain p-3 sm:p-6"
            />
          </div>
        </div>
      ) : null}

      <PublicHeader items={buildPublicNav(section)} />

      <div className="mx-auto max-w-[1180px] px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <Link
            href={basePath}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a {kind === "comercio" ? "comercios" : kind === "servicio" ? "servicios" : "instituciones"}
          </Link>
        </div>

        <section className="overflow-hidden rounded-[30px] border border-slate-200/80 bg-white shadow-[0_24px_70px_-40px_rgba(15,23,42,0.42)]">
          <div className="mx-auto flex w-full max-w-[860px] flex-col gap-6 p-5 sm:p-7 lg:p-8">
            <section className="rounded-[26px] border border-slate-100 bg-white/80 p-5 shadow-sm sm:p-6">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-7">
                <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm sm:h-36 sm:w-36">
                  {logoImage ? (
                    <button
                      type="button"
                      onClick={() => openImageAt(0, "main")}
                      className="relative block h-full w-full"
                      aria-label="Ver logo más grande"
                    >
                      <OptimizedImage
                        src={logoImage}
                        alt={title}
                        sizes="150px"
                        priority
                        className="bg-white object-contain p-3"
                      />
                    </button>
                  ) : (
                    <div className="flex h-full items-center justify-center px-3 text-center text-sm text-slate-400">
                      Sin imagen
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  {category ? (
                    <div className="inline-flex rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                      {category}
                    </div>
                  ) : null}

                  <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
                    {title}
                  </h1>
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {address ? <InfoPill icon={<MapPin className="h-4 w-4" />} text={address} /> : null}
                {phone ? <InfoPill icon={<Phone className="h-4 w-4" />} text={phone} /> : null}
                {contactName ? (
                  <InfoPill icon={<UserRound className="h-4 w-4" />} text={contactName} />
                ) : null}
              </div>

              <div className="mt-7">
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  {contactHref ? (
                    <ContactActionLink
                      href={contactHref}
                      mode={usesWhatsapp === false ? "phone" : "whatsapp"}
                      section={section}
                      itemId={String(id)}
                      itemTitle={title}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 font-semibold text-white shadow-[0_16px_34px_-18px_rgba(5,150,105,0.95)] transition hover:-translate-y-0.5 hover:bg-emerald-500 hover:shadow-[0_18px_38px_-18px_rgba(5,150,105,0.95)] focus:outline-none focus:ring-2 focus:ring-emerald-300 sm:min-w-40"
                    >
                      {usesWhatsapp === false ? <Phone className="h-4 w-4" /> : <MessageCircle className="h-4 w-4" />}
                      {usesWhatsapp === false ? "Llamar" : "WhatsApp"}
                    </ContactActionLink>
                  ) : null}

                  {directionsUrl ? (
                    <a
                      href={directionsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-5 py-3 font-semibold text-sky-700 transition hover:-translate-y-0.5 hover:border-sky-300 hover:bg-sky-100 focus:outline-none focus:ring-2 focus:ring-sky-200"
                    >
                      <Navigation className="h-4 w-4" />
                      Cómo llegar
                    </a>
                  ) : null}

                  <ShareButton
                    title={title}
                    text={description || premiumDetail || undefined}
                    url={shareUrl}
                    section={section}
                    itemId={String(id)}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:border-sky-300 hover:text-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-100"
                  />

                  <ExternalLinksButtons
                    webUrl={webUrl}
                    instagramUrl={instagramUrl}
                    facebookUrl={facebookUrl}
                    section={section}
                    itemId={String(id)}
                    itemTitle={title}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:border-sky-300 hover:text-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-100"
                  />
                </div>
              </div>
            </section>

            {description ? (
              <section className="rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-5 shadow-sm sm:p-6">
                <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  <Sparkles className="h-4 w-4 text-emerald-600" />
                  Sobre este perfil
                </div>
                <p className="whitespace-pre-line text-base leading-8 text-slate-700 sm:text-[17px]">
                  {description}
                </p>
              </section>
            ) : null}

            {mainGalleryImages.length > 1 ? (
              <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Galería
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      Deslizá para ver más imágenes
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => goToPrevious()}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-300 hover:text-sky-700"
                      aria-label="Ver imagen anterior"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => goToNext()}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-300 hover:text-sky-700"
                      aria-label="Ver siguiente imagen"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-5 overflow-x-auto pb-2">
                  <div className="flex min-w-max gap-3">
                    {mainGalleryImages.map((image, index) => (
                      <button
                        type="button"
                        key={`${image}-${index}`}
                        onClick={() => openImageAt(index, "main")}
                        className={`relative h-[120px] w-[120px] shrink-0 overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:h-[130px] sm:w-[130px] lg:h-[145px] lg:w-[145px] ${
                          activeGallery === "main" && selectedImageIndex === index
                            ? "border-sky-500 ring-2 ring-sky-100"
                            : "border-slate-200 hover:border-sky-300"
                        }`}
                      >
                        <OptimizedImage
                          src={image}
                          alt={`${title} ${index + 1}`}
                          sizes="150px"
                          className="object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </section>
            ) : null}

            {premiumDetail ? (
              <section className="rounded-[24px] border border-sky-100 bg-sky-50/70 p-5 shadow-sm sm:p-6">
                <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
                  <ExternalLink className="h-4 w-4" />
                  Información ampliada
                </div>
                <p className="whitespace-pre-line text-base leading-8 text-slate-700 sm:text-[17px]">
                  {premiumDetail}
                </p>
              </section>
            ) : null}

            {premiumExtraTitle || premiumExtraDetail || extraGalleryImages.length ? (
              <section className="rounded-[24px] border border-amber-100 bg-amber-50/80 p-5 shadow-sm sm:p-6">
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
                  <div className="mt-5 overflow-x-auto pb-2">
                    <div className="flex min-w-max gap-3">
                      {extraGalleryImages.map((image, index) => (
                        <button
                          type="button"
                          key={`${image}-${index}`}
                          onClick={() => openImageAt(index, "extra")}
                          className={`relative h-[120px] w-[120px] shrink-0 overflow-hidden rounded-[22px] border bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:h-[130px] sm:w-[130px] lg:h-[145px] lg:w-[145px] ${
                            activeGallery === "extra" && selectedImageIndex === index
                              ? "border-amber-400 ring-2 ring-amber-100"
                              : "border-amber-200 hover:border-amber-300"
                          }`}
                        >
                          <OptimizedImage
                            src={image}
                            alt={`${premiumExtraTitle || title} ${index + 1}`}
                            sizes="150px"
                            className="object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </section>
            ) : null}
          </div>
        </section>

        {relatedEvents.length > 0 ? (
          <section id="eventos-del-local" className="mt-8 rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_22px_70px_-42px_rgba(15,23,42,0.32)] sm:p-7 lg:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  {eventsSectionEyebrow}
                </div>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                  {eventsSectionTitle}
                </h2>
              </div>

              <Link
                href="/eventos"
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:border-sky-300 hover:text-sky-700"
              >
                Ver todos los eventos
              </Link>
            </div>

            <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {relatedEvents.map((event) => (
                <article key={event.id} className="overflow-hidden rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] shadow-sm transition hover:-translate-y-1 hover:shadow-[0_20px_46px_-32px_rgba(15,23,42,0.55)]">
                  {event.imagen ? (
                    <div className="relative h-56 w-full bg-white">
                      <OptimizedImage
                        src={event.imagen}
                        alt={event.titulo}
                        sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                        className="object-contain p-2"
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

                    {!shouldHideEventDate(event.descripcion, event.categoria) ? (
                      <div className="mt-3 flex items-center gap-2 text-sm text-slate-600">
                        <CalendarDays className="h-4 w-4 text-slate-400" />
                        <span>{formatEventDateRange(event.fecha, event.fecha_fin, event.fecha_solo_mes ?? false)}</span>
                      </div>
                    ) : null}

                    {event.descripcion ? (
                      <p className="mt-4 line-clamp-4 whitespace-pre-line text-sm leading-7 text-slate-500">
                        {parseEventDescription(event.descripcion).baseDescription}
                      </p>
                    ) : null}

                    <div className="mt-5">
                      <Link
                        href={`/eventos/${event.id}`}
                        className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700 transition hover:border-sky-300 hover:bg-sky-100"
                      >
                        Ver evento
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {relatedCourses.length > 0 ? (
          <section className="mt-8 rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_22px_70px_-42px_rgba(15,23,42,0.32)] sm:p-7 lg:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  {coursesSectionEyebrow}
                </div>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                  {coursesSectionTitle}
                </h2>
              </div>

              <Link
                href="/cursos"
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:border-sky-300 hover:text-sky-700"
              >
                Ver todos los cursos
              </Link>
            </div>

            <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {relatedCourses.map((course) => (
                <article
                  key={course.id}
                  className="overflow-hidden rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] shadow-sm transition hover:-translate-y-1 hover:shadow-[0_20px_46px_-32px_rgba(15,23,42,0.55)]"
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
                        href={`/cursos/${course.id}`}
                        className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700 transition hover:border-sky-300 hover:bg-sky-100"
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
    <div className="flex min-h-[64px] items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-700">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-sky-600 shadow-sm">
        {icon}
      </div>
      <span className="min-w-0 leading-6">{text}</span>
    </div>
  )
}