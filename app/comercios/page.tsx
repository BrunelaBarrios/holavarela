import type { Metadata } from "next"
import { JsonLd } from "../components/JsonLd"
import { ComerciosPageClient } from "../components/public/ComerciosPageClient"
import { absoluteUrl, buildPageMetadata } from "../lib/seo"
import { buildItemListSchema } from "../lib/schema"
import { supabaseServer } from "../lib/supabaseServer"

// Admin and subscription flows call revalidatePath; this interval is only a fallback.
export const revalidate = 3600

export const metadata: Metadata = buildPageMetadata({
  path: "/comercios",
  title: "Comercios en José Pedro Varela | Hola Varela!",
  description:
    "Descubre comercios de José Pedro Varela con ubicación, contacto y perfiles destacados en Hola Varela.",
})

export default async function ComerciosPage() {
  const { data } = await supabaseServer
    .from("comercios")
    .select("id, nombre, descripcion, premium_detalle, premium_galeria, premium_activo, direccion, telefono, web_url, instagram_url, facebook_url, imagen, imagen_url, usa_whatsapp")
    .eq("estado", "activo")
    .order("id", { ascending: false })

  const comercios = data || []

  return (
    <>
      <JsonLd
        data={buildItemListSchema(
          "Comercios locales en José Pedro Varela",
          comercios.slice(0, 48).map((comercio) => ({
            name: comercio.nombre,
            url: absoluteUrl(
              comercio.premium_activo ? `/comercios/${comercio.id}` : `/comercios?item=${comercio.id}`
            ),
          }))
        )}
      />
      <ComerciosPageClient initialComercios={comercios} />
    </>
  )
}
