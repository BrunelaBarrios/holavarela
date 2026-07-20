import type { Metadata } from "next"
import { OpportunitiesClient } from "./OpportunitiesClient"

export const metadata: Metadata = {
  title: "Oportunidades Laborales | Hola Varela",
  description: "Ofertas de empleo y búsquedas laborales de José Pedro Varela.",
}

export default function OpportunitiesPage() {
  return <OpportunitiesClient />
}
