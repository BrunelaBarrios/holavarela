import type { Metadata } from "next"
import { ServiciosPageClient } from "../components/public/ServiciosPageClient"
import { buildPageMetadata } from "../lib/seo"
import { supabaseServer } from "../lib/supabaseServer"

// Public listings change occasionally, so a longer cache window is enough.
export const revalidate = 43200

export const metadata: Metadata = buildPageMetadata({
  path: "/servicios",
  title: "Servicios en Jose Pedro Varela | Hola Varela!",
  description:
    "Encuentra servicios, oficios y profesionales de Jose Pedro Varela con informacion de contacto y perfiles destacados.",
})

export default async function ServiciosPage() {
  const { data } = await supabaseServer
    .from("servicios")
    .select("id, nombre, categoria, descripcion, premium_detalle, premium_galeria, premium_activo, responsable, contacto, direccion, web_url, instagram_url, facebook_url, imagen, estado, usa_whatsapp")
    .or("estado.is.null,estado.eq.activo")
    .order("id", { ascending: false })

  return <ServiciosPageClient initialServicios={data || []} />
}
