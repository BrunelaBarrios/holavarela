import type { Metadata } from "next"
import { JsonLd } from "../components/JsonLd"
import { CursosPageClient } from "../components/public/CursosPageClient"
import { absoluteUrl, buildPageMetadata } from "../lib/seo"
import { buildCourseSchema, buildItemListSchema } from "../lib/schema"
import { supabaseServer } from "../lib/supabaseServer"

// Public listings change occasionally, so a longer cache window is enough.
export const revalidate = 43200

export const metadata: Metadata = buildPageMetadata({
  path: "/cursos",
  title: "Cursos y talleres en José Pedro Varela | Hola Varela!",
  description:
    "Explora cursos, clases y talleres disponibles en José Pedro Varela con datos de contacto y redes sociales.",
})

export default async function CursosPage() {
  const { data } = await supabaseServer
    .from("cursos")
    .select("id, nombre, descripcion, responsable, contacto, edad_destino, web_url, instagram_url, facebook_url, estado, usa_whatsapp")
    .eq("estado", "activo")
    .order("id", { ascending: false })

  const cursos = data || []

  return (
    <>
      <JsonLd
        data={[
          buildItemListSchema(
            "Cursos y talleres en José Pedro Varela",
            cursos.slice(0, 48).map((curso) => ({
              name: curso.nombre,
              url: absoluteUrl(`/cursos?item=${curso.id}`),
            }))
          ),
          ...cursos.slice(0, 12).map((curso) =>
            buildCourseSchema({
              name: curso.nombre,
              description: curso.descripcion,
              url: absoluteUrl(`/cursos?item=${curso.id}`),
              providerName: curso.responsable,
            })
          ),
        ]}
      />
      <CursosPageClient initialCursos={cursos} />
    </>
  )
}
