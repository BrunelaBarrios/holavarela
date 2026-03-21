import { HomePage, type HomePageData, type WeatherData } from "./components/HomePage"
import { supabase } from "./supabase"

const defaultSobreVarela = {
  titulo: "Jose Pedro Varela",
  texto_1:
    "Jose Pedro Varela es una ciudad del departamento de Lavalleja, Uruguay. Conocida por su rica historia y su comunidad vibrante, es un importante centro agropecuario de la region.",
  texto_2:
    "La ciudad cuenta con todos los servicios esenciales y una amplia variedad de comercios locales que sirven a la comunidad y sus alrededores.",
  texto_3:
    "A traves de Hola Varela!, podes mantenerte informado sobre todo lo que acontece en nuestra ciudad: eventos culturales, comercios, cursos, servicios y nuestra querida radio local.",
  imagen_url: null,
}

export default async function Page() {
  const today = new Date().toISOString().slice(0, 10)
  const weatherPromise = fetch(
    "https://api.open-meteo.com/v1/forecast?latitude=-33.45&longitude=-54.53&current=temperature_2m,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min&timezone=America%2FMontevideo&forecast_days=1",
    {
      next: { revalidate: 1800 },
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
    { data: sobreVarelaData },
    weather,
  ] = await Promise.all([
    supabase
      .from("comercios")
      .select("*")
      .or("estado.is.null,estado.eq.activo")
      .eq("destacado", true)
      .order("id", { ascending: false })
      .limit(8),
    supabase
      .from("eventos")
      .select("*")
      .or("estado.is.null,estado.eq.activo")
      .gte("fecha", today)
      .order("fecha", { ascending: true }),
    supabase
      .from("cursos")
      .select("*")
      .or("estado.is.null,estado.eq.activo")
      .order("id", { ascending: false }),
    supabase
      .from("servicios")
      .select("*")
      .or("estado.is.null,estado.eq.activo")
      .order("id", { ascending: false }),
    supabase
      .from("sitio")
      .select("titulo, texto_1, texto_2, texto_3, imagen_url")
      .eq("id", 1)
      .maybeSingle(),
    weatherPromise,
  ])

  const initialData: HomePageData = {
    featuredBusinesses: featuredBusinesses || [],
    eventos: (eventosData || []).slice(0, 6),
    cursos: cursos || [],
    servicios: (servicios || []).slice(0, 8),
    allCursos: cursos || [],
    allServicios: servicios || [],
    sobreVarela: sobreVarelaData
      ? { ...defaultSobreVarela, ...sobreVarelaData }
      : defaultSobreVarela,
    weather,
  }

  return <HomePage initialData={initialData} />
}
