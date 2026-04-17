'use client'

import dynamic from "next/dynamic"
import Link from "next/link"
import Image from "next/image"
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react"
import { useRouter } from "next/navigation"
import { ContactActionLink } from "./ContactActionLink"
import { ExternalLinksButtons } from "./ExternalLinksButtons"
import { EventLikeButton } from "./EventLikeButton"
import { OptimizedImage } from "./OptimizedImage"
import { PrimaryExternalLinkButton } from "./PrimaryExternalLinkButton"
import { PublicHeader } from "./PublicHeader"
import { ShareButton } from "./ShareButton"
import { SweepstakesPopup } from "./SweepstakesPopup"
import { formatEventDateRange } from "../lib/eventDates"
import { fetchEventLikes, recordEventLike } from "../lib/eventLikes"
import { parseEventDescription } from "../lib/eventSubmissionMeta"
import { useSweepstakesPopup } from "../lib/useSweepstakesPopup"
import { recordContentVisit, recordSiteVisit } from "../lib/contentVisits"
import { DELAYED_PROMO_STORAGE_KEY, RADIO_STORAGE_KEY } from "../lib/localStorageKeys"
import { buildHomePublicNav } from "../lib/publicNav"
import { recordViewMore, type ViewMoreSection } from "../lib/viewMoreTracking"
import { supabase } from "../supabase"
import {
  ArrowRight,
  Building2,
  CalendarDays,
  Cloud,
  CloudDrizzle,
  CloudRain,
  CloudSun,
  GraduationCap,
  Heart,
  Megaphone,
  Mail,
  MapPin,
  Phone,
  UserRound,
  X,
} from "lucide-react"

const MyTunerWidget = dynamic(
  () => import("./MyTunerWidget").then((module) => module.MyTunerWidget),
  {
    ssr: false,
    loading: () => (
      <div className="h-[236px] w-full animate-pulse rounded-[28px] border border-blue-100/35 bg-[linear-gradient(135deg,#dbeafe_0%,#eff6ff_55%,#f8fbff_100%)]" />
    ),
  }
)

const PublicDetailModal = dynamic(
  () => import("./PublicDetailModal").then((module) => module.PublicDetailModal),
  {
    ssr: false,
  }
)

const getEventShareUrl = (id: string) => {
  if (typeof window === "undefined") return `/eventos/${id}`
  return `${window.location.origin}/eventos/${id}`
}

type Comercio = {
  id: number
  nombre: string
  descripcion: string | null
  premium_detalle?: string | null
  premium_galeria?: string[] | null
  premium_activo?: boolean | null
  direccion: string | null
  telefono: string | null
  web_url?: string | null
  instagram_url?: string | null
  facebook_url?: string | null
  imagen?: string | null
  imagen_url?: string | null
  destacado?: boolean | null
  plan_suscripcion?: string | null
  usa_whatsapp?: boolean | null
}

type Evento = {
  id: string
  titulo: string
  categoria?: string | null
  descripcion: string
  fecha: string
  fecha_fin?: string | null
  fecha_solo_mes?: boolean | null
  ubicacion: string
  telefono?: string | null
  web_url?: string | null
  instagram_url?: string | null
  facebook_url?: string | null
  imagen?: string | null
  estado?: string | null
  usa_whatsapp?: boolean | null
}

const normalizeEventCategory = (categoria?: string | null) => {
  const value = categoria?.trim()
  if (!value || value.toUpperCase() === "NOT NULL") return "Evento"
  if (value.toLowerCase() === "beneficios") return "Beneficio"
  return value
}

type Curso = {
  id: number
  nombre: string
  descripcion: string
  responsable: string
  contacto: string
  web_url?: string | null
  instagram_url?: string | null
  facebook_url?: string | null
  imagen: string | null
  destacado?: boolean | null
  plan_suscripcion?: string | null
  usa_whatsapp?: boolean | null
}

type Servicio = {
  id: number
  nombre: string
  categoria: string
  descripcion: string | null
  premium_detalle?: string | null
  premium_galeria?: string[] | null
  premium_activo?: boolean | null
  responsable: string | null
  contacto: string | null
  direccion: string | null
  web_url?: string | null
  instagram_url?: string | null
  facebook_url?: string | null
  imagen: string | null
  destacado?: boolean | null
  plan_suscripcion?: string | null
  usa_whatsapp?: boolean | null
}

type Institucion = {
  id: number
  nombre: string
  descripcion: string | null
  direccion: string | null
  telefono: string | null
  web_url?: string | null
  instagram_url?: string | null
  facebook_url?: string | null
  foto: string | null
  usa_whatsapp?: boolean | null
  premium_activo?: boolean | null
}

type SobreVarelaConfig = {
  titulo: string
  texto_1: string
  texto_2: string
  texto_3: string
  imagen_url: string | null
}

type RadioConfig = {
  title: string
  description: string
  streamUrl: string
  isLive: boolean
}

type ContactLeadForm = {
  nombre: string
  telefono: string
  mensaje: string
}

export type WeatherData = {
  temperature: number
  weatherCode: number
  tempMax: number
  tempMin: number
  windSpeed: number
}

export type HomePageData = {
  featuredBusinesses: Comercio[]
  eventos: Evento[]
  cursos: Curso[]
  servicios: Servicio[]
  instituciones: Institucion[]
  allCursos: Curso[]
  allServicios: Servicio[]
  sobreVarela: SobreVarelaConfig
  weather: WeatherData | null
}

const WEATHER_LABELS: Record<number, string> = {
  0: "Despejado",
  1: "Mayormente despejado",
  2: "Parcialmente nublado",
  3: "Nublado",
  45: "Neblina",
  48: "Niebla con escarcha",
  51: "Llovizna leve",
  53: "Llovizna moderada",
  55: "Llovizna intensa",
  61: "Lluvia leve",
  63: "Lluvia moderada",
  65: "Lluvia intensa",
  71: "Nieve leve",
  73: "Nieve moderada",
  75: "Nieve intensa",
  80: "Chaparrones leves",
  81: "Chaparrones moderados",
  82: "Chaparrones intensos",
  95: "Tormenta",
}

type WelcomeHighlight = {
  key: string
  kind: "comercio" | "servicio" | "curso"
  title: string
  description: string
  image: string | null
  subtitle?: string | null
  contact?: string | null
  usesWhatsapp?: boolean
}

type DelayedPromo = {
  key: string
  kind: "comercio" | "servicio" | "curso"
  title: string
  description: string
  image: string | null
  subtitle?: string | null
  href: string
}

const buildWelcomeItems = (
  featuredBusinesses: Comercio[],
  allServicios: Servicio[],
  allCursos: Curso[]
): WelcomeHighlight[] => [
  ...featuredBusinesses.map((item) => ({
    key: `comercio-${item.id}`,
    kind: "comercio" as const,
    title: item.nombre,
    description: item.descripcion || "Conoce este comercio destacado de la ciudad.",
    image: item.imagen_url || item.imagen || null,
    subtitle: item.direccion || null,
    contact: item.telefono || null,
    usesWhatsapp: item.usa_whatsapp ?? true,
  })),
  ...(allServicios
    .filter((item) => isFeaturedListing(item))
    .map((item) => ({
      key: `servicio-${item.id}`,
      kind: "servicio" as const,
      title: item.nombre,
      description:
        item.descripcion || "Servicio destacado para descubrir en Jose Pedro Varela.",
      image: item.imagen || null,
      subtitle: item.categoria || null,
      contact: item.contacto || null,
      usesWhatsapp: item.usa_whatsapp ?? true,
    }))),
  ...(allCursos
    .filter((item) => item.destacado)
    .map((item) => ({
      key: `curso-${item.id}`,
      kind: "curso" as const,
      title: item.nombre,
      description: item.descripcion || "Curso o clase destacada para sumarte en la ciudad.",
      image: item.imagen || null,
      subtitle: item.responsable || null,
      contact: item.contacto || null,
      usesWhatsapp: item.usa_whatsapp ?? true,
    }))),
]

const getInitialWelcomeHighlight = (
  featuredBusinesses: Comercio[],
  allServicios: Servicio[],
  allCursos: Curso[]
): WelcomeHighlight | null => {
  if (typeof window === "undefined") return null

  const alreadyShownThisSession =
    window.sessionStorage.getItem(WELCOME_SESSION_KEY) === "true"

  if (alreadyShownThisSession) return null

  const welcomeItems = buildWelcomeItems(featuredBusinesses, allServicios, allCursos)
  if (welcomeItems.length === 0) return null

  const lastShownKey = window.localStorage.getItem(WELCOME_LAST_KEY)
  const lastIndex = welcomeItems.findIndex((item) => item.key === lastShownKey)
  const nextIndex = lastIndex >= 0 ? (lastIndex + 1) % welcomeItems.length : 0
  const nextItem = welcomeItems[nextIndex]

  window.localStorage.setItem(WELCOME_LAST_KEY, nextItem.key)
  return nextItem
}

const defaultSobreVarela: SobreVarelaConfig = {
  titulo: "Jose Pedro Varela",
  texto_1:
    "Jose Pedro Varela es una ciudad del departamento de Lavalleja, Uruguay. Conocida por su rica historia y su comunidad vibrante, es un importante centro agropecuario de la region.",
  texto_2:
    "La ciudad cuenta con todos los servicios esenciales y una amplia variedad de comercios locales que sirven a la comunidad y sus alrededores.",
  texto_3:
    "Cartelera online de Jose Pedro Varela: encontra aca eventos, cursos, clases, servicios y mas.",
  imagen_url: null,
}

const defaultRadioConfig: RadioConfig = {
  title: "Delta FM 88.3",
  description: "Escucha Delta FM 88.3 en vivo desde Jose Pedro Varela.",
  streamUrl: "https://radios.com.uy/delta/?utm_source=chatgpt.com",
  isLive: true,
}

const WELCOME_PROMOTION_ENABLED = false
const WELCOME_SESSION_KEY = "guia-varela-welcome-shown-v2"
const WELCOME_LAST_KEY = "guia-varela-last-highlight"
const DELAYED_PROMO_SESSION_KEY = "guia-varela-delayed-promo-shown-v1"
const DELAYED_PROMO_LAST_KEY = "guia-varela-delayed-promo-last-key"
const SWEEPSTAKES_HINT_DISMISSED_SESSION_KEY = "guia-varela-sweepstakes-hint-dismissed-v1"
const DELAYED_PROMO_UPDATE_EVENT = "delayed-promo-config-updated"

type DelayedPromoConfig = {
  enabled: boolean
  delaySeconds: number
  itemKey: string
}

const defaultDelayedPromoConfig: DelayedPromoConfig = {
  enabled: true,
  delaySeconds: 60,
  itemKey: "",
}
const initialContactLeadForm: ContactLeadForm = {
  nombre: "",
  telefono: "",
  mensaje: "",
}

