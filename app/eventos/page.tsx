import { EventosPageClient } from "../components/public/EventosPageClient"
import { supabaseServer } from "../lib/supabaseServer"

export const dynamic = "force-dynamic"

export default async function EventosPage() {
  const { data } = await supabaseServer
    .from("eventos")
    .select("id, titulo, categoria, descripcion, fecha, fecha_fin, fecha_solo_mes, ubicacion, telefono, web_url, instagram_url, facebook_url, imagen, estado, usa_whatsapp")
    .eq("estado", "activo")
    .order("fecha", { ascending: true })

  return <EventosPageClient initialEventos={data || []} />
}
