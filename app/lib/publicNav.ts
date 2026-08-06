type PublicNavKey =
  | "inicio"
  | "eventos"
  | "cursos"
  | "instituciones"
  | "comercios"
  | "servicios"
  | "suscripciones"
  | "contacto"
  | "trabajo"

const publicNavItems: Record<PublicNavKey, { href: string; label: string }> = {
  inicio: { href: "/#inicio", label: "Inicio" },
  eventos: { href: "/#eventos", label: "Hoy en Varela" },
  cursos: { href: "/cursos", label: "Cursos y Clases" },
  instituciones: { href: "/instituciones", label: "Instituciones" },
  comercios: { href: "/#comercios", label: "Comercios" },
  servicios: { href: "/#servicios", label: "Servicios" },
  suscripciones: { href: "/suscripciones", label: "Suscripciones" },
  contacto: { href: "/#contacto", label: "Contacto" },
  trabajo: { href: "/oportunidades-laborales", label: "Trabajo" },
}

const publicNavOrder: PublicNavKey[] = [
  "inicio",
  "eventos",
  "cursos",
  "instituciones",
  "comercios",
  "servicios",
  "trabajo",
  "contacto",
]

export function buildPublicNav(active?: PublicNavKey) {
  return publicNavOrder.map((key) => ({
    ...publicNavItems[key],
    active: key === active,
  }))
}

export function buildHomePublicNav() {
  return [
    { href: "/#inicio", label: "Inicio" },
    { href: "/#eventos", label: "Hoy en Varela" },
    { href: "/cursos", label: "Cursos y Clases" },
    { href: "/instituciones", label: "Instituciones" },
    { href: "/#comercios", label: "Comercios" },
    { href: "/#servicios", label: "Servicios" },
    { href: "/oportunidades-laborales", label: "Trabajo" },
    { href: "/#contacto", label: "Contacto" },
  ]
}
