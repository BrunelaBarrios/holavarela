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
import { PublicHeader } from "./PublicHeader"
import { ShareButton } from "./ShareButton"
import { formatEventDateRange } from "../lib/eventDates"
import { fetchEventLikes, recordEventLike } from "../lib/eventLikes"
import { parseEventDescription, shouldHideEventDate } from "../lib/eventSubmissionMeta"
import { recordContentVisit, recordHighlightImpression, recordSiteVisit } from "../lib/contentVisits"
import { RADIO_STORAGE_KEY } from "../lib/localStorageKeys"
import { buildHomePublicNav } from "../lib/publicNav"
import { type GoalGameConfig, type GoalGameRankingEntry } from "../lib/goalGame"
import { useSweepstakesPopup } from "../lib/useSweepstakesPopup"
import { recordViewMore, type ViewMoreSection } from "../lib/viewMoreTracking"
import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Cloud,
  CloudDrizzle,
  CloudRain,
  CloudSun,
  Gift,
  GraduationCap,
  Heart,
  Mail,
  MapPin,
  Phone,
  Plus,
  Store,
  Trophy,
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

const SweepstakesPopup = dynamic(
  () => import("./SweepstakesPopup").then((module) => module.SweepstakesPopup),
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
  created_at?: string | null
  ciudad?: string | null
}

const normalizeEventCategory = (categoria?: string | null) => {
  const value = categoria?.trim()
  if (!value || value.toUpperCase() === "NOT NULL") return "Evento"
  if (value.toLowerCase() === "beneficios") return "Beneficio"
  if (value.toLowerCase() === "avisos") return "Aviso"
  return value
}

const isAvisoCategory = (categoria?: string | null) =>
  normalizeEventCategory(categoria).toLowerCase() === "aviso"

const isPromoOrSweepstakesCategory = (categoria?: string | null) => {
  const normalized = normalizeEventCategory(categoria).toLowerCase()
  return (
    normalized === "promocion" ||
    normalized === "promociones" ||
    normalized === "promo" ||
    normalized === "promos" ||
    normalized === "sorteo" ||
    normalized === "sorteos" ||
    normalized === "consulta" ||
    normalized === "consulta comercial" ||
    normalized === "consultas"
  )
}

const sortEventsForHome = (events: Evento[]) =>
  [...events].sort((a, b) => {
    const aHasDate = Boolean(a.fecha)
    const bHasDate = Boolean(b.fecha)

    if (aHasDate && bHasDate) {
      return a.fecha.localeCompare(b.fecha)
    }

    if (aHasDate) return -1
    if (bHasDate) return 1

    const aCreatedAt = a.created_at || ""
    const bCreatedAt = b.created_at || ""
    return bCreatedAt.localeCompare(aCreatedAt)
  })

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
  premium_galeria?: string[] | null
  destacado?: boolean | null
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
  destacado?: boolean | null
  premium_activo?: boolean | null
  plan_suscripcion?: string | null
}

type SobreVarelaConfig = {
  titulo: string
  texto_1: string
  texto_2: string
  texto_3: string
  imagen_url: string | null
  cursos_home_tagline?: string | null
  cursos_home_titulo?: string | null
  cursos_home_texto?: string | null
  cursos_home_boton?: string | null
  cursos_home_imagen_url?: string | null
  instituciones_home_tagline?: string | null
  instituciones_home_titulo?: string | null
  instituciones_home_texto?: string | null
  instituciones_home_boton?: string | null
  instituciones_home_imagen_url?: string | null
  mostrar_juegos_home?: boolean | null
  mostrar_ranking_juego_home?: boolean | null
  mostrar_galeria_home?: boolean | null
  galeria_home?: string[] | null
}

type ChallengeRankingEntry = {
  id: number
  nombre: string
  puntajeTotal: number
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
  nearbyActivities: Evento[]
  cursos: Curso[]
  servicios: Servicio[]
  instituciones: Institucion[]
  allCursos: Curso[]
  allServicios: Servicio[]
  sobreVarela: SobreVarelaConfig
  destacadosHome: HomeHighlightAd[]
  challengeRanking: ChallengeRankingEntry[]
  goalGameConfig: GoalGameConfig
  goalGameRanking: GoalGameRankingEntry[]
  totalEventLikes: number
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
  id: number
  key: string
  kind: "comercio" | "servicio" | "institucion"
  title: string
  image: string | null
  href: string
  delaySeconds: number
}

type HomeHighlightAd = {
  id: number
  image: string
  entityType: "comercio" | "servicio" | "institucion"
  entityId: number
  delaySeconds: number
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
        item.descripcion || "Servicio destacado para descubrir en José Pedro Varela.",
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
    "DescubrÃ­ propuestas educativas y talleres en JosÃ© Pedro Varela. AprendÃ©, desarrollÃ¡ nuevas habilidades y alcanzÃ¡ tus metas.",
  cursos_home_boton: "Ver mÃ¡s cursos y clases",
  cursos_home_imagen_url: null,
  instituciones_home_tagline: "Nuestra comunidad",
  instituciones_home_titulo: "Instituciones",
  instituciones_home_texto:
    "ConocÃ© las instituciones que hacen crecer nuestra ciudad. ExplorÃ¡ organizaciones, entidades y espacios que nos unen.",
  instituciones_home_boton: "Ver mÃ¡s instituciones",
  instituciones_home_imagen_url: null,
  mostrar_juegos_home: true,
  mostrar_ranking_juego_home: false,
  mostrar_galeria_home: false,
  galeria_home: [],
}

const defaultRadioConfig: RadioConfig = {
  title: "Delta FM 88.3",
  description: "Escuchá Delta FM 88.3 en vivo desde José Pedro Varela.",
  streamUrl: "https://radios.com.uy/delta/?utm_source=chatgpt.com",
  isLive: true,
}

const WELCOME_PROMOTION_ENABLED = false
const WELCOME_SESSION_KEY = "guia-varela-welcome-shown-v2"
const WELCOME_LAST_KEY = "guia-varela-last-highlight"
const DELAYED_PROMO_LAST_KEY = "guia-varela-last-delayed-promo"
const initialContactLeadForm: ContactLeadForm = {
  nombre: "",
  telefono: "",
  mensaje: "",
}

function scheduleIdleTask(callback: () => void) {
  if (typeof window === "undefined") return () => {}

  if ("requestIdleCallback" in window) {
    const idleId = window.requestIdleCallback(callback, { timeout: 2500 })
    return () => window.cancelIdleCallback(idleId)
  }

  const timeoutId = globalThis.setTimeout(callback, 600)
  return () => globalThis.clearTimeout(timeoutId)
}

function getSumateTypeFromUrl() {
  if (typeof window === "undefined") return null
  return new URLSearchParams(window.location.search).get("sumate")
}

