'use client'

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import {
  ArrowLeft,
  BarChart3,
  FileText,
  Heart,
  MessageCircle,
  MousePointerClick,
  Share2,
} from "lucide-react"
import { supabase } from "../../supabase"
import { buildEventLikeTotal } from "../../lib/eventLikes"
import {
  buildExternalLinkTotals,
  buildExternalLinkTypeTotals,
  emptyExternalLinkTotals,
  emptyExternalLinkTypeTotals,
  EXTERNAL_LINK_SECTIONS,
  type ExternalLinkTotals,
  type ExternalLinkTypeTotals,
} from "../../lib/externalLinkTracking"
import { SHARE_SECTIONS, buildShareTotals, emptyShareTotals, type ShareTotals } from "../../lib/shareTracking"
import {
  WHATSAPP_SECTIONS,
  buildWhatsappTotals,
  emptyWhatsappTotals,
  type WhatsappTotals,
} from "../../lib/whatsappTracking"
import {
  VIEW_MORE_SECTIONS,
  buildViewMoreTotals,
  emptyViewMoreTotals,
  type ViewMoreTotals,
} from "../../lib/viewMoreTracking"
import { recordSiteVisit } from "../../lib/contentVisits"
import type { SiteTrafficSnapshot } from "../../../lib/siteTrafficSummary"

type MetricRow = {
  section: string | null
  created_at: string | null
}

type ExternalLinkMetricRow = MetricRow & {
  link_type: string | null
}

type EventLikeMetricRow = {
  created_at: string | null
}

type InteractionRow = {
  created_at: string | null
}

type RecentSiteActivity = {
  interactions15Days: number
  whatsapp15Days: number
}

type RecentMessage = {
  label: string
  value: number
}

type TrendPoint = {
  day: string
  whatsapp: number
  compartir: number
  verMas: number
  enlaces: number
  corazones: number
}

const EMPTY_SITE_TRAFFIC: SiteTrafficSnapshot = {
  configured: false,
  visitors: null,
  pageViews: null,
  periodLabel: "Ultimos 30 dias",
  updatedAt: null,
}

const SECTION_LABELS: Record<string, string> = {
  comercios: "Comercios",
  eventos: "Eventos",
  cursos: "Cursos",
  servicios: "Servicios",
  instituciones: "Instituciones",
}

const LINK_TYPE_LABELS: Record<string, string> = {
  web: "Sitio web",
  instagram: "Instagram",
  facebook: "Facebook",
}

const formatDayKey = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

const buildLast7Days = () => {
  const days: string[] = []
  const today = new Date()
  for (let offset = 6; offset >= 0; offset -= 1) {
    const current = new Date(today)
    current.setDate(today.getDate() - offset)
    days.push(formatDayKey(current))
  }
  return days
}

const getIsoDaysAgo = (days: number) => {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toISOString()
}

const buildDailyTrend = (
  shareRows: MetricRow[],
  whatsappRows: MetricRow[],
  viewMoreRows: MetricRow[],
  externalLinkRows: ExternalLinkMetricRow[],
  eventLikeRows: EventLikeMetricRow[]
): TrendPoint[] => {
  const last7Days = buildLast7Days()
  const seed = last7Days.reduce<Record<string, TrendPoint>>((acc, day) => {
    acc[day] = {
      day,
      whatsapp: 0,
      compartir: 0,
      verMas: 0,
      enlaces: 0,
      corazones: 0,
    }
    return acc
  }, {})

  const addRows = (
    rows: Array<{ created_at: string | null }>,
    key: "whatsapp" | "compartir" | "verMas" | "enlaces" | "corazones"
  ) => {
    rows.forEach((row) => {
      if (!row.created_at) return
      const date = new Date(row.created_at)
      if (Number.isNaN(date.getTime())) return
      const day = formatDayKey(date)
      if (!seed[day]) return
      seed[day][key] += 1
    })
  }

  addRows(shareRows, "compartir")
  addRows(whatsappRows, "whatsapp")
  addRows(viewMoreRows, "verMas")
  addRows(externalLinkRows, "enlaces")
  addRows(eventLikeRows, "corazones")

  return last7Days.map((day) => seed[day])
}

const withFallback = async <T,>(
  promiseLike: PromiseLike<{ data: T[] | null; error: unknown }>,
  label: string
) => {
  const { data, error } = await promiseLike
  if (error) {
    console.warn(`No se pudo cargar ${label}.`, error)
    return [] as T[]
  }
  return (data || []) as T[]
}

