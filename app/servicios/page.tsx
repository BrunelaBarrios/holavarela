import { ServiciosPageClient } from "../components/public/ServiciosPageClient"
import { supabaseServer } from "../lib/supabaseServer"

export const dynamic = "force-dynamic"

export default async function ServiciosPage() {
  const { data } = await supabaseServer
    .from("servicios")
    .select("id, nombre, categoria, descripcion, responsable, contacto, direccion, imagen, estado, usa_whatsapp")
    .or("estado.is.null,estado.eq.activo")
    .order("id", { ascending: false })

  return <ServiciosPageClient initialServicios={data || []} />
}
