import { InstitucionesPageClient } from "../components/public/InstitucionesPageClient"
import { getSupabaseAdmin } from "../lib/supabaseAdmin"

export const revalidate = 3600

export default async function InstitucionesPage() {
  const supabaseAdmin = getSupabaseAdmin()

  const { data: instituciones } = await supabaseAdmin
    .from("instituciones")
    .select("*")
    .or("estado.is.null,estado.eq.activo")
    .order("id", { ascending: false })

  return <InstitucionesPageClient initialInstituciones={instituciones || []} />
}
