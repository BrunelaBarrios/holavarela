import { InstitucionesPageClient } from "../components/public/InstitucionesPageClient"
import { getSupabaseAdmin } from "../lib/supabaseAdmin"

export const revalidate = 3600

export default async function InstitucionesPage() {
  const supabaseAdmin = getSupabaseAdmin()

  const [{ data: instituciones }, { data: cursosRelacionados }] = await Promise.all([
    supabaseAdmin
      .from("instituciones")
      .select("*")
      .or("estado.is.null,estado.eq.activo")
      .order("id", { ascending: false }),
    supabaseAdmin
      .from("cursos")
      .select("id, nombre, descripcion, responsable, institucion_id")
      .or("estado.is.null,estado.eq.activo")
      .not("institucion_id", "is", null)
      .order("id", { ascending: false }),
  ])

  return (
    <InstitucionesPageClient
      initialInstituciones={instituciones || []}
      initialCursosRelacionados={cursosRelacionados || []}
    />
  )
}