const maxValue = (values: number[]) => Math.max(...values, 1)

const formatMetricValue = (value: number | null) =>
  value === null ? "Sin dato" : new Intl.NumberFormat("es-UY").format(value)

const formatUpdatedAt = (value: string | null) => {
  if (!value) return ""

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""

  return date.toLocaleDateString("es-UY", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function SectionBars({
  title,
  subtitle,
  icon,
  barClass,
  iconClass,
  totals,
  sections,
}: {
  title: string
  subtitle: string
  icon: React.ReactNode
  barClass: string
  iconClass: string
  totals: Record<string, number>
  sections: readonly string[]
}) {
  const largest = maxValue(sections.map((section) => totals[section] || 0))

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
          <p className="text-sm text-slate-500">{subtitle}</p>
        </div>
        <div className={`rounded-2xl p-3 ${iconClass}`}>{icon}</div>
      </div>

      <div className="space-y-4">
        {sections.map((section) => {
          const value = totals[section] || 0
          const width = `${(value / largest) * 100}%`

          return (
            <div key={section} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-slate-700">
                  {SECTION_LABELS[section] || section}
                </span>
                <span className="text-slate-500">{value}</span>
              </div>
              <div className="h-3 rounded-full bg-slate-100">
                <div className={`h-3 rounded-full ${barClass}`} style={{ width }} />
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function MetricCard({
  title,
  value,
  helper,
  icon,
  tone,
}: {
  title: string
  value: string | number
  helper: string
  icon: React.ReactNode
  tone: string
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <h2 className="text-3xl font-semibold text-slate-900">{value}</h2>
        </div>
        <div className={`rounded-2xl p-3 ${tone}`}>{icon}</div>
      </div>
      <p className="text-sm text-slate-500">{helper}</p>
    </div>
  )
}

function LinkTypeCard({
  label,
  value,
}: {
  label: string
  value: number
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-slate-900">{value}</div>
    </div>
  )
}

export default function AdminMetricasPage() {
  const [activeTab, setActiveTab] = useState<"interacciones" | "vista_usuario">(
    "interacciones"
  )
  const [shareTotals, setShareTotals] = useState<ShareTotals>(emptyShareTotals())
  const [whatsappTotals, setWhatsappTotals] = useState<WhatsappTotals>(emptyWhatsappTotals())
  const [viewMoreTotals, setViewMoreTotals] = useState<ViewMoreTotals>(emptyViewMoreTotals())
  const [externalLinkTotals, setExternalLinkTotals] = useState<ExternalLinkTotals>(emptyExternalLinkTotals())
  const [externalLinkTypeTotals, setExternalLinkTypeTotals] = useState<ExternalLinkTypeTotals>(
    emptyExternalLinkTypeTotals()
  )
  const [eventLikeTotal, setEventLikeTotal] = useState(0)
  const [dailyTrend, setDailyTrend] = useState<TrendPoint[]>([])
  const [recentMessages, setRecentMessages] = useState<RecentMessage[]>([])
  const [recentSiteActivity, setRecentSiteActivity] = useState<RecentSiteActivity>({
    interactions15Days: 0,
    whatsapp15Days: 0,
  })
  const [siteTraffic, setSiteTraffic] = useState<SiteTrafficSnapshot>(EMPTY_SITE_TRAFFIC)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadMetrics = async () => {
      const [
        siteTrafficResponse,
        { data: shareRows },
        { data: whatsappRows },
        { data: viewMoreRows },
        { data: externalLinkRows },
        { data: eventLikeRows },
        shareRows15,
        whatsappRows15,
        viewMoreRows15,
        externalRows15,
        likesRows15,
        contactRows48,
        likesRows48,
        eventRows48,
        commerceRows48,
        serviceRows48,
        courseRows48,
        institutionRows48,
      ] = await Promise.all([
        fetch("/api/metricas/trafico")
          .then(async (response) => {
            if (!response.ok) {
              throw new Error("No pudimos cargar el trafico general.")
            }

            return (await response.json()) as SiteTrafficSnapshot
          })
          .catch((error) => {
            console.warn("No se pudo cargar el trafico general del sitio.", error)
            return EMPTY_SITE_TRAFFIC
          }),
        supabase.from("share_events").select("section, created_at"),
        supabase.from("whatsapp_clicks").select("section, created_at"),
        supabase.from("view_more_clicks").select("section, created_at"),
        supabase.from("external_link_clicks").select("section, link_type, created_at"),
        supabase.from("event_likes").select("created_at"),
        withFallback<InteractionRow>(
          supabase.from("share_events").select("created_at").gte("created_at", getIsoDaysAgo(15)),
          "los compartidos de 15 dias"
        ),
        withFallback<InteractionRow>(
          supabase
            .from("whatsapp_clicks")
            .select("created_at")
            .gte("created_at", getIsoDaysAgo(15)),
          "los clics de WhatsApp de 15 dias"
        ),
        withFallback<InteractionRow>(
          supabase
            .from("view_more_clicks")
            .select("created_at")
            .gte("created_at", getIsoDaysAgo(15)),
          "los clics en ver mas de 15 dias"
        ),
        withFallback<InteractionRow>(
          supabase
            .from("external_link_clicks")
            .select("created_at")
            .gte("created_at", getIsoDaysAgo(15)),
          "los clics externos de 15 dias"
        ),
        withFallback<InteractionRow>(
          supabase.from("event_likes").select("created_at").gte("created_at", getIsoDaysAgo(15)),
          "los likes de 15 dias"
        ),
        withFallback<InteractionRow>(
          supabase
            .from("contacto_solicitudes")
            .select("created_at")
            .gte("created_at", getIsoDaysAgo(2)),
          "los mensajes de 48 horas"
        ),
        withFallback<InteractionRow>(
          supabase.from("event_likes").select("created_at").gte("created_at", getIsoDaysAgo(2)),
          "los likes de 48 horas"
        ),
        withFallback<InteractionRow>(
          supabase.from("eventos").select("created_at").gte("created_at", getIsoDaysAgo(2)),
          "los eventos nuevos de 48 horas"
        ),
        withFallback<InteractionRow>(
          supabase.from("comercios").select("created_at").gte("created_at", getIsoDaysAgo(2)),
          "los comercios nuevos de 48 horas"
        ),
        withFallback<InteractionRow>(
          supabase.from("servicios").select("created_at").gte("created_at", getIsoDaysAgo(2)),
          "los servicios nuevos de 48 horas"
        ),
        withFallback<InteractionRow>(
          supabase.from("cursos").select("created_at").gte("created_at", getIsoDaysAgo(2)),
          "los cursos nuevos de 48 horas"
        ),
        withFallback<InteractionRow>(
          supabase.from("instituciones").select("created_at").gte("created_at", getIsoDaysAgo(2)),
          "las instituciones nuevas de 48 horas"
        ),
      ])

      const safeShareRows = (shareRows || []) as MetricRow[]
      const safeWhatsappRows = (whatsappRows || []) as MetricRow[]
      const safeViewMoreRows = (viewMoreRows || []) as MetricRow[]
      const safeExternalLinkRows = (externalLinkRows || []) as ExternalLinkMetricRow[]
      const safeEventLikeRows = (eventLikeRows || []) as EventLikeMetricRow[]

      setShareTotals(buildShareTotals(safeShareRows))
      setWhatsappTotals(buildWhatsappTotals(safeWhatsappRows))
      setViewMoreTotals(buildViewMoreTotals(safeViewMoreRows))
      setExternalLinkTotals(buildExternalLinkTotals(safeExternalLinkRows))
      setExternalLinkTypeTotals(buildExternalLinkTypeTotals(safeExternalLinkRows))
      setEventLikeTotal(buildEventLikeTotal(safeEventLikeRows))
      setDailyTrend(
        buildDailyTrend(
          safeShareRows,
          safeWhatsappRows,
          safeViewMoreRows,
          safeExternalLinkRows,
          safeEventLikeRows
        )
      )

      const listings48 =
        commerceRows48.length +
        serviceRows48.length +
        courseRows48.length +
        institutionRows48.length

      setRecentSiteActivity({
        interactions15Days:
          shareRows15.length +
          whatsappRows15.length +
          viewMoreRows15.length +
          externalRows15.length +
          likesRows15.length,
        whatsapp15Days: whatsappRows15.length,
      })
      setSiteTraffic(siteTrafficResponse)
      setRecentMessages(
        [
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
      setLoading(false)
    }

    void loadMetrics()
  }, [])

  useEffect(() => {
    void recordSiteVisit("admin-metricas", "Metricas admin")
  }, [])

  const totalShare = useMemo(
    () => Object.values(shareTotals).reduce((sum, value) => sum + value, 0),
    [shareTotals]
  )
  const totalWhatsapp = useMemo(
    () => Object.values(whatsappTotals).reduce((sum, value) => sum + value, 0),
    [whatsappTotals]
  )
  const totalViewMore = useMemo(
    () => Object.values(viewMoreTotals).reduce((sum, value) => sum + value, 0),
    [viewMoreTotals]
  )
  const totalExternalLinks = useMemo(
    () => Object.values(externalLinkTotals).reduce((sum, value) => sum + value, 0),
    [externalLinkTotals]
  )

  const trendMax = maxValue(
    dailyTrend.flatMap((item) => [
      item.whatsapp,
      item.compartir,
      item.verMas,
      item.enlaces,
      item.corazones,
    ])
  )
  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">
            Metricas
          </p>
          <h1 className="text-3xl font-semibold text-slate-900">
            Interacciones del sitio
          </h1>
          <p className="mt-2 text-slate-500">
            Seguimiento de WhatsApp, compartir, ver mas, sitios/redes y corazones.
          </p>
        </div>
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 self-start rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al dashboard
        </Link>
      </div>

      <div className="mb-8 flex flex-wrap gap-3">
        {[
          { id: "interacciones" as const, label: "Interacciones" },
          { id: "vista_usuario" as const, label: "Resumen interno" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              activeTab === tab.id
                ? "bg-slate-900 text-white"
                : "border border-slate-200 bg-white text-slate-700 hover:border-sky-300 hover:text-sky-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-slate-500 shadow-sm">
          Cargando metricas...
        </div>
      ) : (
        activeTab === "interacciones" ? (
        <>
          <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
            <MetricCard
              title="WhatsApp"
              value={totalWhatsapp}
              helper="Clics de contacto directos."
              icon={<MessageCircle className="h-5 w-5 text-green-700" />}
              tone="bg-green-100 text-green-700"
            />
            <MetricCard
              title="Compartir"
              value={totalShare}
              helper="Veces que compartieron contenido."
              icon={<Share2 className="h-5 w-5 text-violet-700" />}
              tone="bg-violet-100 text-violet-700"
            />
            <MetricCard
              title="Ver mas"
              value={totalViewMore}
              helper="Aperturas de detalle o perfil ampliado."
              icon={<FileText className="h-5 w-5 text-sky-700" />}
              tone="bg-sky-100 text-sky-700"
            />
            <MetricCard
              title="Sitio y redes"
              value={totalExternalLinks}
              helper="Botones de web, Instagram y Facebook."
              icon={<MousePointerClick className="h-5 w-5 text-amber-700" />}
              tone="bg-amber-100 text-amber-700"
            />
            <MetricCard
              title="Corazones"
              value={eventLikeTotal}
              helper="Likes recibidos por los eventos."
              icon={<Heart className="h-5 w-5 text-rose-700" />}
              tone="bg-rose-100 text-rose-700"
            />
          </div>

          <section className="mb-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Ultimos 7 dias</h2>
                <p className="text-sm text-slate-500">Comparacion diaria de interacciones.</p>
              </div>
              <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
                <BarChart3 className="h-5 w-5" />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-7">
              {dailyTrend.map((item) => (
                <div
                  key={item.day}
                  className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                >
                  <div className="mb-4 text-sm font-medium text-slate-600">
                    {new Date(`${item.day}T00:00:00`).toLocaleDateString("es-UY", {
                      day: "2-digit",
                      month: "short",
                    })}
                  </div>

                  <div className="space-y-3">
                    {[
                      { label: "WhatsApp", value: item.whatsapp, color: "bg-green-500" },
                      { label: "Compartir", value: item.compartir, color: "bg-violet-500" },
                      { label: "Ver mas", value: item.verMas, color: "bg-sky-500" },
                      { label: "Sitio/redes", value: item.enlaces, color: "bg-amber-500" },
                      { label: "Corazones", value: item.corazones, color: "bg-rose-500" },
                    ].map((metric) => (
                      <div key={metric.label}>
                        <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                          <span>{metric.label}</span>
                          <span>{metric.value}</span>
                        </div>
                        <div className="h-2 rounded-full bg-white">
                          <div
                            className={`h-2 rounded-full ${metric.color}`}
                            style={{ width: `${(metric.value / trendMax) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-3">
            <SectionBars
              title="WhatsApp"
              subtitle="Desglose por seccion"
              icon={<MessageCircle className="h-5 w-5 text-green-700" />}
              barClass="bg-green-500"
              iconClass="bg-green-100"
              totals={whatsappTotals}
              sections={WHATSAPP_SECTIONS}
            />
            <SectionBars
              title="Compartir"
              subtitle="Contenido compartido por seccion"
              icon={<Share2 className="h-5 w-5 text-violet-700" />}
              barClass="bg-violet-500"
              iconClass="bg-violet-100"
              totals={shareTotals}
              sections={SHARE_SECTIONS}
            />
            <SectionBars
              title="Ver mas"
              subtitle="Aperturas por seccion"
              icon={<FileText className="h-5 w-5 text-sky-700" />}
              barClass="bg-sky-500"
              iconClass="bg-sky-100"
              totals={viewMoreTotals}
              sections={VIEW_MORE_SECTIONS}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.4fr_0.6fr]">
            <SectionBars
              title="Sitio y redes"
              subtitle="Clics en web, Instagram y Facebook"
              icon={<MousePointerClick className="h-5 w-5 text-amber-700" />}
              barClass="bg-amber-500"
              iconClass="bg-amber-100"
              totals={externalLinkTotals}
              sections={EXTERNAL_LINK_SECTIONS}
            />

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-slate-900">Tipos de enlace</h2>
                <p className="text-sm text-slate-500">Que botones usan mas dentro del sitio.</p>
              </div>

              <div className="space-y-3">
                {Object.entries(externalLinkTypeTotals).map(([type, value]) => (
                  <LinkTypeCard
                    key={type}
                    label={LINK_TYPE_LABELS[type] || type}
                    value={value}
                  />
                ))}
              </div>

              <div className="mt-6 rounded-2xl bg-rose-50 p-4">
                <div className="mb-1 text-sm text-rose-700">Corazones en eventos</div>
                <div className="text-2xl font-semibold text-slate-900">{eventLikeTotal}</div>
              </div>
            </section>
          </div>
        </>
        ) : (
          <div className="space-y-8">
            <section className="grid gap-4 md:grid-cols-2">
              <MetricCard
                title="Actividad reciente"
                value={recentSiteActivity.interactions15Days}
                helper="Interacciones ultimos 15 dias"
                icon={<BarChart3 className="h-5 w-5 text-emerald-700" />}
                tone="bg-emerald-100 text-emerald-700"
              />
              <MetricCard
                title="Contactos rapidos"
                value={recentSiteActivity.whatsapp15Days}
                helper="WhatsApp ultimos 15 dias"
                icon={<MessageCircle className="h-5 w-5 text-green-700" />}
                tone="bg-green-100 text-green-700"
              />
            </section>

            <div className="grid gap-6">
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-5">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Trafico general
                  </div>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                    Visitantes y page views
                  </h2>
                  <p className="mt-2 text-sm leading-7 text-slate-500">
                    Resumen general del trafico de la web tomado desde Vercel Analytics.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <MetricCard
                    title="Visitantes"
                    value={formatMetricValue(siteTraffic.visitors)}
                    helper={siteTraffic.periodLabel}
                    icon={<BarChart3 className="h-5 w-5 text-sky-700" />}
                    tone="bg-sky-100 text-sky-700"
                  />
                  <MetricCard
                    title="Page views"
                    value={formatMetricValue(siteTraffic.pageViews)}
                    helper={siteTraffic.periodLabel}
                    icon={<MousePointerClick className="h-5 w-5 text-violet-700" />}
                    tone="bg-violet-100 text-violet-700"
                  />
                </div>

                {!siteTraffic.configured ? (
                  <div className="mt-4 rounded-[24px] border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                    Aun no cargamos los valores de trafico general para mostrar aqui.
                  </div>
                ) : null}
                {siteTraffic.updatedAt ? (
                  <div className="mt-4 text-xs text-slate-400">
                    Actualizado: {formatUpdatedAt(siteTraffic.updatedAt)}
                  </div>
                ) : null}
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-5">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Actividad reciente
                  </div>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-950">Ultimas 48 horas</h2>
                  <p className="mt-2 text-sm leading-7 text-slate-500">
                    El mismo resumen general que hoy ve el usuario.
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
        )
      )}
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
