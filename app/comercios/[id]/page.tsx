import { redirect } from "next/navigation"

export default async function ComercioSharePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(`/comercios?item=${encodeURIComponent(id)}`)
}
