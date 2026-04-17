import { redirect } from "next/navigation"

// Redirect-only detail route does not need frequent regeneration.
export const revalidate = 43200

export default async function CursoSharePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(`/cursos?item=${encodeURIComponent(id)}`)
}
