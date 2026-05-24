'use client'

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Calendar,
  CreditCard,
  Mail,
  ShieldAlert,
  Store,
} from "lucide-react"
import { recordSiteVisit } from "../lib/contentVisits"
import {
  adminNavigationItems,
  type AdminNavigationItem,
} from "./adminNavigation"
import {
  AdminActionCard,
  AdminLoadingPanel,
  AdminNotice,
  AdminPageHeader,
  AdminSection,
} from "./components/AdminUI"

type DashboardCounts = {
  comercios: number
  eventos: number
  servicios: number
  instituciones: number
  cursos: number
  usuarios: number
  newComercios: number
  newEventos: number
  newContactos: number
  pendingPasswordRequests: number
  pendingSubscriptions: number
}

type CardTone =
  | "blue"
  | "emerald"
  | "slate"
  | "amber"
  | "rose"
  | "violet"
  | "cyan"
  | "sky"

const emptyCounts: DashboardCounts = {
  comercios: 0,
  eventos: 0,
  servicios: 0,
  instituciones: 0,
  cursos: 0,
  usuarios: 0,
  newComercios: 0,
  newEventos: 0,
  newContactos: 0,
  pendingPasswordRequests: 0,
  pendingSubscriptions: 0,
}

const priorityCards = [
  {
    id: "password-requests",
    title: "Claves solicitadas",
    countKey: "pendingPasswordRequests",
    description: "Usuarios esperando una nueva contraseña.",
    icon: ShieldAlert,
    tone: "violet",
    href: "/admin/usuarios",
  },
  {
    id: "contactos",
    title: "Contactos pendientes",
    countKey: "newContactos",
    description: "Mensajes nuevos esperando revisión.",
    icon: Mail,
    tone: "rose",
    href: "/admin/contactos",
  },
  {
    id: "eventos",
    title: "Eventos borrador",
    countKey: "newEventos",
    description: "Publicaciones listas para revisar o publicar.",
    icon: Calendar,
    tone: "emerald",
    href: "/admin/eventos",
  },
  {
    id: "comercios",
    title: "Comercios borrador",
    countKey: "newComercios",
    description: "Altas nuevas pendientes de publicación.",
    icon: Store,
    tone: "blue",
    href: "/admin/comercios",
  },
  {
    id: "suscripciones",
    title: "Suscripciones pendientes",
    countKey: "pendingSubscriptions",
    description: "Fichas esperando confirmación o seguimiento.",
    icon: CreditCard,
    tone: "slate",
    href: "/admin/suscripciones",
  },
] satisfies {
  id: string
  title: string
  countKey: keyof DashboardCounts
  description: string
  icon: typeof Store
  tone: CardTone
  href: string
}[]

const sectionCards = [
  { href: "/admin/comercios", countKey: "comercios", tone: "blue" },
  { href: "/admin/eventos", countKey: "eventos", tone: "emerald" },
  { href: "/admin/servicios", countKey: "servicios", tone: "amber" },
  { href: "/admin/instituciones", countKey: "instituciones", tone: "cyan" },
  { href: "/admin/cursos", countKey: "cursos", tone: "slate" },
  { href: "/admin/usuarios", countKey: "usuarios", tone: "sky" },
] satisfies {
  href: string
  countKey: keyof DashboardCounts
  tone: CardTone
}[]

const systemHrefs = ["/admin/sitio", "/admin/sorteos", "/admin/desafios", "/admin/radio"]

function getNavigationItem(href: string) {
  return adminNavigationItems.find((item) => item.href === href)
}

export default function AdminDashboardPage() {
  const router = useRouter()
  const [counts, setCounts] = useState<DashboardCounts>(emptyCounts)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState("")

  useEffect(() => {
    const cargarDashboard = async () => {
      try {
        const response = await fetch("/api/admin/dashboard", {
          cache: "no-store",
        })
        const result = (await response.json()) as {
          counts?: DashboardCounts
          error?: string
        }

        if (!response.ok || !result.counts) {
          throw new Error(result.error || "No se pudo cargar el dashboard.")
        }

        setCounts(result.counts)
      } catch (error) {
        setLoadError(
          error instanceof Error ? error.message : "No se pudo cargar el dashboard."
        )
      } finally {
        setLoading(false)
      }
    }

    void cargarDashboard()
  }, [])

  useEffect(() => {
    void recordSiteVisit("admin-dashboard", "Panel de admin")
  }, [])

  const quickSections = useMemo(
    () =>
      sectionCards
        .map((card) => ({
          ...card,
          item: getNavigationItem(card.href),
        }))
        .filter((card): card is typeof card & { item: AdminNavigationItem } =>
          Boolean(card.item)
        ),
    []
  )

  const systemSections = useMemo(
    () =>
      systemHrefs
        .map((href) => getNavigationItem(href))
        .filter((item): item is AdminNavigationItem => Boolean(item)),
    []
  )

  return (
    <div className="mx-auto max-w-7xl">
      <AdminPageHeader
        title="Dashboard"
        description="Una bandeja simple para resolver lo urgente y entrar rápido al módulo correcto."
      />

      {loading ? (
        <AdminLoadingPanel label="Cargando panel..." />
      ) : loadError ? (
        <AdminNotice tone="danger">{loadError}</AdminNotice>
      ) : (
        <div className="space-y-6">
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
            {priorityCards.map((card) => (
              <AdminActionCard
                key={card.id}
                title={card.title}
                description={card.description}
                value={counts[card.countKey]}
                icon={card.icon}
                tone={card.tone}
                onClick={() => router.push(card.href)}
              />
            ))}
          </section>

          <AdminSection
            title="Accesos principales"
            description="Contenido, usuarios y tareas frecuentes en un solo nivel de navegación."
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {quickSections.map((card) => (
                <AdminActionCard
                  key={card.href}
                  title={card.item.label}
                  description={card.item.description}
                  value={counts[card.countKey]}
                  icon={card.item.icon}
                  tone={card.tone}
                  onClick={() => router.push(card.href)}
                />
              ))}
            </div>
          </AdminSection>

          <AdminSection
            title="Sistema"
            description="Herramientas menos frecuentes, separadas para no competir con la gestión diaria."
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {systemSections.map((item) => (
                <AdminActionCard
                  key={item.href}
                  title={item.label}
                  description={item.description}
                  icon={item.icon}
                  tone="slate"
                  onClick={() => router.push(item.href)}
                />
              ))}
            </div>
          </AdminSection>
        </div>
      )}
    </div>
  )
}
