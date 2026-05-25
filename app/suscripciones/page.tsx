import { buildSubscriptionPlansForUser, type SubscriptionSiteContent } from "../lib/subscriptionContent"
import { supabaseServer } from "../lib/supabaseServer"
import { SuscripcionesLandingClient } from "./SuscripcionesLandingClient"

export const revalidate = 3600

const siteFieldSelection = `
  plan_presencia_titulo,
  plan_presencia_tagline,
  plan_presencia_descripcion,
  plan_presencia_precio,
  plan_presencia_features,
  plan_destacado_titulo,
  plan_destacado_tagline,
  plan_destacado_descripcion,
  plan_destacado_precio,
  plan_destacado_features,
  plan_destacado_plus_titulo,
  plan_destacado_plus_tagline,
  plan_destacado_plus_descripcion,
  plan_destacado_plus_precio,
  plan_destacado_plus_features
`

export default async function SuscripcionesPage() {
  const { data } = await supabaseServer
    .from("sitio")
    .select(siteFieldSelection)
    .eq("id", 1)
    .maybeSingle()

  return (
    <SuscripcionesLandingClient
      plans={buildSubscriptionPlansForUser(data as SubscriptionSiteContent | null)}
    />
  )
}