function getSumateLeadMessage(value: string | null) {
  if (value === "comercio") return "Quiero sumar un comercio a Hola Varela."
  if (value === "servicio") return "Quiero sumar un servicio a Hola Varela."
  if (value === "curso") return "Quiero sumar un curso a Hola Varela."
  if (value === "institucion") return "Quiero sumar una institucion a Hola Varela."
  return ""
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
const MOBILE_ITEMS_PER_ROTATION = 9
const FEATURED_ROTATION_DAYS = 2

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

export function HomePage({
  initialData,
}: {
  initialData: HomePageData
}) {
  const router = useRouter()
  const featuredBusinesses = initialData.featuredBusinesses
  const eventos = initialData.eventos
  const cursos = initialData.cursos
  const servicios = initialData.servicios
  const allCursos = initialData.allCursos
  const allServicios = initialData.allServicios
  const instituciones = initialData.instituciones
  const sobreVarela = initialData.sobreVarela || defaultSobreVarela
  const nearbyActivities = initialData.nearbyActivities || []
  const cursosHome = {
    tagline: sobreVarela.cursos_home_tagline || defaultSobreVarela.cursos_home_tagline || "Aprende y crece",
    titulo: sobreVarela.cursos_home_titulo || defaultSobreVarela.cursos_home_titulo || "Cursos y Clases",
    texto: sobreVarela.cursos_home_texto || defaultSobreVarela.cursos_home_texto || "",
    boton: sobreVarela.cursos_home_boton || defaultSobreVarela.cursos_home_boton || "Ver mÃ¡s cursos y clases",
    imagenUrl: sobreVarela.cursos_home_imagen_url || null,
  }
  const institucionesHome = {
    tagline:
      sobreVarela.instituciones_home_tagline ||
      defaultSobreVarela.instituciones_home_tagline ||
      "Nuestra comunidad",
    titulo:
      sobreVarela.instituciones_home_titulo ||
      defaultSobreVarela.instituciones_home_titulo ||
      "Instituciones",
    texto: sobreVarela.instituciones_home_texto || defaultSobreVarela.instituciones_home_texto || "",
    boton:
      sobreVarela.instituciones_home_boton ||
      defaultSobreVarela.instituciones_home_boton ||
      "Ver mÃ¡s instituciones",
    imagenUrl: sobreVarela.instituciones_home_imagen_url || null,
  }
  const challengeRanking = initialData.challengeRanking || []
  const goalGameConfig = initialData.goalGameConfig
  const goalGameRanking = initialData.goalGameRanking || []
  const totalEventLikes = initialData.totalEventLikes || 0
  const shouldShowGoalGame = goalGameConfig?.activo === true
  const shouldShowGoalGameRanking =
    shouldShowGoalGame &&
    goalGameConfig?.mostrarRankingHome === true &&
    goalGameRanking.length > 0
  const shouldShowHomeGames = sobreVarela.mostrar_juegos_home !== false
  const shouldShowGameRanking =
    sobreVarela.mostrar_ranking_juego_home === true && challengeRanking.length > 0
  const homeGallery = Array.isArray(sobreVarela.galeria_home)
    ? sobreVarela.galeria_home.filter(Boolean).slice(0, 10)
    : []
  const shouldShowHomeGallery =
    sobreVarela.mostrar_galeria_home === true && homeGallery.length > 0
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
  const sweepstakesPopup = useSweepstakesPopup()
  const { loadHomePopupBubble, openHomePopup } = sweepstakesPopup

  useEffect(() => {
    return scheduleIdleTask(() => {
      void recordSiteVisit("home", "Inicio")
    })
  }, [])

  useEffect(() => {
    return scheduleIdleTask(() => {
      void loadHomePopupBubble()
    })
  }, [loadHomePopupBubble])

  const [contactLeadLoading, setContactLeadLoading] = useState(false)
  const [isContactLeadOpen, setIsContactLeadOpen] = useState(false)
  const [isDelayedPromoOpen, setIsDelayedPromoOpen] = useState(false)
  const [welcomeHighlight, setWelcomeHighlight] = useState<WelcomeHighlight | null>(null)
  const [zoomedImage, setZoomedImage] = useState<{ src: string; alt: string } | null>(null)
  const [shouldLoadRadioWidget, setShouldLoadRadioWidget] = useState(false)
  const eventsSectionRef = useRef<HTMLElement | null>(null)
  const radioSectionRef = useRef<HTMLElement | null>(null)
  const selectedCursoImage =
    selectedCurso?.imagen || selectedCurso?.premium_galeria?.[0] || null

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
    () => sliceRotatingItems(featuredBusinesses, scheduledFeaturedBusinessPage, MOBILE_ITEMS_PER_ROTATION),
    [featuredBusinesses, scheduledFeaturedBusinessPage]
  )
  const visibleServicios = useMemo(
    () =>
      shouldRotateServicios
        ? sliceRotatingItems(featuredServiciosForHome, scheduledServicePage, MOBILE_ITEMS_PER_ROTATION)
        : featuredServiciosForHome.slice(0, MOBILE_ITEMS_PER_ROTATION),
    [featuredServiciosForHome, scheduledServicePage, shouldRotateServicios]
  )
  const visiblePrimaryEventos = useMemo(
    () =>
      sortEventsForHome(
        eventos
        .filter(
          (event) =>
            !isAvisoCategory(event.categoria) &&
            !isPromoOrSweepstakesCategory(event.categoria)
        )
      ).slice(0, 6),
    [eventos]
  )
  const visibleAvisoEventos = useMemo(
    () => sortEventsForHome(eventos.filter((event) => isAvisoCategory(event.categoria))).slice(0, 8),
    [eventos]
  )
  const visiblePromoEventos = useMemo(
    () =>
      sortEventsForHome(
        eventos.filter((event) => isPromoOrSweepstakesCategory(event.categoria))
      ).slice(0, 8),
    [eventos]
  )
  const visiblePromoImageEventos = useMemo(
    () => visiblePromoEventos.filter((event) => Boolean(event.imagen)),
    [visiblePromoEventos]
  )
  const visibleCursos = useMemo(() => [] as Curso[], [])
  const visibleInstituciones = useMemo(() => [] as Institucion[], [])
  const delayedPromo = useMemo<DelayedPromo | null>(() => {
    const activeAds = initialData.destacadosHome || []
    if (activeAds.length === 0) return null

    const lastShownKey =
      typeof window === "undefined"
        ? null
        : window.localStorage.getItem(DELAYED_PROMO_LAST_KEY)
    const lastIndex = activeAds.findIndex((item) => `ad:${item.id}` === lastShownKey)
    const ad = activeAds[lastIndex >= 0 ? (lastIndex + 1) % activeAds.length : 0]
    if (!ad?.image) return null

    if (ad.entityType === "comercio") {
      const comercio = featuredBusinesses.find((item) => item.id === ad.entityId)
      return {
        id: ad.id,
        key: `ad:${ad.id}:comercio:${ad.entityId}`,
        kind: "comercio",
        title: comercio?.nombre || "Comercio destacado",
        image: ad.image,
        href: `/comercios/${ad.entityId}`,
        delaySeconds: ad.delaySeconds,
      }
    }

    if (ad.entityType === "servicio") {
      const servicio =
        allServicios.find((item) => item.id === ad.entityId) ||
        servicios.find((item) => item.id === ad.entityId)
      return {
        id: ad.id,
        key: `ad:${ad.id}:servicio:${ad.entityId}`,
        kind: "servicio",
        title: servicio?.nombre || "Servicio destacado",
        image: ad.image,
        href: `/servicios/${ad.entityId}`,
        delaySeconds: ad.delaySeconds,
      }
    }

    const institucion = instituciones.find((item) => item.id === ad.entityId)
    return {
      id: ad.id,
      key: `ad:${ad.id}:institucion:${ad.entityId}`,
      kind: "institucion",
      title: institucion?.nombre || "Institucion destacada",
      image: ad.image,
      href: `/instituciones/${ad.entityId}`,
      delaySeconds: ad.delaySeconds,
    }
  }, [allServicios, featuredBusinesses, initialData.destacadosHome, instituciones, servicios])


  const weather = initialData.weather
  const weatherLabel = weather ? WEATHER_LABELS[weather.weatherCode] || "Clima actual" : null

  useEffect(() => {
    const message = getSumateLeadMessage(getSumateTypeFromUrl())
    if (!message) return

    const timeoutId = window.setTimeout(() => {
      setContactLeadForm((prev) => ({
        ...prev,
        mensaje: message,
      }))
      setIsContactLeadOpen(true)
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [])

  useEffect(() => {
    if (eventos.length === 0) return

    return scheduleIdleTask(() => {
      const eventIds = eventos.map((evento) => String(evento.id))
      void fetchEventLikes(eventIds).then(({ countMap, likedMap }) => {
        setEventLikeCounts(countMap)
        setLikedEvents(likedMap)
      })
    })
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
    if (!delayedPromo?.image || typeof window === "undefined") return

    const timeoutId = window.setTimeout(() => {
      window.localStorage.setItem(DELAYED_PROMO_LAST_KEY, `ad:${delayedPromo.id}`)
      void recordHighlightImpression(String(delayedPromo.id), delayedPromo.title)
      setIsDelayedPromoOpen(true)
    }, delayedPromo.delaySeconds * 1000)

    return () => window.clearTimeout(timeoutId)
  }, [delayedPromo])

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
    setLikedEvents((prev) => ({
      ...prev,
      [eventId]: true,
    }))
    setEventLikeCounts((prev) => ({
      ...prev,
      [eventId]: (prev[eventId] || 0) + 1,
    }))

    const result = await recordEventLike(eventId, eventTitle)

    if (result.status === "exists" || result.status === "error") {
      setEventLikeCounts((prev) => ({
        ...prev,
        [eventId]: Math.max((prev[eventId] || 1) - 1, 0),
      }))
    }

    if (result.status === "error") {
      setLikedEvents((prev) => ({
        ...prev,
        [eventId]: false,
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

    const response = await fetch("/api/contacto", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    const result = (await response.json().catch(() => null)) as
      | { error?: string; message?: string }
      | null

    if (!response.ok) {
      setContactLeadStatus(result?.error || "No pudimos enviar tu solicitud. Proba de nuevo.")
      setContactLeadLoading(false)
      return
    }

    setContactLeadForm(initialContactLeadForm)
    setContactLeadStatus(result?.message || "Recibimos tu mensaje. Te contactaremos a la brevedad.")
    setContactLeadLoading(false)
  }

  const openWelcomeDetail = () => {
    if (!welcomeHighlight) return

    if (welcomeHighlight.kind === "comercio") {
      const comercio = featuredBusinesses.find(
        (item) => `comercio-${item.id}` === welcomeHighlight.key
      )
      if (comercio) {
        if (comercio.premium_activo) {
          void recordViewMore("comercios", String(comercio.id), comercio.nombre)
          void recordContentVisit("comercios", String(comercio.id), comercio.nombre)
          router.push(`/comercios/${comercio.id}`)
          closeWelcomeHighlight()
          return
        }

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
        if (servicio.premium_activo) {
          void recordViewMore("servicios", String(servicio.id), servicio.nombre)
          void recordContentVisit("servicios", String(servicio.id), servicio.nombre)
          router.push(`/servicios/${servicio.id}`)
          closeWelcomeHighlight()
          return
        }

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

  const openDelayedPromoDetail = () => {
    if (!delayedPromo) return

    const [, , , rawId] = delayedPromo.key.split(":")
    if (!rawId) return

    setIsDelayedPromoOpen(false)
    const section =
      delayedPromo.kind === "comercio"
        ? "comercios"
        : delayedPromo.kind === "servicio"
          ? "servicios"
          : "instituciones"

    void recordViewMore(section, rawId, delayedPromo.title)
    void recordContentVisit(section, rawId, delayedPromo.title)
    router.push(delayedPromo.href)
  }

  const contactLeadIntro =
    "Déjanos tu nombre, teléfono y mensaje para responderte."
  const contactLeadSubmitHint =
    "Te vamos a contactar usando el teléfono que nos compartas."
  return (
      <div className="min-h-screen bg-[linear-gradient(180deg,#f8fbff_0%,#f2f7f5_48%,#ffffff_100%)] text-slate-900">
        {sweepstakesPopup.config ? (
          <SweepstakesPopup
            open={sweepstakesPopup.open}
            title={sweepstakesPopup.config.title}
            description={sweepstakesPopup.config.description}
            participants={sweepstakesPopup.config.participants}
            mode={sweepstakesPopup.mode}
            loading={sweepstakesPopup.submitting}
            error={sweepstakesPopup.submitError}
            onClose={sweepstakesPopup.closePopup}
            onSubmit={sweepstakesPopup.submitEntry}
          />
        ) : null}

        {sweepstakesPopup.config && !sweepstakesPopup.open ? (
          <button
            type="button"
            onClick={openHomePopup}
            className="fixed bottom-5 right-4 z-[80] flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-full border border-emerald-100 bg-white px-4 py-3 text-left text-slate-900 shadow-[0_18px_45px_-22px_rgba(15,23,42,0.45)] transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-[0_22px_52px_-24px_rgba(16,185,129,0.45)] sm:bottom-6 sm:right-6"
            aria-label="Ver como participar del sorteo"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <Gift className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-black text-slate-950">
                Sorteo Hola Varela
              </span>
              <span className="block text-xs font-medium text-slate-600">
                Tocá para ver cómo participar
              </span>
            </span>
          </button>
        ) : null}

        {isDelayedPromoOpen && delayedPromo ? (
          <div
            className="fixed inset-0 z-[84] overflow-y-auto bg-slate-950/70 px-3 py-4 sm:p-4"
            onClick={() => setIsDelayedPromoOpen(false)}
          >
            <div className="mx-auto flex min-h-full max-w-4xl items-center justify-center py-2 sm:py-4">
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
                <button
                  type="button"
                  onClick={openDelayedPromoDetail}
                  className="relative block h-[min(78vh,720px)] min-h-[260px] w-full bg-slate-50 sm:min-h-[420px]"
                  aria-label={`Abrir ficha de ${delayedPromo.title}`}
                >
                  {delayedPromo.image ? (
                    <OptimizedImage
                      src={delayedPromo.image}
                      alt={delayedPromo.title}
                      sizes="(max-width: 768px) 96vw, 860px"
                      priority
                      className="object-contain"
                    />
                  ) : null}
                </button>
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
                        aria-label="Ver imagen más grande"
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
                      Teléfono
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
          ...(selectedEvento?.fecha && !shouldHideEventDate(selectedEvento.descripcion, selectedEvento.categoria)
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
                className="inline-flex items-center gap-1.5 rounded-full border border-sky-100 bg-sky-50 px-4 py-3 text-sm font-medium text-sky-600 transition hover:bg-sky-100 disabled:cursor-default disabled:opacity-70"
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

            <div className="grid grid-cols-1 lg:grid-cols-[minmax(280px,0.78fr)_minmax(0,1.22fr)]">
                <div className="bg-[linear-gradient(180deg,#f8fafc_0%,#eef4ff_100%)]">
                  {selectedCursoImage ? (
                    <div className="flex min-h-[260px] w-full items-center justify-center bg-slate-100 p-5 md:min-h-[340px]">
                      <button
                        type="button"
                        onClick={() =>
                          setZoomedImage({
                            src: selectedCursoImage,
                            alt: selectedCurso.nombre,
                          })
                        }
                        className="relative aspect-[4/5] h-[300px] w-full max-w-[430px] overflow-hidden rounded-[24px] border border-white/80 bg-white shadow-[0_18px_45px_-28px_rgba(15,23,42,0.45)] transition hover:scale-[1.01] md:h-[420px]"
                        aria-label="Ver imagen más grande"
                      >
                        <OptimizedImage
                          src={selectedCursoImage}
                          alt={selectedCurso.nombre}
                          sizes="(max-width: 1024px) 100vw, 60vw"
                          className="object-contain p-3 sm:p-4"
                        />
                      </button>
                    </div>
                  ) : (
                  <div className="flex min-h-[260px] items-center justify-center text-slate-400">
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

                {selectedCurso.premium_galeria?.length ? (
                  <div className="mt-6">
                    <div className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                      Galeria
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {selectedCurso.premium_galeria.map((image, index) => (
                        <button
                          key={`${image}-${index}`}
                          type="button"
                          onClick={() =>
                            setZoomedImage({
                              src: image,
                              alt: `${selectedCurso.nombre} ${index + 1}`,
                            })
                          }
                          className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 transition hover:scale-[1.01]"
                        >
                          <OptimizedImage
                            src={image}
                            alt={`${selectedCurso.nombre} ${index + 1}`}
                            sizes="(max-width: 768px) 50vw, 25vw"
                            className="object-contain p-2"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

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

            <div className="grid grid-cols-1 lg:grid-cols-[minmax(280px,0.78fr)_minmax(0,1.22fr)]">
              <div className="bg-[linear-gradient(180deg,#f8fafc_0%,#eef4ff_100%)]">
                {selectedInstitucion.foto ? (
                  <div className="flex min-h-[260px] w-full items-center justify-center bg-slate-100 p-5 md:min-h-[340px]">
                    <button
                      type="button"
                      onClick={() =>
                        setZoomedImage({
                          src: selectedInstitucion.foto!,
                          alt: selectedInstitucion.nombre,
                        })
                      }
                      className="relative aspect-[4/5] h-[300px] w-full max-w-[430px] overflow-hidden rounded-[24px] border border-white/80 bg-white shadow-[0_18px_45px_-28px_rgba(15,23,42,0.45)] transition hover:scale-[1.01] md:h-[420px]"
                      aria-label="Ver imagen más grande"
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
                  <div className="flex min-h-[260px] items-center justify-center bg-[linear-gradient(135deg,#ecfeff_0%,#eff6ff_50%,#f8fafc_100%)] text-slate-500">
                    <div className="flex flex-col items-center text-center">
                      <div className="flex h-20 w-20 items-center justify-center rounded-[28px] border border-cyan-100 bg-white text-cyan-700 shadow-sm">
                        <Building2 className="h-10 w-10" />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 md:p-8">
                <div className="mb-4 inline-flex rounded-full bg-blue-700 px-3 py-1 text-sm font-semibold text-white shadow-sm">
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

      <PublicHeader
        items={buildHomePublicNav()}
        borderClassName="border-white/60"
        backgroundClassName="bg-white/80"
      />

      <aside className="hidden">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-center gap-1 text-center text-xs sm:flex-row sm:gap-1.5">
          <span className="font-medium">
            Sumate como colaborador de Hola Varela y participá por premios mensuales.
          </span>
          <span className="font-medium">Más información:</span>
          <a
            href="https://wa.me/59892715516"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-200 bg-white/80 px-2.5 py-0.5 font-semibold tracking-wide text-emerald-700 transition hover:border-emerald-300 hover:bg-white hover:text-emerald-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
            aria-label="Más información por WhatsApp al 092 715 516"
          >
            <Phone className="h-3 w-3" />
            092 715 516
          </a>
        </div>
      </aside>

      <section
        id="inicio"
        className="relative overflow-hidden bg-[linear-gradient(135deg,#eefaf2_0%,#f7fbff_46%,#eaf4ff_100%)] py-16 md:py-24"
      >
        <div className="absolute inset-0 -z-0 bg-[radial-gradient(circle_at_top_center,rgba(255,255,255,0.86),transparent_38%)]" />
        <div className="absolute left-1/2 top-10 h-48 w-48 -translate-x-1/2 rounded-full bg-blue-200/20 blur-3xl" />
        <div className="absolute bottom-8 left-[12%] h-32 w-32 rounded-full bg-emerald-200/20 blur-3xl" />

        <div className="relative z-10 mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <div className="mx-auto mb-8 inline-flex items-center gap-2 rounded-full border border-blue-200/70 bg-white/80 px-4 py-2 text-sm font-medium text-blue-700 shadow-sm">
            <MapPin className="h-4 w-4" />
            <span>José Pedro Varela, Uruguay</span>
            <span className="sr-only">
            José Pedro Varela, Uruguay
            </span>
          </div>

          <div className="mx-auto max-w-4xl">
            <h1 className="flex flex-col items-center gap-3 text-4xl font-black uppercase leading-[0.95] tracking-normal text-slate-950 sm:justify-center sm:text-6xl lg:text-7xl">
              <span>Cartelera Digital</span>
              <span className="sr-only">
              Cartelera online de José Pedro Varela
              </span>
            </h1>
            <div className="mx-auto mt-5 h-px max-w-md bg-[linear-gradient(90deg,transparent,rgba(37,99,235,0.45),transparent)]" />
            <p className="mt-5 bg-[linear-gradient(90deg,#0f172a_0%,#123d73_42%,#1d4ed8_100%)] bg-clip-text text-3xl font-black tracking-normal text-transparent sm:text-4xl lg:text-5xl">
              José Pedro Varela
            </p>
          </div>

          <p className="mx-auto mt-7 max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl">
            <span>
              Encontrá eventos, cursos, comercios, servicios y novedades de la ciudad
            </span>
            <span className="sr-only">
            Encontrá acá eventos, cursos, servicios y más.
            </span>
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/usuarios/eventos/nuevo?public=1"
              className="inline-flex w-full max-w-xs items-center justify-center gap-3 rounded-2xl bg-[linear-gradient(135deg,#16a34a_0%,#0ea5e9_100%)] px-8 py-4 text-base font-semibold text-white shadow-[0_18px_40px_-20px_rgba(14,165,233,0.85)] ring-1 ring-white/30 transition hover:-translate-y-0.5 hover:shadow-[0_22px_48px_-22px_rgba(22,163,74,0.75)] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 sm:w-auto"
            >
              <Plus className="h-5 w-5 stroke-[3]" />
              Sumar evento
            </Link>
            <button
              onClick={() =>
                document.getElementById("eventos")?.scrollIntoView({ behavior: "smooth" })
              }
              className="inline-flex w-full max-w-xs items-center justify-center gap-3 rounded-2xl bg-slate-950 px-8 py-4 text-base font-semibold text-white shadow-[0_18px_40px_-20px_rgba(15,23,42,0.85)] transition hover:-translate-y-0.5 hover:bg-slate-900 sm:w-auto"
            >
              Hoy en Varela
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </section>

      {shouldShowGoalGame ? (
        <section className="py-4 [content-visibility:auto] [contain-intrinsic-size:260px]">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-4 rounded-2xl border border-cyan-100 bg-[linear-gradient(135deg,#ecfeff_0%,#f8fafc_52%,#ecfdf5_100%)] p-4 shadow-[0_18px_42px_-34px_rgba(8,145,178,0.42)] md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:px-5 md:py-4">
              <div>
                <div className="inline-flex rounded-full bg-white/85 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700 ring-1 ring-cyan-100">
                  {goalGameConfig.titulo}
                </div>
                <h2 className="mt-2 text-xl font-black tracking-normal text-slate-950 sm:text-2xl">
                  {goalGameConfig.textoBanner}
                </h2>
                <p className="mt-1.5 max-w-3xl text-sm leading-6 text-slate-600">
                  Patea penales, suma goles y queda en el ranking local.
                </p>
              </div>
              <Link
                href="/juego-gol"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_-22px_rgba(15,23,42,0.9)] transition hover:-translate-y-0.5 hover:bg-cyan-700 md:w-auto"
              >
                {goalGameConfig.textoBanner}
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>

            {shouldShowGoalGameRanking ? (
              <div className="mt-2 grid gap-2 md:grid-cols-3">
                {goalGameRanking.slice(0, 3).map((entry, index) => (
                  <div
                    key={entry.id}
                    className="rounded-xl border border-white/80 bg-white/90 p-3 shadow-[0_14px_32px_-28px_rgba(15,23,42,0.4)]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-50 text-sm font-black text-cyan-700 ring-1 ring-cyan-100">
                        {index + 1}
                      </span>
                      <span className="rounded-full bg-slate-950 px-3 py-1 text-sm font-bold text-white">
                        {entry.puntaje} pts
                      </span>
                    </div>
                    <div className="mt-2 text-base font-black text-slate-950">
                      {entry.nombre}
                    </div>
                    <div className="text-xs font-medium text-slate-500">
                      Desafio del Gol
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {false && shouldShowHomeGames ? (
        <section className="py-4 [content-visibility:auto] [contain-intrinsic-size:260px]">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-4 rounded-2xl border border-emerald-100 bg-[linear-gradient(135deg,#ecfdf5_0%,#f8fafc_52%,#eff6ff_100%)] p-4 shadow-[0_18px_42px_-34px_rgba(15,118,110,0.42)] md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:px-5 md:py-4">
            <div>
              <div className="inline-flex rounded-full bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700 ring-1 ring-emerald-100">
                Desafío Hola Varela
              </div>
              <h2 className="mt-2 text-xl font-black tracking-normal text-slate-950 sm:text-2xl">
                Jugá, divertite y poné a prueba tus habilidades
              </h2>
              <p className="mt-1.5 max-w-3xl text-sm leading-6 text-slate-600">
                Disfrutá desafíos cortos de memoria, palabras e imágenes. Sumá puntos y superá tu mejor resultado.
              </p>
            </div>
            <Link
              href="/juga-y-gana"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_-22px_rgba(15,23,42,0.9)] transition hover:-translate-y-0.5 hover:bg-emerald-700 md:w-auto"
            >
              Jugar ahora
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
            </div>
        </section>
      ) : null}

      {shouldShowGameRanking ? (
        <section className="py-4 [content-visibility:auto] [contain-intrinsic-size:320px]">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-2xl border border-amber-100 bg-[linear-gradient(135deg,#fff7ed_0%,#f8fafc_54%,#eef2ff_100%)] p-4 shadow-[0_18px_42px_-36px_rgba(217,119,6,0.38)] md:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/85 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-700 ring-1 ring-amber-100">
                    <Trophy className="h-4 w-4" />
                    Top del juego
                  </div>
                  <h2 className="mt-2 text-xl font-black tracking-normal text-slate-950 sm:text-2xl">
                    Los 3 mejores lugares
                  </h2>
                </div>
                <Link
                  href="/juga-y-gana"
                  className="inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_-24px_rgba(15,23,42,0.9)] transition hover:-translate-y-0.5 hover:bg-amber-700 sm:w-auto"
                >
                  Jugar ahora
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="mt-3 grid gap-2 md:grid-cols-3">
                {challengeRanking.slice(0, 3).map((entry, index) => (
                  <div
                    key={entry.id}
                    className="rounded-xl border border-white/80 bg-white/90 p-3 shadow-[0_14px_32px_-28px_rgba(15,23,42,0.4)]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-sm font-black text-amber-700 ring-1 ring-amber-100">
                        {index + 1}
                      </span>
                      <span className="rounded-full bg-slate-950 px-3 py-1 text-sm font-bold text-white">
                        {entry.puntajeTotal} pts
                      </span>
                    </div>
                    <div className="mt-2 text-base font-black text-slate-950">
                      {entry.nombre}
                    </div>
                    <div className="text-xs font-medium text-slate-500">
                      Puesto {index + 1}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {weather && (
        <section className="py-6 [content-visibility:auto] [contain-intrinsic-size:190px]">
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
                  Clima en José Pedro Varela
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
        <section ref={radioSectionRef} className="py-6 [content-visibility:auto] [contain-intrinsic-size:280px]">
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

      <section id="comercios" className="order-5 py-18 [content-visibility:auto] [contain-intrinsic-size:760px]">
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

          <div className="grid grid-cols-3 gap-2 sm:gap-4 xl:grid-cols-4">
            {visibleFeaturedBusinesses.map((business, index) => {
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
                  aria-label={`Ver mas de ${business.nombre}`}
                  className={`cursor-pointer overflow-hidden rounded-2xl border bg-white [content-visibility:auto] [contain-intrinsic-size:160px] shadow-[0_14px_32px_-24px_rgba(15,23,42,0.5)] transition hover:-translate-y-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 sm:rounded-[28px] ${index >= ITEMS_PER_ROTATION ? "xl:hidden" : ""} ${business.premium_activo ? "border-violet-200 hover:shadow-[0_28px_60px_-30px_rgba(139,92,246,0.35)]" : "border-white/80 hover:shadow-[0_28px_60px_-30px_rgba(59,130,246,0.35)]"}`}
                >
                  {imageSrc ? (
                    <div className="relative aspect-square w-full bg-white">
                      <OptimizedImage
                        src={imageSrc}
                        alt={business.nombre}
                        sizes="(max-width: 640px) 33vw, (max-width: 1280px) 25vw, 25vw"
                        quality={60}
                        className="object-contain p-2 sm:p-3"
                      />
                    </div>
                  ) : (
                    <div className="flex aspect-square w-full items-center justify-center bg-slate-50 text-slate-300">
                      <Store className="h-8 w-8 sm:h-10 sm:w-10" />
                    </div>
                  )}

                  <div className="hidden">
                    <h3 className="text-lg font-semibold leading-tight text-slate-900 sm:text-[22px]">
                      {business.nombre}
                    </h3>

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
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section id="servicios" className="order-6 py-16 [content-visibility:auto] [contain-intrinsic-size:760px]">
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
              Todavía no hay servicios cargados.
            </div>
          ) : (
            <>
            <div className="grid grid-cols-3 gap-2 sm:gap-4 xl:grid-cols-4">
              {visibleServicios.map((servicio, index) => (
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
                        aria-label={`Ver mas de ${servicio.nombre}`}
                        className={`cursor-pointer overflow-hidden rounded-2xl border bg-white [content-visibility:auto] [contain-intrinsic-size:160px] shadow-[0_14px_32px_-24px_rgba(15,23,42,0.45)] transition hover:-translate-y-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 sm:rounded-[28px] ${index >= ITEMS_PER_ROTATION ? "xl:hidden" : ""} ${servicio.premium_activo ? "border-violet-200 hover:shadow-[0_28px_60px_-30px_rgba(139,92,246,0.35)]" : "border-white/80 hover:shadow-[0_28px_60px_-30px_rgba(245,158,11,0.35)]"}`}
                      >
                        {servicio.imagen ? (
                          <div className="relative aspect-square w-full bg-white">
                            <OptimizedImage
                              src={servicio.imagen}
                              alt={servicio.nombre}
                              sizes="(max-width: 768px) 33vw, (max-width: 1280px) 25vw, 25vw"
                              quality={60}
                              className="object-contain p-2 sm:p-3"
                            />
                          </div>
                        ) : (
                          <div className="flex aspect-square w-full items-center justify-center bg-slate-50 text-slate-300">
                            <BriefcaseBusiness className="h-8 w-8 sm:h-10 sm:w-10" />
                          </div>
                        )}

                        <div className="hidden">
                          <h3 className="text-lg font-semibold leading-tight text-slate-900 sm:text-xl">
                            {servicio.nombre}
                          </h3>

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
                          ) : null}
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
        className="order-2 py-16 [content-visibility:auto] [contain-intrinsic-size:920px]"
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
              Eventos, aviso, promos y sorteos activos
            </p>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/eventos"
                className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-600"
              >
                Ver todo Hoy en Varela
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {visiblePrimaryEventos.length === 0 &&
          visibleAvisoEventos.length === 0 &&
          visiblePromoEventos.length === 0 ? (
            <div className="rounded-[28px] border border-slate-200 bg-white/90 p-8 text-center shadow-sm">
              <h3 className="text-xl font-semibold text-slate-900">
                Todavía no hay novedades activas
              </h3>
              <p className="mt-3 text-sm leading-7 text-slate-500">
                Cuando se publiquen eventos, aviso o promos en Hola Varela, van a aparecer en este bloque.
              </p>
            </div>
          ) : (
            <div className="space-y-10">
              <section className="space-y-5">
                <div className="rounded-[28px] border border-emerald-100 bg-[linear-gradient(135deg,#ecfdf5_0%,#f6fbff_70%,#ffffff_100%)] p-6">
                  <h3 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                    Eventos y Beneficios
                  </h3>
                </div>

                {visiblePrimaryEventos.length === 0 ? (
                  <div className="rounded-[28px] border border-slate-200 bg-white/90 p-8 text-center shadow-sm">
                    <h3 className="text-xl font-semibold text-slate-900">
                      No hay eventos ni beneficios activos
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-slate-500">
                      Cuando se publiquen novedades de ese tipo en Hola Varela, van a mostrarse primero en este bloque.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 lg:gap-6">
                    {visiblePrimaryEventos.map((event) => (
                      <HomeEventCard
                        key={event.id}
                        event={event}
                        count={eventLikeCounts[String(event.id)]}
                        liked={Boolean(likedEvents[String(event.id)])}
                        disabled={likingEventId === String(event.id)}
                        onLike={() => void handleEventLike(String(event.id), event.titulo)}
                        onOpen={() =>
                          handleViewMoreClick(
                            "eventos",
                            String(event.id),
                            event.titulo,
                            () => setSelectedEvento(event)
                          )
                        }
                        onCardKeyDown={handleCardKeyDown}
                      />
                    ))}
                  </div>
                )}
              </section>

              <section className="space-y-5">
                <div className="rounded-[28px] border border-cyan-100 bg-[linear-gradient(135deg,#ecfeff_0%,#eff6ff_60%,#ffffff_100%)] p-6">
                  <h3 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                    Avisos importantes
                  </h3>
                </div>

                {visibleAvisoEventos.length === 0 ? (
                  <div className="rounded-[28px] border border-slate-200 bg-white/90 p-8 text-center shadow-sm">
                    <h3 className="text-xl font-semibold text-slate-900">
                      No hay avisos activos
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-slate-500">
                      Cuando se publique un aviso activo en Hola Varela, va a verse en esta fila propia.
                    </p>
                  </div>
                ) : (
                  <div className="-mx-4 overflow-x-auto px-4 pb-3 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
                    <div className="flex min-w-full snap-x snap-mandatory gap-4 lg:gap-6">
                      {visibleAvisoEventos.map((event) => (
                        <HomeEventCard
                          key={event.id}
                          event={event}
                          className="w-[78vw] shrink-0 snap-start sm:w-[22rem] lg:w-[calc((100%_-_3rem)/3)]"
                          count={eventLikeCounts[String(event.id)]}
                          liked={Boolean(likedEvents[String(event.id)])}
                          disabled={likingEventId === String(event.id)}
                          onLike={() => void handleEventLike(String(event.id), event.titulo)}
                          onOpen={() =>
                            handleViewMoreClick(
                              "eventos",
                              String(event.id),
                              event.titulo,
                              () => setSelectedEvento(event)
                            )
                          }
                          onCardKeyDown={handleCardKeyDown}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </section>

              <section className="space-y-5">
                <div className="rounded-[28px] border border-amber-100 bg-[linear-gradient(135deg,#fff7ed_0%,#fff1f2_55%,#ffffff_100%)] p-6">
                  <h3 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                    Promociones, Sorteos y Consultas
                  </h3>
                </div>

                {visiblePromoImageEventos.length === 0 ? (
                  <div className="rounded-[28px] border border-slate-200 bg-white/90 p-8 text-center shadow-sm">
                    <h3 className="text-xl font-semibold text-slate-900">
                      No hay promociones ni sorteos activos
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-slate-500">
                      Cuando haya promociones o sorteos publicados en Hola Varela, se van a mostrar en este bloque separado.
                    </p>
                  </div>
                ) : (
                  <div className="-mx-4 overflow-x-auto px-4 pb-3 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
                    <div className="flex min-w-full snap-x snap-mandatory gap-4 lg:gap-6">
                      {visiblePromoImageEventos.map((event) => (
                        <HomePromoImageCard
                          key={event.id}
                          event={event}
                          onOpen={() =>
                            handleViewMoreClick(
                              "eventos",
                              String(event.id),
                              event.titulo,
                              () => setSelectedEvento(event)
                            )
                          }
                          onCardKeyDown={handleCardKeyDown}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </section>

      <section id="cursos" className="order-3 py-8 [content-visibility:auto] [contain-intrinsic-size:430px] sm:py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-[28px] border border-violet-100/70 bg-[linear-gradient(135deg,#faf8ff_0%,#ffffff_58%,#f7f2ff_100%)] p-7 shadow-[0_18px_48px_-38px_rgba(88,28,135,0.32)] sm:rounded-[34px] sm:p-10 lg:p-12">
            <div className="absolute right-0 top-0 h-full w-3/5 bg-[radial-gradient(circle_at_72%_35%,rgba(139,92,246,0.1),transparent_36%),radial-gradient(circle_at_42%_85%,rgba(196,181,253,0.14),transparent_40%)]" />
            <div className="relative grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
              <div>
                <div className="inline-flex items-center gap-3 text-sm font-black uppercase tracking-[0.16em] text-violet-700">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                    <GraduationCap className="h-6 w-6" />
                  </span>
                  {cursosHome.tagline}
                </div>
                <h2 className="mt-5 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
                  {cursosHome.titulo}
                </h2>
                <p className="mt-5 max-w-xl text-base leading-8 text-slate-600 sm:text-lg">
                  {cursosHome.texto}
                </p>
                <p className="hidden">
                  Descubrí propuestas educativas y talleres en José Pedro Varela. Aprendé, desarrollá nuevas habilidades y alcanzá tus metas.
                </p>
                <Link
                  href="/cursos"
                  className="mt-7 inline-flex items-center justify-center gap-3 rounded-full bg-violet-600 px-7 py-3.5 text-[0px] font-bold text-white shadow-[0_14px_28px_-22px_rgba(109,40,217,0.65)] transition hover:-translate-y-0.5 hover:bg-violet-700"
                >
                  <span className="text-sm">{cursosHome.boton}</span>
                  Ver más cursos y clases
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </div>
              <div className="relative hidden min-h-[230px] lg:block">
                {cursosHome.imagenUrl ? (
                  <div className="absolute inset-0 z-20 overflow-hidden rounded-[28px]">
                    <OptimizedImage
                      src={cursosHome.imagenUrl}
                      alt={cursosHome.titulo}
                      sizes="(max-width: 1024px) 0px, 50vw"
                      quality={72}
                      className="object-contain p-4"
                    />
                  </div>
                ) : null}
                <div className="absolute bottom-4 left-16 h-20 w-36 rounded-xl border-2 border-violet-300 bg-white/70 shadow-sm" />
                <div className="absolute bottom-12 left-28 h-20 w-56 rotate-3 rounded-xl border-2 border-violet-300 bg-white/80 shadow-sm" />
                <div className="absolute bottom-8 right-24 h-32 w-56 -rotate-3 rounded-2xl border-2 border-violet-400 bg-violet-200/60 shadow-sm">
                  <div className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />
                </div>
                <GraduationCap className="absolute right-6 top-4 h-24 w-24 text-violet-700/25" />
                <div className="absolute right-36 top-4 flex h-16 w-16 items-center justify-center rounded-full border-2 border-violet-300 bg-yellow-100 text-violet-900">
                  <span className="text-3xl">✦</span>
                </div>
                <div className="absolute bottom-0 right-64 h-2 w-28 rotate-[-10deg] rounded-full bg-violet-700/55" />
                <div className="absolute left-6 top-12 h-28 w-14 rounded-full bg-violet-400/70" />
                <div className="absolute left-16 top-20 h-24 w-10 rounded-full bg-violet-700/80" />
                <span className="absolute left-2 top-4 text-3xl font-light text-violet-500">+</span>
                <span className="absolute right-2 bottom-10 h-3 w-3 rounded-full border-2 border-violet-400" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="instituciones" className="order-4 py-8 [content-visibility:auto] [contain-intrinsic-size:450px] sm:py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-[28px] border border-emerald-100/70 bg-[linear-gradient(135deg,#f9fffc_0%,#ffffff_58%,#f1fbf6_100%)] p-7 shadow-[0_18px_48px_-38px_rgba(6,95,70,0.3)] sm:rounded-[34px] sm:p-10 lg:p-12">
            <div className="absolute right-0 top-0 h-full w-3/5 bg-[radial-gradient(circle_at_68%_40%,rgba(16,185,129,0.08),transparent_36%),radial-gradient(circle_at_40%_88%,rgba(167,243,208,0.2),transparent_40%)]" />
            <div className="relative grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
              <div>
                <div className="inline-flex items-center gap-3 text-sm font-black uppercase tracking-[0.16em] text-emerald-700">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                    <Building2 className="h-6 w-6" />
                  </span>
                  {institucionesHome.tagline}
                </div>
                <h2 className="mt-5 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
                  {institucionesHome.titulo}
                </h2>
                <p className="mt-5 max-w-xl text-base leading-8 text-slate-600 sm:text-lg">
                  {institucionesHome.texto}
                </p>
                <p className="hidden">
                  Conocé las instituciones que hacen crecer nuestra ciudad. Explorá organizaciones, entidades y espacios que nos unen.
                </p>
                <Link
                  href="/instituciones"
                  className="mt-7 inline-flex items-center justify-center gap-3 rounded-full bg-emerald-600 px-7 py-3.5 text-[0px] font-bold text-white shadow-[0_14px_28px_-22px_rgba(5,150,105,0.62)] transition hover:-translate-y-0.5 hover:bg-emerald-700"
                >
                  <span className="text-sm">{institucionesHome.boton}</span>
                  Ver más instituciones
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </div>
              <div className="relative hidden min-h-[250px] lg:block">
                {institucionesHome.imagenUrl ? (
                  <div className="absolute inset-0 z-20 overflow-hidden rounded-[28px]">
                    <OptimizedImage
                      src={institucionesHome.imagenUrl}
                      alt={institucionesHome.titulo}
                      sizes="(max-width: 1024px) 0px, 50vw"
                      quality={72}
                      className="object-contain p-4"
                    />
                  </div>
                ) : null}
                <div className="absolute bottom-4 left-36 h-40 w-72 rounded-t-[34px] border-2 border-emerald-500/45 bg-white/65" />
                <div className="absolute bottom-4 left-48 h-28 w-48 border-x-2 border-t-2 border-emerald-500/45 bg-emerald-50/80" />
                <div className="absolute bottom-4 left-[17.5rem] h-20 w-12 rounded-t-full border-2 border-emerald-600/55 bg-emerald-100" />
                <div className="absolute bottom-32 left-[18.1rem] h-10 w-10 rounded-full border-2 border-emerald-600/55 bg-white/70" />
                <div className="absolute bottom-44 left-[19rem] h-12 w-1 bg-emerald-700/60" />
                <div className="absolute bottom-52 left-[19rem] h-8 w-16 rounded-r-full border border-emerald-600/60 bg-emerald-100" />
                <div className="absolute bottom-4 left-10 h-28 w-16 rounded-full bg-emerald-500/65" />
                <div className="absolute bottom-4 right-16 h-32 w-20 rounded-full bg-emerald-500/55" />
                <div className="absolute bottom-4 right-0 h-14 w-36 rounded-t-2xl border-2 border-amber-700/45 bg-amber-100/70" />
                <Cloud className="absolute right-24 top-8 h-20 w-20 text-emerald-700/35" />
                <span className="absolute left-20 top-14 h-5 w-5 rounded-full border-2 border-emerald-500" />
                <span className="absolute right-8 top-24 text-3xl font-light text-emerald-600">+</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="cursos-anterior" className="hidden">
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
              Todavía no hay cursos o clases cargados.
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:gap-4 xl:grid-cols-4">
              {visibleCursos.map((curso, index) => (
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
                  className={`cursor-pointer overflow-hidden rounded-2xl border border-white/80 bg-white/90 shadow-[0_14px_32px_-24px_rgba(15,23,42,0.45)] transition hover:-translate-y-1 hover:shadow-[0_28px_60px_-30px_rgba(34,197,94,0.3)] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 sm:rounded-[28px] ${index >= 3 ? "hidden xl:block" : ""}`}
                >
                  <div className="flex items-center gap-3 border-b border-emerald-950/20 bg-emerald-800 px-3 py-3 sm:px-5 sm:py-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/95 text-emerald-700 shadow-sm sm:h-12 sm:w-12 sm:rounded-2xl">
                      <GraduationCap className="h-5 w-5 sm:h-6 sm:w-6" />
                    </div>
                  </div>
                  <div className="p-3 sm:p-5">
                    <h3 className="line-clamp-3 text-sm font-semibold leading-tight text-slate-900 sm:text-[22px]">
                      {curso.nombre}
                    </h3>
                    <p className="mt-2 hidden overflow-hidden whitespace-pre-line text-sm leading-6 text-slate-500 sm:mt-3 sm:block sm:max-h-[5.25rem] sm:text-base sm:leading-7">
                      {curso.descripcion}
                    </p>
                    <div className="mt-3 hidden items-center gap-2 text-xs text-slate-600 sm:mt-4 sm:flex sm:text-sm">
                      <GraduationCap className="h-4 w-4" />
                      <span>{curso.responsable}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section id="instituciones-anterior" className="hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="text-4xl font-semibold tracking-tight text-slate-900 md:text-5xl">
              Instituciones
            </h2>
            <p className="mt-4 text-xl text-slate-500">
              Espacios y organizaciones de referencia en José Pedro Varela
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
            <div className="grid grid-cols-3 gap-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-5">
              {visibleInstituciones.map((institucion, index) => (
                <div
                  key={institucion.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleInstitutionClick(institucion)}
                  onKeyDown={(event) =>
                    handleCardKeyDown(event, () => handleInstitutionClick(institucion))
                  }
                  className={`cursor-pointer overflow-hidden rounded-2xl border border-white/80 bg-white/90 shadow-[0_14px_32px_-24px_rgba(15,23,42,0.45)] transition hover:-translate-y-1 hover:shadow-[0_28px_60px_-30px_rgba(6,182,212,0.35)] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 sm:rounded-[28px] ${index >= 3 ? "hidden xl:block" : ""}`}
                >
                  <div className="flex items-center gap-3 border-b border-blue-950/20 bg-blue-900 px-3 py-3 sm:px-5 sm:py-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/95 text-blue-700 shadow-sm sm:h-12 sm:w-12 sm:rounded-2xl">
                      <Building2 className="h-5 w-5 sm:h-6 sm:w-6" />
                    </div>
                  </div>
                  <div className="p-3 sm:p-5">
                    <h3 className="line-clamp-3 text-sm font-semibold leading-tight text-slate-900 sm:text-[22px]">
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
                        className="mt-4 hidden items-center gap-2 text-xs font-semibold text-violet-600 transition hover:text-violet-700 sm:mt-5 sm:inline-flex sm:text-sm"
                      >
                        Ver perfil completo
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      </div>

      {nearbyActivities.length > 0 ? (
        <section className="border-y border-emerald-100/80 bg-white/70 py-10 [content-visibility:auto] [contain-intrinsic-size:430px] sm:py-12">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-600">
                  Para descubrir en la región
                </div>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                  Actividades de ciudades cercanas
                </h2>
              </div>
              <span className="hidden text-sm text-slate-500 sm:block">
                Deslizá para ver más →
              </span>
            </div>

            <div className="-mx-4 overflow-x-auto px-4 pb-3 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
              <div className="flex min-w-full snap-x snap-mandatory gap-4 lg:gap-5">
                {nearbyActivities.map((activity) => (
                  <Link
                    key={activity.id}
                    href={`/eventos/${activity.id}`}
                    onClick={() => {
                      void recordViewMore("eventos", String(activity.id), activity.titulo)
                      void recordContentVisit("eventos", String(activity.id), activity.titulo)
                    }}
                    className="group w-[78vw] max-w-[330px] shrink-0 snap-start overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-[0_18px_42px_-30px_rgba(15,23,42,0.55)] transition hover:-translate-y-1 hover:border-emerald-200 hover:shadow-[0_24px_52px_-30px_rgba(16,185,129,0.35)] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 sm:w-[310px] lg:w-[calc((100%_-_3.75rem)/4)]"
                    aria-label={`Ver más sobre ${activity.titulo}`}
                  >
                    <div className="relative aspect-[16/10] bg-slate-100">
                      {activity.imagen ? (
                        <OptimizedImage
                          src={activity.imagen}
                          alt={activity.titulo}
                          sizes="(max-width: 640px) 78vw, 330px"
                          quality={68}
                          className="object-cover transition duration-500 group-hover:scale-[1.03]"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-emerald-600">
                          <CalendarDays className="h-10 w-10" />
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="line-clamp-2 text-lg font-bold leading-snug text-slate-950">
                        {activity.titulo}
                      </h3>
                      <div className="mt-3 space-y-2 text-sm text-slate-600">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 shrink-0 text-emerald-600" />
                          <span className="truncate">{activity.ciudad || activity.ubicacion}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CalendarDays className="h-4 w-4 shrink-0 text-emerald-600" />
                          <span>
                            {formatEventDateRange(
                              activity.fecha,
                              activity.fecha_fin,
                              activity.fecha_solo_mes ?? false
                            )}
                          </span>
                        </div>
                      </div>
                      <span className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-emerald-700">
                        Ver más
                        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {shouldShowHomeGallery ? (
        <section className="border-y border-sky-100 bg-white/75 py-8 [content-visibility:auto] [contain-intrinsic-size:380px] sm:py-10">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-600">
                  Imágenes de nuestra comunidad
                </div>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                  Galería Hola Varela
                </h2>
              </div>
              <span className="hidden text-sm text-slate-500 sm:block">Deslizá para ver más →</span>
            </div>
            <div className="-mx-4 overflow-x-auto px-4 pb-3 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
              <div className="flex min-w-full snap-x snap-mandatory gap-4 lg:gap-6">
                {homeGallery.map((image, index) => (
                  <button
                    key={`${index}-${image.slice(0, 32)}`}
                    type="button"
                    onClick={() => setZoomedImage({ src: image, alt: `Galería Hola Varela ${index + 1}` })}
                    className="relative aspect-[4/3] w-[82vw] shrink-0 snap-start overflow-hidden rounded-2xl bg-slate-100 [content-visibility:auto] [contain-intrinsic-size:320px] shadow-[0_18px_42px_-30px_rgba(15,23,42,0.55)] ring-1 ring-slate-200 transition hover:-translate-y-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 sm:w-[24rem] lg:w-[calc((100%_-_3rem)/3)]"
                    aria-label={`Ampliar foto ${index + 1} de la galería`}
                  >
                    <OptimizedImage
                      src={image}
                      alt={`Galería Hola Varela ${index + 1}`}
                      sizes="(max-width: 640px) 82vw, (max-width: 1024px) 24rem, 33vw"
                      quality={68}
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section className="py-16 [content-visibility:auto] [contain-intrinsic-size:560px]">
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
                    Imagen de José Pedro Varela pendiente
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

      <section className="py-10 [content-visibility:auto] [contain-intrinsic-size:260px]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-[28px] border border-sky-100 bg-[linear-gradient(135deg,#eff6ff_0%,#f0f9ff_55%,#ffffff_100%)] px-6 py-8 text-center shadow-[0_20px_55px_-38px_rgba(14,165,233,0.45)]">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white text-sky-500 shadow-sm">
              <Heart className="h-7 w-7 fill-current" />
            </div>
            <h2 className="mt-5 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              Gracias por tu apoyo
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
              La comunidad ya regaló{" "}
              <span className="font-semibold text-sky-600">
                {totalEventLikes.toLocaleString("es-UY")} corazones
              </span>{" "}
              a eventos y propuestas de Hola Varela.
            </p>
          </div>
        </div>
      </section>

      <aside className="px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-2 overflow-hidden rounded-full border border-emerald-100/80 bg-white/70 px-4 py-2 text-center text-xs text-slate-500 shadow-[0_10px_28px_-24px_rgba(15,23,42,0.35)] sm:flex-row sm:text-left">
          <div className="w-full overflow-hidden sm:flex-1" aria-label="Sumate como colaborador de Hola Varela y participa por premios mensuales.">
            <div className="hola-varela-marquee flex w-max min-w-full items-center gap-7 whitespace-nowrap font-medium">
              <span>Sumate como colaborador de Hola Varela y participá por premios mensuales.</span>
              <span aria-hidden="true">Sumate como colaborador de Hola Varela y participá por premios mensuales.</span>
              <span aria-hidden="true">Sumate como colaborador de Hola Varela y participá por premios mensuales.</span>
              <span aria-hidden="true">Sumate como colaborador de Hola Varela y participá por premios mensuales.</span>
            </div>
          </div>
          <p className="hidden">
            Sumate como colaborador de Hola Varela y participá por premios mensuales.
          </p>
          <a
            href="https://wa.me/59892715516"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50/70 px-3 py-1.5 text-xs font-semibold tracking-wide text-emerald-700 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
            aria-label="Más información por WhatsApp al 092 715 516"
          >
            <Phone className="h-3.5 w-3.5" />
            092 715 516
          </a>
        </div>
      </aside>

      <footer id="contacto" className="mt-6 border-t border-slate-200/80 bg-white/80 py-14 [content-visibility:auto] [contain-intrinsic-size:420px] backdrop-blur">
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
              Portal informativo independiente de José Pedro Varela. Tu guía
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
                <span>José Pedro Varela, Lavalleja</span>
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

function HomeEventCard({
  event,
  count,
  liked,
  disabled,
  onLike,
  onOpen,
  onCardKeyDown,
  className = "",
}: {
  event: Evento
  count?: number
  liked: boolean
  disabled: boolean
  onLike: () => void
  onOpen: () => void
  onCardKeyDown: (event: KeyboardEvent<HTMLElement>, action: () => void) => void
  className?: string
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(eventKey) => onCardKeyDown(eventKey, onOpen)}
      className={`group cursor-pointer overflow-hidden rounded-[24px] border bg-white [content-visibility:auto] [contain-intrinsic-size:390px] shadow-[0_18px_42px_-30px_rgba(15,23,42,0.55)] transition hover:-translate-y-1 hover:shadow-[0_24px_52px_-30px_rgba(14,165,233,0.32)] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${className} ${
        normalizeEventCategory(event.categoria) === "Evento"
          ? "border-emerald-200/80 hover:border-emerald-300"
          : "border-slate-200/80 hover:border-sky-200"
      }`}
    >
      <div className="relative aspect-[16/10] bg-slate-100">
        {event.imagen ? (
          <OptimizedImage
            src={event.imagen}
            alt={event.titulo}
            sizes="(max-width: 1024px) 100vw, 33vw"
            quality={62}
            className="object-cover transition duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sky-600">
            <CalendarDays className="h-10 w-10" />
          </div>
        )}

        <div className="absolute left-3 top-3 inline-flex rounded-full bg-white/90 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-sky-700 shadow-sm backdrop-blur">
          {normalizeEventCategory(event.categoria)}
        </div>
      </div>

      <div className="p-4 sm:p-5">
        <h3 className="line-clamp-2 text-lg font-bold leading-snug text-slate-950 sm:text-xl">
          {event.titulo}
        </h3>

        <div className="mt-3 space-y-2 text-sm text-slate-600">
          {event.ubicacion ? (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0 text-sky-600" />
              <span className="truncate">{event.ubicacion}</span>
            </div>
          ) : null}
          {!shouldHideEventDate(event.descripcion, event.categoria) ? (
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 shrink-0 text-sky-600" />
              <span>
                {formatEventDateRange(event.fecha, event.fecha_fin, event.fecha_solo_mes ?? false)}
              </span>
            </div>
          ) : null}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3" onClick={(eventLikeWrapper) => eventLikeWrapper.stopPropagation()}>
          <EventLikeButton
            count={count}
            liked={liked}
            onClick={onLike}
            disabled={disabled}
            className="inline-flex items-center gap-1.5 rounded-full border border-sky-100 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 transition hover:bg-sky-100 disabled:cursor-default disabled:opacity-70"
          />
          <span className="inline-flex items-center gap-1.5 text-sm font-bold text-sky-700">
            Ver m&aacute;s
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
          </span>
        </div>

      </div>
    </div>
  )
}

function HomePromoImageCard({
  event,
  onOpen,
  onCardKeyDown,
}: {
  event: Evento
  onOpen: () => void
  onCardKeyDown: (event: KeyboardEvent<HTMLElement>, action: () => void) => void
}) {
  if (!event.imagen) return null

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Ver ${event.titulo}`}
      onClick={onOpen}
      onKeyDown={(eventKey) => onCardKeyDown(eventKey, onOpen)}
      className="group relative aspect-[4/5] w-[72vw] shrink-0 snap-start cursor-pointer overflow-hidden rounded-2xl bg-slate-100 [content-visibility:auto] [contain-intrinsic-size:520px] shadow-[0_18px_42px_-30px_rgba(15,23,42,0.7)] outline-none ring-1 ring-slate-200 transition hover:-translate-y-1 hover:shadow-[0_28px_60px_-34px_rgba(15,23,42,0.65)] focus-visible:ring-2 focus-visible:ring-amber-400 sm:w-72 lg:w-80"
    >
      <OptimizedImage
        src={event.imagen}
        alt={event.titulo}
        sizes="(max-width: 640px) 72vw, (max-width: 1024px) 18rem, 20rem"
        quality={68}
        className="object-contain p-2 transition duration-300 group-hover:scale-[1.02]"
      />
    </div>
  )
}

function FacebookMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-current">
      <path d="M13.5 22v-8.2h2.76l.41-3.2H13.5V8.56c0-.93.26-1.56 1.59-1.56H16.8V4.14c-.29-.04-1.28-.14-2.44-.14-2.42 0-4.08 1.48-4.08 4.2v2.4H7.5v3.2h2.78V22h3.22Z" />
    </svg>
  )
}
