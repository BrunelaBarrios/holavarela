import { redirect } from "next/navigation"

export default async function InstitucionSharePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(`/instituciones?item=${encodeURIComponent(id)}`)
}
