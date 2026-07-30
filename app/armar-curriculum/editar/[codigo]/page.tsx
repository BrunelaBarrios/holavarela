import type { Metadata } from "next"
import EditLoader from "./EditLoader"

export const metadata: Metadata = { robots: { index: false, follow: false } }
export default async function EditCurriculumPage({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params
  return <EditLoader code={codigo}/>
}
