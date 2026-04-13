import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { CalendarDays, MapPin, Phone, Share2 } from "lucide-react"
import { ContactActionLink } from "../../components/ContactActionLink"
import { ExternalLinksButtons } from "../../components/ExternalLinksButtons"
import { OptimizedImage } from "../../components/OptimizedImage"
import { PublicHeader } from "../../components/PublicHeader"
import { ShareButton } from "../../components/ShareButton"
import { formatEventDateRange } from "../../lib/eventDates"
import { parseEventDescription } from "../../lib/eventSubmissionMeta"
import { buildPublicNav } from "../../lib/publicNav"
import { supabaseServer } from "../../lib/supabaseServer"

export const revalidate = 7200

type EventPageParams = {
  params: Promise<{ id: string }>
}

type EventoRecord = {
  id: string
  titulo: string
  categoria?: string | null
  descripcion: string
  fecha: string
  fecha_fin?: string | null
  fecha_solo_mes?: boolean | null
  ubicacion: string
  telefono?: string | null
  web_url?: string | null
  instagram_url?: string | null
  facebook_url?: string | null
  imagen?: string | null
  estado?: string | null
  usa_whatsapp?: boolean | null
  owner_email?: string | null
}

const getSiteUrl = () => {
  const directUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL
  if (directUrl) {
    return directUrl.startsWith("http") ? directUrl : `https://${directUrl}`
  }

  const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL
  if (vercelUrl) {
    return vercelUrl.startsWith("http") ? vercelUrl : `https://${vercelUrl}`
  }

  return "https://www.holavarela.uy"
}

const getEventUrl = (id: string) => `${getSiteUrl()}/eventos/${id}`
const getEventImageUrl = (id: string) => `${getSiteUrl()}/api/eventos/${id}/og-image`

const normalizeEventCategory = (categoria?: string | null) => {
  const value = categoria?.trim()
  if (!value || value.toUpperCase() === "NOT NULL") return "Evento"
  if (value.toLowerCase() === "beneficios") return "Beneficio"
  return value
}

const whatsappLink = (telefono: string) => {
  const limpio = telefono.replace(/\D/g, "")
  const numero = limpio.startsWith("598")
    ? limpio
    : `598${limpio.replace(/^0+/, "")}`

  return `https://wa.me/${numero}`
}

async function fetchEventById(id: string) {
  const { data } = await supabaseServer
    .from("eventos")
    .select("id, titulo, categoria, descripcion, fecha, fecha_fin, fecha_solo_mes, ubicacion, telefono, web_url, instagram_url, facebook_url, imagen, estado, usa_whatsapp, owner_email")
    .eq("id", id)
    .or("estado.is.null,estado.eq.activo")
    .maybeSingle()

  if (!data) return null

  return data as EventoRecord
}

