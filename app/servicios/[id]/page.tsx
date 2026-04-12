import { notFound, redirect } from "next/navigation"
import { PremiumListingPage } from "../../components/public/PremiumListingPage"
import { isEventCurrentOrUpcoming } from "../../lib/eventDates"
import { supabaseServer } from "../../lib/supabaseServer"

export const revalidate = 7200

export default async function ServicioSharePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { data } = await supabaseServer
    .from("servicios")
    .select("id, nombre, categoria, descripcion, premium_detalle, premium_galeria, premium_extra_titulo, premium_extra_detalle, premium_extra_galeria, premium_activo, responsable, contacto, direccion, direccion_mapa, web_url, instagram_url, facebook_url, imagen, estado, usa_whatsapp, owner_email")
    .eq("id", Number(id))
    .maybeSingle()

  if (!data) {
    notFound()
  }

  if (data.estado && data.estado !== "activo") {
    notFound()
  }

  if (!data.premium_activo) {
    redirect(`/servicios?item=${encodeURIComponent(id)}`)
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
      kind="servicio"
      id={data.id}
      title={data.nombre}
      imageSrc={data.imagen || null}
      description={data.descripcion}
      premiumDetail={data.premium_detalle}
      premiumGallery={data.premium_galeria}
      premiumExtraTitle={data.premium_extra_titulo}
      premiumExtraDetail={data.premium_extra_detalle}
      premiumExtraGallery={data.premium_extra_galeria}
      address={data.direccion}
      directionsAddress={data.direccion_mapa}
      phone={data.contacto}
      contactName={data.responsable}
      category={data.categoria}
      webUrl={data.web_url}
      instagramUrl={data.instagram_url}
      facebookUrl={data.facebook_url}
      usesWhatsapp={data.usa_whatsapp}
      relatedEvents={(relatedEvents || []).filter((event) => isEventCurrentOrUpcoming(event))}
    />
  )
}
