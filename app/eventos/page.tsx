import { EventosPageClient } from "../components/public/EventosPageClient"
import { isEventCurrentOrUpcoming } from "../lib/eventDates"
import { supabaseServer } from "../lib/supabaseServer"

// Events need freshness, but hourly ISR was more expensive than necessary.
export const revalidate = 14400

export default async function EventosPage() {
  const { data } = await supabaseServer
    .from("eventos")
    .select("id, titulo, categoria, descripcion, fecha, fecha_fin, fecha_solo_mes, ubicacion, telefono, web_url, instagram_url, facebook_url, imagen, estado, usa_whatsapp, owner_email")
    .or("estado.is.null,estado.eq.activo")
    .order("fecha", { ascending: true })

  const activeEvents = data || []
  const currentOrUpcomingEvents = activeEvents.filter((evento) =>
    isEventCurrentOrUpcoming(evento)
  )
  const visibleEvents = currentOrUpcomingEvents.length
    ? currentOrUpcomingEvents
    : activeEvents
  const ownerEmails = Array.from(
    new Set(
      visibleEvents
        .map((evento) => evento.owner_email?.trim().toLowerCase())
        .filter(Boolean) as string[]
    )
  )

  const { data: instituciones } = ownerEmails.length
    ? await supabaseServer
        .from("instituciones")
        .select("id, nombre, owner_email, premium_activo, estado")
        .in("owner_email", ownerEmails)
        .eq("premium_activo", true)
        .eq("estado", "activo")
    : { data: [] }

  const institutionOwnerMap = new Map(
    (instituciones || []).map((institucion) => [
      String(institucion.owner_email || "").toLowerCase(),
      {
        ownerLabel: institucion.nombre,
        ownerHref: `/instituciones/${institucion.id}`,
      },
    ])
  )

  const enrichedEvents = visibleEvents.map((evento) => {
    const ownerInfo = evento.owner_email
      ? institutionOwnerMap.get(String(evento.owner_email).toLowerCase())
      : undefined

    return {
      ...evento,
      ownerLabel: ownerInfo?.ownerLabel || null,
      ownerHref: ownerInfo?.ownerHref || null,
    }
  })

  return <EventosPageClient initialEventos={enrichedEvents} />
}
