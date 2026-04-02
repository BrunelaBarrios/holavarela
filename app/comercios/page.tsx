import { ComerciosPageClient } from "../components/public/ComerciosPageClient"
import { supabaseServer } from "../lib/supabaseServer"

export const dynamic = "force-dynamic"

export default async function ComerciosPage() {
  const { data } = await supabaseServer
    .from("comercios")
    .select("id, nombre, descripcion, direccion, telefono, web_url, instagram_url, facebook_url, imagen, imagen_url, usa_whatsapp")
    .eq("estado", "activo")
    .order("id", { ascending: false })

  return <ComerciosPageClient initialComercios={data || []} />
}
