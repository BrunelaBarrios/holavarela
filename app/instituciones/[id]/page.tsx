import { notFound, redirect } from "next/navigation"
import { PremiumListingPage } from "../../components/public/PremiumListingPage"
import { isEventCurrentOrUpcoming } from "../../lib/eventDates"
import { supabaseServer } from "../../lib/supabaseServer"

export const revalidate = 7200

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
    .select("id, nombre, descripcion, premium_detalle, premium_galeria, premium_extra_titulo, premium_extra_detalle, premium_extra_galeria, premium_activo, direccion, telefono, web_url, instagram_url, facebook_url, foto, usa_whatsapp, estado, owner_email")
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

  const { data: relatedEvents } = data.owner_email
    ? await supabaseServer
        .from("eventos")
        .select("id, titulo, categoria, fecha, fecha_fin, fecha_solo_mes, descripcion, imagen")
        .eq("owner_email", data.owner_email)
        .or("estado.is.null,estado.eq.activo")
        .order("fecha", { ascending: true })
    : { data: [] }

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
      phone={data.telefono}
      webUrl={data.web_url}
      instagramUrl={data.instagram_url}
      facebookUrl={data.facebook_url}
      usesWhatsapp={data.usa_whatsapp}
      relatedEvents={(relatedEvents || []).filter((event) => isEventCurrentOrUpcoming(event))}
      relatedCourses={[]}
    />
  )
}
