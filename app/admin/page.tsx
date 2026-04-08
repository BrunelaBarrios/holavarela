'use client'

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  BarChart3,
  Building2,
  Calendar,
  CreditCard,
  GraduationCap,
  Eye,
  Mail,
  MessageCircle,
  ShieldAlert,
  Store,
  Users,
} from "lucide-react"
import { buildEventLikeTotal } from "../lib/eventLikes"
import {
  buildExternalLinkTotals,
  emptyExternalLinkTotals,
  type ExternalLinkTotals,
} from "../lib/externalLinkTracking"
import { buildShareTotals, emptyShareTotals, type ShareTotals } from "../lib/shareTracking"
import {
  buildViewMoreTotals,
  emptyViewMoreTotals,
  type ViewMoreTotals,
} from "../lib/viewMoreTracking"
import {
  buildWhatsappTotals,
  emptyWhatsappTotals,
  type WhatsappTotals,
} from "../lib/whatsappTracking"
import { supabase } from "../supabase"

type VisitRow = {
  section: string | null
  item_id: string | null
  item_title: string | null
  browser_key: string | null
  created_at: string | null
}

type BrowserVisitRow = {
  browser_key: string | null
  created_at: string | null
}

type InteractionRow = {
  created_at: string | null
}

type SectionTotal = {
  label: string
  value: number
}

type RecentActivity = {
  interactions15Days: number
  whatsapp15Days: number
}

type RecentMessage = {
  label: string
  value: number
}

type StatCard = {
  id: string
  title: string
  value: number
  icon: typeof Store
  color: string
  action: () => void
}

const SECTION_LABELS: Record<string, string> = {
  home: "Inicio",
  "comercios-page": "Listado de comercios",
  "servicios-page": "Listado de servicios",
  "eventos-page": "Listado de eventos",
  "cursos-page": "Listado de cursos y clases",
  "instituciones-page": "Listado de instituciones",
}

const BASELINE_SITE_VISITORS_30D = 752
const BASELINE_SITE_PAGE_VIEWS_30D = 3601

const getIsoDaysAgo = (days: number) => {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toISOString()
}

const countUniqueBrowsers = (rows: Array<{ browser_key: string | null }>) =>
  new Set(rows.map((row) => row.browser_key).filter((key): key is string => Boolean(key))).size

const buildSectionTotals = (rows: VisitRow[]): SectionTotal[] => {
  const totals = rows.reduce<Record<string, number>>((acc, row) => {
    const key = row.item_id || row.item_title
    if (!key) return acc
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})

  return Object.entries(totals)
    .map(([section, value]) => ({
      label: SECTION_LABELS[section] || section,
      value,
    }))
    .sort((a, b) => b.value - a.value)
}

const withFallback = async <T,>(
  promiseLike: PromiseLike<{ data: T[] | null; error: unknown }>
) => {
  const { data, error } = await promiseLike
  if (error) {
    console.warn("No se pudo cargar una metrica del dashboard.", error)
    return [] as T[]
  }
  return (data || []) as T[]
}