const SOCIAL_LINKS = [
  {
    id: "instagram",
    label: "Instagram",
    href: "https://www.instagram.com/hola.varela?igsh=MTRwczl1aGI0MTEzaw==",
    className:
      "border-pink-100 bg-[linear-gradient(135deg,#fff1f7_0%,#f5ecff_100%)] text-pink-700 hover:border-pink-200 hover:text-pink-800",
  },
  {
    id: "facebook",
    label: "Facebook",
    href: "https://www.facebook.com/share/1HZBYuVRC3/",
    className:
      "border-blue-100 bg-[linear-gradient(135deg,#eef5ff_0%,#f3f8ff_100%)] text-blue-700 hover:border-blue-200 hover:text-blue-800",
  },
]

const ITEMS_PER_ROTATION = 8
const FEATURED_ROTATION_DAYS = 2
const DELAYED_PROMO_ROTATION_ITEMS = 4

function isFeaturedListing(item: {
  destacado?: boolean | null
  plan_suscripcion?: string | null
}) {
  return (
    item.destacado === true ||
    item.plan_suscripcion === "destacado" ||
    item.plan_suscripcion === "destacado_plus"
  )
}

function hasInstitutionPremium(item: {
  premium_activo?: boolean | null
}) {
  return Boolean(item.premium_activo)
}

function sliceRotatingItems<T>(items: T[], page: number, pageSize = ITEMS_PER_ROTATION) {
  if (items.length <= pageSize) {
    return items.slice(0, pageSize)
  }

  const start = page * pageSize
  const visibleItems: T[] = []

  for (let index = 0; index < pageSize; index += 1) {
    visibleItems.push(items[(start + index) % items.length])
  }

  return visibleItems
}

function getScheduledRotationPage(totalPages: number, rotationDays = FEATURED_ROTATION_DAYS) {
  if (totalPages <= 1) return 0

  const daysSinceEpoch = Math.floor(Date.now() / (1000 * 60 * 60 * 24))
  return Math.floor(daysSinceEpoch / rotationDays) % totalPages
}

function getInitialDelayedPromo(
  items: DelayedPromo[],
  configuredItemKey: string
): DelayedPromo | null {
  if (items.length === 0 || typeof window === "undefined") return null

  if (configuredItemKey) {
    return items.find((item) => item.key === configuredItemKey) || null
  }

  const totalPages = Math.max(1, Math.ceil(items.length / DELAYED_PROMO_ROTATION_ITEMS))
  const scheduledPage = getScheduledRotationPage(totalPages, 1)
  const dailyPool = sliceRotatingItems(
    items,
    scheduledPage,
    Math.min(DELAYED_PROMO_ROTATION_ITEMS, items.length)
  )

  if (dailyPool.length === 0) return null

  const lastShownKey = window.localStorage.getItem(DELAYED_PROMO_LAST_KEY)
  const lastIndex = dailyPool.findIndex((item) => item.key === lastShownKey)
  const nextIndex = lastIndex >= 0 ? (lastIndex + 1) % dailyPool.length : 0
  const nextItem = dailyPool[nextIndex] || dailyPool[0]

  window.localStorage.setItem(DELAYED_PROMO_LAST_KEY, nextItem.key)
  return nextItem
}

