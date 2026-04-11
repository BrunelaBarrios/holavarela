import { EventosPageClient } from "../components/public/EventosPageClient"
import { isEventCurrentOrUpcoming } from "../lib/eventDates"
import { supabaseServer } from "../lib/supabaseServer"

export const revalidate = 3600

export default async function EventosPage() {
  const { data } = await supabaseServer
    .from("eventos")
    .select("id, titulo, categoria, descripcion, fecha, fecha_fin, fecha_solo_mes, ubicacion, telefono, web_url, instagram_url, facebook_url, imagen, estado, usa_whatsapp")
    .or("estado.is.null,estado.eq.activo")
    .order("fecha", { ascending: true })

  return <EventosPageClient initialEventos={(data || []).filter((evento) => isEventCurrentOrUpcoming(evento))} />
}
