export type SubscriptionPlanKey = "presencia" | "destacado" | "destacado_plus"

export const subscriptionPlans: Record<
  SubscriptionPlanKey,
  {
    name: string
    shortLabel: string
    price: string
    tagline: string
    description: string
    features: string[]
  }
> = {
  presencia: {
    name: "Plan Presencia",
    shortLabel: "Presencia",
    price: "$390 / mes",
    tagline: "Ideal para empezar a estar presente",
    description: "Una ficha clara y completa para aparecer en Hola Varela desde el inicio.",
    features: [
      "Presencia del comercio en la web",
      "Informacion basica: nombre, descripcion y direccion",
      "Boton de contacto directo por WhatsApp",
      "Redes sociales visibles",
      "Aparicion en listado general por categoria",
    ],
  },
  destacado: {
    name: "Plan Destacado",
    shortLabel: "Destacado",
    price: "$650 / mes",
    tagline: "Para ganar mayor visibilidad",
    description: "Suma destaque visual y espacio para moverte mejor durante el ano.",
    features: [
      "Incluye todo lo del plan Presencia",
      "Aparicion en seccion Destacados",
      "Mayor visibilidad dentro de la web",
      "Ventana emergente rotativa",
      "Hasta 6 publicaciones de eventos al ano",
    ],
  },
  destacado_plus: {
    name: "Plan Destacado Plus",
    shortLabel: "Destacado Plus",
    price: "$1090 / mes",
    tagline: "Maxima visibilidad y movimiento constante",
    description: "Pensado para comercios activos que trabajan con varias promos, sorteos y eventos.",
    features: [
      "Incluye todo lo del plan Destacado",
      "Publicacion de eventos, promociones o sorteos ilimitados",
      "Mayor presencia continua en la web",
      "Ideal para negocios con movimiento frecuente durante todo el ano",
    ],
  },
}

export function getSubscriptionPlan(plan?: string | null) {
  if (!plan) return subscriptionPlans.presencia
  return subscriptionPlans[plan as SubscriptionPlanKey] || subscriptionPlans.presencia
}
