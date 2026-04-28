import { HomePage, type HomePageData, type WeatherData } from "./components/HomePage"
import { getDateKeyDaysAgo, isEventCurrentOrUpcoming } from "./lib/eventDates"
import { supabaseServer } from "./lib/supabaseServer"

export const revalidate = 3600

const defaultSobreVarela = {
  titulo: "Jose Pedro Varela",
  texto_1:
    "Jose Pedro Varela es una ciudad del departamento de Lavalleja, Uruguay. Conocida por su rica historia y su comunidad vibrante, es un importante centro agropecuario de la region.",
  texto_2:
    "La ciudad cuenta con todos los servicios esenciales y una amplia variedad de comercios locales que sirven a la comunidad y sus alrededores.",
  texto_3:
    "Cartelera online de Jose Pedro Varela: encontra aca eventos, cursos, clases, servicios y mas.",
  imagen_url: null,
}

const RECENT_COMMERCIAL_EVENT_DAYS = 1

const isCommercialEventCategory = (categoria?: string | null) => {
  const normalized = categoria?.trim().toLowerCase()

  return (
    normalized === "promocion" ||
    normalized === "promociones" ||
    normalized === "promo" ||
    normalized === "promos" ||
    normalized === "sorteo" ||
    normalized === "sorteos" ||
    normalized === "consulta" ||
    normalized === "consultas" ||
    normalized === "consulta comercial"
  )
}

export default async function Page() {
  const weatherPromise = fetch(
    "https://api.open-meteo.com/v1/forecast?latitude=-33.45&longitude=-54.53&current=temperature_2m,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min&timezone=America%2FMontevideo&forecast_days=1",
    {
      // Keep weather reasonably fresh without forcing the whole home
      // to regenerate every few minutes.
      next: { revalidate: 3600 },
    }
  )
    .then(async (response) => {
      if (!response.ok) return null
      const data = await response.json()

      const weather: WeatherData | null =
        data?.current && data?.daily
          ? {
              temperature: data.current.temperature_2m,
              weatherCode: data.current.weather_code,
              tempMax: data.daily.temperature_2m_max?.[0] ?? data.current.temperature_2m,
              tempMin: data.daily.temperature_2m_min?.[0] ?? data.current.temperature_2m,
              windSpeed: data.current.wind_speed_10m ?? 0,
            }
          : null

      return weather
    })
    .catch(() => null)

  const [
    { data: featuredBusinesses },
    { data: eventosData },
    { data: cursos },
    { data: servicios },
    { data: highlightedServicios },
    { data: highlightedCursos },
    { data: instituciones },
    { data: sobreVarelaData },
    weather,
  ] = await Promise.all([
    supabaseServer
      .from("comercios")
      .select("id, nombre, descripcion, premium_detalle, premium_galeria, premium_activo, direccion, telefono, web_url, instagram_url, facebook_url, imagen, imagen_url, destacado, plan_suscripcion, usa_whatsapp")
      .or("estado.is.null,estado.eq.activo")
      .order("id", { ascending: false })
      .limit(48),
    supabaseServer
      .from("eventos")
      .select("id, titulo, categoria, descripcion, fecha, fecha_fin, fecha_solo_mes, ubicacion, telefono, web_url, instagram_url, facebook_url, imagen, estado, usa_whatsapp, created_at")
      .or("estado.is.null,estado.eq.activo")
      .order("fecha", { ascending: true }),
    supabaseServer
      .from("cursos")
      .select("id, nombre, descripcion, responsable, contacto, web_url, instagram_url, facebook_url, imagen, destacado, usa_whatsapp")
      .or("estado.is.null,estado.eq.activo")
      .order("id", { ascending: false })
      .limit(8),
    supabaseServer
      .from("servicios")
      .select("id, nombre, categoria, descripcion, premium_detalle, premium_galeria, premium_activo, responsable, contacto, direccion, web_url, instagram_url, facebook_url, imagen, destacado, plan_suscripcion, usa_whatsapp")
      .or("estado.is.null,estado.eq.activo")
      .order("id", { ascending: false })
      .limit(48),
    supabaseServer
      .from("servicios")
      .select("id, nombre, categoria, descripcion, premium_detalle, premium_galeria, premium_activo, responsable, contacto, direccion, web_url, instagram_url, facebook_url, imagen, destacado, plan_suscripcion, usa_whatsapp")
      .or("estado.is.null,estado.eq.activo")
      .or("destacado.eq.true,plan_suscripcion.eq.destacado,plan_suscripcion.eq.destacado_plus")
      .order("id", { ascending: false })
      .limit(24),
    supabaseServer
      .from("cursos")
      .select("id, nombre, descripcion, responsable, contacto, web_url, instagram_url, facebook_url, imagen, destacado, usa_whatsapp")
      .or("estado.is.null,estado.eq.activo")
      .eq("destacado", true)
      .order("id", { ascending: false })
      .limit(12),
    supabaseServer
      .from("instituciones")
      .select("id, nombre, descripcion, direccion, telefono, web_url, instagram_url, facebook_url, foto, usa_whatsapp, premium_activo")
      .or("estado.is.null,estado.eq.activo")
      .order("id", { ascending: false })
      .limit(10),
    supabaseServer
      .from("sitio")
      .select("titulo, texto_1, texto_2, texto_3, imagen_url")
      .eq("id", 1)
      .maybeSingle(),
    weatherPromise,
  ])

  const initialData: HomePageData = {
    featuredBusinesses: featuredBusinesses || [],
    eventos: (() => {
      const activeEvents = eventosData || []
      const recentCommercialCutoff = getDateKeyDaysAgo(RECENT_COMMERCIAL_EVENT_DAYS)
      const eventsForHome = activeEvents.filter((evento) =>
        isEventCurrentOrUpcoming(evento) ||
        (!evento.fecha &&
          isCommercialEventCategory(evento.categoria) &&
          typeof evento.created_at === "string" &&
          evento.created_at.slice(0, 10) >= recentCommercialCutoff)
      )

      // Show current/upcoming items in home, and only allow very recent
      // commercial posts without a usable event date as a fallback.
      return (eventsForHome.length ? eventsForHome : activeEvents).slice(0, 30)
    })(),
    cursos: cursos || [],
    servicios: servicios || [],
    instituciones: instituciones || [],
    allCursos: highlightedCursos || cursos || [],
    allServicios: highlightedServicios || servicios || [],
    sobreVarela: sobreVarelaData
      ? { ...defaultSobreVarela, ...sobreVarelaData }
      : defaultSobreVarela,
    weather,
  }

  return <HomePage initialData={initialData} />
}
