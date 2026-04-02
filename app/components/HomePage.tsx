'use client'

import Link from "next/link"
import Image from "next/image"
import { useEffect, useMemo, useState } from "react"
import { ContactActionLink } from "./ContactActionLink"
import { ExternalLinksButtons } from "./ExternalLinksButtons"
import { EventLikeButton } from "./EventLikeButton"
import { OptimizedImage } from "./OptimizedImage"
import { MyTunerWidget } from "./MyTunerWidget"
import { PublicHeader } from "./PublicHeader"
import { formatEventDateRange } from "../lib/eventDates"
import { fetchEventLikes, recordEventLike } from "../lib/eventLikes"
import { buildHomePublicNav } from "../lib/publicNav"
import { recordViewMore, type ViewMoreSection } from "../lib/viewMoreTracking"
import { supabase } from "../supabase"
import {
  ArrowRight,
  CalendarDays,
  Cloud,
  CloudDrizzle,
  CloudRain,
  CloudSun,
  GraduationCap,
  Mail,
  MapPin,
  Phone,
  UserRound,
  X,
} from "lucide-react"

type Comercio = {
  id: number
  nombre: string
  descripcion: string | null
  direccion: string | null
  telefono: string | null
  web_url?: string | null
  instagram_url?: string | null
  facebook_url?: string | null
  imagen?: string | null
  imagen_url?: string | null
  destacado?: boolean | null
  usa_whatsapp?: boolean | null
}

type Evento = {
  id: number
  titulo: string
  categoria?: string | null
  descripcion: string
  fecha: string
  fecha_fin?: string | null
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
  usa_whatsapp?: boolean | null
}

