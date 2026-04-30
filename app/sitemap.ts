import type { MetadataRoute } from "next"
import { isEventCurrentOrUpcoming } from "./lib/eventDates"
import { absoluteUrl } from "./lib/seo"
import { supabaseServer } from "./lib/supabaseServer"

export const revalidate = 43200

const staticRoutes = [
  "/",
  "/comercios",
  "/cursos",
  "/eventos",
  "/instituciones",
  "/juga-y-gana",
  "/servicios",
  "/sorteo",
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  const [comerciosResult, serviciosResult, institucionesResult, eventosResult] =
    await Promise.all([
      supabaseServer
        .from("comercios")
        .select("id, premium_activo, estado")
        .or("estado.is.null,estado.eq.activo")
        .eq("premium_activo", true),
      supabaseServer
        .from("servicios")
        .select("id, premium_activo, estado")
        .or("estado.is.null,estado.eq.activo")
        .eq("premium_activo", true),
      supabaseServer
        .from("instituciones")
        .select("id, premium_activo, estado")
        .or("estado.is.null,estado.eq.activo")
        .eq("premium_activo", true),
      supabaseServer
        .from("eventos")
        .select("id, fecha, fecha_fin, fecha_solo_mes, estado")
        .or("estado.is.null,estado.eq.activo"),
    ])

  return [
    ...staticRoutes.map((route) => ({
      url: absoluteUrl(route),
      lastModified: now,
    })),
    ...(comerciosResult.data || []).map((item) => ({
      url: absoluteUrl(`/comercios/${item.id}`),
      lastModified: now,
    })),
    ...(serviciosResult.data || []).map((item) => ({
      url: absoluteUrl(`/servicios/${item.id}`),
      lastModified: now,
    })),
    ...(institucionesResult.data || []).map((item) => ({
      url: absoluteUrl(`/instituciones/${item.id}`),
      lastModified: now,
    })),
    ...(eventosResult.data || [])
      .filter((item) => isEventCurrentOrUpcoming(item))
      .map((item) => ({
        url: absoluteUrl(`/eventos/${item.id}`),
        lastModified: now,
      })),
  ]
}
