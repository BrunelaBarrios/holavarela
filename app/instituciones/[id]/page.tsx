import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import { cache } from "react"
import { JsonLd } from "../../components/JsonLd"
import { PremiumListingPage } from "../../components/public/PremiumListingPage"
import { compareUpcomingEvents, getTodayInMontevideo, isEventCurrentOrUpcoming } from "../../lib/eventDates"
import { absoluteUrl, buildPageMetadata } from "../../lib/seo"
import { buildLocalBusinessSchema } from "../../lib/schema"
import { supabaseServer } from "../../lib/supabaseServer"

// Premium detail pages include editable public content and layout changes should show quickly.
export const revalidate = 60

function hasInstitutionPremium(data: {
  premium_activo?: boolean | null
}) {
  return Boolean(data.premium_activo)
}

const hasMissingInstitutionIdColumn = (message?: string | null) =>
  Boolean(message && message.toLowerCase().includes("institucion_id"))

const fetchInstitucionById = cache(async (id: string) =>
  supabaseServer
    .from("instituciones")
    .select("id, nombre, descripcion, premium_detalle, premium_galeria, premium_extra_titulo, premium_extra_detalle, premium_extra_galeria, premium_activo, premium_cursos_activo, premium_cursos_titulo, direccion, direccion_mapa, telefono, web_url, instagram_url, facebook_url, foto, usa_whatsapp, estado, owner_email")
    .eq("id", Number(id))
    .maybeSingle()
)

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const { data } = await fetchInstitucionById(id)

  if (!data || (data.estado && data.estado !== "activo")) {
    return buildPageMetadata({
      path: `/instituciones/${id}`,
      title: "Institución | Hola Varela!",
      description: "Perfil institucional en Hola Varela.",
      noIndex: true,
    })
  }

  return buildPageMetadata({
    path: `/instituciones/${id}`,
    title: `${data.nombre} | Hola Varela!`,
    description:
      data.premium_detalle?.trim() ||
      data.descripcion?.trim() ||
      `Conoce ${data.nombre} y su informacion en Hola Varela.`,
    image: data.foto || "/logo-varela-grande.png",
    noIndex: !hasInstitutionPremium(data),
  })
}

export default async function InstitucionSharePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const { data } = await fetchInstitucionById(id)

  if (!data) {
    notFound()
  }

  if (data.estado && data.estado !== "activo") {
    notFound()
  }

  if (!hasInstitutionPremium(data)) {
    redirect(`/instituciones?item=${encodeURIComponent(id)}`)
  }

  const eventRelationFilter = data.owner_email
    ? `institucion_id.eq.${data.id},owner_email.eq.${data.owner_email}`
    : `institucion_id.eq.${data.id}`

  const relatedEventsWithInstitutionResult = await supabaseServer
    .from("eventos")
    .select("id, titulo, categoria, fecha, fecha_fin, fecha_solo_mes, descripcion, imagen, estado, institucion_id")
    .or(eventRelationFilter)
    .order("fecha", { ascending: true })
  const relatedEventsResult =
    relatedEventsWithInstitutionResult.error &&
    hasMissingInstitutionIdColumn(relatedEventsWithInstitutionResult.error.message) &&
    data.owner_email
      ? await supabaseServer
          .from("eventos")
          .select("id, titulo, categoria, fecha, fecha_fin, fecha_solo_mes, descripcion, imagen, estado")
          .eq("owner_email", data.owner_email)
          .order("fecha", { ascending: true })
      : relatedEventsWithInstitutionResult

  const relatedCoursesResult = await supabaseServer
    .from("cursos")
    .select("id, nombre, descripcion, responsable, contacto, imagen, estado")
    .eq("institucion_id", data.id)
    .eq("estado", "activo")
    .order("id", { ascending: false })

  const relatedEvents = (relatedEventsResult.data || []).filter(
    (event) => !event.estado || event.estado === "activo"
  )
  const today = getTodayInMontevideo()
  const relatedCourses = relatedCoursesResult.data || []

  return (
    <>
      <JsonLd
        data={buildLocalBusinessSchema({
          name: data.nombre,
          description: data.premium_detalle || data.descripcion,
          url: absoluteUrl(`/instituciones/${data.id}`),
          image: data.foto,
          address: data.direccion,
          telephone: data.telefono,
          category: "Institución local",
        })}
      />
      <PremiumListingPage
        kind="institucion"
        id={data.id}
        title={data.nombre}
        imageSrc={data.foto || null}
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
        relatedCourses={data.premium_cursos_activo ? relatedCourses || [] : []}
        relatedCoursesTitle={
          data.premium_cursos_titulo?.trim() || `Cursos, clases y talleres de ${data.nombre}`
        }
      />
    </>
  )
}
