import { notFound, redirect } from "next/navigation"
import { PremiumListingPage } from "../../components/public/PremiumListingPage"
import { isEventCurrentOrUpcoming } from "../../lib/eventDates"
import { supabaseServer } from "../../lib/supabaseServer"

// Premium detail pages are stable enough for a longer cache window.
export const revalidate = 43200

function hasInstitutionPremium(data: {
  premium_activo?: boolean | null
}) {
  return Boolean(data.premium_activo)
}

export default async function InstitucionSharePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const { data } = await supabaseServer
    .from("instituciones")
    .select("id, nombre, descripcion, premium_detalle, premium_galeria, premium_extra_titulo, premium_extra_detalle, premium_extra_galeria, premium_activo, premium_cursos_activo, premium_cursos_titulo, direccion, direccion_mapa, telefono, web_url, instagram_url, facebook_url, foto, usa_whatsapp, estado, owner_email")
    .eq("id", Number(id))
    .maybeSingle()

  if (!data) {
    notFound()
  }

  if (data.estado && data.estado !== "activo") {
    notFound()
  }

  if (!hasInstitutionPremium(data)) {
    redirect(`/instituciones?item=${encodeURIComponent(id)}`)
  }

  const [relatedEventsResult, relatedCoursesResult] = data.owner_email
    ? await Promise.all([
        supabaseServer
          .from("eventos")
          .select("id, titulo, categoria, fecha, fecha_fin, fecha_solo_mes, descripcion, imagen")
          .eq("owner_email", data.owner_email)
          .or("estado.is.null,estado.eq.activo")
          .order("fecha", { ascending: true }),
        supabaseServer
          .from("cursos")
          .select("id, nombre, descripcion, responsable, contacto, imagen, estado")
          .eq("institucion_id", data.id)
          .eq("estado", "activo")
          .order("id", { ascending: false }),
      ])
    : [{ data: [] }, { data: [] }]

  const relatedEvents = relatedEventsResult.data || []
  const relatedCourses = relatedCoursesResult.data || []

  return (
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
      relatedEvents={(relatedEvents || []).filter((event) => isEventCurrentOrUpcoming(event))}
      relatedCourses={data.premium_cursos_activo ? relatedCourses || [] : []}
      relatedCoursesTitle={
        data.premium_cursos_titulo?.trim() || `Cursos, clases y talleres de ${data.nombre}`
      }
    />
  )
}
