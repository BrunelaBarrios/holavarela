'use client'

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, BarChart3, Eye, FileText, MessageCircle, Share2 } from "lucide-react"
import { supabase } from "../../supabase"

type VisitRow = {
  section: string | null
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
  visitors15Days: number
  interactions15Days: number
  shares15Days: number
  whatsapp15Days: number
}

const SECTION_LABELS: Record<string, string> = {
  comercios: "Comercios",
  eventos: "Eventos",
  cursos: "Cursos",
  servicios: "Servicios",
  instituciones: "Instituciones",
}

const getIsoDaysAgo = (days: number) => {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toISOString()
}

const countUniqueBrowsers = (rows: Array<{ browser_key: string | null }>) =>
  new Set(rows.map((row) => row.browser_key).filter((key): key is string => Boolean(key))).size

const buildSectionTotals = (rows: VisitRow[]): SectionTotal[] => {
  const totals = rows.reduce<Record<string, number>>((acc, row) => {
    const section = row.section
    if (!section) return acc
    acc[section] = (acc[section] || 0) + 1
    return acc
  }, {})

  return Object.entries(totals)
    .map(([section, value]) => ({
      label: SECTION_LABELS[section] || section,
      value,
    }))
    .sort((a, b) => b.value - a.value)
}

export default function UsuariosMetricasHolaVarelaPage() {
  const [loading, setLoading] = useState(true)
  const [visitors30Days, setVisitors30Days] = useState(0)
  const [pageViews30Days, setPageViews30Days] = useState(0)
  const [sectionTotals, setSectionTotals] = useState<SectionTotal[]>([])
  const [recentActivity, setRecentActivity] = useState<RecentActivity>({
    visitors15Days: 0,
    interactions15Days: 0,
    shares15Days: 0,
    whatsapp15Days: 0,
  })

  useEffect(() => {
    const loadMetrics = async () => {
      const since30 = getIsoDaysAgo(30)
      const since15 = getIsoDaysAgo(15)

      const [
        { data: visitRows30, error: visits30Error },
        { data: visitRows15, error: visits15Error },
        { data: shareRows15, error: shares15Error },
        { data: whatsappRows15, error: whatsapp15Error },
        { data: viewMoreRows15, error: viewMore15Error },
        { data: externalRows15, error: external15Error },
        { data: likesRows15, error: likes15Error },
      ] = await Promise.all([
        supabase.from("content_visits").select("section, browser_key, created_at").gte("created_at", since30),
        supabase.from("content_visits").select("browser_key, created_at").gte("created_at", since15),
        supabase.from("share_events").select("created_at").gte("created_at", since15),
        supabase.from("whatsapp_clicks").select("created_at").gte("created_at", since15),
        supabase.from("view_more_clicks").select("created_at").gte("created_at", since15),
        supabase.from("external_link_clicks").select("created_at").gte("created_at", since15),
        supabase.from("event_likes").select("created_at").gte("created_at", since15),
      ])

      if (
        visits30Error ||
        visits15Error ||
        shares15Error ||
        whatsapp15Error ||
        viewMore15Error ||
        external15Error ||
        likes15Error
      ) {
        console.error("No se pudieron cargar las métricas de Hola Varela.", {
          visits30Error,
          visits15Error,
          shares15Error,
          whatsapp15Error,
          viewMore15Error,
          external15Error,
          likes15Error,
        })
        setLoading(false)
        return
      }

      const safeVisitRows30 = (visitRows30 || []) as VisitRow[]
      const safeVisitRows15 = (visitRows15 || []) as VisitRow[]
      const safeShareRows15 = (shareRows15 || []) as InteractionRow[]
      const safeWhatsappRows15 = (whatsappRows15 || []) as InteractionRow[]
      const safeViewMoreRows15 = (viewMoreRows15 || []) as InteractionRow[]
      const safeExternalRows15 = (externalRows15 || []) as InteractionRow[]
      const safeLikesRows15 = (likesRows15 || []) as InteractionRow[]

      setVisitors30Days(countUniqueBrowsers(safeVisitRows30))
      setPageViews30Days(safeVisitRows30.length)
      setSectionTotals(buildSectionTotals(safeVisitRows30).slice(0, 5))
      setRecentActivity({
        visitors15Days: countUniqueBrowsers(safeVisitRows15),
        interactions15Days:
          safeShareRows15.length +
          safeWhatsappRows15.length +
          safeViewMoreRows15.length +
          safeExternalRows15.length +
          safeLikesRows15.length,
        shares15Days: safeShareRows15.length,
        whatsapp15Days: safeWhatsappRows15.length,
      })
      setLoading(false)
    }

    void loadMetrics()
  }, [])

  const sectionSummary = useMemo(() => {
    if (sectionTotals.length === 0) return "Todavía no hay suficiente actividad para mostrar secciones destacadas."
    return `${sectionTotals[0]?.label || "Sección principal"} lidera el interés reciente dentro de Hola Varela.`
  }, [sectionTotals])

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fbff_0%,#eef7f2_48%,#ffffff_100%)] px-4 py-10 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex rounded-full bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700 shadow-sm">
              Métricas de Hola Varela
            </div>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-slate-950">
              Movimiento general de la plataforma
            </h1>
            <p className="mt-3 max-w-3xl text-lg leading-8 text-slate-600">
              Aquí ves la actividad registrada por Hola Varela dentro de la web, sin mezclarla con métricas externas.
            </p>
          </div>
          <Link
            href="/usuarios"
            className="inline-flex items-center gap-2 self-start rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-300 hover:text-blue-600"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al panel
          </Link>
        </div>

        {loading ? (
          <div className="rounded-[32px] border border-slate-200 bg-white p-10 text-slate-500 shadow-sm">
            Cargando métricas de Hola Varela...
          </div>
        ) : (
          <div className="space-y-8">
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Visitantes del sitio"
                value={visitors30Days}
                description="Visitantes únicos últimos 30 días"
                icon={<Eye className="h-5 w-5 text-sky-700" />}
                tone="bg-sky-100"
              />
              <MetricCard
                label="Vistas del sitio"
                value={pageViews30Days}
                description="Registros de visita últimos 30 días"
                icon={<FileText className="h-5 w-5 text-violet-700" />}
                tone="bg-violet-100"
              />
              <MetricCard
                label="Actividad reciente"
                value={recentActivity.interactions15Days}
                description="Interacciones últimos 15 días"
                icon={<BarChart3 className="h-5 w-5 text-emerald-700" />}
                tone="bg-emerald-100"
              />
              <MetricCard
                label="Contactos rápidos"
                value={recentActivity.whatsapp15Days}
                description="WhatsApp últimos 15 días"
                icon={<MessageCircle className="h-5 w-5 text-green-700" />}
                tone="bg-green-100"
              />
            </section>

            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-5">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Secciones más visitadas
                  </div>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-950">Dónde se mueve más la gente</h2>
                  <p className="mt-2 text-sm leading-7 text-slate-500">{sectionSummary}</p>
                </div>
                <div className="space-y-4">
                  {sectionTotals.length === 0 ? (
                    <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                      Aún no hay visitas registradas para mostrar.
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
                  <h2 className="mt-2 text-2xl font-semibold text-slate-950">Últimos 15 días</h2>
                  <p className="mt-2 text-sm leading-7 text-slate-500">
                    Una lectura rápida del movimiento reciente dentro de Hola Varela.
                  </p>
                </div>
                <div className="space-y-4">
                  <ActivityRow label="Visitantes únicos" value={recentActivity.visitors15Days} icon={<Eye className="h-4 w-4 text-sky-700" />} />
                  <ActivityRow label="Interacciones" value={recentActivity.interactions15Days} icon={<BarChart3 className="h-4 w-4 text-emerald-700" />} />
                  <ActivityRow label="Compartidos" value={recentActivity.shares15Days} icon={<Share2 className="h-4 w-4 text-violet-700" />} />
                  <ActivityRow label="WhatsApp" value={recentActivity.whatsapp15Days} icon={<MessageCircle className="h-4 w-4 text-green-700" />} />
                </div>
              </section>
            </div>
          </div>
        )}
      </div>
    </main>
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

function ActivityRow({
  label,
  value,
  icon,
}: {
  label: string
  value: number
  icon: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between rounded-[24px] border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-white p-3 shadow-sm">{icon}</div>
        <div className="text-sm font-medium text-slate-700">{label}</div>
      </div>
      <div className="text-2xl font-semibold text-slate-950">{value}</div>
    </div>
  )
}
