'use client'

import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Building2,
  Calendar,
  FileText,
  GraduationCap,
  Mail,
  MessageCircle,
  Plus,
  Radio,
  Share2,
  ShieldAlert,
  Store,
  Users,
} from "lucide-react"
import { buildActiveEventsFilter, formatEventDateRange } from "../lib/eventDates"
import { buildShareTotals, emptyShareTotals, type ShareTotals } from "../lib/shareTracking"
import {
  buildWhatsappTotals,
  emptyWhatsappTotals,
  type WhatsappTotals,
} from "../lib/whatsappTracking"
import { supabase } from "../supabase"

type EventoResumen = {
  id: string
  titulo: string
  fecha: string
  fecha_fin?: string | null
}

export default function AdminDashboardPage() {
  const router = useRouter()
  const [comerciosCount, setComerciosCount] = useState(0)
  const [eventosCount, setEventosCount] = useState(0)
  const [serviciosCount, setServiciosCount] = useState(0)
  const [institucionesCount, setInstitucionesCount] = useState(0)
  const [cursosCount, setCursosCount] = useState(0)
  const [contactosCount, setContactosCount] = useState(0)
  const [usuariosCount, setUsuariosCount] = useState(0)
  const [proximosEventos, setProximosEventos] = useState<EventoResumen[]>([])
  const [shareTotals, setShareTotals] = useState<ShareTotals>(emptyShareTotals())
  const [whatsappTotals, setWhatsappTotals] = useState<WhatsappTotals>(emptyWhatsappTotals())

  useEffect(() => {
    const cargarDashboard = async () => {
      const today = new Date().toISOString().slice(0, 10)
      const [
        { count: comercios },
        { count: eventos },
        { count: servicios },
        { count: instituciones },
        { count: cursos },
        { count: contactos },
        { count: usuarios },
        { data: eventosData },
        { data: shareRows },
        { data: whatsappRows },
      ] = await Promise.all([
        supabase.from("comercios").select("*", { count: "exact", head: true }),
        supabase.from("eventos").select("*", { count: "exact", head: true }),
        supabase.from("servicios").select("*", { count: "exact", head: true }),
        supabase.from("instituciones").select("*", { count: "exact", head: true }),
        supabase.from("cursos").select("*", { count: "exact", head: true }),
        supabase.from("contacto_solicitudes").select("*", { count: "exact", head: true }),
        supabase.from("usuarios_registrados").select("*", { count: "exact", head: true }),
        supabase
          .from("eventos")
          .select("id, titulo, fecha, fecha_fin")
          .eq("estado", "activo")
          .or(buildActiveEventsFilter(today))
          .order("fecha", { ascending: true })
          .limit(3),
        supabase.from("share_events").select("section"),
        supabase.from("whatsapp_clicks").select("section"),
      ])

      setComerciosCount(comercios || 0)
      setEventosCount(eventos || 0)
      setServiciosCount(servicios || 0)
      setInstitucionesCount(instituciones || 0)
      setCursosCount(cursos || 0)
      setContactosCount(contactos || 0)
      setUsuariosCount(usuarios || 0)
      setProximosEventos(eventosData || [])
      setShareTotals(buildShareTotals(shareRows || []))
      setWhatsappTotals(buildWhatsappTotals(whatsappRows || []))
    }

    cargarDashboard()
  }, [])

  const stats = [
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
      id: "secciones",
      title: "Cursos",
      value: cursosCount,
      icon: GraduationCap,
      color: "bg-slate-800",
      action: () => router.push("/admin/cursos"),
    },
    {
      id: "contactos",
      title: "Contactos",
      value: contactosCount,
      icon: Mail,
      color: "bg-rose-600",
      action: () => router.push("/admin/contactos"),
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
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-semibold text-slate-900">Dashboard</h1>
        <p className="text-slate-500">Bienvenido al panel de administración</p>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-6">
        {stats.map((stat) => {
          const Icon = stat.icon

          return (
            <button
              key={stat.id}
              onClick={stat.action}
              className="rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className={`${stat.color} rounded-xl p-3 text-white`}>
                  <Icon className="h-6 w-6" />
                </div>
                <span className="text-3xl font-semibold text-slate-900">
                  {stat.value}
                </span>
              </div>
              <h3 className="text-slate-500">{stat.title}</h3>
            </button>
          )
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-900">
              Próximos Eventos
            </h2>
            <Link
              href="/admin/eventos"
              className="text-sm font-medium text-blue-600 transition hover:text-blue-500"
            >
              Ver todos
            </Link>
          </div>

          <div className="space-y-4">
            {proximosEventos.length === 0 ? (
              <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                No hay eventos cargados todavia.
              </div>
            ) : (
              proximosEventos.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center gap-4 rounded-xl bg-slate-50 p-4"
                >
                  <div className="rounded-xl bg-blue-600 p-2 text-white">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-slate-900">{event.titulo}</h4>
                    <p className="text-sm text-slate-500">
                      {formatEventDateRange(event.fecha, event.fecha_fin)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-900">
              Compartidos
            </h2>
            <div className="rounded-xl bg-slate-100 p-2 text-slate-600">
              <Share2 className="h-5 w-5" />
            </div>
          </div>

          <div className="mb-6 grid grid-cols-2 gap-4">
            <div className="rounded-xl bg-blue-50 p-4">
              <div className="text-sm text-slate-500">Comercios</div>
              <div className="mt-1 text-2xl font-semibold text-slate-900">
                {shareTotals.comercios}
              </div>
            </div>
            <div className="rounded-xl bg-emerald-50 p-4">
              <div className="text-sm text-slate-500">Eventos</div>
              <div className="mt-1 text-2xl font-semibold text-slate-900">
                {shareTotals.eventos}
              </div>
            </div>
            <div className="rounded-xl bg-violet-50 p-4">
              <div className="text-sm text-slate-500">Cursos</div>
              <div className="mt-1 text-2xl font-semibold text-slate-900">
                {shareTotals.cursos}
              </div>
            </div>
            <div className="rounded-xl bg-amber-50 p-4">
              <div className="text-sm text-slate-500">Servicios</div>
              <div className="mt-1 text-2xl font-semibold text-slate-900">
                {shareTotals.servicios}
              </div>
            </div>
          </div>

          <h2 className="mb-6 text-xl font-semibold text-slate-900">
            WhatsApp
          </h2>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl bg-green-50 p-4">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <MessageCircle className="h-4 w-4 text-green-600" />
                Comercios
              </div>
              <div className="mt-1 text-2xl font-semibold text-slate-900">
                {whatsappTotals.comercios}
              </div>
            </div>
            <div className="rounded-xl bg-green-50 p-4">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <MessageCircle className="h-4 w-4 text-green-600" />
                Servicios
              </div>
              <div className="mt-1 text-2xl font-semibold text-slate-900">
                {whatsappTotals.servicios}
              </div>
            </div>
            <div className="rounded-xl bg-green-50 p-4">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <MessageCircle className="h-4 w-4 text-green-600" />
                Cursos
              </div>
              <div className="mt-1 text-2xl font-semibold text-slate-900">
                {whatsappTotals.cursos}
              </div>
            </div>
          </div>

          <h2 className="mb-6 text-xl font-semibold text-slate-900">
            Acciones Rapidas
          </h2>
          <div className="space-y-3">
            <button
              onClick={() => router.push("/admin/comercios")}
              className="flex w-full items-center gap-3 rounded-xl bg-blue-600 px-4 py-3 text-white transition hover:bg-blue-500"
            >
              <Plus className="h-5 w-5" />
              <span>Agregar Comercio</span>
            </button>

            <button
              onClick={() => router.push("/admin/eventos")}
              className="flex w-full items-center gap-3 rounded-xl bg-emerald-600 px-4 py-3 text-white transition hover:bg-emerald-500"
            >
              <Plus className="h-5 w-5" />
              <span>Agregar Evento</span>
            </button>

            <button
              onClick={() => router.push("/admin/radio")}
              className="flex w-full items-center gap-3 rounded-xl bg-slate-800 px-4 py-3 text-white transition hover:bg-slate-700"
            >
              <Radio className="h-5 w-5" />
              <span>Configurar Radio</span>
            </button>

            <button
              onClick={() => router.push("/admin/servicios")}
              className="flex w-full items-center gap-3 rounded-xl bg-amber-600 px-4 py-3 text-white transition hover:bg-amber-500"
            >
              <Plus className="h-5 w-5" />
              <span>Agregar Servicio</span>
            </button>

            <button
              onClick={() => router.push("/admin/instituciones")}
              className="flex w-full items-center gap-3 rounded-xl bg-cyan-600 px-4 py-3 text-white transition hover:bg-cyan-500"
            >
              <Plus className="h-5 w-5" />
              <span>Agregar institución</span>
            </button>

            <button
              onClick={() => router.push("/admin/cursos")}
              className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700 transition hover:bg-slate-100"
            >
              <GraduationCap className="h-5 w-5" />
              <span>Gestionar Cursos</span>
            </button>

            <button
              onClick={() => router.push("/admin/contactos")}
              className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700 transition hover:bg-slate-100"
            >
              <Mail className="h-5 w-5" />
              <span>Ver Contactos</span>
            </button>

            <button
              onClick={() => router.push("/admin/sitio")}
              className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700 transition hover:bg-slate-100"
            >
              <FileText className="h-5 w-5" />
              <span>Editar texto del sitio</span>
            </button>

            <Link
              href="/"
              className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700 transition hover:bg-slate-100"
            >
              <Store className="h-5 w-5" />
              <span>Ver sitio publico</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
