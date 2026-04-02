'use client'

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, BarChart3, FileText, MessageCircle, Share2 } from "lucide-react"
import { supabase } from "../../supabase"
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

type MetricRow = {
  section: string | null
  created_at: string | null
}

type TrendPoint = {
  day: string
  whatsapp: number
  compartir: number
  verMas: number
}

const SECTION_LABELS: Record<string, string> = {
  comercios: "Comercios",
  eventos: "Eventos",
  cursos: "Cursos",
  servicios: "Servicios",
  instituciones: "Instituciones",
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

const buildDailyTrend = (
  shareRows: MetricRow[],
  whatsappRows: MetricRow[],
  viewMoreRows: MetricRow[]
): TrendPoint[] => {
  const last7Days = buildLast7Days()
  const seed = last7Days.reduce<Record<string, TrendPoint>>((acc, day) => {
    acc[day] = { day, whatsapp: 0, compartir: 0, verMas: 0 }
    return acc
  }, {})

  const addRows = (
    rows: MetricRow[],
    key: "whatsapp" | "compartir" | "verMas"
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

  return last7Days.map((day) => seed[day])
}

const maxValue = (values: number[]) => Math.max(...values, 1)

function SectionBars({
  title,
  icon,
  colorClass,
  totals,
  sections,
}: {
  title: string
  icon: React.ReactNode
  colorClass: string
  totals: Record<string, number>
  sections: readonly string[]
}) {
  const largest = maxValue(sections.map((section) => totals[section] || 0))

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
          <p className="text-sm text-slate-500">Distribución por sección</p>
        </div>
        <div className={`rounded-2xl p-3 ${colorClass}`}>{icon}</div>
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
                <div
                  className={`h-3 rounded-full ${colorClass}`}
                  style={{ width }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

export default function AdminMetricasPage() {
  const [shareTotals, setShareTotals] = useState<ShareTotals>(emptyShareTotals())
  const [whatsappTotals, setWhatsappTotals] = useState<WhatsappTotals>(emptyWhatsappTotals())
  const [viewMoreTotals, setViewMoreTotals] = useState<ViewMoreTotals>(emptyViewMoreTotals())
  const [dailyTrend, setDailyTrend] = useState<TrendPoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadMetrics = async () => {
      const [{ data: shareRows }, { data: whatsappRows }, { data: viewMoreRows }] =
        await Promise.all([
          supabase.from("share_events").select("section, created_at"),
          supabase.from("whatsapp_clicks").select("section, created_at"),
          supabase.from("view_more_clicks").select("section, created_at"),
        ])

      const safeShareRows = (shareRows || []) as MetricRow[]
      const safeWhatsappRows = (whatsappRows || []) as MetricRow[]
      const safeViewMoreRows = (viewMoreRows || []) as MetricRow[]

      setShareTotals(buildShareTotals(safeShareRows))
      setWhatsappTotals(buildWhatsappTotals(safeWhatsappRows))
      setViewMoreTotals(buildViewMoreTotals(safeViewMoreRows))
      setDailyTrend(buildDailyTrend(safeShareRows, safeWhatsappRows, safeViewMoreRows))
      setLoading(false)
    }

    void loadMetrics()
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

  const trendMax = maxValue(
    dailyTrend.flatMap((item) => [item.whatsapp, item.compartir, item.verMas])
  )

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">
            Métricas
          </p>
          <h1 className="text-3xl font-semibold text-slate-900">
            Interacciones del sitio
          </h1>
          <p className="mt-2 text-slate-500">
            Seguimiento de WhatsApp, compartir y ver más.
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

      {loading ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-slate-500 shadow-sm">
          Cargando métricas...
        </div>
      ) : (
        <>
          <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">WhatsApp</p>
                  <h2 className="text-3xl font-semibold text-slate-900">{totalWhatsapp}</h2>
                </div>
                <div className="rounded-2xl bg-green-100 p-3 text-green-700">
                  <MessageCircle className="h-5 w-5" />
                </div>
              </div>
              <p className="text-sm text-slate-500">Clics de contacto registrados</p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Compartir</p>
                  <h2 className="text-3xl font-semibold text-slate-900">{totalShare}</h2>
                </div>
                <div className="rounded-2xl bg-violet-100 p-3 text-violet-700">
                  <Share2 className="h-5 w-5" />
                </div>
              </div>
              <p className="text-sm text-slate-500">Veces que compartieron contenido</p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Ver más</p>
                  <h2 className="text-3xl font-semibold text-slate-900">{totalViewMore}</h2>
                </div>
                <div className="rounded-2xl bg-sky-100 p-3 text-sky-700">
                  <FileText className="h-5 w-5" />
                </div>
              </div>
              <p className="text-sm text-slate-500">Aperturas de detalle o ficha</p>
            </div>
          </div>

          <section className="mb-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Últimos 7 días</h2>
                <p className="text-sm text-slate-500">Comparación diaria de interacciones</p>
              </div>
              <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
                <BarChart3 className="h-5 w-5" />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-7">
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
                      {
                        label: "WhatsApp",
                        value: item.whatsapp,
                        color: "bg-green-500",
                      },
                      {
                        label: "Compartir",
                        value: item.compartir,
                        color: "bg-violet-500",
                      },
                      {
                        label: "Ver más",
                        value: item.verMas,
                        color: "bg-sky-500",
                      },
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

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <SectionBars
              title="WhatsApp"
              icon={<MessageCircle className="h-5 w-5 text-green-700" />}
              colorClass="bg-green-500"
              totals={whatsappTotals}
              sections={WHATSAPP_SECTIONS}
            />
            <SectionBars
              title="Compartir"
              icon={<Share2 className="h-5 w-5 text-violet-700" />}
              colorClass="bg-violet-500"
              totals={shareTotals}
              sections={SHARE_SECTIONS}
            />
            <SectionBars
              title="Ver más"
              icon={<FileText className="h-5 w-5 text-sky-700" />}
              colorClass="bg-sky-500"
              totals={viewMoreTotals}
              sections={VIEW_MORE_SECTIONS}
            />
          </div>
        </>
      )}
    </div>
  )
}
