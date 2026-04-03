import Link from "next/link"
import { ArrowLeft, CalendarDays, MapPin, Phone, UserRound } from "lucide-react"
import { ContactActionLink } from "../ContactActionLink"
import { ExternalLinksButtons } from "../ExternalLinksButtons"
import { OptimizedImage } from "../OptimizedImage"
import { PublicHeader } from "../PublicHeader"
import { ShareButton } from "../ShareButton"
import { formatEventDateRange } from "../../lib/eventDates"
import { buildPublicNav } from "../../lib/publicNav"

type RelatedEvent = {
  id: number
  titulo: string
  categoria?: string | null
  fecha: string
  fecha_fin?: string | null
  descripcion?: string | null
  imagen?: string | null
}

type PremiumListingPageProps = {
  kind: "comercio" | "servicio"
  id: number
  title: string
  imageSrc?: string | null
  description?: string | null
  premiumDetail?: string | null
  premiumGallery?: string[] | null
  address?: string | null
  phone?: string | null
  contactName?: string | null
  category?: string | null
  webUrl?: string | null
  instagramUrl?: string | null
  facebookUrl?: string | null
  usesWhatsapp?: boolean | null
  relatedEvents?: RelatedEvent[]
}

export function PremiumListingPage({
  kind,
  id,
  title,
  imageSrc,
  description,
  premiumDetail,
  premiumGallery,
  address,
  phone,
  contactName,
  category,
  webUrl,
  instagramUrl,
  facebookUrl,
  usesWhatsapp,
  relatedEvents = [],
}: PremiumListingPageProps) {
  const basePath = kind === "comercio" ? "/comercios" : "/servicios"
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

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fbff_0%,#eef7f2_45%,#ffffff_100%)]">
      <PublicHeader items={buildPublicNav(kind === "comercio" ? "comercios" : "servicios")} />

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <Link
            href={basePath}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a {kind === "comercio" ? "comercios" : "servicios"}
          </Link>

          <div className="inline-flex rounded-full bg-violet-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">
            Perfil premium
          </div>
        </div>

        <section className="overflow-hidden rounded-[36px] border border-slate-200 bg-white shadow-[0_24px_80px_-36px_rgba(15,23,42,0.35)]">
          <div className="grid xl:grid-cols-[1.1fr_0.9fr]">
            <div className="bg-[radial-gradient(circle_at_top_left,#e8f6ec_0%,#f4f9ff_38%,#eef4ff_100%)] p-5 sm:p-7 lg:p-8">
              <div className="overflow-hidden rounded-[30px] border border-white/80 bg-white/90 shadow-[0_28px_80px_-36px_rgba(15,23,42,0.45)]">
                {imageSrc ? (
                  <div className="relative aspect-[5/4] w-full">
                    <OptimizedImage
                      src={imageSrc}
                      alt={title}
                      sizes="(max-width: 1280px) 100vw, 60vw"
                      priority
                      className="object-contain bg-white"
                    />
                  </div>
                ) : (
                  <div className="flex min-h-[320px] items-center justify-center text-slate-400">
                    Sin imagen principal
                  </div>
                )}
              </div>

              {premiumGallery?.length ? (
                <div className="mt-5">
                  <div className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Galeria
                  </div>
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                    {premiumGallery.map((image, index) => (
                      <div
                        key={`${image}-${index}`}
                        className="relative aspect-[4/3] overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm"
                      >
                        <OptimizedImage
                          src={image}
                          alt={`${title} ${index + 1}`}
                          sizes="(max-width: 768px) 50vw, 25vw"
                          className="object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="bg-white p-6 sm:p-8">
              {category ? (
                <div className="inline-flex rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">
                  {category}
                </div>
              ) : null}

              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                {title}
              </h1>

              {description ? (
                <div className="mt-6 rounded-[24px] border border-slate-100 bg-slate-50/80 p-5">
                  <div className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                    Descripcion
                  </div>
                  <p className="whitespace-pre-line text-base leading-8 text-slate-700">
                    {description}
                  </p>
                </div>
              ) : null}

              {premiumDetail ? (
                <div className="mt-5 rounded-[24px] border border-violet-100 bg-violet-50/70 p-5">
                  <div className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-violet-600">
                    Perfil ampliado
                  </div>
                  <p className="whitespace-pre-line text-base leading-8 text-slate-700">
                    {premiumDetail}
                  </p>
                </div>
              ) : null}

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {contactName ? (
                  <InfoPill icon={<UserRound className="h-4 w-4" />} text={contactName} />
                ) : null}
                {address ? <InfoPill icon={<MapPin className="h-4 w-4" />} text={address} /> : null}
                {phone ? <InfoPill icon={<Phone className="h-4 w-4" />} text={phone} /> : null}
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
                      section={kind === "comercio" ? "comercios" : "servicios"}
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

                  <ShareButton
                    title={title}
                    text={description || premiumDetail || undefined}
                    url={shareUrl}
                    section={kind === "comercio" ? "comercios" : "servicios"}
                    itemId={String(id)}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
                  />

                  <ExternalLinksButtons
                    webUrl={webUrl}
                    instagramUrl={instagramUrl}
                    facebookUrl={facebookUrl}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-[36px] border border-slate-200 bg-white p-6 shadow-[0_24px_80px_-36px_rgba(15,23,42,0.2)] sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Actividad del local
              </div>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                Eventos de este perfil
              </h2>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                Si este comercio o servicio publica eventos activos, los vas a ver aca mismo.
              </p>
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
              <h3 className="text-lg font-semibold text-slate-900">Todavia no tiene eventos activos</h3>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
                Cuando este perfil publique eventos y queden activos en Hola Varela, van a aparecer en esta seccion.
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
                      <span>{formatEventDateRange(event.fecha, event.fecha_fin)}</span>
                    </div>
                    {event.descripcion ? (
                      <p className="mt-4 line-clamp-4 whitespace-pre-line text-sm leading-7 text-slate-500">
                        {event.descripcion}
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
      </div>
    </main>
  )
}

function InfoPill({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex min-h-[68px] items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-700">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-sky-600 shadow-sm">
        {icon}
      </div>
      <span className="leading-6">{text}</span>
    </div>
  )
}
