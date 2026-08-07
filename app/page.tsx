import { HomePage, type HomePageData, type WeatherData } from "./components/HomePage"
import { unstable_cache } from "next/cache"
import {
  buildActiveEventsFilter,
  compareUpcomingEvents,
  getDateKeyDaysAgo,
  getTodayInMontevideo,
  isEventCurrentOrUpcoming,
} from "./lib/eventDates"
import {
  DEFAULT_GOAL_GAME_CONFIG,
  isMissingGoalGameSchemaError,
} from "./lib/goalGame"
import { supabaseServer } from "./lib/supabaseServer"

export const revalidate = 300

const defaultSobreVarela = {
  titulo: "José Pedro Varela",
  texto_1:
    "José Pedro Varela es una ciudad del departamento de Lavalleja, Uruguay. Conocida por su rica historia y su comunidad vibrante, es un importante centro agropecuario de la región.",
  texto_2:
    "La ciudad cuenta con todos los servicios esenciales y una amplia variedad de comercios locales que sirven a la comunidad y sus alrededores.",
  texto_3:
    "Cartelera online de José Pedro Varela: encontrá acá eventos, cursos, clases, servicios y más.",
  imagen_url: null,
  cursos_home_tagline: "Aprende y crece",
  cursos_home_titulo: "Cursos y Clases",
  cursos_home_texto:
    "Descubrí propuestas educativas y talleres en José Pedro Varela. Aprendé, desarrollá nuevas habilidades y alcanzá tus metas.",
  cursos_home_boton: "Ver más cursos y clases",
  cursos_home_imagen_url: null,
  instituciones_home_tagline: "Nuestra comunidad",
  instituciones_home_titulo: "Instituciones",
  instituciones_home_texto:
    "Conocé las instituciones que hacen crecer nuestra ciudad. Explorá organizaciones, entidades y espacios que nos unen.",
  instituciones_home_boton: "Ver más instituciones",
  instituciones_home_imagen_url: null,
  mostrar_juegos_home: true,
  mostrar_ranking_juego_home: false,
  mostrar_oportunidades_laborales_home: true,
  mostrar_galeria_home: false,
  galeria_home: [] as string[],
}

const RECENT_COMMERCIAL_EVENT_DAYS = 1
const HOME_BUSINESS_LIMIT = 16
const HOME_EVENTS_LIMIT = 24
const HOME_COURSES_LIMIT = 12
const HOME_SERVICES_LIMIT = 24
const HOME_INSTITUTIONS_LIMIT = 12

type HomeHighlightAdRow = {
  id: number
  imagen_url: string | null
  entidad_tipo: "comercio" | "servicio" | "institucion" | null
  entidad_id: number | null
  delay_seconds: number | null
}

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

function withApiImage<T extends { id: number | string; imagen?: string | null }>(
  item: T,
  routeBase: string
) {
  return {
    ...item,
    imagen: `/api/${routeBase}/${item.id}/image`,
  }
}

