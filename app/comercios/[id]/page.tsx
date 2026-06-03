import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import { cache } from "react"
import { JsonLd } from "../../components/JsonLd"
import { PremiumListingPage } from "../../components/public/PremiumListingPage"
import { compareUpcomingEvents, getTodayInMontevideo, isEventCurrentOrUpcoming } from "../../lib/eventDates"
import { absoluteUrl } from "../../lib/seo"
import { buildPageMetadata } from "../../lib/seo"
import { buildLocalBusinessSchema } from "../../lib/schema"
import { supabaseServer } from "../../lib/supabaseServer"

// Admin and subscription flows call revalidatePath; this interval is only a fallback.
export const revalidate = 3600

const fetchComercioById = cache(async (id: string) =>
  supabaseServer
    .from("comercios")
    .select("id, nombre, descripcion, premium_detalle, premium_galeria, premium_extra_titulo, premium_extra_detalle, premium_extra_galeria, premium_activo, direccion, direccion_mapa, telefono, web_url, instagram_url, facebook_url, imagen, imagen_url, usa_whatsapp, estado, owner_email")
    .eq("id", Number(id))
    .maybeSingle()
)

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const { data } = await fetchComercioById(id)

  if (!data || (data.estado && data.estado !== "activo")) {
    return buildPageMetadata({
      path: `/comercios/${id}`,
      title: "Comercio | Hola Varela!",
      description: "Perfil comercial en Hola Varela.",
      noIndex: true,
    })
  }

  return buildPageMetadata({
    path: `/comercios/${id}`,
    title: `${data.nombre} | Hola Varela!`,
    description:
      data.premium_detalle?.trim() ||
      data.descripcion?.trim() ||
      `Conoce ${data.nombre} en la guía digital de José Pedro Varela.`,
    image: data.imagen_url || data.imagen || "/logo-varela-grande.png",
    noIndex: !data.premium_activo,
  })
}

export default async function ComercioSharePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { data } = await fetchComercioById(id)

  if (!data) {
    notFound()
  }

  if (data.estado && data.estado !== "activo") {
    notFound()
  }

  if (!data.premium_activo) {
    redirect(`/comercios?item=${encodeURIComponent(id)}`)
  }

  const eventRelationFilter = data.owner_email
    ? `comercio_id.eq.${data.id},owner_email.eq.${data.owner_email}`
    : `comercio_id.eq.${data.id}`

  const [relatedEventsResult, relatedCoursesResult] = await Promise.all([
    supabaseServer
      .from("eventos")
      .select("id, titulo, categoria, fecha, fecha_fin, fecha_solo_mes, descripcion, imagen, estado, comercio_id")
      .or(eventRelationFilter)
      .or("estado.is.null,estado.eq.activo")
      .order("fecha", { ascending: true }),
    data.owner_email
      ? supabaseServer
          .from("cursos")
          .select("id, nombre, descripcion, responsable, contacto, imagen, estado")
          .eq("owner_email", data.owner_email)
          .eq("estado", "activo")
          .order("id", { ascending: false })
      : Promise.resolve({ data: [] as unknown[] }),
  ])

  const relatedEvents = relatedEventsResult.data || []
  const today = getTodayInMontevideo()
  const relatedCourses = (relatedCoursesResult.data || []) as Array<{
    id: number
    nombre: string
    descripcion?: string | null
    responsable?: string | null
    contacto?: string | null
    imagen?: string | null
    estado?: string | null
  }>

  return (
    <>
      <JsonLd
        data={buildLocalBusinessSchema({
          name: data.nombre,
          description: data.premium_detalle || data.descripcion,
          url: absoluteUrl(`/comercios/${data.id}`),
          image: data.imagen_url || data.imagen,
          address: data.direccion,
          telephone: data.telefono,
          category: "Comercio local",
        })}
      />
      <PremiumListingPage
        kind="comercio"
        id={data.id}
        title={data.nombre}
        imageSrc={data.imagen_url || data.imagen || null}
        description={data.descripcion}
        premiumDetail={data.premium_detalle}
        premiumGallery={data.premium_galeria}
        premiumExtraTitle={data.premium_extra_titulo}
        premiumExtraDetail={data.premium_extra_detalle}
        premiumExtraGallery={data.premium_extra_galeria}
        address={data.direccion}
        directionsAddress={data.direccion_mapa}
        phone={data.telefono}
        webUrl={data.web_url}
        instagramUrl={data.instagram_url}
        facebookUrl={data.facebook_url}
        usesWhatsapp={data.usa_whatsapp}
        relatedEvents={(relatedEvents || [])
          .filter((event) => isEventCurrentOrUpcoming(event))
          .sort((first, second) => compareUpcomingEvents(first, second, today))}
        relatedCourses={relatedCourses || []}
      />
    </>
  )
}
