import type { Metadata } from "next"
import { JsonLd } from "../components/JsonLd"
import { EventosPageClient } from "../components/public/EventosPageClient"
import type { Evento } from "../components/public/EventosPageClient"
import { compareUpcomingEvents, getTodayInMontevideo, isEventCurrentOrUpcoming } from "../lib/eventDates"
import { absoluteUrl, buildPageMetadata } from "../lib/seo"
import { buildItemListSchema } from "../lib/schema"
import { supabaseServer } from "../lib/supabaseServer"

// Admin and user edits call revalidatePath; this interval is only a fallback.
export const revalidate = 3600

export const metadata: Metadata = buildPageMetadata({
  path: "/eventos",
  title: "Eventos en José Pedro Varela | Hola Varela!",
  description:
    "Mirá eventos, actividades, beneficios y agenda local de José Pedro Varela actualizados en Hola Varela.",
})

const EVENT_BASE_SELECT =
  "id, titulo, categoria, descripcion, fecha, fecha_fin, fecha_solo_mes, ubicacion, telefono, web_url, instagram_url, facebook_url, estado, usa_whatsapp, owner_email"

const hasMissingInstitutionIdColumn = (message?: string | null) =>
  Boolean(message && message.toLowerCase().includes("institucion_id"))

export default async function EventosPage() {
  const eventsWithInstitutionResult = await supabaseServer
    .from("eventos")
    .select(`${EVENT_BASE_SELECT}, institucion_id, mostrar_ciudades_cercanas`)
    .or("estado.is.null,estado.eq.activo")
    .order("fecha", { ascending: true })
  const eventsResult =
    eventsWithInstitutionResult.error
      ? await supabaseServer
          .from("eventos")
          .select(
            hasMissingInstitutionIdColumn(eventsWithInstitutionResult.error.message)
              ? EVENT_BASE_SELECT
              : `${EVENT_BASE_SELECT}, institucion_id`
          )
          .or("estado.is.null,estado.eq.activo")
          .order("fecha", { ascending: true })
      : eventsWithInstitutionResult

  const activeEvents = (eventsResult.data || []) as Array<
    Evento & {
      owner_email?: string | null
      institucion_id?: number | null
      mostrar_ciudades_cercanas?: boolean | null
    }
  >
  const ownerEmails = Array.from(
    new Set(
      activeEvents
        .map((evento) => evento.owner_email?.trim().toLowerCase())
        .filter(Boolean) as string[]
    )
  )
  const institutionIds = Array.from(
    new Set(
      activeEvents
        .map((evento) => evento.institucion_id)
        .filter((value): value is number => typeof value === "number")
    )
  )

  const { data: institutionsByEmail } = ownerEmails.length
    ? await supabaseServer
        .from("instituciones")
        .select("id, nombre, owner_email, premium_activo, estado")
        .in("owner_email", ownerEmails)
        .eq("premium_activo", true)
        .eq("estado", "activo")
    : { data: [] }
  const { data: institutionsById } = institutionIds.length
    ? await supabaseServer
        .from("instituciones")
        .select("id, nombre, owner_email, premium_activo, estado")
        .in("id", institutionIds)
        .eq("premium_activo", true)
        .eq("estado", "activo")
    : { data: [] }

  const institutionOwnerMap = new Map(
    (institutionsByEmail || []).map((institucion) => [
      String(institucion.owner_email || "").toLowerCase(),
      {
        ownerLabel: institucion.nombre,
        ownerHref: `/instituciones/${institucion.id}`,
      },
    ])
  )
  const institutionIdMap = new Map(
    (institutionsById || []).map((institucion) => [
      institucion.id,
      {
        ownerLabel: institucion.nombre,
        ownerHref: `/instituciones/${institucion.id}`,
      },
    ])
  )

  // Public listings only surface current or upcoming events.
  const today = getTodayInMontevideo()
  const enrichedEvents = activeEvents
    .filter(
      (evento) =>
        evento.mostrar_ciudades_cercanas !== true &&
        isEventCurrentOrUpcoming(evento)
    )
    .sort((first, second) => compareUpcomingEvents(first, second, today))
    .map((evento) => {
    const ownerInfo =
      (typeof evento.institucion_id === "number"
        ? institutionIdMap.get(evento.institucion_id)
        : undefined) ||
      (evento.owner_email
        ? institutionOwnerMap.get(String(evento.owner_email).toLowerCase())
        : undefined)

    return {
      ...evento,
      imagen: `/api/eventos/${evento.id}/image`,
      ownerLabel: ownerInfo?.ownerLabel || null,
      ownerHref: ownerInfo?.ownerHref || null,
    }
  })

  return (
    <>
      <JsonLd
        data={buildItemListSchema(
          "Eventos y novedades en José Pedro Varela",
          enrichedEvents.slice(0, 24).map((evento) => ({
            name: evento.titulo,
            url: absoluteUrl(`/eventos/${evento.id}`),
          }))
        )}
      />
      <EventosPageClient initialEventos={enrichedEvents as Evento[]} />
    </>
  )
}
