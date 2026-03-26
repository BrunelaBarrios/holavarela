import { CursosPageClient } from "../components/public/CursosPageClient"
import { supabaseServer } from "../lib/supabaseServer"

export const dynamic = "force-dynamic"

export default async function CursosPage() {
  const { data } = await supabaseServer
    .from("cursos")
    .select("id, nombre, descripcion, responsable, contacto, imagen, estado, usa_whatsapp")
    .eq("estado", "activo")
    .order("id", { ascending: false })

  return <CursosPageClient initialCursos={data || []} />
}
