import type { Metadata } from "next"
import { ComerciosPageClient } from "../components/public/ComerciosPageClient"
import { buildPageMetadata } from "../lib/seo"
import { supabaseServer } from "../lib/supabaseServer"

// Public listings change occasionally, so a longer cache window is enough.
export const revalidate = 43200

export const metadata: Metadata = buildPageMetadata({
  path: "/comercios",
  title: "Comercios en Jose Pedro Varela | Hola Varela!",
  description:
    "Descubre comercios de Jose Pedro Varela con ubicacion, contacto y perfiles destacados en Hola Varela.",
})

export default async function ComerciosPage() {
  const { data } = await supabaseServer
    .from("comercios")
    .select("id, nombre, descripcion, premium_detalle, premium_galeria, premium_activo, direccion, telefono, web_url, instagram_url, facebook_url, imagen, imagen_url, usa_whatsapp")
    .eq("estado", "activo")
    .order("id", { ascending: false })

  return <ComerciosPageClient initialComercios={data || []} />
}
