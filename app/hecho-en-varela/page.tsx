import type { Metadata } from "next"
import { PublicHeader } from "../components/PublicHeader"
import { supabaseServer } from "../lib/supabaseServer"
import type { ProductoVarela } from "../lib/hechoEnVarela"
import { HechoEnVarelaClient } from "./HechoEnVarelaClient"

export const revalidate = 300
export const metadata: Metadata = { title: "Hecho en Varela | Hola Varela!", description: "Productos creados por artesanos y emprendedores de José Pedro Varela.", robots: { index: true, follow: true } }

export default async function Page() {
  const { data } = await supabaseServer.from("productos_varela").select("*, emprendimientos_varela(*)").eq("activo", true).order("destacado", { ascending: false }).order("orden").order("creado_at", { ascending: false })
  return <><PublicHeader items={[]} /><HechoEnVarelaClient products={(data || []) as ProductoVarela[]} /></>
}
