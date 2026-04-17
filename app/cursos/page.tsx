import { CursosPageClient } from "../components/public/CursosPageClient"
import { supabaseServer } from "../lib/supabaseServer"

// Public listings change occasionally, so a longer cache window is enough.
export const revalidate = 43200

export default async function CursosPage() {
  const { data } = await supabaseServer
    .from("cursos")
    .select("id, nombre, descripcion, responsable, contacto, web_url, instagram_url, facebook_url, imagen, estado, usa_whatsapp")
    .eq("estado", "activo")
    .order("id", { ascending: false })

  return <CursosPageClient initialCursos={data || []} />
}
