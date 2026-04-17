import { InstitucionesPageClient } from "../components/public/InstitucionesPageClient"
import { getSupabaseAdmin } from "../lib/supabaseAdmin"

// Public listings change occasionally, so a longer cache window is enough.
export const revalidate = 43200

export default async function InstitucionesPage() {
  const supabaseAdmin = getSupabaseAdmin()

  const { data: instituciones } = await supabaseAdmin
    .from("instituciones")
    .select(
      "id, nombre, descripcion, direccion, telefono, web_url, instagram_url, facebook_url, foto, estado, usa_whatsapp, premium_detalle, premium_extra_titulo, premium_extra_detalle, premium_activo"
    )
    .or("estado.is.null,estado.eq.activo")
    .order("id", { ascending: false })

  return <InstitucionesPageClient initialInstituciones={instituciones || []} />
}
