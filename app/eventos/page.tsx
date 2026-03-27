import { EventosPageClient } from "../components/public/EventosPageClient"
import { buildActiveEventsFilter } from "../lib/eventDates"
import { supabaseServer } from "../lib/supabaseServer"

export const dynamic = "force-dynamic"

export default async function EventosPage() {
  const today = new Date().toISOString().slice(0, 10)

  const { data } = await supabaseServer
    .from("eventos")
    .select("id, titulo, categoria, descripcion, fecha, fecha_fin, ubicacion, telefono, imagen, estado, usa_whatsapp")
    .eq("estado", "activo")
    .or(buildActiveEventsFilter(today))
    .order("fecha", { ascending: true })

  return <EventosPageClient initialEventos={data || []} />
}
