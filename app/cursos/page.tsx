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
    .select("id, nombre, descripcion, responsable, contacto, edad_destino, categoria, lugar, dias_semana, hora_inicio, hora_fin, horarios, costo_tipo, web_url, instagram_url, facebook_url, imagen, premium_galeria, estado, usa_whatsapp, institucion_id")
    .eq("estado", "activo")
    .order("id", { ascending: false })

  const institutionIds = Array.from(
    new Set((data || []).map((curso) => curso.institucion_id).filter(Boolean) as number[])
  )
  const { data: institutionRows } = institutionIds.length
    ? await supabaseServer.from("instituciones").select("id, nombre").in("id", institutionIds)
    : { data: [] }
  const institutionNameById = new Map(
    (institutionRows || []).map((institution) => [Number(institution.id), institution.nombre])
  )

  const cursos = (data || []).map((curso) => ({
    ...curso,
    institucion_nombre: curso.institucion_id
      ? institutionNameById.get(Number(curso.institucion_id)) || null
      : null,
    imagen: curso.imagen ? `/api/cursos/${curso.id}/image` : null,
    premium_galeria: curso.premium_galeria || [],
  }))

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