export async function generateMetadata({ params }: EventPageParams): Promise<Metadata> {
  const { id } = await params
  const evento = await fetchEventById(id)

  if (!evento) {
    return {
      title: "Evento | Hola Varela!",
    }
  }

  const parsedDescription = parseEventDescription(evento.descripcion).baseDescription
  const description =
    parsedDescription || `Mira este evento en Hola Varela: ${evento.titulo}`
  const imageUrl = evento.imagen
    ? getEventImageUrl(evento.id)
    : `${getSiteUrl()}/logo-varela-grande.png`
  const eventUrl = getEventUrl(evento.id)

  return {
    metadataBase: new URL(getSiteUrl()),
    title: `${evento.titulo} | Hola Varela!`,
    description,
    openGraph: {
      title: evento.titulo,
      description,
      url: eventUrl,
      type: "article",
      images: [
        {
          url: imageUrl,
          alt: evento.titulo,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: evento.titulo,
      description,
      images: [imageUrl],
    },
  }
}

export default async function EventoSharePage({ params }: EventPageParams) {
  const { id } = await params
  const evento = await fetchEventById(id)

  if (!evento) {
    notFound()
  }

  const parsedDescription = parseEventDescription(evento.descripcion).baseDescription
  const eventUrl = getEventUrl(evento.id)
  const { data: ownerInstitution } = evento.owner_email
    ? await supabaseServer
        .from("instituciones")
        .select("id, nombre, owner_email, premium_activo, estado")
        .eq("owner_email", evento.owner_email)
        .eq("premium_activo", true)
        .eq("estado", "activo")
        .maybeSingle()
    : { data: null }
  const contactHref = evento.telefono
    ? evento.usa_whatsapp === false
      ? `tel:${evento.telefono}`
      : whatsappLink(evento.telefono)
    : null

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fbff_0%,#eef7f2_45%,#ffffff_100%)]">
      <PublicHeader items={buildPublicNav("eventos")} />

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/eventos"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
          >
            Volver a Hoy en Varela
          </Link>
        </div>

        <section className="overflow-hidden rounded-[36px] border border-slate-200 bg-white shadow-[0_24px_80px_-36px_rgba(15,23,42,0.35)]">
          <div className="grid lg:grid-cols-[1.08fr_0.92fr]">
            <div className="bg-[radial-gradient(circle_at_top_left,#e8f6ec_0%,#f4f9ff_38%,#eef4ff_100%)] p-5 sm:p-7 lg:p-10">
              <div className="overflow-hidden rounded-[30px] border border-white/80 bg-white/90 shadow-[0_28px_80px_-36px_rgba(15,23,42,0.45)]">
                {evento.imagen ? (
                  <div className="relative aspect-[16/10] w-full">
                    <OptimizedImage
                      src={evento.imagen}
                      alt={evento.titulo}
                      sizes="(max-width: 1280px) 100vw, 58vw"
                      priority
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex min-h-[320px] items-center justify-center text-slate-400">
                    Sin imagen principal
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 sm:p-8 lg:p-10">
              <div className="rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-6">
                <div className="inline-flex rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">
                  {normalizeEventCategory(evento.categoria)}
                </div>

                <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                  {evento.titulo}
                </h1>

                <div className="mt-6 grid gap-3">
                  <InfoPill
                    icon={<CalendarDays className="h-4 w-4" />}
                    text={formatEventDateRange(
                      evento.fecha,
                      evento.fecha_fin,
                      evento.fecha_solo_mes ?? false
                    )}
                  />
                  <InfoPill icon={<MapPin className="h-4 w-4" />} text={evento.ubicacion} />
                  {evento.telefono ? (
                    <InfoPill icon={<Phone className="h-4 w-4" />} text={evento.telefono} />
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
                        mode={evento.usa_whatsapp === false ? "phone" : "whatsapp"}
                        section="eventos"
                        itemId={String(evento.id)}
                        itemTitle={evento.titulo}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-2xl bg-green-600 px-5 py-3 font-semibold text-white transition hover:bg-green-500"
                      >
                        <Phone className="h-4 w-4" />
                        {evento.usa_whatsapp === false ? "Llamar" : "WhatsApp"}
                      </ContactActionLink>
                    ) : null}

                    <ShareButton
                      title={evento.titulo}
                      text={parsedDescription}
                      url={eventUrl}
                      section="eventos"
                      itemId={String(evento.id)}
                      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
                    />

                    <ExternalLinksButtons
                      webUrl={evento.web_url}
                      instagramUrl={evento.instagram_url}
                      facebookUrl={evento.facebook_url}
                      section="eventos"
                      itemId={String(evento.id)}
                      itemTitle={evento.titulo}
                    />
                  </div>
                </div>
              </div>

              {parsedDescription ? (
                <div className="mt-6 rounded-[24px] border border-slate-100 bg-slate-50/80 p-6">
                  <div className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                    Sobre este evento
                  </div>
                  <p className="whitespace-pre-line text-base leading-8 text-slate-700">
                    {parsedDescription}
                  </p>
                </div>
              ) : null}

              {ownerInstitution ? (
                <div className="mt-5 rounded-[24px] border border-emerald-100 bg-emerald-50/70 p-6">
                  <div className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">
                    Pertenece a
                  </div>
                  <p className="text-lg font-semibold text-slate-950">
                    {ownerInstitution.nombre}
                  </p>
                  <Link
                    href={`/instituciones/${ownerInstitution.id}`}
                    className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100"
                  >
                    Ver perfil completo
                  </Link>
                </div>
              ) : null}

              <div className="mt-5 rounded-[24px] border border-blue-100 bg-blue-50/70 p-6">
                <div className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-blue-700">
                  Compartir
                </div>
                <p className="text-sm leading-7 text-slate-700">
                  Esta pagina tiene enlace propio para compartir y vista previa con imagen en apps como WhatsApp y Facebook.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <ShareButton
                    title={evento.titulo}
                    text={parsedDescription}
                    url={eventUrl}
                    section="eventos"
                    itemId={String(evento.id)}
                    className="inline-flex items-center gap-2 rounded-2xl border border-blue-200 bg-white px-5 py-3 font-semibold text-blue-700 transition hover:border-blue-300 hover:bg-blue-50"
                  />
                  <a
                    href={eventUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
                  >
                    <Share2 className="h-4 w-4" />
                    Abrir enlace
                  </a>
                </div>
              </div>
            </div>
          </div>
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
