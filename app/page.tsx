import { HomePage, type HomePageData, type WeatherData } from "./components/HomePage"
import { unstable_cache } from "next/cache"
import {
  buildActiveEventsFilter,
  compareUpcomingEvents,
  getDateKeyDaysAgo,
  getTodayInMontevideo,
  isEventCurrentOrUpcoming,
} from "./lib/eventDates"
import { supabaseServer } from "./lib/supabaseServer"

export const revalidate = 3600

const defaultSobreVarela = {
  titulo: "José Pedro Varela",
  texto_1:
    "José Pedro Varela es una ciudad del departamento de Lavalleja, Uruguay. Conocida por su rica historia y su comunidad vibrante, es un importante centro agropecuario de la región.",
  texto_2:
    "La ciudad cuenta con todos los servicios esenciales y una amplia variedad de comercios locales que sirven a la comunidad y sus alrededores.",
  texto_3:
    "Cartelera online de José Pedro Varela: encontrá acá eventos, cursos, clases, servicios y más.",
  imagen_url: null,
  mostrar_juegos_home: true,
  mostrar_ranking_juego_home: false,
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

function withDataUrlImage<T extends { id: number | string; imagen?: string | null }>(
  item: T,
  routeBase: string
) {
  return {
    ...item,
    imagen: item.imagen ? `/api/${routeBase}/${item.id}/image` : null,
  }
}

function withInstitutionImage<T extends { id: number | string; foto?: string | null }>(
  item: T
) {
  return {
    ...item,
    foto: item.foto ? `/api/instituciones/${item.id}/image` : null,
  }
}

const getHomePageData = unstable_cache(
  async (today: string): Promise<HomePageData> => {
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

    const sitioPromise = supabaseServer
      .from("sitio")
      .select("titulo, texto_1, texto_2, texto_3, imagen_url, mostrar_juegos_home, mostrar_ranking_juego_home")
      .eq("id", 1)
      .maybeSingle()
      .then(async (result) => {
        if (result.error?.code === "42703") {
          return supabaseServer
            .from("sitio")
            .select("titulo, texto_1, texto_2, texto_3, imagen_url")
            .eq("id", 1)
            .maybeSingle()
        }

        return result
      })

    const [
      { data: featuredBusinesses },
      { data: eventosData },
      { data: cursos },
      { data: servicios },
      { data: instituciones },
      { data: sobreVarelaData },
      challengeRanking,
      weather,
    ] = await Promise.all([
      supabaseServer
        .from("comercios")
        .select("id, nombre, descripcion, premium_activo, direccion, telefono, web_url, instagram_url, facebook_url, imagen, imagen_url, destacado, plan_suscripcion, usa_whatsapp")
        .or("estado.is.null,estado.eq.activo")
        .order("id", { ascending: false })
        .limit(48),
      supabaseServer
        .from("eventos")
        .select("id, titulo, categoria, descripcion, fecha, fecha_fin, fecha_solo_mes, ubicacion, telefono, web_url, instagram_url, facebook_url, imagen, estado, usa_whatsapp, created_at")
        .or("estado.is.null,estado.eq.activo")
        .or(buildActiveEventsFilter(today))
        .order("fecha", { ascending: true }),
      supabaseServer
        .from("cursos")
        .select("id, nombre, descripcion, responsable, contacto, web_url, instagram_url, facebook_url, imagen, premium_galeria, destacado, usa_whatsapp")
        .or("estado.is.null,estado.eq.activo")
        .order("id", { ascending: false })
        .limit(24),
      supabaseServer
        .from("servicios")
        .select("id, nombre, categoria, descripcion, premium_activo, responsable, contacto, direccion, web_url, instagram_url, facebook_url, imagen, destacado, plan_suscripcion, usa_whatsapp")
        .or("estado.is.null,estado.eq.activo")
        .order("id", { ascending: false })
        .limit(72),
      supabaseServer
        .from("instituciones")
        .select("id, nombre, descripcion, direccion, telefono, web_url, instagram_url, facebook_url, foto, usa_whatsapp, destacado, premium_activo")
        .or("estado.is.null,estado.eq.activo")
        .order("id", { ascending: false })
        .limit(48),
      sitioPromise,
      supabaseServer
        .from("desafio_config")
        .select("slug")
        .eq("id", 1)
        .maybeSingle()
        .then(async ({ data: activeChallenge }) => {
          let rankingQuery = supabaseServer
            .from("desafio_participaciones")
            .select("id, nombre, puntaje_total, created_at")
            .order("puntaje_total", { ascending: false })
            .order("created_at", { ascending: true })
            .limit(3)

          if (activeChallenge?.slug) {
            rankingQuery = rankingQuery.eq("desafio_slug", activeChallenge.slug)
          }

          const { data, error } = await rankingQuery
          if (error) return []

          return (data || []).map((entry) => ({
            id: Number(entry.id),
            nombre: entry.nombre || "Participante",
            puntajeTotal: Number(entry.puntaje_total || 0),
          }))
        })
        .catch(() => []),
      weatherPromise,
    ])

    const highlightedCursos = (cursos || []).filter((curso) => curso.destacado).slice(0, 12)
    const highlightedServicios = (servicios || [])
      .filter(
        (servicio) =>
          servicio.destacado ||
          servicio.plan_suscripcion === "destacado" ||
          servicio.plan_suscripcion === "destacado_plus"
      )
      .slice(0, 24)

    return {
      featuredBusinesses: (featuredBusinesses || []).map((item) =>
        item.imagen_url ? item : withDataUrlImage(item, "comercios")
      ),
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
        return (eventsForHome.length ? eventsForHome : activeEvents)
          .sort((first, second) => compareUpcomingEvents(first, second, today))
          .slice(0, 30)
          .map((item) => withDataUrlImage(item, "eventos"))
      })(),
      cursos: (cursos || []).slice(0, 8).map((item) => withDataUrlImage(item, "cursos")),
      servicios: (servicios || []).slice(0, 48).map((item) => withDataUrlImage(item, "servicios")),
      instituciones: (instituciones || []).map((item) => withInstitutionImage(item)),
      allCursos: (highlightedCursos.length ? highlightedCursos : cursos || []).map((item) =>
        withDataUrlImage(item, "cursos")
      ),
      allServicios: (highlightedServicios.length ? highlightedServicios : servicios || []).map((item) =>
        withDataUrlImage(item, "servicios")
      ),
      sobreVarela: sobreVarelaData
        ? { ...defaultSobreVarela, ...sobreVarelaData }
        : defaultSobreVarela,
      challengeRanking,
      weather,
    }
  },
  ["home-page-data-v6"],
  { revalidate: 3600 }
)

export default async function Page() {
  const initialData = await getHomePageData(getTodayInMontevideo())

  return <HomePage initialData={initialData} />
}