export function HomePage({ initialData }: { initialData: HomePageData }) {
  const router = useRouter()
  const featuredBusinesses = initialData.featuredBusinesses
  const eventos = initialData.eventos
  const cursos = initialData.cursos
  const servicios = initialData.servicios
  const allCursos = initialData.allCursos
  const allServicios = initialData.allServicios
  const instituciones = initialData.instituciones
  const sobreVarela = initialData.sobreVarela || defaultSobreVarela
  const [radio, setRadio] = useState<RadioConfig>(defaultRadioConfig)
  const [selectedComercio, setSelectedComercio] = useState<Comercio | null>(null)
  const [selectedServicio, setSelectedServicio] = useState<Servicio | null>(null)
  const [selectedEvento, setSelectedEvento] = useState<Evento | null>(null)
  const [selectedCurso, setSelectedCurso] = useState<Curso | null>(null)
  const [selectedInstitucion, setSelectedInstitucion] = useState<Institucion | null>(null)
  const [eventLikeCounts, setEventLikeCounts] = useState<Record<string, number>>({})
  const [likedEvents, setLikedEvents] = useState<Record<string, boolean>>({})
  const [likingEventId, setLikingEventId] = useState<string | null>(null)
  const [contactLeadForm, setContactLeadForm] = useState<ContactLeadForm>(
    initialContactLeadForm
  )
  const [contactLeadStatus, setContactLeadStatus] = useState("")

  useEffect(() => {
    void recordSiteVisit("home", "Inicio")
  }, [])
  const [contactLeadLoading, setContactLeadLoading] = useState(false)
  const [isContactLeadOpen, setIsContactLeadOpen] = useState(false)
  const [isSweepstakesHintOpen, setIsSweepstakesHintOpen] = useState(false)
  const [isSweepstakesHintVisible, setIsSweepstakesHintVisible] = useState(() => {
    if (typeof window === "undefined") return true
    return (
      window.sessionStorage.getItem(SWEEPSTAKES_HINT_DISMISSED_SESSION_KEY) !== "true"
    )
  })
  const [isDelayedPromoOpen, setIsDelayedPromoOpen] = useState(false)
  const [delayedPromoConfig, setDelayedPromoConfig] = useState<DelayedPromoConfig>(
    defaultDelayedPromoConfig
  )
  const [welcomeHighlight, setWelcomeHighlight] = useState<WelcomeHighlight | null>(null)
  const [zoomedImage, setZoomedImage] = useState<{ src: string; alt: string } | null>(null)
  const [shouldLoadRadioWidget, setShouldLoadRadioWidget] = useState(false)
  const eventsSectionRef = useRef<HTMLElement | null>(null)
  const radioSectionRef = useRef<HTMLElement | null>(null)
  const sweepstakesPopup = useSweepstakesPopup()

  const featuredBusinessPageCount = Math.max(
    1,
    Math.ceil(featuredBusinesses.length / ITEMS_PER_ROTATION)
  )
  const scheduledFeaturedBusinessPage = useMemo(
    () => getScheduledRotationPage(featuredBusinessPageCount),
    [featuredBusinessPageCount]
  )
  const featuredServiciosForHome = useMemo(() => {
    const highlighted = allServicios.filter((item) => isFeaturedListing(item))
    if (highlighted.length > 0) return highlighted

    const featuredFromHomeFeed = servicios.filter((item) => isFeaturedListing(item))
    if (featuredFromHomeFeed.length > 0) return featuredFromHomeFeed

    return servicios
  }, [allServicios, servicios])
  const servicePageCount = Math.max(
    1,
    Math.ceil(featuredServiciosForHome.length / ITEMS_PER_ROTATION)
  )
  const shouldRotateServicios = featuredServiciosForHome.length > ITEMS_PER_ROTATION
  const scheduledServicePage = useMemo(
    () => getScheduledRotationPage(servicePageCount),
    [servicePageCount]
  )
  const visibleFeaturedBusinesses = useMemo(
    () => sliceRotatingItems(featuredBusinesses, scheduledFeaturedBusinessPage),
    [featuredBusinesses, scheduledFeaturedBusinessPage]
  )
  const visibleServicios = useMemo(
    () =>
      shouldRotateServicios
        ? sliceRotatingItems(featuredServiciosForHome, scheduledServicePage)
        : featuredServiciosForHome.slice(0, ITEMS_PER_ROTATION),
    [featuredServiciosForHome, scheduledServicePage, shouldRotateServicios]
  )
  const visibleEventos = useMemo(() => eventos.slice(0, 8), [eventos])
  const visibleCursos = useMemo(() => cursos.slice(0, 8), [cursos])
  const visibleInstituciones = useMemo(() => instituciones.slice(0, 10), [instituciones])
  const delayedPromoOptions = useMemo<DelayedPromo[]>(() => {
    const comercioOptions = featuredBusinesses
      .filter((item) => isFeaturedListing(item))
      .map((item) => ({
      key: `comercio:${item.id}`,
      kind: "comercio" as const,
      title: item.nombre,
      description:
        item.descripcion || "Descubre este comercio destacado dentro de Hola Varela.",
      image: item.imagen_url || item.imagen || null,
      subtitle: item.direccion || null,
      href: item.premium_activo ? `/comercios/${item.id}` : `/comercios?item=${item.id}`,
    }))

    const servicioOptions = allServicios
      .filter((item) => isFeaturedListing(item))
      .map((item) => ({
      key: `servicio:${item.id}`,
      kind: "servicio" as const,
      title: item.nombre,
      description:
        item.descripcion || "Conoce este servicio destacado recomendado dentro de la plataforma.",
      image: item.imagen || null,
      subtitle: item.categoria || null,
      href: item.premium_activo ? `/servicios/${item.id}` : `/servicios?item=${item.id}`,
    }))

    const cursoOptions = allCursos
      .filter((item) => item.destacado)
      .map((item) => ({
      key: `curso:${item.id}`,
      kind: "curso" as const,
      title: item.nombre,
      description:
        item.descripcion || "Mira esta propuesta destacada para aprender o sumarte a una clase.",
      image: item.imagen || null,
      subtitle: item.responsable || null,
      href: `/cursos?item=${item.id}`,
    }))

    return [...comercioOptions, ...servicioOptions, ...cursoOptions]
  }, [allCursos, allServicios, featuredBusinesses])


  const weather = initialData.weather
  const weatherLabel = weather ? WEATHER_LABELS[weather.weatherCode] || "Clima actual" : null

  useEffect(() => {
    if (eventos.length === 0) return

    const loadEventLikes = async () => {
      const eventIds = eventos.map((evento) => String(evento.id))
      const { countMap, likedMap } = await fetchEventLikes(eventIds)
      setEventLikeCounts(countMap)
      setLikedEvents(likedMap)
    }

    void loadEventLikes()
  }, [eventos])

  useEffect(() => {
    if (shouldLoadRadioWidget || !radio.isLive) return

    const section = radioSectionRef.current
    if (!section) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShouldLoadRadioWidget(true)
          observer.disconnect()
        }
      },
      {
        rootMargin: "220px 0px",
      }
    )

    observer.observe(section)

    return () => observer.disconnect()
  }, [radio.isLive, shouldLoadRadioWidget])

  useEffect(() => {
    const loadRadioConfig = () => {
      const raw = window.localStorage.getItem(RADIO_STORAGE_KEY)
      if (!raw) {
        setRadio(defaultRadioConfig)
        return
      }

      try {
        const parsed = JSON.parse(raw) as Partial<RadioConfig>
        setRadio({
          title: parsed.title?.trim() || defaultRadioConfig.title,
          description: parsed.description?.trim() || defaultRadioConfig.description,
          streamUrl: parsed.streamUrl?.trim() || defaultRadioConfig.streamUrl,
          isLive: parsed.isLive ?? defaultRadioConfig.isLive,
        })
      } catch {
        window.localStorage.removeItem(RADIO_STORAGE_KEY)
        setRadio(defaultRadioConfig)
      }
    }

    loadRadioConfig()
    window.addEventListener("radio-config-updated", loadRadioConfig)
    window.addEventListener("storage", loadRadioConfig)

    return () => {
      window.removeEventListener("radio-config-updated", loadRadioConfig)
      window.removeEventListener("storage", loadRadioConfig)
    }
  }, [])

  useEffect(() => {
    const loadDelayedPromoConfig = () => {
      if (typeof window === "undefined") return

      const raw = window.localStorage.getItem(DELAYED_PROMO_STORAGE_KEY)
      if (!raw) {
        setDelayedPromoConfig(defaultDelayedPromoConfig)
        return
      }

      try {
        const parsed = JSON.parse(raw) as Partial<DelayedPromoConfig>
        setDelayedPromoConfig({
          enabled: parsed.enabled ?? defaultDelayedPromoConfig.enabled,
          delaySeconds:
            typeof parsed.delaySeconds === "number" && Number.isFinite(parsed.delaySeconds)
              ? Math.max(5, parsed.delaySeconds)
              : defaultDelayedPromoConfig.delaySeconds,
          itemKey: parsed.itemKey?.trim() || "",
        })
      } catch {
        window.localStorage.removeItem(DELAYED_PROMO_STORAGE_KEY)
        setDelayedPromoConfig(defaultDelayedPromoConfig)
      }
    }

    loadDelayedPromoConfig()
    window.addEventListener(DELAYED_PROMO_UPDATE_EVENT, loadDelayedPromoConfig)
    window.addEventListener("storage", loadDelayedPromoConfig)

    return () => {
      window.removeEventListener(DELAYED_PROMO_UPDATE_EVENT, loadDelayedPromoConfig)
      window.removeEventListener("storage", loadDelayedPromoConfig)
    }
  }, [])

  const delayedPromo = useMemo(
    () => getInitialDelayedPromo(delayedPromoOptions, delayedPromoConfig.itemKey),
    [delayedPromoConfig.itemKey, delayedPromoOptions]
  )

  useEffect(() => {
    if (!WELCOME_PROMOTION_ENABLED) return

    const timeoutId = window.setTimeout(() => {
      setWelcomeHighlight(
        getInitialWelcomeHighlight(
          initialData.featuredBusinesses,
          initialData.allServicios,
          initialData.allCursos
        )
      )
    }, 15000)

    return () => window.clearTimeout(timeoutId)
  }, [initialData.allCursos, initialData.allServicios, initialData.featuredBusinesses])

  useEffect(() => {
    if (!delayedPromoConfig.enabled || !delayedPromo) return
    if (typeof window === "undefined") return
    if (window.sessionStorage.getItem(DELAYED_PROMO_SESSION_KEY) === "true") return

    const timeoutId = window.setTimeout(() => {
      window.sessionStorage.setItem(DELAYED_PROMO_SESSION_KEY, "true")
      setIsDelayedPromoOpen(true)
    }, delayedPromoConfig.delaySeconds * 1000)

    return () => window.clearTimeout(timeoutId)
  }, [delayedPromo, delayedPromoConfig.delaySeconds, delayedPromoConfig.enabled])

  const WeatherIcon = useMemo(() => {
    if (!weather) return CloudSun
    if ([61, 63, 65, 80, 81, 82].includes(weather.weatherCode)) return CloudRain
    if ([51, 53, 55].includes(weather.weatherCode)) return CloudDrizzle
    if ([1, 2].includes(weather.weatherCode)) return CloudSun
    return Cloud
  }, [weather])

  const whatsappLink = (telefono: string | null) => {
    if (!telefono) return "#"
    const limpio = telefono.replace(/\D/g, "")
    const numero = limpio.startsWith("598")
      ? limpio
      : `598${limpio.replace(/^0+/, "")}`

    return `https://wa.me/${numero}`
  }

  const getContactHref = (contacto: string | null, usaWhatsapp?: boolean | null) => {
    if (!contacto) return "#"
    return usaWhatsapp === false ? `tel:${contacto}` : whatsappLink(contacto)
  }

  const getContactLabel = (usaWhatsapp?: boolean | null) =>
    usaWhatsapp === false ? "Llamar" : "Contactar por WhatsApp"

  const handleViewMoreClick = (
    section: ViewMoreSection,
    itemId: string,
    itemTitle: string,
    open: () => void
  ) => {
    void recordViewMore(section, itemId, itemTitle)
    void recordContentVisit(section, itemId, itemTitle)
    open()
  }

  const handleCardKeyDown = (
    event: KeyboardEvent<HTMLElement>,
    action: () => void
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      action()
    }
  }

  const handleInstitutionClick = (institucion: Institucion) => {
    if (hasInstitutionPremium(institucion)) {
      void recordViewMore("instituciones", String(institucion.id), institucion.nombre)
      void recordContentVisit("instituciones", String(institucion.id), institucion.nombre)
      router.push(`/instituciones/${institucion.id}`)
      return
    }

    handleViewMoreClick(
      "instituciones",
      String(institucion.id),
      institucion.nombre,
      () => setSelectedInstitucion(institucion)
    )
  }

  const handleEventLike = async (eventId: string, eventTitle: string) => {
    if (likedEvents[eventId] || likingEventId === eventId) return

    setLikingEventId(eventId)
    const result = await recordEventLike(eventId, eventTitle)

    if (result.status === "liked") {
      setEventLikeCounts((prev) => ({
        ...prev,
        [eventId]: (prev[eventId] || 0) + 1,
      }))
    }

    if (result.status === "liked" || result.status === "exists") {
      setLikedEvents((prev) => ({
        ...prev,
        [eventId]: true,
      }))
    }

    await sweepstakesPopup.handleLikeResult(result)
    setLikingEventId(null)
  }

  const closeWelcomeHighlight = () => {
    window.sessionStorage.setItem(WELCOME_SESSION_KEY, "true")
    setWelcomeHighlight(null)
  }

  const handleContactLeadSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setContactLeadLoading(true)
    setContactLeadStatus("")

    const payload = {
      nombre: contactLeadForm.nombre.trim(),
      email: null,
      telefono: contactLeadForm.telefono.trim(),
      mensaje: contactLeadForm.mensaje.trim(),
    }

    const { error } = await supabase.from("contacto_solicitudes").insert([payload])

    if (error) {
      setContactLeadStatus("No pudimos enviar tu solicitud. Proba de nuevo.")
      setContactLeadLoading(false)
      return
    }

    setContactLeadForm(initialContactLeadForm)
    setContactLeadStatus("Recibimos tu mensaje. Te contactaremos a la brevedad.")
    setContactLeadLoading(false)
  }

  const openWelcomeDetail = () => {
    if (!welcomeHighlight) return

    if (welcomeHighlight.kind === "comercio") {
      const comercio = featuredBusinesses.find(
        (item) => `comercio-${item.id}` === welcomeHighlight.key
      )
      if (comercio) {
        setSelectedComercio(comercio)
      }
    }

    if (welcomeHighlight.kind === "servicio") {
      const servicio = servicios.find(
        (item) => `servicio-${item.id}` === welcomeHighlight.key
      ) || allServicios.find(
        (item) => `servicio-${item.id}` === welcomeHighlight.key
      )
      if (servicio) {
        setSelectedServicio(servicio)
      }
    }

    if (welcomeHighlight.kind === "curso") {
      const curso =
        cursos.find((item) => `curso-${item.id}` === welcomeHighlight.key) ||
        allCursos.find((item) => `curso-${item.id}` === welcomeHighlight.key)
      if (curso) {
        setSelectedCurso(curso)
      }
    }

    closeWelcomeHighlight()
  }

  const contactLeadIntro =
    "Déjanos tu nombre, teléfono y mensaje para responderte."
  const contactLeadSubmitHint =
    "Te vamos a contactar usando el teléfono que nos compartas."
  return (
      <div className="min-h-screen bg-[linear-gradient(180deg,#f8fbff_0%,#f2f7f5_48%,#ffffff_100%)] text-slate-900">
        {isDelayedPromoOpen && delayedPromo ? (
          <div
            className="fixed inset-0 z-[84] overflow-y-auto bg-slate-950/55 px-3 py-4 sm:p-4"
            onClick={() => setIsDelayedPromoOpen(false)}
          >
            <div className="mx-auto flex min-h-full max-w-3xl items-center justify-center py-2 sm:py-4">
              <div
                className="relative w-full overflow-hidden rounded-[28px] border border-white/10 bg-white shadow-2xl sm:rounded-[34px]"
                onClick={(event) => event.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => setIsDelayedPromoOpen(false)}
                  className="absolute right-3 top-3 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/80 bg-white/95 text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-white hover:text-slate-900 sm:right-4 sm:top-4"
                  aria-label="Cerrar publicidad"
                >
                  <X className="h-4 w-4" />
                </button>
                <div className="grid lg:grid-cols-[0.95fr_1.05fr]">
                  <div className="relative min-h-[180px] bg-[radial-gradient(circle_at_top_left,#e7f3ff_0%,#f6fbff_42%,#ffffff_100%)] sm:min-h-[220px] lg:min-h-[260px]">
                    {delayedPromo.image ? (
                      <div className="absolute inset-0 p-4 sm:p-5 lg:p-6">
                        <div className="relative h-full w-full overflow-hidden rounded-[24px] border border-white/80 bg-white/70 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.3)]">
                          <OptimizedImage
                            src={delayedPromo.image}
                            alt={delayedPromo.title}
                            sizes="(max-width: 1024px) 100vw, 45vw"
                            className="object-contain p-3 sm:p-4"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="flex h-full min-h-[180px] items-center justify-center text-slate-400 sm:min-h-[220px] lg:min-h-[260px]">
                        Sin imagen
                      </div>
                    )}
                  </div>
                  <div className="p-4 sm:p-6 lg:p-8">
                    <div className="inline-flex rounded-full bg-amber-100 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-800 sm:px-4 sm:py-2 sm:text-xs">
                      Publicidad
                    </div>
                    <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-700 sm:mt-4 sm:text-xs">
                      <Megaphone className="h-3.5 w-3.5" />
                      Comercio recomendado
                    </div>
                    <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950 sm:mt-5 sm:text-3xl">
                      {delayedPromo.title}
                    </h2>
                    {delayedPromo.subtitle ? (
                      <p className="mt-2 text-sm font-medium text-slate-500 sm:mt-3">
                        {delayedPromo.subtitle}
                      </p>
                    ) : null}
                    <p className="mt-3 text-sm leading-7 text-slate-700 sm:mt-4 sm:text-base sm:leading-8">
                      {delayedPromo.description}
                    </p>
                    <div className="mt-5 rounded-[20px] border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-600 sm:mt-6 sm:rounded-[24px] sm:p-4 sm:leading-7">
                      Esta tarjeta es una promocion destacada. Puedes entrar a ver el comercio o cerrarla y seguir navegando.
                    </div>
                    <div className="mt-5 flex flex-col gap-3 sm:mt-6 sm:flex-row sm:flex-wrap">
                      <Link
                        href={delayedPromo.href}
                        onClick={() => setIsDelayedPromoOpen(false)}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-600 sm:w-auto"
                      >
                        Ver comercio
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => setIsDelayedPromoOpen(false)}
                        className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 sm:w-auto"
                      >
                        Cerrar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {isSweepstakesHintOpen ? (
          <div className="fixed inset-0 z-[85] overflow-y-auto bg-slate-950/55 px-3 py-4 sm:p-4" onClick={() => setIsSweepstakesHintOpen(false)}>
            <div className="mx-auto flex min-h-full max-w-2xl items-center justify-center py-2 sm:py-4">
              <div
                className="w-full overflow-hidden rounded-[26px] border border-white/10 bg-white shadow-2xl sm:rounded-[32px]"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="bg-[radial-gradient(circle_at_top_left,#ffe2ea_0%,#fff4f7_42%,#f5f8ff_100%)] p-4 sm:p-6 lg:p-8">
                  <div className="inline-flex rounded-full bg-white/85 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-700 sm:px-4 sm:py-2 sm:text-xs">
                    Sorteo 9 de Mayo
                  </div>
                  <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950 sm:mt-5 sm:text-4xl">
                    Participa dando 3 corazones
                  </h2>
                  <div className="mt-4 space-y-3 text-sm leading-7 text-slate-700 sm:mt-5 sm:space-y-4 sm:text-base sm:leading-8">
                    <p>
                      Busca las publicaciones de <span className="font-semibold">Hoy en Varela</span> y toca el boton de corazones.
                    </p>
                    <p>
                      Cuando llegues a <span className="font-semibold">3 corazones</span>, se abre el popup del sorteo para dejar tu nombre y telefono.
                    </p>
                    <p>
                      El sorteo es el <span className="font-semibold">9 de Mayo</span>. Puedes participar desde la web, de forma simple y rapida.
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-3 p-4 sm:flex-row sm:flex-wrap sm:p-6 lg:p-8">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSweepstakesHintOpen(false)
                      eventsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
                    }}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-600 sm:w-auto"
                  >
                    Ir a dar corazones
                    <Heart className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsSweepstakesHintOpen(false)}
                    className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 sm:w-auto"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {zoomedImage ? (
          <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/92 p-4">
          <button
            type="button"
            onClick={() => setZoomedImage(null)}
            className="absolute right-4 top-4 rounded-full bg-white/90 p-2 text-slate-700 shadow-sm transition hover:bg-white"
            aria-label="Cerrar imagen ampliada"
          >
            <X className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={() => setZoomedImage(null)}
            className="relative h-[88vh] w-full max-w-5xl overflow-hidden rounded-[28px] bg-white/5"
            aria-label="Cerrar imagen ampliada"
          >
            <OptimizedImage
              src={zoomedImage.src}
              alt={zoomedImage.alt}
              sizes="100vw"
              priority
              className="object-contain p-4"
            />
          </button>
        </div>
      ) : null}

      {WELCOME_PROMOTION_ENABLED && welcomeHighlight && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/70 p-4">
          <div className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-[28px] bg-white shadow-2xl">
            <button
              type="button"
              onClick={closeWelcomeHighlight}
              className="absolute right-4 top-4 z-10 rounded-full bg-white/90 p-2 text-slate-700 shadow-sm transition hover:bg-white"
              aria-label="Cerrar bienvenida"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr]">
                <div className="bg-[linear-gradient(180deg,#f8fafc_0%,#eef4ff_100%)]">
                  {welcomeHighlight.image ? (
                    <div className="flex min-h-[280px] w-full items-center justify-center bg-slate-100 p-6 md:min-h-[360px]">
                      <button
                        type="button"
                        onClick={() =>
                          setZoomedImage({
                            src: welcomeHighlight.image || "",
                            alt: welcomeHighlight.title,
                          })
                        }
                        className="relative aspect-[4/5] h-[280px] w-full max-w-[420px] overflow-hidden rounded-[24px] border border-white/80 bg-white shadow-[0_18px_45px_-28px_rgba(15,23,42,0.45)] transition hover:scale-[1.01] md:h-[360px]"
                        aria-label="Ver imagen mas grande"
                      >
                        <OptimizedImage
                          src={welcomeHighlight.image}
                          alt={welcomeHighlight.title}
                          sizes="(max-width: 768px) 100vw, 50vw"
                          className="object-cover"
                        />
                      </button>
                    </div>
                  ) : (
                  <div className="flex min-h-[280px] items-center justify-center text-slate-400">
                    Sin imagen
                  </div>
                )}
              </div>

              <div className="p-6 md:p-8">
                <div className="mb-4 inline-flex rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700">
                  Descubrí en Varela
                </div>

                <h2 className="text-3xl font-semibold leading-tight text-slate-900">
                  {welcomeHighlight.title}
                </h2>

                {welcomeHighlight.subtitle && (
                  <p className="mt-3 text-base font-medium text-slate-500">
                    {welcomeHighlight.subtitle}
                  </p>
                )}

                <p className="mt-5 text-lg leading-8 text-slate-600">
                  {welcomeHighlight.description}
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      handleViewMoreClick(
                        welcomeHighlight.kind === "comercio"
                          ? "comercios"
                          : welcomeHighlight.kind === "servicio"
                            ? "servicios"
                            : "cursos",
                        welcomeHighlight.key.split("-").slice(1).join("-"),
                        welcomeHighlight.title,
                        openWelcomeDetail
                      )
                    }
                    className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-500"
                  >
                    Ver más
                    <ArrowRight className="h-4 w-4" />
                  </button>

                  {welcomeHighlight.contact && (
                    <ContactActionLink
                      href={getContactHref(
                        welcomeHighlight.contact,
                        welcomeHighlight.usesWhatsapp
                      )}
                      mode={welcomeHighlight.usesWhatsapp === false ? "phone" : "whatsapp"}
                      section={
                        welcomeHighlight.kind === "comercio"
                          ? "comercios"
                          : welcomeHighlight.kind === "servicio"
                            ? "servicios"
                            : "cursos"
                      }
                      itemId={welcomeHighlight.key.split("-").slice(1).join("-")}
                      itemTitle={welcomeHighlight.title}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      <Phone className="h-4 w-4" />
                      {getContactLabel(welcomeHighlight.usesWhatsapp)}
                    </ContactActionLink>
                  )}

                  <button
                    type="button"
                    onClick={closeWelcomeHighlight}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isContactLeadOpen && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center bg-slate-950/55 p-4">
          <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl sm:p-8">
            <button
              type="button"
              onClick={() => setIsContactLeadOpen(false)}
              className="absolute right-4 top-4 rounded-full bg-slate-100 p-2 text-slate-600 transition hover:bg-slate-200"
              aria-label="Cerrar formulario"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="pr-10">
              <div className="inline-flex rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
                Quiero estar en Hola Varela
              </div>
              <h3 className="mt-4 text-[30px] font-semibold text-slate-900">
                Completa tu propuesta
              </h3>
              <p className="hidden mt-3 text-base leading-7 text-slate-500">
                Elige qué quieres sumar, completa los datos y después te avisamos por email cómo seguir con tu usuario.
              </p>
              <p className="mt-3 text-base leading-7 text-slate-500">{contactLeadIntro}</p>
            </div>

            <form onSubmit={handleContactLeadSubmit} className="mt-8 space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="mb-4 text-sm font-semibold text-slate-800">
                  Tus datos de contacto
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Nombre
                    </label>
                    <input
                      type="text"
                      value={contactLeadForm.nombre}
                      onChange={(e) =>
                        setContactLeadForm((prev) => ({
                          ...prev,
                          nombre: e.target.value,
                        }))
                      }
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 outline-none transition focus:border-sky-400"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Telefono
                    </label>
                    <input
                      type="tel"
                      value={contactLeadForm.telefono}
                      onChange={(e) =>
                        setContactLeadForm((prev) => ({
                          ...prev,
                          telefono: e.target.value,
                        }))
                      }
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 outline-none transition focus:border-sky-400"
                      required
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Mensaje
                </label>
                <textarea
                  value={contactLeadForm.mensaje}
                  onChange={(e) =>
                    setContactLeadForm((prev) => ({
                      ...prev,
                      mensaje: e.target.value,
                    }))
                  }
                  className="min-h-28 w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 outline-none transition focus:border-sky-400"
                  placeholder="Cuentanos brevemente que necesitas o como quieres estar en Hola Varela."
                  required
                />
              </div>

              {contactLeadStatus && (
                <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
                  {contactLeadStatus}
                </div>
              )}

              <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-500">{contactLeadSubmitHint}</p>
                <button
                  type="submit"
                  disabled={contactLeadLoading}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-sky-600 px-6 py-3 font-semibold text-white transition hover:bg-sky-500 disabled:opacity-60"
                >
                  {contactLeadLoading ? "Enviando..." : "Enviar"}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedComercio ? (
      <PublicDetailModal
        open={Boolean(selectedComercio)}
        onClose={() => setSelectedComercio(null)}
        title={selectedComercio?.nombre || ""}
        imageSrc={selectedComercio ? selectedComercio.imagen_url || selectedComercio.imagen || null : null}
        imageAlt={selectedComercio?.nombre || "Comercio"}
        badge={selectedComercio?.premium_activo ? "Premium" : null}
        description={selectedComercio?.descripcion || null}
        extraContent={
          selectedComercio?.premium_activo ? (
            <div className="space-y-4">
              {selectedComercio.premium_detalle ? (
                <div className="rounded-[24px] border border-violet-100 bg-violet-50/70 p-5">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-violet-600">
                    Perfil ampliado
                  </div>
                  <p className="whitespace-pre-line text-sm leading-7 text-slate-700">
                    {selectedComercio.premium_detalle}
                  </p>
                </div>
              ) : null}
              {selectedComercio.premium_galeria?.length ? (
                <div>
                  <div className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Galeria
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {selectedComercio.premium_galeria.map((image, index) => (
                      <div key={`${image}-${index}`} className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                        <OptimizedImage
                          src={image}
                          alt={`${selectedComercio.nombre} ${index + 1}`}
                          sizes="(max-width: 768px) 50vw, 25vw"
                          quality={64}
                          className="object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null
        }
        meta={[
          ...(selectedComercio?.direccion ? [{ icon: MapPin, text: selectedComercio.direccion }] : []),
          ...(selectedComercio?.telefono ? [{ icon: Phone, text: selectedComercio.telefono }] : []),
        ]}
        actions={
          <>
            {selectedComercio?.telefono ? (
              <ContactActionLink
                href={getContactHref(
                  selectedComercio.telefono,
                  selectedComercio.usa_whatsapp
                )}
                mode={selectedComercio.usa_whatsapp === false ? "phone" : "whatsapp"}
                section="comercios"
                itemId={String(selectedComercio.id)}
                itemTitle={selectedComercio.nombre}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-2xl bg-green-600 px-5 py-3 font-semibold text-white transition hover:bg-green-500"
              >
                <Phone className="h-4 w-4" />
                {getContactLabel(selectedComercio.usa_whatsapp)}
              </ContactActionLink>
            ) : null}

            {selectedComercio ? (
              <ExternalLinksButtons
                webUrl={selectedComercio.web_url}
                instagramUrl={selectedComercio.instagram_url}
                facebookUrl={selectedComercio.facebook_url}
                section="comercios"
                itemId={String(selectedComercio.id)}
                itemTitle={selectedComercio.nombre}
              />
            ) : null}
            {selectedComercio?.premium_activo ? (
              <Link
                href={`/comercios/${selectedComercio.id}`}
                onClick={() =>
                  void recordViewMore(
                    "comercios",
                    String(selectedComercio.id),
                    selectedComercio.nombre
                  )
                }
                className="inline-flex items-center gap-2 rounded-2xl border border-violet-200 bg-violet-50 px-5 py-3 font-semibold text-violet-700 transition hover:border-violet-300 hover:bg-violet-100"
              >
                Ver perfil completo
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : null}
          </>
        }
      />
      ) : null}

      {selectedServicio ? (
      <PublicDetailModal
        open={Boolean(selectedServicio)}
        onClose={() => setSelectedServicio(null)}
        title={selectedServicio?.nombre || ""}
        imageSrc={selectedServicio?.imagen || null}
        imageAlt={selectedServicio?.nombre || "Servicio"}
        badge={selectedServicio?.premium_activo ? "Premium" : selectedServicio?.categoria || null}
        description={selectedServicio?.descripcion || null}
        extraContent={
          selectedServicio?.premium_activo ? (
            <div className="space-y-4">
              {selectedServicio.premium_detalle ? (
                <div className="rounded-[24px] border border-violet-100 bg-violet-50/70 p-5">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-violet-600">
                    Perfil ampliado
                  </div>
                  <p className="whitespace-pre-line text-sm leading-7 text-slate-700">
                    {selectedServicio.premium_detalle}
                  </p>
                </div>
              ) : null}
              {selectedServicio.premium_galeria?.length ? (
                <div>
                  <div className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Galeria
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {selectedServicio.premium_galeria.map((image, index) => (
                      <div key={`${image}-${index}`} className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                        <OptimizedImage
                          src={image}
                          alt={`${selectedServicio.nombre} ${index + 1}`}
                          sizes="(max-width: 768px) 50vw, 25vw"
                          quality={64}
                          className="object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null
        }
        meta={[
          ...(selectedServicio?.responsable ? [{ icon: UserRound, text: selectedServicio.responsable }] : []),
          ...(selectedServicio?.contacto ? [{ icon: Phone, text: selectedServicio.contacto }] : []),
          ...(selectedServicio?.direccion ? [{ icon: MapPin, text: selectedServicio.direccion }] : []),
        ]}
        actions={
          <>
            {selectedServicio?.contacto ? (
              <ContactActionLink
                href={getContactHref(
                  selectedServicio.contacto,
                  selectedServicio.usa_whatsapp
                )}
                mode={selectedServicio.usa_whatsapp === false ? "phone" : "whatsapp"}
                section="servicios"
                itemId={String(selectedServicio.id)}
                itemTitle={selectedServicio.nombre}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-500"
              >
                <Phone className="h-4 w-4" />
                {getContactLabel(selectedServicio.usa_whatsapp)}
              </ContactActionLink>
            ) : null}

            {selectedServicio ? (
              <ExternalLinksButtons
                webUrl={selectedServicio.web_url}
                instagramUrl={selectedServicio.instagram_url}
                facebookUrl={selectedServicio.facebook_url}
                section="servicios"
                itemId={String(selectedServicio.id)}
                itemTitle={selectedServicio.nombre}
              />
            ) : null}
            {selectedServicio?.premium_activo ? (
              <Link
                href={`/servicios/${selectedServicio.id}`}
                onClick={() =>
                  void recordViewMore(
                    "servicios",
                    String(selectedServicio.id),
                    selectedServicio.nombre
                  )
                }
                className="inline-flex items-center gap-2 rounded-2xl border border-violet-200 bg-violet-50 px-5 py-3 font-semibold text-violet-700 transition hover:border-violet-300 hover:bg-violet-100"
              >
                Ver perfil completo
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : null}
          </>
        }
      />
      ) : null}

      {selectedEvento ? (
      <PublicDetailModal
        open={Boolean(selectedEvento)}
        onClose={() => setSelectedEvento(null)}
        title={selectedEvento?.titulo || ""}
        imageSrc={selectedEvento?.imagen || null}
        imageAlt={selectedEvento?.titulo || "Evento"}
        badge={selectedEvento ? normalizeEventCategory(selectedEvento.categoria) : null}
        description={selectedEvento ? parseEventDescription(selectedEvento.descripcion).baseDescription || null : null}
        meta={[
          ...(selectedEvento?.fecha
            ? [{
                icon: CalendarDays,
                text: formatEventDateRange(
                  selectedEvento.fecha,
                  selectedEvento.fecha_fin,
                  selectedEvento.fecha_solo_mes ?? false
                ),
              }]
            : []),
          ...(selectedEvento?.ubicacion
            ? [{ icon: MapPin, text: selectedEvento.ubicacion }]
            : []),
          ...(selectedEvento?.telefono
            ? [{ icon: Phone, text: selectedEvento.telefono }]
            : []),
        ]}
        actions={
          <>
            <Link
              href="/usuarios/eventos/nuevo?public=1"
              className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-500"
            >
              Sumar nueva actividad
              <ArrowRight className="h-4 w-4" />
            </Link>

            {selectedEvento?.telefono?.trim() ? (
              <ContactActionLink
                href={getContactHref(
                  selectedEvento.telefono,
                  selectedEvento.usa_whatsapp
                )}
                mode={selectedEvento.usa_whatsapp === false ? "phone" : "whatsapp"}
                section="eventos"
                itemId={String(selectedEvento.id)}
                itemTitle={selectedEvento.titulo}
                target="_blank"
                rel="noopener noreferrer"
                className={
                  selectedEvento.usa_whatsapp === false
                    ? "inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
                    : "inline-flex items-center gap-2 rounded-2xl bg-green-600 px-5 py-3 font-semibold text-white transition hover:bg-green-500"
                }
              >
                <Phone className="h-4 w-4" />
                {selectedEvento.usa_whatsapp === false ? "Llamar" : "WhatsApp"}
              </ContactActionLink>
            ) : null}

            {selectedEvento ? (
              <ExternalLinksButtons
                webUrl={selectedEvento.web_url}
                instagramUrl={selectedEvento.instagram_url}
                facebookUrl={selectedEvento.facebook_url}
                section="eventos"
                itemId={String(selectedEvento.id)}
                itemTitle={selectedEvento.titulo}
              />
            ) : null}

            {selectedEvento ? (
              <ShareButton
                title={selectedEvento.titulo}
                text={parseEventDescription(selectedEvento.descripcion).baseDescription}
                url={getEventShareUrl(String(selectedEvento.id))}
                section="eventos"
                itemId={String(selectedEvento.id)}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
              />
            ) : null}

            {selectedEvento ? (
              <EventLikeButton
                count={eventLikeCounts[String(selectedEvento.id)]}
                liked={Boolean(likedEvents[String(selectedEvento.id)])}
                onClick={() =>
                  void handleEventLike(String(selectedEvento.id), selectedEvento.titulo)
                }
                disabled={likingEventId === String(selectedEvento.id)}
                className="inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-600 transition hover:bg-emerald-100 disabled:cursor-default disabled:opacity-70"
              />
            ) : null}

            <Link
              href="/eventos"
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
            >
              Ver todo Hoy en Varela
              <ArrowRight className="h-4 w-4" />
            </Link>
          </>
        }
      />
      ) : null}

      {selectedCurso && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 p-4">
          <div className="relative max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-[28px] bg-white shadow-2xl">
            <button
              type="button"
              onClick={() => setSelectedCurso(null)}
              className="absolute right-4 top-4 z-10 rounded-full bg-white/90 p-2 text-slate-700 shadow-sm transition hover:bg-white"
              aria-label="Cerrar detalle"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-[1.45fr_0.55fr]">
                <div className="bg-[linear-gradient(180deg,#f8fafc_0%,#eef4ff_100%)]">
                  {selectedCurso.imagen ? (
                    <div className="flex min-h-[320px] w-full items-center justify-center bg-slate-100 p-6 md:min-h-[420px]">
                      <button
                        type="button"
                        onClick={() =>
                          setZoomedImage({
                            src: selectedCurso.imagen!,
                            alt: selectedCurso.nombre,
                          })
                        }
                        className="relative aspect-[4/5] h-[380px] w-full max-w-[680px] overflow-hidden rounded-[24px] border border-white/80 bg-white shadow-[0_18px_45px_-28px_rgba(15,23,42,0.45)] transition hover:scale-[1.01] md:h-[560px]"
                        aria-label="Ver imagen mas grande"
                      >
                        <OptimizedImage
                          src={selectedCurso.imagen}
                          alt={selectedCurso.nombre}
                          sizes="(max-width: 1024px) 100vw, 60vw"
                          className="object-contain p-3 sm:p-4"
                        />
                      </button>
                    </div>
                  ) : (
                  <div className="flex min-h-[320px] items-center justify-center text-slate-400">
                    Sin imagen
                  </div>
                )}
              </div>

              <div className="p-6 md:p-8">
                <h3 className="text-3xl font-semibold leading-tight text-slate-900">
                  {selectedCurso.nombre}
                </h3>

                <div className="mt-4 flex items-center gap-2 text-slate-500">
                  <GraduationCap className="h-4 w-4" />
                  <span>{selectedCurso.responsable}</span>
                </div>

                <div className="mt-3 flex items-center gap-2 text-slate-500">
                  <Phone className="h-4 w-4" />
                  <span>{selectedCurso.contacto}</span>
                </div>

                  <p className="mt-6 whitespace-pre-line text-lg leading-8 text-slate-600">
                    {selectedCurso.descripcion}
                  </p>

                <div className="mt-8 flex flex-wrap gap-3">
                  {selectedCurso.contacto?.trim() ? (
                    <ContactActionLink
                      href={getContactHref(
                        selectedCurso.contacto,
                        selectedCurso.usa_whatsapp
                      )}
                      mode={selectedCurso.usa_whatsapp === false ? "phone" : "whatsapp"}
                      section="cursos"
                      itemId={String(selectedCurso.id)}
                      itemTitle={selectedCurso.nombre}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-500"
                    >
                      <Phone className="h-4 w-4" />
                      {getContactLabel(selectedCurso.usa_whatsapp)}
                    </ContactActionLink>
                  ) : null}

                  <ExternalLinksButtons
                    webUrl={selectedCurso.web_url}
                    instagramUrl={selectedCurso.instagram_url}
                    facebookUrl={selectedCurso.facebook_url}
                    section="cursos"
                    itemId={String(selectedCurso.id)}
                    itemTitle={selectedCurso.nombre}
                  />

                  <button
                    type="button"
                    onClick={() => setSelectedCurso(null)}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedInstitucion && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 p-4">
          <div className="relative max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-[28px] bg-white shadow-2xl">
            <button
              type="button"
              onClick={() => setSelectedInstitucion(null)}
              className="absolute right-4 top-4 z-10 rounded-full bg-white/90 p-2 text-slate-700 shadow-sm transition hover:bg-white"
              aria-label="Cerrar detalle"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-[1.45fr_0.55fr]">
              <div className="bg-[linear-gradient(180deg,#f8fafc_0%,#eef4ff_100%)]">
                {selectedInstitucion.foto ? (
                  <div className="flex min-h-[320px] w-full items-center justify-center bg-slate-100 p-6 md:min-h-[420px]">
                    <button
                      type="button"
                      onClick={() =>
                        setZoomedImage({
                          src: selectedInstitucion.foto!,
                          alt: selectedInstitucion.nombre,
                        })
                      }
                      className="relative aspect-[4/5] h-[380px] w-full max-w-[680px] overflow-hidden rounded-[24px] border border-white/80 bg-white shadow-[0_18px_45px_-28px_rgba(15,23,42,0.45)] transition hover:scale-[1.01] md:h-[560px]"
                      aria-label="Ver imagen mas grande"
                    >
                      <OptimizedImage
                        src={selectedInstitucion.foto}
                        alt={selectedInstitucion.nombre}
                        sizes="(max-width: 1024px) 100vw, 60vw"
                        className="object-contain p-3 sm:p-4"
                      />
                    </button>
                  </div>
                ) : (
                  <div className="flex min-h-[320px] items-center justify-center bg-[linear-gradient(135deg,#ecfeff_0%,#eff6ff_50%,#f8fafc_100%)] text-slate-500">
                    <div className="flex flex-col items-center text-center">
                      <div className="flex h-20 w-20 items-center justify-center rounded-[28px] border border-cyan-100 bg-white text-cyan-700 shadow-sm">
                        <Building2 className="h-10 w-10" />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 md:p-8">
                <div className="mb-4 inline-flex rounded-full bg-cyan-50 px-3 py-1 text-sm font-semibold text-cyan-700">
                    Institución
                </div>

                <h3 className="text-3xl font-semibold leading-tight text-slate-900">
                  {selectedInstitucion.nombre}
                </h3>

                {selectedInstitucion.direccion && (
                  <div className="mt-4 flex items-center gap-2 text-slate-500">
                    <MapPin className="h-4 w-4" />
                    <span>{selectedInstitucion.direccion}</span>
                  </div>
                )}

                {selectedInstitucion.telefono && (
                  <div className="mt-3 flex items-center gap-2 text-slate-500">
                    <Phone className="h-4 w-4" />
                    <span>{selectedInstitucion.telefono}</span>
                  </div>
                )}

                {selectedInstitucion.descripcion && (
                  <p className="mt-6 whitespace-pre-line text-lg leading-8 text-slate-600">
                    {selectedInstitucion.descripcion}
                  </p>
                )}

                <div className="mt-8 flex flex-wrap gap-3">
                  {selectedInstitucion.telefono?.trim() ? (
                    <ContactActionLink
                      href={getContactHref(
                        selectedInstitucion.telefono,
                        selectedInstitucion.usa_whatsapp
                      )}
                      mode={selectedInstitucion.usa_whatsapp === false ? "phone" : "whatsapp"}
                      section="instituciones"
                      itemId={String(selectedInstitucion.id)}
                      itemTitle={selectedInstitucion.nombre}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={
                        selectedInstitucion.usa_whatsapp === false
                          ? "inline-flex items-center gap-2 rounded-2xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
                          : "inline-flex items-center gap-2 rounded-2xl bg-green-500 px-5 py-3 font-semibold text-white transition hover:bg-green-600"
                      }
                    >
                      <Phone className="h-4 w-4" />
                      {selectedInstitucion.usa_whatsapp === false ? "Llamar" : "WhatsApp"}
                    </ContactActionLink>
                  ) : null}

                  <ExternalLinksButtons
                    webUrl={selectedInstitucion.web_url}
                    instagramUrl={selectedInstitucion.instagram_url}
                    facebookUrl={selectedInstitucion.facebook_url}
                    section="instituciones"
                    itemId={String(selectedInstitucion.id)}
                    itemTitle={selectedInstitucion.nombre}
                  />

                  <Link
                    href="/instituciones"
                    className="inline-flex items-center gap-2 rounded-2xl bg-cyan-600 px-5 py-3 font-semibold text-white transition hover:bg-cyan-500"
                  >
                    Ver todas las instituciones
                    <ArrowRight className="h-4 w-4" />
                  </Link>

                  <button
                    type="button"
                    onClick={() => setSelectedInstitucion(null)}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {sweepstakesPopup.config ? (
        <SweepstakesPopup
          open={sweepstakesPopup.open}
          title={sweepstakesPopup.config.title}
          description={sweepstakesPopup.config.description}
              participants={sweepstakesPopup.config.participants}
          loading={sweepstakesPopup.submitting}
          error={sweepstakesPopup.submitError}
          onClose={sweepstakesPopup.closePopup}
          onSubmit={sweepstakesPopup.submitEntry}
        />
      ) : null}

      <PublicHeader
        items={buildHomePublicNav()}
        borderClassName="border-white/60"
        backgroundClassName="bg-white/80"
      />

      <section
        id="inicio"
        className="relative overflow-hidden bg-[radial-gradient(circle_at_top_left,#d7f3df_0%,#eff9f2_38%,#eef6ff_100%)] py-20 md:py-28"
      >
        <div className="absolute inset-x-0 top-0 -z-0 h-56 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.15),transparent_60%)]" />
        <div className="absolute -left-16 top-20 -z-0 h-48 w-48 rounded-full bg-blue-200/30 blur-3xl" />
        <div className="absolute right-0 top-10 -z-0 h-56 w-56 rounded-full bg-emerald-200/40 blur-3xl" />

        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <div className="mx-auto mb-8 inline-flex items-center gap-2 rounded-full border border-blue-200/70 bg-white/80 px-4 py-2 text-sm font-medium text-blue-700 shadow-sm">
            <MapPin className="h-4 w-4" />
            Jose Pedro Varela, Uruguay
          </div>

          <div className="mx-auto max-w-5xl">
            <h1 className="text-4xl font-bold leading-[1.05] tracking-tight text-slate-950 sm:text-5xl lg:text-7xl">
              Cartelera online de Jose Pedro Varela
            </h1>
          </div>

          <p className="mx-auto mt-8 max-w-3xl text-lg leading-8 text-slate-600 sm:text-xl">
            Encontrá acá eventos, cursos, servicios y más.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <button
              onClick={() =>
                document.getElementById("eventos")?.scrollIntoView({ behavior: "smooth" })
              }
              className="inline-flex items-center gap-3 rounded-2xl bg-slate-950 px-8 py-4 text-base font-semibold text-white shadow-[0_18px_40px_-20px_rgba(15,23,42,0.85)] transition hover:-translate-y-0.5 hover:bg-slate-900"
            >
              Hoy en Varela
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </section>

      {weather && (
        <section className="py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-4 rounded-[28px] border border-sky-100 bg-white/90 p-6 shadow-[0_18px_45px_-30px_rgba(14,165,233,0.35)] backdrop-blur md:grid-cols-[auto_1fr_auto] md:items-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
                <WeatherIcon className="h-8 w-8" />
              </div>

              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-700">
                  Estado del tiempo
                </p>
                <h2 className="mt-1 text-2xl font-semibold text-slate-900">
                  Clima en Jose Pedro Varela
                </h2>
                <p className="mt-2 text-base text-slate-600">
                  {weatherLabel}. Min {Math.round(weather.tempMin)}°C, max {Math.round(weather.tempMax)}°C y viento de {Math.round(weather.windSpeed)} km/h.
                </p>
              </div>

              <div className="rounded-2xl bg-sky-50 px-5 py-4 text-center text-sky-700">
                <div className="text-3xl font-bold">{Math.round(weather.temperature)}°C</div>
                <div className="text-sm font-medium">Ahora</div>
              </div>
            </div>
          </div>
        </section>
      )}

      {radio.isLive && (
        <section ref={radioSectionRef} className="py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {shouldLoadRadioWidget ? (
              <MyTunerWidget
                streamUrl={radio.streamUrl}
                title={radio.title}
                description={radio.description}
              />
            ) : (
              <div className="h-[236px] w-full rounded-[28px] border border-blue-100/35 bg-[linear-gradient(135deg,#dbeafe_0%,#eff6ff_55%,#f8fbff_100%)]" />
            )}
          </div>
        </section>
      )}

      <div className="flex flex-col">

      <section id="comercios" className="order-5 py-18">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="text-4xl font-semibold tracking-tight text-slate-900 md:text-5xl">
              Comercios
            </h2>
            <p className="mt-4 text-xl text-slate-500">
              Conoce la variedad de comercio en la ciudad
            </p>
            <div className="mt-6">
              <Link
                href="/comercios"
                className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-600"
              >
                Ver todos los comercios
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            {visibleFeaturedBusinesses.map((business) => {
              const imageSrc = business.imagen_url || business.imagen

              return (
                <div
                  key={business.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    if (business.premium_activo) {
                      void recordViewMore("comercios", String(business.id), business.nombre)
                      router.push(`/comercios/${business.id}`)
                      return
                    }

                    handleViewMoreClick(
                      "comercios",
                      String(business.id),
                      business.nombre,
                      () => setSelectedComercio(business)
                    )
                  }}
                  onKeyDown={(event) =>
                    handleCardKeyDown(event, () => {
                      if (business.premium_activo) {
                        void recordViewMore("comercios", String(business.id), business.nombre)
                        router.push(`/comercios/${business.id}`)
                        return
                      }

                      handleViewMoreClick(
                        "comercios",
                        String(business.id),
                        business.nombre,
                        () => setSelectedComercio(business)
                      )
                    })
                  }
                  className={`cursor-pointer overflow-hidden rounded-[28px] border bg-white/90 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.5)] transition hover:-translate-y-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${business.premium_activo ? "border-violet-200 hover:shadow-[0_28px_60px_-30px_rgba(139,92,246,0.35)]" : "border-white/80 hover:shadow-[0_28px_60px_-30px_rgba(59,130,246,0.35)]"}`}
                >
                  {imageSrc && (
                    <div className="relative h-36 w-full sm:h-52">
                      <OptimizedImage
                        src={imageSrc}
                        alt={business.nombre}
                        sizes="(max-width: 640px) 50vw, (max-width: 1280px) 25vw, 25vw"
                        quality={60}
                        className="object-cover"
                      />
                    </div>
                  )}

                  <div className="p-4 sm:p-5">
                    <h3 className="text-lg font-semibold leading-tight text-slate-900 sm:text-[22px]">
                      {business.nombre}
                    </h3>
                    {business.descripcion && (
                        <p className="mt-2 line-clamp-2 whitespace-pre-line text-sm text-slate-500 sm:line-clamp-3 sm:text-base">
                          {business.descripcion}
                        </p>
                    )}
                    {business.direccion && (
                      <p className="mt-2 line-clamp-2 text-xs text-slate-500 sm:text-sm">
                        {business.direccion}
                      </p>
                    )}

                      {business.telefono && business.usa_whatsapp !== false ? (
                        <ContactActionLink
                          href={getContactHref(
                            business.telefono,
                          business.usa_whatsapp
                        )}
                        mode="whatsapp"
                        section="comercios"
                        itemId={String(business.id)}
                        itemTitle={business.nombre}
                        onClick={(event) => event.stopPropagation()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-green-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-green-600 sm:mt-5 sm:py-3 sm:text-lg"
                      >
                          <Phone className="h-5 w-5" />
                          WhatsApp
                        </ContactActionLink>
                      ) : (
                        <PrimaryExternalLinkButton
                          webUrl={business.web_url}
                          instagramUrl={business.instagram_url}
                          facebookUrl={business.facebook_url}
                          section="comercios"
                          itemId={String(business.id)}
                          itemTitle={business.nombre}
                          onClick={(event) => event.stopPropagation()}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:border-blue-300 hover:bg-blue-100 sm:mt-5 sm:py-3 sm:text-lg"
                        />
                      )}

                    {business.premium_activo ? (
                      <Link
                        href={`/comercios/${business.id}`}
                        onClick={(event) => {
                          event.stopPropagation()
                          void recordViewMore(
                            "comercios",
                            String(business.id),
                            business.nombre
                          )
                        }}
                        className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-violet-700 transition hover:text-violet-800 sm:text-sm"
                      >
                        Ver perfil completo
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          handleViewMoreClick(
                            "comercios",
                            String(business.id),
                            business.nombre,
                            () => setSelectedComercio(business)
                          )
                        }}
                        className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-blue-500 transition hover:text-blue-600 sm:text-sm"
                      >
                        Ver mas
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section id="servicios" className="order-6 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="text-4xl font-semibold tracking-tight text-slate-900 md:text-5xl">
              Servicios y Profesionales
            </h2>
            <p className="mt-4 text-xl text-slate-500">
              Abogados, escribanos, alojamientos y otros servicios locales
            </p>
            <div className="mt-6">
              <Link
                href="/servicios"
                className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-600"
              >
                Ver todos los servicios
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {servicios.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
              Todavia no hay servicios cargados.
            </div>
          ) : (
            <>
            <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
              {visibleServicios.map((servicio) => (
                <div
                        key={servicio.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          if (servicio.premium_activo) {
                            void recordViewMore("servicios", String(servicio.id), servicio.nombre)
                            router.push(`/servicios/${servicio.id}`)
                            return
                          }

                          handleViewMoreClick(
                            "servicios",
                            String(servicio.id),
                            servicio.nombre,
                            () => setSelectedServicio(servicio)
                          )
                        }}
                        onKeyDown={(event) =>
                          handleCardKeyDown(event, () => {
                            if (servicio.premium_activo) {
                              void recordViewMore("servicios", String(servicio.id), servicio.nombre)
                              router.push(`/servicios/${servicio.id}`)
                              return
                            }

                            handleViewMoreClick(
                              "servicios",
                              String(servicio.id),
                              servicio.nombre,
                              () => setSelectedServicio(servicio)
                            )
                          })
                        }
                        className={`cursor-pointer overflow-hidden rounded-[28px] border bg-white/90 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.45)] transition hover:-translate-y-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${servicio.premium_activo ? "border-violet-200 hover:shadow-[0_28px_60px_-30px_rgba(139,92,246,0.35)]" : "border-white/80 hover:shadow-[0_28px_60px_-30px_rgba(245,158,11,0.35)]"}`}
                      >
                        {servicio.imagen && (
                          <div className="relative h-36 w-full sm:h-48">
                            <OptimizedImage
                              src={servicio.imagen}
                              alt={servicio.nombre}
                              sizes="(max-width: 768px) 50vw, (max-width: 1280px) 25vw, 25vw"
                              quality={60}
                              className="object-cover"
                            />
                          </div>
                        )}

                        <div className="p-4 sm:p-5">
                          {servicio.categoria && (
                            <div className="mb-3 inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                              {servicio.categoria}
                            </div>
                          )}

                          <h3 className="text-lg font-semibold leading-tight text-slate-900 sm:text-xl">
                            {servicio.nombre}
                          </h3>

                          <div className="mt-3 space-y-2 text-xs text-slate-600 sm:mt-4 sm:text-sm">
                            {servicio.responsable && (
                              <div className="flex items-center gap-2">
                                <UserRound className="h-4 w-4" />
                                <span>{servicio.responsable}</span>
                              </div>
                            )}

                            {servicio.contacto && (
                              <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4" />
                                <span>{servicio.contacto}</span>
                              </div>
                            )}

                            {servicio.direccion && (
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4" />
                                <span>{servicio.direccion}</span>
                              </div>
                            )}
                          </div>

                            {servicio.contacto?.trim() &&
                            servicio.usa_whatsapp !== false ? (
                              <ContactActionLink
                                href={getContactHref(
                                  servicio.contacto,
                                servicio.usa_whatsapp
                              )}
                              mode="whatsapp"
                              section="servicios"
                              itemId={String(servicio.id)}
                              itemTitle={servicio.nombre}
                              onClick={(event) => event.stopPropagation()}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-green-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-green-600 sm:mt-5 sm:py-3 sm:text-lg"
                            >
                                <Phone className="h-5 w-5" />
                                WhatsApp
                              </ContactActionLink>
                            ) : (
                              <PrimaryExternalLinkButton
                                webUrl={servicio.web_url}
                                instagramUrl={servicio.instagram_url}
                                facebookUrl={servicio.facebook_url}
                                section="servicios"
                                itemId={String(servicio.id)}
                                itemTitle={servicio.nombre}
                                onClick={(event) => event.stopPropagation()}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-5 py-3 font-semibold text-blue-700 transition hover:border-blue-300 hover:bg-blue-100"
                              />
                            )}

                          {servicio.premium_activo ? (
                            <Link
                              href={`/servicios/${servicio.id}`}
                              onClick={(event) => {
                                event.stopPropagation()
                                void recordViewMore(
                                  "servicios",
                                  String(servicio.id),
                                  servicio.nombre
                                )
                              }}
                              className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-violet-700 transition hover:text-violet-800 sm:text-sm"
                            >
                              Ver perfil completo
                              <ArrowRight className="h-4 w-4" />
                            </Link>
                          ) : (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation()
                                handleViewMoreClick(
                                  "servicios",
                                  String(servicio.id),
                                  servicio.nombre,
                                  () => setSelectedServicio(servicio)
                                )
                              }}
                              className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-blue-500 transition hover:text-blue-600 sm:text-sm"
                            >
                              Ver más
                              <ArrowRight className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
              ))}
            </div>
            {shouldRotateServicios ? (
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <div className="text-sm text-slate-500">
                  Mostrando tanda {scheduledServicePage + 1} de {servicePageCount}
                </div>
                <div className="text-sm text-slate-500">
                  La rotacion cambia cada 48 horas
                </div>
              </div>
            ) : null}
            </>
          )}
        </div>
      </section>

      <section
        id="eventos"
        ref={eventsSectionRef}
        className="order-2 py-16"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <div className="mb-4 inline-flex rounded-full bg-sky-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">
              Novedades
            </div>
            <h2 className="text-4xl font-semibold tracking-tight text-slate-900 md:text-5xl">
              Hoy en Varela
            </h2>
            <p className="mt-4 text-xl text-slate-500">
              Eventos, avisos, promos y sorteos activos
            </p>
            <div className="mt-6">
              <Link
                href="/eventos"
                className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-600"
              >
                Ver todo Hoy en Varela
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {visibleEventos.length === 0 ? (
            <div className="rounded-[28px] border border-slate-200 bg-white/90 p-8 text-center shadow-sm">
              <h3 className="text-xl font-semibold text-slate-900">
                Todavía no hay novedades activas
              </h3>
              <p className="mt-3 text-sm leading-7 text-slate-500">
                Cuando se publiquen eventos, avisos o promos en Hola Varela, van a aparecer en este bloque.
              </p>
              <div className="mt-5">
                <Link
                  href="/usuarios/eventos/nuevo?public=1"
                  className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-5 py-3 text-sm font-semibold text-blue-700 transition hover:border-blue-300 hover:bg-blue-100"
                >
                  Sumar nueva actividad
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {visibleEventos.map((event) => (
                <div
                  key={event.id}
                  role="button"
                  tabIndex={0}
                  onClick={() =>
                    handleViewMoreClick(
                      "eventos",
                      String(event.id),
                      event.titulo,
                      () => setSelectedEvento(event)
                    )
                  }
                  onKeyDown={(eventKey) =>
                    handleCardKeyDown(eventKey, () =>
                      handleViewMoreClick(
                        "eventos",
                        String(event.id),
                        event.titulo,
                        () => setSelectedEvento(event)
                      )
                    )
                  }
                  className={`cursor-pointer overflow-hidden rounded-[28px] border bg-white/95 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.45)] transition hover:-translate-y-1.5 hover:shadow-[0_28px_60px_-30px_rgba(14,165,233,0.35)] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
                    normalizeEventCategory(event.categoria) === "Evento"
                      ? "border-emerald-200/80"
                      : "border-white/80"
                  }`}
                >
                  {event.imagen && (
                    <div className="relative h-64 w-full">
                      <OptimizedImage
                        src={event.imagen}
                        alt={event.titulo}
                        sizes="(max-width: 1024px) 100vw, 33vw"
                        quality={62}
                        className="object-cover"
                      />
                    </div>
                  )}

                  <div className="p-5">
                    <div className="mb-4 flex items-center gap-2 text-lg text-blue-500">
                      <CalendarDays className="h-5 w-5" />
                      <span>{formatEventDateRange(event.fecha, event.fecha_fin, event.fecha_solo_mes ?? false)}</span>
                    </div>

                    <div className="mb-3 inline-flex rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                      {normalizeEventCategory(event.categoria)}
                    </div>

                    <h3 className="text-[22px] font-semibold text-slate-900">
                      {event.titulo}
                    </h3>

                    <p className="mt-2 text-sm text-slate-500">{event.ubicacion}</p>

                    <div className="mt-4" onClick={(eventLikeWrapper) => eventLikeWrapper.stopPropagation()}>
                      <EventLikeButton
                        count={eventLikeCounts[String(event.id)]}
                        liked={Boolean(likedEvents[String(event.id)])}
                        onClick={() => void handleEventLike(String(event.id), event.titulo)}
                        disabled={likingEventId === String(event.id)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-600 transition hover:bg-emerald-100 disabled:cursor-default disabled:opacity-70"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={(eventClick) => {
                        eventClick.stopPropagation()
                        handleViewMoreClick(
                          "eventos",
                          String(event.id),
                          event.titulo,
                          () => setSelectedEvento(event)
                        )
                      }}
                      className="mt-5 inline-flex items-center gap-2 text-lg font-medium text-blue-500 hover:text-blue-600"
                    >
                      Ver más
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section id="cursos" className="order-3 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="text-4xl font-semibold tracking-tight text-slate-900 md:text-5xl">
              Cursos y Clases
            </h2>
            <p className="mt-4 text-xl text-slate-500">
              Propuestas de aprendizaje y formación en la ciudad
            </p>
            <div className="mt-6">
              <Link
                href="/cursos"
                className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-600"
              >
                Ver todos los cursos y clases
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {cursos.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
              Todavia no hay cursos o clases cargados.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
              {visibleCursos.map((curso) => (
                <div
                  key={curso.id}
                  role="button"
                  tabIndex={0}
                  onClick={() =>
                    handleViewMoreClick(
                      "cursos",
                      String(curso.id),
                      curso.nombre,
                      () => setSelectedCurso(curso)
                    )
                  }
                  onKeyDown={(event) =>
                    handleCardKeyDown(event, () =>
                      handleViewMoreClick(
                        "cursos",
                        String(curso.id),
                        curso.nombre,
                        () => setSelectedCurso(curso)
                      )
                    )
                  }
                  className="cursor-pointer overflow-hidden rounded-[28px] border border-white/80 bg-white/90 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.45)] transition hover:-translate-y-1.5 hover:shadow-[0_28px_60px_-30px_rgba(139,92,246,0.35)] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                >
                  <div className="p-4 sm:p-5">
                    <h3 className="text-lg font-semibold leading-tight text-slate-900 sm:text-[22px]">
                      {curso.nombre}
                    </h3>
                      <p className="mt-2 line-clamp-2 whitespace-pre-line text-sm leading-6 text-slate-500 sm:mt-3 sm:line-clamp-3 sm:text-base sm:leading-7">
                        {curso.descripcion}
                      </p>
                    <div className="mt-3 flex items-center gap-2 text-xs text-slate-600 sm:mt-4 sm:text-sm">
                      <GraduationCap className="h-4 w-4" />
                      <span>{curso.responsable}</span>
                    </div>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        handleViewMoreClick(
                          "cursos",
                          String(curso.id),
                          curso.nombre,
                          () => setSelectedCurso(curso)
                        )
                      }}
                      className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-blue-500 transition hover:text-blue-600 sm:mt-5 sm:text-sm"
                    >
                      Ver más
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section id="instituciones" className="order-4 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="text-4xl font-semibold tracking-tight text-slate-900 md:text-5xl">
              Instituciones
            </h2>
            <p className="mt-4 text-xl text-slate-500">
              Espacios y organizaciones de referencia en Jose Pedro Varela
            </p>
            <div className="mt-6">
              <Link
                href="/instituciones"
                className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-cyan-600"
              >
                Ver todas las instituciones
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {instituciones.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
                Todavía no hay instituciones cargadas.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-5">
              {visibleInstituciones.map((institucion) => (
                <div
                  key={institucion.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleInstitutionClick(institucion)}
                  onKeyDown={(event) =>
                    handleCardKeyDown(event, () => handleInstitutionClick(institucion))
                  }
                  className="cursor-pointer overflow-hidden rounded-[28px] border border-white/80 bg-white/90 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.45)] transition hover:-translate-y-1.5 hover:shadow-[0_28px_60px_-30px_rgba(6,182,212,0.35)] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                >
                  <div className="flex items-center gap-3 border-b border-slate-100 bg-[linear-gradient(135deg,#ecfeff_0%,#eff6ff_55%,#f8fafc_100%)] px-4 py-4 sm:px-5">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-cyan-100 bg-white text-cyan-700 shadow-sm">
                      <Building2 className="h-6 w-6" />
                    </div>
                  </div>
                  <div className="p-4 sm:p-5">
                    <h3 className="text-lg font-semibold leading-tight text-slate-900 sm:text-[22px]">
                      {institucion.nombre}
                    </h3>

                    {hasInstitutionPremium(institucion) ? (
                      <Link
                        href={`/instituciones/${institucion.id}`}
                        onClick={(event) => {
                          event.stopPropagation()
                          void recordViewMore("instituciones", String(institucion.id), institucion.nombre)
                          void recordContentVisit("instituciones", String(institucion.id), institucion.nombre)
                        }}
                        className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-violet-600 transition hover:text-violet-700 sm:mt-5 sm:text-sm"
                      >
                        Ver perfil completo
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          handleInstitutionClick(institucion)
                        }}
                        className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-cyan-600 transition hover:text-cyan-700 sm:mt-5 sm:text-sm"
                      >
                        Ver más
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      </div>

      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
            <div>
              <h2 className="text-4xl font-semibold tracking-tight text-slate-900 md:text-5xl">
                {sobreVarela.titulo}
              </h2>

              <div className="mt-8 space-y-6 text-xl leading-10 text-slate-500">
                <p>{sobreVarela.texto_1}</p>
                <p>{sobreVarela.texto_2}</p>
                <p>{sobreVarela.texto_3}</p>
              </div>
            </div>

            {sobreVarela.imagen_url ? (
              <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-slate-100 shadow-lg">
                <div className="relative h-full min-h-[320px] w-full">
                  <OptimizedImage
                    src={sobreVarela.imagen_url}
                    alt={sobreVarela.titulo}
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    className="object-cover"
                  />
                </div>
              </div>
            ) : (
              <div className="flex min-h-[320px] items-center justify-center rounded-[28px] border border-slate-200 bg-slate-100 p-8 text-center shadow-lg">
                <div>
                  <MapPin className="mx-auto h-10 w-10 text-slate-400" />
                  <p className="mt-4 text-lg font-medium text-slate-600">
                    Imagen de Jose Pedro Varela pendiente
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    Cargala desde el panel admin cuando la tengas pronta.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <footer id="contacto" className="mt-6 border-t border-slate-200/80 bg-white/80 py-14 backdrop-blur">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 sm:px-6 md:grid-cols-2 lg:px-8">
          <div>
            <div className="flex items-center gap-3">
              <Image
                src="/logo-varela-chico.png"
                alt="Hola Varela"
                width={40}
                height={40}
                loading="lazy"
                className="h-10 w-auto"
              />
              <span className="text-[28px] font-semibold">Hola Varela!</span>
            </div>

            <p className="mt-6 text-lg leading-8 text-slate-500">
              Portal informativo independiente de Jose Pedro Varela. Tu guia
              digital para todo lo que pasa en la ciudad.
            </p>

          </div>

          <div>
            <h3 className="text-[28px] font-semibold text-slate-900">Contacto</h3>

            <div className="mt-6 space-y-4 text-lg text-slate-500">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-slate-400" />
                <span>holajpvarela@gmail.com</span>
              </div>

              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-slate-400" />
                <span>Jose Pedro Varela, Lavalleja</span>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                {SOCIAL_LINKS.map((item) => (
                  <a
                    key={item.id}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-3 rounded-full border px-4 py-3 text-sm font-semibold transition ${item.className}`}
                  >
                    {item.id === "instagram" ? <InstagramMark /> : <FacebookMark />}
                    <span>{item.label}</span>
                  </a>
                ))}
              </div>

              <button
                type="button"
                onClick={() => {
                  setContactLeadStatus("")
                  setIsContactLeadOpen(true)
                }}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-semibold text-slate-800 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700"
              >
                Quiero estar en Hola Varela
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>

        </div>
      </footer>

      {isSweepstakesHintVisible ? (
        <div className="fixed bottom-5 left-4 right-4 z-[70] sm:bottom-7 sm:left-auto sm:right-7 sm:max-w-[300px] lg:bottom-8 lg:right-8 lg:max-w-[320px]">
          <button
            type="button"
            onClick={() => setIsSweepstakesHintOpen(true)}
            className="w-full rounded-[24px] border border-rose-200 bg-[linear-gradient(135deg,#fff1f5_0%,#ffffff_100%)] px-3 py-3 pr-12 text-left shadow-[0_24px_60px_-24px_rgba(244,63,94,0.4)] transition hover:-translate-y-0.5 hover:shadow-[0_30px_70px_-24px_rgba(244,63,94,0.45)] sm:rounded-[26px] sm:px-4 sm:py-4 lg:px-5 lg:py-4"
            aria-label="Ver como participar del sorteo del 9 de Mayo"
          >
            <div className="flex items-start gap-2.5 sm:gap-3">
              <div className="rounded-2xl bg-rose-100 p-2.5 text-rose-600 sm:p-3">
                <Heart className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-rose-600 sm:text-xs sm:tracking-[0.18em]">
                  9 de Mayo
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-900 sm:text-base">
                  Sorteo con 3 corazones
                </div>
                <p className="mt-1 text-xs leading-5 text-slate-600 sm:text-sm sm:leading-6">
                  Toca aqui y te explicamos como participar.
                </p>
              </div>
            </div>
          </button>
          <button
            type="button"
            onClick={() => {
              setIsSweepstakesHintVisible(false)
              if (typeof window !== "undefined") {
                window.sessionStorage.setItem(
                  SWEEPSTAKES_HINT_DISMISSED_SESSION_KEY,
                  "true"
                )
              }
            }}
            className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full border border-rose-200/80 bg-white/90 text-rose-500 shadow-sm transition hover:border-rose-300 hover:bg-white hover:text-rose-700"
            aria-label="Cerrar aviso del sorteo"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}
    </div>
  )
}

function InstagramMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-current">
      <path d="M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2Zm0 1.75A4 4 0 0 0 3.75 7.75v8.5a4 4 0 0 0 4 4h8.5a4 4 0 0 0 4-4v-8.5a4 4 0 0 0-4-4h-8.5Zm8.94 1.31a1.06 1.06 0 1 1 0 2.12 1.06 1.06 0 0 1 0-2.12ZM12 6.5A5.5 5.5 0 1 1 6.5 12 5.5 5.5 0 0 1 12 6.5Zm0 1.75A3.75 3.75 0 1 0 15.75 12 3.75 3.75 0 0 0 12 8.25Z" />
    </svg>
  )
}

function FacebookMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-current">
      <path d="M13.5 22v-8.2h2.76l.41-3.2H13.5V8.56c0-.93.26-1.56 1.59-1.56H16.8V4.14c-.29-.04-1.28-.14-2.44-.14-2.42 0-4.08 1.48-4.08 4.2v2.4H7.5v3.2h2.78V22h3.22Z" />
    </svg>
  )
}
