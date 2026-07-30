import type { Metadata } from "next"
import CurriculumBuilder from "./CurriculumBuilder"

export const metadata: Metadata = {
  title: "Armá tu currículum profesional | Hola Varela",
  description: "Creá, previsualizá y descargá tu currículum profesional.",
  robots: { index: false, follow: false },
}

export default function CurriculumPage() {
  return <CurriculumBuilder />
}
