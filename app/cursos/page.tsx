import type { Metadata } from "next"
import { CursosPageClient } from "../components/public/CursosPageClient"
import { buildPageMetadata } from "../lib/seo"
import { supabaseServer } from "../lib/supabaseServer"

// Public listings change occasionally, so a longer cache window is enough.
export const revalidate = 43200

export const metadata: Metadata = buildPageMetadata({
  path: "/cursos",
  title: "Cursos y talleres en Jose Pedro Varela | Hola Varela!",
  description:
    "Explora cursos, clases y talleres disponibles en Jose Pedro Varela con datos de contacto y redes sociales.",
})

export default async function CursosPage() {
  const { data } = await supabaseServer
    .from("cursos")
    .select("id, nombre, descripcion, responsable, contacto, web_url, instagram_url, facebook_url, imagen, estado, usa_whatsapp")
    .eq("estado", "activo")
    .order("id", { ascending: false })

  return <CursosPageClient initialCursos={data || []} />
}
