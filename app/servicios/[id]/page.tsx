import { redirect } from "next/navigation"

export default async function ServicioSharePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(`/servicios?item=${encodeURIComponent(id)}`)
}