const isMissingColumnError = (error: { code?: string; message?: string } | null | undefined, column: string) =>
  error?.code === "42703" && Boolean(error.message?.includes(column))

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
      .select("titulo, texto_1, texto_2, texto_3, imagen_url, cursos_home_tagline, cursos_home_titulo, cursos_home_texto, cursos_home_boton, cursos_home_imagen_url, instituciones_home_tagline, instituciones_home_titulo, instituciones_home_texto, instituciones_home_boton, instituciones_home_imagen_url, mostrar_juegos_home, mostrar_ranking_juego_home, mostrar_oportunidades_laborales_home, mostrar_galeria_home, galeria_home")
      .eq("id", 1)
      .maybeSingle()
      .then(async (result) => {
        if (result.error?.code === "42703") {
          return supabaseServer
            .from("sitio")
            .select("titulo, texto_1, texto_2, texto_3, imagen_url, mostrar_juegos_home, mostrar_ranking_juego_home")
            .eq("id", 1)
            .maybeSingle()
        }

        return result
      })

    const destacadosHomePromise = (async () => {
      try {
        const result = await supabaseServer
          .from("destacados_home")
          .select("id, imagen_url, entidad_tipo, entidad_id, delay_seconds")
          .eq("activo", true)
          .order("updated_at", { ascending: false })
          .limit(20)

        return result.error ? [] : ((result.data || []) as HomeHighlightAdRow[])
      } catch {
        return []
      }
    })()

    const [
      { data: featuredBusinesses },
      { data: eventosData },
      nearbyActivities,
      { data: cursos },
      { data: servicios },
      { data: instituciones },
      { data: sobreVarelaData },
      destacadosHomeData,
      challengeRanking,
      goalGameConfig,
      goalGameRanking,
      weather,
    ] = await Promise.all([
      supabaseServer
        .from("comercios")
        .select("id, nombre, descripcion, premium_activo, direccion, telefono, web_url, instagram_url, facebook_url, destacado, plan_suscripcion, usa_whatsapp")
        .or("estado.is.null,estado.eq.activo")
        .order("id", { ascending: false })
        .limit(HOME_BUSINESS_LIMIT),
      supabaseServer
        .from("eventos")
        .select("id, titulo, categoria, descripcion, fecha, fecha_fin, fecha_solo_mes, ubicacion, telefono, web_url, instagram_url, facebook_url, estado, usa_whatsapp, created_at")
        .or("estado.is.null,estado.eq.activo")
        .or(buildActiveEventsFilter(today))
        .order("fecha", { ascending: true })
        .limit(HOME_EVENTS_LIMIT),
      (async () => {
        try {
          const { data, error } = await supabaseServer
            .from("eventos")
            .select("id, titulo, categoria, descripcion, fecha, fecha_fin, fecha_solo_mes, ubicacion, ciudad, estado")
            .eq("mostrar_ciudades_cercanas", true)
            .or("estado.is.null,estado.eq.activo")
            .or(buildActiveEventsFilter(today))
            .order("fecha", { ascending: true })
            .limit(12)

          if (error) return []
          return (data || []).map((item) => withApiImage(item, "eventos"))
        } catch {
          return []
        }
      })(),
      supabaseServer
        .from("cursos")
        .select("id, nombre, descripcion, responsable, contacto, web_url, instagram_url, facebook_url, edad_destino, destacado, usa_whatsapp, institucion_id")
        .or("estado.is.null,estado.eq.activo")
        .order("id", { ascending: false })
        .limit(HOME_COURSES_LIMIT),
      supabaseServer
        .from("servicios")
        .select("id, nombre, categoria, descripcion, premium_activo, responsable, contacto, direccion, web_url, instagram_url, facebook_url, destacado, plan_suscripcion, usa_whatsapp")
        .or("estado.is.null,estado.eq.activo")
        .order("id", { ascending: false })
        .limit(HOME_SERVICES_LIMIT),
      supabaseServer
        .from("instituciones")
        .select("id, nombre, descripcion, direccion, telefono, web_url, instagram_url, facebook_url, usa_whatsapp, destacado, premium_activo")
        .or("estado.is.null,estado.eq.activo")
        .order("id", { ascending: false })
        .limit(HOME_INSTITUTIONS_LIMIT)
        .then(async (result) => {
          if (!isMissingColumnError(result.error, "instituciones.destacado")) {
            return result
          }

          const fallbackResult = await supabaseServer
            .from("instituciones")
            .select("id, nombre, descripcion, direccion, telefono, web_url, instagram_url, facebook_url, usa_whatsapp, premium_activo")
            .or("estado.is.null,estado.eq.activo")
            .order("id", { ascending: false })
            .limit(HOME_INSTITUTIONS_LIMIT)

          return {
            ...fallbackResult,
            data: (fallbackResult.data || []).map((institucion) => ({
              ...institucion,
              destacado: false,
            })),
          }
      }),
      sitioPromise,
      destacadosHomePromise,
      (async () => {
        try {
          const { data: siteConfig } = await sitioPromise
          const shouldLoadRanking =
            siteConfig && "mostrar_ranking_juego_home" in siteConfig
              ? siteConfig.mostrar_ranking_juego_home === true
              : defaultSobreVarela.mostrar_ranking_juego_home === true

          if (!shouldLoadRanking) return []

          const { data: activeChallenge } = await supabaseServer
            .from("desafio_config")
            .select("slug")
            .eq("id", 1)
            .maybeSingle()

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
        } catch {
          return []
        }
      })(),
      (async () => {
        try {
          const { data, error } = await supabaseServer
            .from("juego_gol_config")
            .select("activo, titulo, texto_banner, mostrar_ranking_home")
            .eq("id", 1)
            .maybeSingle()

          if (error) {
            if (isMissingGoalGameSchemaError(error)) return DEFAULT_GOAL_GAME_CONFIG
            return DEFAULT_GOAL_GAME_CONFIG
          }

          return {
            activo: data?.activo === true,
            titulo: data?.titulo || DEFAULT_GOAL_GAME_CONFIG.titulo,
            textoBanner: data?.texto_banner || DEFAULT_GOAL_GAME_CONFIG.textoBanner,
            mostrarRankingHome: data?.mostrar_ranking_home === true,
          }
        } catch {
          return DEFAULT_GOAL_GAME_CONFIG
        }
      })(),
      (async () => {
        try {
          const { data: config } = await supabaseServer
            .from("juego_gol_config")
            .select("activo, mostrar_ranking_home")
            .eq("id", 1)
            .maybeSingle()

          if (config?.activo !== true || config.mostrar_ranking_home !== true) return []

          const { data, error } = await supabaseServer
            .from("juego_gol_participaciones")
            .select("id, nombre, puntaje, created_at")
            .order("puntaje", { ascending: false })
            .order("created_at", { ascending: true })
            .limit(3)

          if (error) return []

          return (data || []).map((entry) => ({
            id: Number(entry.id),
            nombre: entry.nombre || "Participante",
            puntaje: Number(entry.puntaje || 0),
            createdAt: entry.created_at || null,
          }))
        } catch {
          return []
        }
      })(),
      weatherPromise,
    ])

    const courseInstitutionIds = Array.from(
      new Set((cursos || []).map((curso) => curso.institucion_id).filter(Boolean) as number[])
    )
    const { data: courseInstitutionRows } = courseInstitutionIds.length
      ? await supabaseServer
          .from("instituciones")
          .select("id, nombre")
          .in("id", courseInstitutionIds)
      : { data: [] }
    const institutionNameById = new Map(
      (courseInstitutionRows || []).map((institucion) => [Number(institucion.id), institucion.nombre])
    )
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
      featuredBusinesses: (featuredBusinesses || []).map((item) => withApiImage(item, "comercios")),
      eventos: (() => {
        const activeEvents = eventosData || []
        const nearbyActivityIds = new Set(
          nearbyActivities.map((activity) => String(activity.id))
        )
        const recentCommercialCutoff = getDateKeyDaysAgo(RECENT_COMMERCIAL_EVENT_DAYS)
        const localEvents = activeEvents.filter(
          (evento) => !nearbyActivityIds.has(String(evento.id))
        )
        const eventsForHome = localEvents.filter(
          (evento) =>
            isEventCurrentOrUpcoming(evento) ||
            (!evento.fecha &&
              isCommercialEventCategory(evento.categoria) &&
              typeof evento.created_at === "string" &&
              evento.created_at.slice(0, 10) >= recentCommercialCutoff)
        )

        // Show current/upcoming items in home, and only allow very recent
        // commercial posts without a usable event date as a fallback.
        return (eventsForHome.length ? eventsForHome : localEvents)
          .sort((first, second) => compareUpcomingEvents(first, second, today))
          .slice(0, 30)
          .map((item) => withApiImage(item, "eventos"))
      })(),
      nearbyActivities,
      cursos: (cursos || []).slice(0, 8).map((item) => ({
        ...item,
        institucion_nombre: item.institucion_id
          ? institutionNameById.get(Number(item.institucion_id)) || null
          : null,
        imagen: `/api/cursos/${item.id}/image`,
        premium_galeria: [],
      })),
      servicios: (servicios || []).slice(0, 16).map((item) => withApiImage(item, "servicios")),
      instituciones: (instituciones || []).map((item) => ({ ...item, foto: null })),
      allCursos: (highlightedCursos.length ? highlightedCursos : cursos || []).map((item) => ({
        ...item,
        institucion_nombre: item.institucion_id
          ? institutionNameById.get(Number(item.institucion_id)) || null
          : null,
        imagen: `/api/cursos/${item.id}/image`,
        premium_galeria: [],
      })),
      allServicios: (highlightedServicios.length ? highlightedServicios : servicios || []).map((item) =>
        withApiImage(item, "servicios")
      ),
      sobreVarela: sobreVarelaData
        ? { ...defaultSobreVarela, ...sobreVarelaData }
        : defaultSobreVarela,
      goalGameConfig,
      goalGameRanking,
      destacadosHome: destacadosHomeData
        .filter(
          (item) =>
            item.imagen_url &&
            item.entidad_tipo &&
            item.entidad_id
        )
        .map((item) => ({
          id: Number(item.id),
          image: item.imagen_url || "",
          entityType: item.entidad_tipo as "comercio" | "servicio" | "institucion",
          entityId: Number(item.entidad_id),
          delaySeconds: Math.max(5, Number(item.delay_seconds || 12)),
        })),
      challengeRanking,
      weather,
    }
  },
  ["home-page-data-v16"],
  { revalidate: 300 }
)

export default async function Page() {
  const initialData = await getHomePageData(getTodayInMontevideo())

  return <HomePage initialData={initialData} />
}