export default function AdminDashboardPage() {
  const router = useRouter()
  const [comerciosCount, setComerciosCount] = useState(0)
  const [eventosCount, setEventosCount] = useState(0)
  const [serviciosCount, setServiciosCount] = useState(0)
  const [institucionesCount, setInstitucionesCount] = useState(0)
  const [cursosCount, setCursosCount] = useState(0)
  const [usuariosCount, setUsuariosCount] = useState(0)
  const [newComerciosCount, setNewComerciosCount] = useState(0)
  const [newEventosCount, setNewEventosCount] = useState(0)
  const [newContactosCount, setNewContactosCount] = useState(0)
  const [pendingSubscriptionsCount, setPendingSubscriptionsCount] = useState(0)
  const [activeSubscriptionsCount, setActiveSubscriptionsCount] = useState(0)
  const [pausedSubscriptionsCount, setPausedSubscriptionsCount] = useState(0)
  const [cancelledSubscriptionsCount, setCancelledSubscriptionsCount] = useState(0)
  const [shareTotals, setShareTotals] = useState<ShareTotals>(emptyShareTotals())
  const [whatsappTotals, setWhatsappTotals] = useState<WhatsappTotals>(emptyWhatsappTotals())
  const [viewMoreTotals, setViewMoreTotals] = useState<ViewMoreTotals>(emptyViewMoreTotals())
  const [externalLinkTotals, setExternalLinkTotals] = useState<ExternalLinkTotals>(emptyExternalLinkTotals())
  const [eventLikeTotal, setEventLikeTotal] = useState(0)
  const [metricsLoading, setMetricsLoading] = useState(true)
  const [visitors30Days, setVisitors30Days] = useState(BASELINE_SITE_VISITORS_30D)
  const [pageViews30Days, setPageViews30Days] = useState(BASELINE_SITE_PAGE_VIEWS_30D)
  const [sectionTotals, setSectionTotals] = useState<SectionTotal[]>([])
  const [recentMessages, setRecentMessages] = useState<RecentMessage[]>([])
  const [recentActivity, setRecentActivity] = useState<RecentActivity>({
    interactions15Days: 0,
    whatsapp15Days: 0,
  })

  useEffect(() => {
    const cargarDashboard = async () => {
      const [
        { count: comercios },
        { count: eventos },
        { count: servicios },
        { count: instituciones },
        { count: cursos },
        { count: usuarios },
        { count: newComercios },
        { count: newEventos },
        { count: newContactos },
        { count: pendingComercios },
        { count: pendingServicios },
        { count: pendingCursos },
        { count: activeComercios },
        { count: activeServicios },
        { count: activeCursos },
        { count: pausedComercios },
        { count: pausedServicios },
        { count: pausedCursos },
        { count: cancelledComercios },
        { count: cancelledServicios },
        { count: cancelledCursos },
        { data: shareRows },
        { data: whatsappRows },
        { data: viewMoreRows },
        { data: externalLinkRows },
        { data: eventLikeRows },
        visitRows30,
        shareRows15,
        whatsappRows15,
        viewMoreRows15,
        externalRows15,
        likesRows15,
        visitRows48,
        contactRows48,
        likesRows48,
        eventRows48,
        commerceRows48,
        serviceRows48,
        courseRows48,
        institutionRows48,
      ] = await Promise.all([
        supabase.from("comercios").select("*", { count: "exact", head: true }),
        supabase.from("eventos").select("*", { count: "exact", head: true }),
        supabase.from("servicios").select("*", { count: "exact", head: true }),
        supabase.from("instituciones").select("*", { count: "exact", head: true }),
        supabase.from("cursos").select("*", { count: "exact", head: true }),
        supabase.from("usuarios_registrados").select("*", { count: "exact", head: true }),
        supabase.from("comercios").select("*", { count: "exact", head: true }).eq("estado", "borrador"),
        supabase.from("eventos").select("*", { count: "exact", head: true }).eq("estado", "borrador"),
        supabase.from("contacto_solicitudes").select("*", { count: "exact", head: true }).or("visto.is.null,visto.eq.false"),
        supabase.from("comercios").select("*", { count: "exact", head: true }).eq("estado_suscripcion", "pendiente"),
        supabase.from("servicios").select("*", { count: "exact", head: true }).eq("estado_suscripcion", "pendiente"),
        supabase.from("cursos").select("*", { count: "exact", head: true }).eq("estado_suscripcion", "pendiente"),
        supabase.from("comercios").select("*", { count: "exact", head: true }).eq("estado_suscripcion", "activa"),
        supabase.from("servicios").select("*", { count: "exact", head: true }).eq("estado_suscripcion", "activa"),
        supabase.from("cursos").select("*", { count: "exact", head: true }).eq("estado_suscripcion", "activa"),
        supabase.from("comercios").select("*", { count: "exact", head: true }).eq("estado_suscripcion", "pausada"),
        supabase.from("servicios").select("*", { count: "exact", head: true }).eq("estado_suscripcion", "pausada"),
        supabase.from("cursos").select("*", { count: "exact", head: true }).eq("estado_suscripcion", "pausada"),
        supabase.from("comercios").select("*", { count: "exact", head: true }).eq("estado_suscripcion", "cancelada"),
        supabase.from("servicios").select("*", { count: "exact", head: true }).eq("estado_suscripcion", "cancelada"),
        supabase.from("cursos").select("*", { count: "exact", head: true }).eq("estado_suscripcion", "cancelada"),
        supabase.from("share_events").select("section"),
        supabase.from("whatsapp_clicks").select("section"),
        supabase.from("view_more_clicks").select("section"),
        supabase.from("external_link_clicks").select("section"),
        supabase.from("event_likes").select("created_at"),
        withFallback<VisitRow>(
          supabase.from("content_visits").select("section, item_id, item_title, browser_key, created_at").gte("created_at", getIsoDaysAgo(30))
        ),
        withFallback<InteractionRow>(
          supabase.from("share_events").select("created_at").gte("created_at", getIsoDaysAgo(15))
        ),
        withFallback<InteractionRow>(
          supabase.from("whatsapp_clicks").select("created_at").gte("created_at", getIsoDaysAgo(15))
        ),
        withFallback<InteractionRow>(
          supabase.from("view_more_clicks").select("created_at").gte("created_at", getIsoDaysAgo(15))
        ),
        withFallback<InteractionRow>(
          supabase.from("external_link_clicks").select("created_at").gte("created_at", getIsoDaysAgo(15))
        ),
        withFallback<InteractionRow>(
          supabase.from("event_likes").select("created_at").gte("created_at", getIsoDaysAgo(15))
        ),
        withFallback<BrowserVisitRow>(
          supabase.from("content_visits").select("browser_key, created_at").eq("section", "site_pages").gte("created_at", getIsoDaysAgo(2))
        ),
        withFallback<InteractionRow>(
          supabase.from("contacto_solicitudes").select("created_at").gte("created_at", getIsoDaysAgo(2))
        ),
        withFallback<InteractionRow>(
          supabase.from("event_likes").select("created_at").gte("created_at", getIsoDaysAgo(2))
        ),
        withFallback<InteractionRow>(
          supabase.from("eventos").select("created_at").gte("created_at", getIsoDaysAgo(2))
        ),
        withFallback<InteractionRow>(
          supabase.from("comercios").select("created_at").gte("created_at", getIsoDaysAgo(2))
        ),
        withFallback<InteractionRow>(
          supabase.from("servicios").select("created_at").gte("created_at", getIsoDaysAgo(2))
        ),
        withFallback<InteractionRow>(
          supabase.from("cursos").select("created_at").gte("created_at", getIsoDaysAgo(2))
        ),
        withFallback<InteractionRow>(
          supabase.from("instituciones").select("created_at").gte("created_at", getIsoDaysAgo(2))
        ),
      ])

      setComerciosCount(comercios || 0)
      setEventosCount(eventos || 0)
      setServiciosCount(servicios || 0)
      setInstitucionesCount(instituciones || 0)
      setCursosCount(cursos || 0)
      setUsuariosCount(usuarios || 0)
      setNewComerciosCount(newComercios || 0)
      setNewEventosCount(newEventos || 0)
      setNewContactosCount(newContactos || 0)
      setPendingSubscriptionsCount((pendingComercios || 0) + (pendingServicios || 0) + (pendingCursos || 0))
      setActiveSubscriptionsCount((activeComercios || 0) + (activeServicios || 0) + (activeCursos || 0))
      setPausedSubscriptionsCount((pausedComercios || 0) + (pausedServicios || 0) + (pausedCursos || 0))
      setCancelledSubscriptionsCount((cancelledComercios || 0) + (cancelledServicios || 0) + (cancelledCursos || 0))
      setShareTotals(buildShareTotals(shareRows || []))
      setWhatsappTotals(buildWhatsappTotals(whatsappRows || []))
      setViewMoreTotals(buildViewMoreTotals(viewMoreRows || []))
      setExternalLinkTotals(buildExternalLinkTotals(externalLinkRows || []))
      setEventLikeTotal(buildEventLikeTotal(eventLikeRows || []))

      const siteVisitRows30 = visitRows30.filter((row) => row.section === "site_pages")
      const visitors48 = countUniqueBrowsers(visitRows48)
      const listings48 =
        commerceRows48.length +
        serviceRows48.length +
        courseRows48.length +
        institutionRows48.length

      setVisitors30Days(BASELINE_SITE_VISITORS_30D + countUniqueBrowsers(siteVisitRows30))
      setPageViews30Days(BASELINE_SITE_PAGE_VIEWS_30D + siteVisitRows30.length)
      setSectionTotals(buildSectionTotals(siteVisitRows30))
      setRecentActivity({
        interactions15Days:
          shareRows15.length +
          whatsappRows15.length +
          viewMoreRows15.length +
          externalRows15.length +
          likesRows15.length,
        whatsapp15Days: whatsappRows15.length,
      })
      setRecentMessages(
        [
          {
            label: `${visitors48} ${visitors48 === 1 ? "nueva visita al sitio" : "nuevas visitas al sitio"}`,
            value: visitors48,
          },
          {
            label: `${contactRows48.length} ${contactRows48.length === 1 ? "mensaje nuevo" : "mensajes nuevos"}`,
            value: contactRows48.length,
          },
          {
            label: `${likesRows48.length} ${likesRows48.length === 1 ? "nuevo like" : "nuevos likes"}`,
            value: likesRows48.length,
          },
          {
            label: `${eventRows48.length} ${eventRows48.length === 1 ? "nuevo evento subido" : "nuevos eventos subidos"}`,
            value: eventRows48.length,
          },
          {
            label: `${listings48} ${listings48 === 1 ? "nueva ficha se sumo" : "nuevas fichas se sumaron"}`,
            value: listings48,
          },
        ].filter((item) => item.value > 0)
      )
      setMetricsLoading(false)
    }

    void cargarDashboard()
  }, [])

  const totalWhatsapp =
    whatsappTotals.comercios +
    whatsappTotals.eventos +
    whatsappTotals.cursos +
    whatsappTotals.servicios +
    whatsappTotals.instituciones

  const totalShares =
    shareTotals.comercios +
    shareTotals.eventos +
    shareTotals.cursos +
    shareTotals.servicios +
    shareTotals.instituciones

  const totalViewMore =
    viewMoreTotals.comercios +
    viewMoreTotals.eventos +
    viewMoreTotals.cursos +
    viewMoreTotals.servicios +
    viewMoreTotals.instituciones

  const totalExternalLinks =
    externalLinkTotals.comercios +
    externalLinkTotals.eventos +
    externalLinkTotals.cursos +
    externalLinkTotals.servicios +
    externalLinkTotals.instituciones

  const totalInteractions =
    totalWhatsapp +
    totalShares +
    totalViewMore +
    totalExternalLinks +
    eventLikeTotal

  const totalTrackedSubscriptions =
    pendingSubscriptionsCount +
    activeSubscriptionsCount +
    pausedSubscriptionsCount +
    cancelledSubscriptionsCount

  const sectionSummary = useMemo(() => {
    if (sectionTotals.length === 0) {
      return "Todavia no hay suficiente actividad para mostrar secciones destacadas."
    }
    return `${sectionTotals[0]?.label || "Seccion principal"} lidera el interes reciente dentro de Hola Varela.`
  }, [sectionTotals])

  const stats: StatCard[] = [
    {
      id: "comercios",
      title: "Comercios",
      value: comerciosCount,
      icon: Store,
      color: "bg-blue-600",
      action: () => router.push("/admin/comercios"),
    },
    {
      id: "eventos",
      title: "Eventos",
      value: eventosCount,
      icon: Calendar,
      color: "bg-emerald-600",
      action: () => router.push("/admin/eventos"),
    },
    {
      id: "servicios",
      title: "Servicios",
      value: serviciosCount,
      icon: ShieldAlert,
      color: "bg-amber-600",
      action: () => router.push("/admin/servicios"),
    },
    {
      id: "instituciones",
      title: "Instituciones",
      value: institucionesCount,
      icon: Building2,
      color: "bg-cyan-600",
      action: () => router.push("/admin/instituciones"),
    },
    {
      id: "cursos",
      title: "Cursos",
      value: cursosCount,
      icon: GraduationCap,
      color: "bg-slate-800",
      action: () => router.push("/admin/cursos"),
    },
    {
      id: "usuarios",
      title: "Usuarios",
      value: usuariosCount,
      icon: Users,
      color: "bg-sky-600",
      action: () => router.push("/admin/usuarios"),
    },
  ]

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="mb-2 text-3xl font-semibold text-slate-900">Dashboard</h1>
          <p className="text-slate-500">
            Lo importante primero, con una sola lectura por tema.
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push("/admin/metricas")}
          className="inline-flex items-center gap-2 self-start rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:border-blue-300 hover:text-blue-600"
        >
          <BarChart3 className="h-4 w-4" />
          Ver metricas
        </button>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <button
          onClick={() => router.push("/admin/contactos")}
          className="rounded-3xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="mb-4 flex items-center justify-between">
            <div className="rounded-2xl bg-rose-600 p-3 text-white">
              <Mail className="h-6 w-6" />
            </div>
            <span className="inline-flex min-w-10 items-center justify-center rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-800">
              {newContactosCount}
            </span>
          </div>
          <h3 className="text-lg font-semibold text-slate-900">Contactos pendientes</h3>
          <p className="mt-2 text-sm text-slate-500">Mensajes nuevos esperando revision.</p>
        </button>

        <button
          onClick={() => router.push("/admin/eventos")}
          className="rounded-3xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="mb-4 flex items-center justify-between">
            <div className="rounded-2xl bg-emerald-600 p-3 text-white">
              <Calendar className="h-6 w-6" />
            </div>
            <span className="inline-flex min-w-10 items-center justify-center rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-800">
              {newEventosCount}
            </span>
          </div>
          <h3 className="text-lg font-semibold text-slate-900">Eventos por revisar</h3>
          <p className="mt-2 text-sm text-slate-500">Borradores o ingresos nuevos desde fuera.</p>
        </button>

        <button
          onClick={() => router.push("/admin/comercios")}
          className="rounded-3xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="mb-4 flex items-center justify-between">
            <div className="rounded-2xl bg-blue-600 p-3 text-white">
              <Store className="h-6 w-6" />
            </div>
            <span className="inline-flex min-w-10 items-center justify-center rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-800">
              {newComerciosCount}
            </span>
          </div>
          <h3 className="text-lg font-semibold text-slate-900">Comercios por revisar</h3>
          <p className="mt-2 text-sm text-slate-500">Altas nuevas pendientes de publicar.</p>
        </button>

        <button
          onClick={() => router.push("/admin/metricas")}
          className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="mb-4 flex items-center justify-between">
            <div className="rounded-2xl bg-white/10 p-3 text-white">
              <BarChart3 className="h-6 w-6" />
            </div>
            <span className="text-3xl font-semibold text-white">{totalInteractions}</span>
          </div>
          <h3 className="text-lg font-semibold text-white">Interacciones</h3>
          <p className="mt-2 text-sm text-slate-300">WhatsApp, compartir, ver mas, sitio/redes y corazones.</p>
        </button>
      </div>

      <div className="mb-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
              Suscripciones
            </p>
            <h2 className="text-2xl font-semibold text-slate-900">Estado de planes</h2>
            <p className="text-sm text-slate-500">
              Comercios, servicios y cursos agrupados por estado de pago.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
            <CreditCard className="h-4 w-4" />
            {totalTrackedSubscriptions} fichas con suscripcion
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Pendientes",
              value: pendingSubscriptionsCount,
              text: "Esperando confirmacion o revision.",
              className: "rounded-2xl border border-slate-200 bg-slate-50 p-5 text-left transition hover:border-blue-300 hover:bg-blue-50/40",
              color: "text-slate-500",
            },
            {
              label: "Activas",
              value: activeSubscriptionsCount,
              text: "Planes en curso y visibles para seguimiento.",
              className: "rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 text-left transition hover:border-emerald-300 hover:bg-emerald-50",
              color: "text-emerald-700",
            },
            {
              label: "Pausadas",
              value: pausedSubscriptionsCount,
              text: "Mantienen plan pero hoy no estan corriendo.",
              className: "rounded-2xl border border-amber-200 bg-amber-50/70 p-5 text-left transition hover:border-amber-300 hover:bg-amber-50",
              color: "text-amber-700",
            },
            {
              label: "Canceladas",
              value: cancelledSubscriptionsCount,
              text: "Planes dados de baja o ya no vigentes.",
              className: "rounded-2xl border border-rose-200 bg-rose-50/70 p-5 text-left transition hover:border-rose-300 hover:bg-rose-50",
              color: "text-rose-700",
            },
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => router.push("/admin/suscripciones")}
              className={item.className}
            >
              <div className={`text-sm font-medium ${item.color}`}>{item.label}</div>
              <div className="mt-2 text-3xl font-semibold text-slate-900">{item.value}</div>
              <p className="mt-2 text-sm text-slate-500">{item.text}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-6">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <button
              key={stat.id}
              onClick={stat.action}
              className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="mb-3 flex items-center justify-between">
                <div className={`${stat.color} rounded-xl p-3 text-white`}>
                  <Icon className="h-6 w-6" />
                </div>
                <span className="text-2xl font-semibold text-slate-900">{stat.value}</span>
              </div>
              <h3 className="text-sm text-slate-500">{stat.title}</h3>
            </button>
          )
        })}
      </div>

      {metricsLoading ? (
        <div className="rounded-[32px] border border-slate-200 bg-white p-10 text-slate-500 shadow-sm">
          Cargando metricas del sitio...
        </div>
      ) : (
        <div className="space-y-8">
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Visitantes del sitio"
              value={visitors30Days}
              description="Visitantes unicos ultimos 30 dias"
              icon={<Eye className="h-5 w-5 text-sky-700" />}
              tone="bg-sky-100"
            />
            <MetricCard
              label="Vistas del sitio"
              value={pageViews30Days}
              description="Registros de visita ultimos 30 dias"
              icon={<Store className="h-5 w-5 text-violet-700" />}
              tone="bg-violet-100"
            />
            <MetricCard
              label="Actividad reciente"
              value={recentActivity.interactions15Days}
              description="Interacciones ultimos 15 dias"
              icon={<BarChart3 className="h-5 w-5 text-emerald-700" />}
              tone="bg-emerald-100"
            />
            <MetricCard
              label="Contactos rapidos"
              value={recentActivity.whatsapp15Days}
              description="WhatsApp ultimos 15 dias"
              icon={<MessageCircle className="h-5 w-5 text-green-700" />}
              tone="bg-green-100"
            />
          </section>

          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Paginas visitadas
                </div>
                <h2 className="mt-2 text-2xl font-semibold text-slate-950">Todas las paginas con actividad</h2>
                <p className="mt-2 text-sm leading-7 text-slate-500">{sectionSummary}</p>
              </div>
              <div className="space-y-4">
                {sectionTotals.length === 0 ? (
                  <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                    Aun no hay visitas registradas para mostrar.
                  </div>
                ) : (
                  sectionTotals.map((section) => (
                    <div key={section.label} className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                      <div className="flex items-center justify-between gap-4">
                        <div className="text-base font-semibold text-slate-900">{section.label}</div>
                        <div className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm">
                          {section.value}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Actividad reciente
                </div>
                <h2 className="mt-2 text-2xl font-semibold text-slate-950">Ultimas 48 horas</h2>
                <p className="mt-2 text-sm leading-7 text-slate-500">
                  Un resumen rapido de lo ultimo que paso dentro de Hola Varela.
                </p>
              </div>
              <div className="space-y-4">
                {recentMessages.length === 0 ? (
                  <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                    Aun no hay novedades registradas en las ultimas 48 horas.
                  </div>
                ) : (
                  recentMessages.map((item) => (
                    <ActivityMessage key={item.label} label={item.label} />
                  ))
                )}
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  )
}

function MetricCard({
  label,
  value,
  description,
  icon,
  tone,
}: {
  label: string
  value: number
  description: string
  icon: React.ReactNode
  tone: string
}) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</div>
          <div className="mt-3 text-4xl font-semibold text-slate-950">{value}</div>
        </div>
        <div className={`rounded-2xl p-3 ${tone}`}>{icon}</div>
      </div>
      <div className="text-sm text-slate-500">{description}</div>
    </div>
  )
}

function ActivityMessage({ label }: { label: string }) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-5 py-4 text-sm font-medium text-slate-700">
      {label}
    </div>
  )
}
