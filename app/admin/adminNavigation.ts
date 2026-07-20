import type { LucideIcon } from "lucide-react"
import {
  Activity,
  BadgeCheck,
  BarChart3,
  Building2,
  Calendar,
  CreditCard,
  FileText,
  Gamepad2,
  Gift,
  Goal,
  GraduationCap,
  LayoutDashboard,
  Mail,
  MessageSquareText,
  BriefcaseBusiness,
  Radio,
  ShieldAlert,
  Store,
  Users,
} from "lucide-react"
import type { AdminRole } from "../lib/adminAuth"

export type AdminNavigationItem = {
  href: string
  icon: LucideIcon
  label: string
  group: "panel" | "contenido" | "gestion" | "sistema"
  roles: AdminRole[]
  description: string
  keywords: string[]
}

export const adminNavigationGroups = [
  { id: "panel", label: "Panel" },
  { id: "contenido", label: "Contenido" },
  { id: "gestion", label: "Gestión" },
  { id: "sistema", label: "Sistema" },
] as const

export const adminNavigationItems: AdminNavigationItem[] = [
  {
    href: "/admin",
    icon: LayoutDashboard,
    label: "Dashboard",
    group: "panel",
    roles: ["superadmin", "admin"],
    description: "Prioridades, pendientes y accesos rápidos.",
    keywords: ["inicio", "resumen", "pendientes"],
  },
  {
    href: "/admin/metricas",
    icon: BarChart3,
    label: "Métricas",
    group: "panel",
    roles: ["superadmin", "admin"],
    description: "Tráfico, clics y comportamiento del sitio.",
    keywords: ["analytics", "trafico", "visitas", "clicks"],
  },
  {
    href: "/admin/comercios",
    icon: Store,
    label: "Comercios",
    group: "contenido",
    roles: ["superadmin", "admin"],
    description: "Altas, fichas, destacados y suscripciones.",
    keywords: ["locales", "negocios", "tiendas"],
  },
  {
    href: "/admin/eventos",
    icon: Calendar,
    label: "Eventos",
    group: "contenido",
    roles: ["superadmin", "admin"],
    description: "Agenda, avisos, promociones y borradores.",
    keywords: ["agenda", "avisos", "promociones"],
  },
  {
    href: "/admin/servicios",
    icon: ShieldAlert,
    label: "Servicios",
    group: "contenido",
    roles: ["superadmin", "admin"],
    description: "Profesionales, oficios y alojamientos.",
    keywords: ["profesionales", "oficios", "alojamientos"],
  },
  {
    href: "/admin/instituciones",
    icon: Building2,
    label: "Instituciones",
    group: "contenido",
    roles: ["superadmin", "admin"],
    description: "Instituciones, cursos asociados y datos públicos.",
    keywords: ["organizaciones", "escuelas", "clubes"],
  },
  {
    href: "/admin/cursos",
    icon: GraduationCap,
    label: "Cursos",
    group: "contenido",
    roles: ["superadmin", "admin"],
    description: "Clases, talleres y propuestas educativas.",
    keywords: ["clases", "talleres", "educacion"],
  },
  {
    href: "/admin/oportunidades-laborales",
    icon: BriefcaseBusiness,
    label: "Oportunidades Laborales",
    group: "contenido",
    roles: ["superadmin", "admin"],
    description: "Ofertas, búsquedas y moderación laboral.",
    keywords: ["trabajo", "empleo", "ofertas", "postulantes"],
  },
  {
    href: "/admin/contactos",
    icon: Mail,
    label: "Contactos",
    group: "gestion",
    roles: ["superadmin", "admin"],
    description: "Mensajes, consultas y solicitudes de alta.",
    keywords: ["mensajes", "consultas", "altas"],
  },
  {
    href: "/admin/mensajes-comunidad",
    icon: MessageSquareText,
    label: "Mensajes de la comunidad",
    group: "gestion",
    roles: ["superadmin", "admin"],
    description: "Moderación y programación de mensajes breves.",
    keywords: ["mensajes", "comunidad", "moderacion", "programados"],
  },
  {
    href: "/admin/usuarios",
    icon: Users,
    label: "Usuarios",
    group: "gestion",
    roles: ["superadmin", "admin"],
    description: "Cuentas, claves y perfiles vinculados.",
    keywords: ["cuentas", "claves", "perfiles"],
  },
  {
    href: "/admin/suscripciones",
    icon: CreditCard,
    label: "Suscripciones",
    group: "gestion",
    roles: ["superadmin", "admin"],
    description: "Planes, textos y estados pendientes.",
    keywords: ["planes", "pagos", "pendientes"],
  },
  {
    href: "/admin/sitio",
    icon: FileText,
    label: "Sitio",
    group: "sistema",
    roles: ["superadmin"],
    description: "Textos generales y contenido institucional.",
    keywords: ["home", "contenido", "copy"],
  },
  {
    href: "/admin/sorteos",
    icon: Gift,
    label: "Sorteos",
    group: "sistema",
    roles: ["superadmin"],
    description: "Campañas, participantes y cupones.",
    keywords: ["campanas", "popup", "cupones"],
  },
  {
    href: "/admin/desafios",
    icon: Gamepad2,
    label: "Desafíos",
    group: "sistema",
    roles: ["superadmin"],
    description: "Participantes, puntajes y ganadores.",
    keywords: ["juegos", "puntajes", "ganadores"],
  },
  {
    href: "/admin/juego-gol",
    icon: Goal,
    label: "Juego gol",
    group: "sistema",
    roles: ["superadmin"],
    description: "Activacion, banner y ranking del Desafio del Gol.",
    keywords: ["penales", "gol", "ranking", "juego"],
  },
  {
    href: "/admin/radio",
    icon: Radio,
    label: "Radio",
    group: "sistema",
    roles: ["superadmin"],
    description: "Configuración de streaming y visibilidad.",
    keywords: ["streaming", "audio", "vivo"],
  },
  {
    href: "/admin/administradores",
    icon: BadgeCheck,
    label: "Administradores",
    group: "sistema",
    roles: ["superadmin"],
    description: "Accesos internos y roles.",
    keywords: ["roles", "permisos", "admins"],
  },
  {
    href: "/admin/actividad",
    icon: Activity,
    label: "Actividad",
    group: "sistema",
    roles: ["superadmin"],
    description: "Historial de acciones del panel.",
    keywords: ["auditoria", "historial", "logs"],
  },
]

export function getVisibleAdminNavigation(role: AdminRole) {
  return adminNavigationItems.filter((item) => item.roles.includes(role))
}

export function isActiveAdminRoute(pathname: string, href: string) {
  return href === "/admin" ? pathname === href : pathname.startsWith(href)
}