type Servicio = {
  id: number
  nombre: string
  categoria: string
  descripcion: string | null
  responsable: string | null
  contacto: string | null
  direccion: string | null
  web_url?: string | null
  instagram_url?: string | null
  facebook_url?: string | null
  imagen: string | null
  destacado?: boolean | null
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
    .filter((item) => item.destacado)
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

const RADIO_STORAGE_KEY = "guia-varela-radio-config"
const defaultRadioConfig: RadioConfig = {
  title: "Delta FM 88.3",
  description: "Escucha Delta FM 88.3 en vivo desde Jose Pedro Varela.",
  streamUrl: "https://radios.com.uy/delta/?utm_source=chatgpt.com",
  isLive: true,
}

const WELCOME_SESSION_KEY = "guia-varela-welcome-shown-v2"
const WELCOME_LAST_KEY = "guia-varela-last-highlight"
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

export function HomePage({ initialData }: { initialData: HomePageData }) {
  const [featuredBusinesses] = useState<Comercio[]>(initialData.featuredBusinesses)
  const [eventos] = useState<Evento[]>(initialData.eventos)
  const [cursos] = useState<Curso[]>(initialData.cursos)
  const [servicios] = useState<Servicio[]>(initialData.servicios)
  const [allCursos] = useState<Curso[]>(initialData.allCursos)
  const [allServicios] = useState<Servicio[]>(initialData.allServicios)
  const [instituciones] = useState<Institucion[]>(initialData.instituciones)
  const [sobreVarela] = useState<SobreVarelaConfig>(
    initialData.sobreVarela || defaultSobreVarela
  )
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
  const [contactLeadLoading, setContactLeadLoading] = useState(false)
  const [isContactLeadOpen, setIsContactLeadOpen] = useState(false)
  const [welcomeHighlight, setWelcomeHighlight] = useState<WelcomeHighlight | null>(null)
  const [zoomedImage, setZoomedImage] = useState<{ src: string; alt: string } | null>(null)

  const visibleServicios = useMemo(() => servicios.slice(0, 8), [servicios])
  const visibleEventos = useMemo(() => eventos.slice(0, 8), [eventos])
  const visibleCursos = useMemo(() => cursos.slice(0, 8), [cursos])
  const visibleInstituciones = useMemo(() => instituciones.slice(0, 10), [instituciones])

  const weather = initialData.weather
  const weatherLabel = weather ? WEATHER_LABELS[weather.weatherCode] || "Clima actual" : null

  useEffect(() => {
    const loadEventLikes = async () => {
      const eventIds = eventos.map((evento) => String(evento.id))
      const { countMap, likedMap } = await fetchEventLikes(eventIds)
      setEventLikeCounts(countMap)
      setLikedEvents(likedMap)
    }

    void loadEventLikes()
  }, [eventos])

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
    open()
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
    setContactLeadStatus("Recibimos tu mensaje. Te vamos a contactar pronto.")
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

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fbff_0%,#f2f7f5_48%,#ffffff_100%)] text-slate-900">
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

      {welcomeHighlight && (
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
                Contanos tu propuesta
              </h3>
              <p className="mt-3 text-base leading-7 text-slate-500">
                Dejanos tus datos y te contactamos para sumar tu comercio,
                servicio, curso o propuesta.
              </p>
            </div>

            <form onSubmit={handleContactLeadSubmit} className="mt-8 space-y-4">
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
                    Numero
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
                  className="min-h-36 w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 outline-none transition focus:border-sky-400"
                  placeholder="Contanos que queres publicar y como te gustaria aparecer."
                  required
                />
              </div>

              {contactLeadStatus && (
                <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
                  {contactLeadStatus}
                </div>
              )}

              <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-500">
                  Tambien podes escribir a holajpvarela@gmail.com
                </p>
                <button
                  type="submit"
                  disabled={contactLeadLoading}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-sky-600 px-6 py-3 font-semibold text-white transition hover:bg-sky-500 disabled:opacity-60"
                >
                  {contactLeadLoading ? "Enviando..." : "Enviar consulta"}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedComercio && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 p-4">
          <div className="relative max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-[28px] bg-white shadow-2xl">
            <button
              type="button"
              onClick={() => setSelectedComercio(null)}
              className="absolute right-4 top-4 z-10 rounded-full bg-white/90 p-2 text-slate-700 shadow-sm transition hover:bg-white"
              aria-label="Cerrar detalle"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-[1.45fr_0.55fr]">
                <div className="bg-[linear-gradient(180deg,#f8fafc_0%,#eef4ff_100%)]">
                  {selectedComercio.imagen_url || selectedComercio.imagen ? (
                    <div className="flex min-h-[320px] w-full items-center justify-center bg-slate-100 p-3 md:min-h-[420px] md:p-4">
                      <button
                        type="button"
                        onClick={() =>
                          setZoomedImage({
                            src: selectedComercio.imagen_url || selectedComercio.imagen || "",
                            alt: selectedComercio.nombre,
                          })
                        }
                        className="relative aspect-[4/5] h-[390px] w-full max-w-[720px] overflow-hidden rounded-[24px] border border-white/80 bg-white shadow-[0_18px_45px_-28px_rgba(15,23,42,0.45)] transition hover:scale-[1.01] md:h-[580px]"
                        aria-label="Ver imagen mas grande"
                      >
                        <OptimizedImage
                          src={selectedComercio.imagen_url || selectedComercio.imagen || ""}
                          alt={selectedComercio.nombre}
                          sizes="(max-width: 1024px) 100vw, 60vw"
                          className="object-cover"
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
                  {selectedComercio.nombre}
                </h3>

                {selectedComercio.direccion && (
                  <div className="mt-4 flex items-center gap-2 text-slate-500">
                    <MapPin className="h-4 w-4" />
                    <span>{selectedComercio.direccion}</span>
                  </div>
                )}

                {selectedComercio.telefono && (
                  <div className="mt-3 flex items-center gap-2 text-slate-500">
                    <Phone className="h-4 w-4" />
                    <span>{selectedComercio.telefono}</span>
                  </div>
                )}

                {selectedComercio.descripcion && (
                    <p className="mt-6 whitespace-pre-line text-lg leading-8 text-slate-600">
                      {selectedComercio.descripcion}
                    </p>
                  )}

                <div className="mt-8 flex flex-wrap gap-3">
                  {selectedComercio.telefono && (
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
                  )}

                  <ExternalLinksButtons
                    webUrl={selectedComercio.web_url}
                    instagramUrl={selectedComercio.instagram_url}
                    facebookUrl={selectedComercio.facebook_url}
                  />

                  <button
                    type="button"
                    onClick={() => setSelectedComercio(null)}
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

      {selectedServicio && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 p-4">
          <div className="relative max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-[28px] bg-white shadow-2xl">
            <button
              type="button"
              onClick={() => setSelectedServicio(null)}
              className="absolute right-4 top-4 z-10 rounded-full bg-white/90 p-2 text-slate-700 shadow-sm transition hover:bg-white"
              aria-label="Cerrar detalle"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-[1.45fr_0.55fr]">
                <div className="bg-[linear-gradient(180deg,#f8fafc_0%,#eef4ff_100%)]">
                  {selectedServicio.imagen ? (
                    <div className="flex min-h-[320px] w-full items-center justify-center bg-slate-100 p-6 md:min-h-[420px]">
                      <button
                        type="button"
                        onClick={() =>
                          setZoomedImage({
                            src: selectedServicio.imagen!,
                            alt: selectedServicio.nombre,
                          })
                        }
                        className="relative aspect-[4/5] h-[380px] w-full max-w-[680px] overflow-hidden rounded-[24px] border border-white/80 bg-white shadow-[0_18px_45px_-28px_rgba(15,23,42,0.45)] transition hover:scale-[1.01] md:h-[560px]"
                        aria-label="Ver imagen mas grande"
                      >
                        <OptimizedImage
                          src={selectedServicio.imagen}
                          alt={selectedServicio.nombre}
                          sizes="(max-width: 1024px) 100vw, 60vw"
                          className="object-contain p-1 sm:p-2"
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
                <div className="mb-4 inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-700">
                  {selectedServicio.categoria}
                </div>

                <h3 className="text-3xl font-semibold leading-tight text-slate-900">
                  {selectedServicio.nombre}
                </h3>

                {selectedServicio.descripcion && (
                    <p className="mt-6 whitespace-pre-line text-lg leading-8 text-slate-600">
                      {selectedServicio.descripcion}
                    </p>
                  )}

                <div className="mt-6 space-y-3 text-slate-600">
                  {selectedServicio.responsable && (
                    <div className="flex items-center gap-2">
                      <UserRound className="h-4 w-4" />
                      <span>{selectedServicio.responsable}</span>
                    </div>
                  )}
                  {selectedServicio.contacto && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      <span>{selectedServicio.contacto}</span>
                    </div>
                  )}
                  {selectedServicio.direccion && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span>{selectedServicio.direccion}</span>
                    </div>
                  )}
                </div>

                <div className="mt-8 flex flex-wrap gap-3">
                  {selectedServicio.contacto && (
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
                  )}

                  <ExternalLinksButtons
                    webUrl={selectedServicio.web_url}
                    instagramUrl={selectedServicio.instagram_url}
                    facebookUrl={selectedServicio.facebook_url}
                  />

                  <button
                    type="button"
                    onClick={() => setSelectedServicio(null)}
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

      {selectedEvento && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 p-4">
          <div className="relative max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-[28px] bg-white shadow-2xl">
            <button
              type="button"
              onClick={() => setSelectedEvento(null)}
              className="absolute right-4 top-4 z-10 rounded-full bg-white/90 p-2 text-slate-700 shadow-sm transition hover:bg-white"
              aria-label="Cerrar detalle"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-[1.45fr_0.55fr]">
                <div className="bg-[linear-gradient(180deg,#f8fafc_0%,#eef4ff_100%)]">
                  {selectedEvento.imagen ? (
                    <div className="flex min-h-[320px] w-full items-center justify-center bg-slate-100 p-3 md:min-h-[420px] md:p-4">
                      <button
                        type="button"
                        onClick={() =>
                          setZoomedImage({
                            src: selectedEvento.imagen!,
                            alt: selectedEvento.titulo,
                          })
                        }
                        className="relative aspect-[4/5] h-[390px] w-full max-w-[720px] overflow-hidden rounded-[24px] border border-white/80 bg-white shadow-[0_18px_45px_-28px_rgba(15,23,42,0.45)] transition hover:scale-[1.01] md:h-[580px]"
                        aria-label="Ver imagen mas grande"
                      >
                        <OptimizedImage
                          src={selectedEvento.imagen}
                          alt={selectedEvento.titulo}
                          sizes="(max-width: 1024px) 100vw, 60vw"
                          className="object-contain p-1 sm:p-2"
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
                <div className="mb-4 flex items-center gap-2 text-base font-medium text-blue-500">
                  <CalendarDays className="h-5 w-5" />
                  <span>
                    {formatEventDateRange(
                      selectedEvento.fecha,
                      selectedEvento.fecha_fin
                    )}
                  </span>
                </div>

                <h3 className="text-3xl font-semibold leading-tight text-slate-900">
                  {selectedEvento.titulo}
                </h3>

                <div className="mt-4 flex items-center gap-2 text-slate-500">
                  <MapPin className="h-4 w-4" />
                  <span>{selectedEvento.ubicacion}</span>
                </div>

                {selectedEvento.telefono && (
                  <div className="mt-3 flex items-center gap-2 text-slate-500">
                    <Phone className="h-4 w-4" />
                    <span>{selectedEvento.telefono}</span>
                  </div>
                )}

                <div className="mt-4 inline-flex rounded-full bg-sky-50 px-3 py-1 text-sm font-semibold text-sky-700">
                  {normalizeEventCategory(selectedEvento.categoria)}
                </div>

                  <p className="mt-6 whitespace-pre-line text-lg leading-8 text-slate-600">
                    {selectedEvento.descripcion}
                  </p>

                <div className="mt-8 flex flex-wrap gap-3">
                  {selectedEvento.telefono?.trim() ? (
                    <ContactActionLink
                      href={getContactHref(
                        selectedEvento.telefono,
                        selectedEvento.usa_whatsapp
                      )}
                      mode={selectedEvento.usa_whatsapp === false ? "phone" : "whatsapp"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={
                        selectedEvento.usa_whatsapp === false
                          ? "inline-flex items-center gap-2 rounded-2xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
                          : "inline-flex items-center gap-2 rounded-2xl bg-green-600 px-5 py-3 font-semibold text-white transition hover:bg-green-500"
                      }
                    >
                      <Phone className="h-4 w-4" />
                      {selectedEvento.usa_whatsapp === false ? "Llamar" : "WhatsApp"}
                    </ContactActionLink>
                  ) : null}

                  <ExternalLinksButtons
                    webUrl={selectedEvento.web_url}
                    instagramUrl={selectedEvento.instagram_url}
                    facebookUrl={selectedEvento.facebook_url}
                  />

                  <EventLikeButton
                    count={eventLikeCounts[String(selectedEvento.id)] || 0}
                    liked={Boolean(likedEvents[String(selectedEvento.id)])}
                    onClick={() =>
                      void handleEventLike(String(selectedEvento.id), selectedEvento.titulo)
                    }
                    disabled={likingEventId === String(selectedEvento.id)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-600 transition hover:bg-emerald-100 disabled:cursor-default disabled:opacity-70"
                  />

                  <Link
                    href="/eventos"
                    className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-500"
                  >
                    Ver todos los eventos
                    <ArrowRight className="h-4 w-4" />
                  </Link>

                  <button
                    type="button"
                    onClick={() => setSelectedEvento(null)}
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
                  <div className="flex min-h-[320px] items-center justify-center text-slate-400">
                    Sin imagen
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
        <section className="py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <MyTunerWidget
              streamUrl={radio.streamUrl}
              title={radio.title}
              description={radio.description}
            />
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

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {featuredBusinesses.map((business) => {
              const imageSrc = business.imagen_url || business.imagen

              return (
                <div
                  key={business.id}
                  className="overflow-hidden rounded-[28px] border border-white/80 bg-white/90 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.5)] transition hover:-translate-y-1.5 hover:shadow-[0_28px_60px_-30px_rgba(59,130,246,0.35)]"
                >
                  {imageSrc && (
                    <div className="relative h-52 w-full">
                      <OptimizedImage
                        src={imageSrc}
                        alt={business.nombre}
                        sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw"
                        className="object-cover"
                      />
                    </div>
                  )}

                  <div className="p-5">
                    <h3 className="text-[22px] font-semibold text-slate-900">
                      {business.nombre}
                    </h3>
                    {business.descripcion && (
                        <p className="line-clamp-3 mt-2 whitespace-pre-line text-base text-slate-500">
                          {business.descripcion}
                        </p>
                    )}
                    {business.direccion && (
                      <p className="mt-2 text-sm text-slate-500">
                        {business.direccion}
                      </p>
                    )}

                    {business.telefono && (
                      <ContactActionLink
                        href={getContactHref(
                          business.telefono,
                          business.usa_whatsapp
                        )}
                        mode={business.usa_whatsapp === false ? "phone" : "whatsapp"}
                        section="comercios"
                        itemId={String(business.id)}
                        itemTitle={business.nombre}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-green-500 px-4 py-3 text-lg font-semibold text-white transition hover:bg-green-600"
                      >
                        <Phone className="h-5 w-5" />
                        {business.usa_whatsapp === false ? "Llamar" : "WhatsApp"}
                      </ContactActionLink>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        handleViewMoreClick(
                          "comercios",
                          String(business.id),
                          business.nombre,
                          () => setSelectedComercio(business)
                        )
                      }
                      className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-blue-500 transition hover:text-blue-600"
                    >
                            Ver mas
                      <ArrowRight className="h-4 w-4" />
                    </button>
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
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
              {visibleServicios.map((servicio) => (
                <div
                        key={servicio.id}
                        className="overflow-hidden rounded-[28px] border border-white/80 bg-white/90 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.45)] transition hover:-translate-y-1.5 hover:shadow-[0_28px_60px_-30px_rgba(245,158,11,0.35)]"
                      >
                        {servicio.imagen && (
                          <div className="relative h-48 w-full">
                            <OptimizedImage
                              src={servicio.imagen}
                              alt={servicio.nombre}
                              sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 25vw"
                              className="object-cover"
                            />
                          </div>
                        )}

                        <div className="p-5">
                          {servicio.categoria && (
                            <div className="mb-3 inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                              {servicio.categoria}
                            </div>
                          )}

                          <h3 className="text-xl font-semibold text-slate-900">
                            {servicio.nombre}
                          </h3>

                          {servicio.descripcion && (
                              <p className="line-clamp-3 mt-3 whitespace-pre-line text-sm leading-7 text-slate-500">
                                {servicio.descripcion}
                              </p>
                          )}

                          <div className="mt-4 space-y-2 text-sm text-slate-600">
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

                          {servicio.contacto?.trim() ? (
                            <ContactActionLink
                              href={getContactHref(
                                servicio.contacto,
                                servicio.usa_whatsapp
                              )}
                              mode={servicio.usa_whatsapp === false ? "phone" : "whatsapp"}
                              section="servicios"
                              itemId={String(servicio.id)}
                              itemTitle={servicio.nombre}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-green-500 px-4 py-3 text-lg font-semibold text-white transition hover:bg-green-600"
                            >
                              <Phone className="h-5 w-5" />
                              {servicio.usa_whatsapp === false ? "Llamar" : "WhatsApp"}
                            </ContactActionLink>
                          ) : null}

                          <button
                            type="button"
                            onClick={() =>
                              handleViewMoreClick(
                                "servicios",
                                String(servicio.id),
                                servicio.nombre,
                                () => setSelectedServicio(servicio)
                              )
                            }
                            className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-blue-500 transition hover:text-blue-600"
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

      <section id="eventos" className="order-2 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <div className="mb-4 inline-flex rounded-full bg-sky-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">
              Hoy en Varela
            </div>
            <h2 className="text-4xl font-semibold tracking-tight text-slate-900 md:text-5xl">
              Proximos eventos
            </h2>
            <p className="mt-4 text-xl text-slate-500">
              Eventos, promos y sorteos activos
            </p>
            <div className="mt-6">
              <Link
                href="/eventos"
                className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-600"
              >
                Ver todos los eventos
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {visibleEventos.map((event) => (
              <div
                key={event.id}
                className="overflow-hidden rounded-[28px] border border-white/80 bg-white/95 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.45)] transition hover:-translate-y-1.5 hover:shadow-[0_28px_60px_-30px_rgba(14,165,233,0.35)]"
              >
                {event.imagen && (
                  <div className="relative h-64 w-full">
                    <OptimizedImage
                      src={event.imagen}
                      alt={event.titulo}
                      sizes="(max-width: 1024px) 100vw, 33vw"
                      className="object-cover"
                    />
                  </div>
                )}

                <div className="p-5">
                  <div className="mb-4 flex items-center gap-2 text-lg text-blue-500">
                    <CalendarDays className="h-5 w-5" />
                    <span>{formatEventDateRange(event.fecha, event.fecha_fin)}</span>
                  </div>

                  <div className="mb-3 inline-flex rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                    {normalizeEventCategory(event.categoria)}
                  </div>

                  <h3 className="text-[22px] font-semibold text-slate-900">
                    {event.titulo}
                  </h3>

                  <p className="mt-2 text-sm text-slate-500">{event.ubicacion}</p>
                    <p className="line-clamp-3 mt-3 whitespace-pre-line text-lg leading-8 text-slate-500">
                      {event.descripcion}
                    </p>

                  <div className="mt-4">
                    <EventLikeButton
                      count={eventLikeCounts[String(event.id)] || 0}
                      liked={Boolean(likedEvents[String(event.id)])}
                      onClick={() => void handleEventLike(String(event.id), event.titulo)}
                      disabled={likingEventId === String(event.id)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-600 transition hover:bg-emerald-100 disabled:cursor-default disabled:opacity-70"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      handleViewMoreClick(
                        "eventos",
                        String(event.id),
                        event.titulo,
                        () => setSelectedEvento(event)
                      )
                    }
                    className="mt-5 inline-flex items-center gap-2 text-lg font-medium text-blue-500 hover:text-blue-600"
                  >
                        Ver más
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
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
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
              {visibleCursos.map((curso) => (
                <div
                  key={curso.id}
                  className="overflow-hidden rounded-[28px] border border-white/80 bg-white/90 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.45)] transition hover:-translate-y-1.5 hover:shadow-[0_28px_60px_-30px_rgba(139,92,246,0.35)]"
                >
                  {curso.imagen && (
                    <div className="relative h-56 w-full">
                      <OptimizedImage
                        src={curso.imagen}
                        alt={curso.nombre}
                        sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 25vw"
                        className="object-cover"
                      />
                    </div>
                  )}

                  <div className="p-5">
                    <h3 className="text-[22px] font-semibold text-slate-900">
                      {curso.nombre}
                    </h3>
                      <p className="line-clamp-3 mt-3 whitespace-pre-line text-base leading-7 text-slate-500">
                        {curso.descripcion}
                      </p>
                    <div className="mt-4 flex items-center gap-2 text-sm text-slate-600">
                      <GraduationCap className="h-4 w-4" />
                      <span>{curso.responsable}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        handleViewMoreClick(
                          "cursos",
                          String(curso.id),
                          curso.nombre,
                          () => setSelectedCurso(curso)
                        )
                      }
                      className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-blue-500 transition hover:text-blue-600"
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
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {visibleInstituciones.map((institucion) => (
                <div
                  key={institucion.id}
                  className="overflow-hidden rounded-[28px] border border-white/80 bg-white/90 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.45)] transition hover:-translate-y-1.5 hover:shadow-[0_28px_60px_-30px_rgba(6,182,212,0.35)]"
                >
                  {institucion.foto && (
                    <div className="relative h-56 w-full">
                      <OptimizedImage
                        src={institucion.foto}
                        alt={institucion.nombre}
                        sizes="(max-width: 768px) 100vw, (max-width: 1280px) 33vw, 20vw"
                        className="object-cover"
                      />
                    </div>
                  )}

                  <div className="p-5">
                    <h3 className="text-[22px] font-semibold text-slate-900">
                      {institucion.nombre}
                    </h3>

                    <button
                      type="button"
                      onClick={() =>
                        handleViewMoreClick(
                          "instituciones",
                          String(institucion.id),
                          institucion.nombre,
                          () => setSelectedInstitucion(institucion)
                        )
                      }
                      className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-cyan-600 transition hover:text-cyan-700"
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
