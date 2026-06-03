import { revalidatePath } from "next/cache"
import { NextResponse } from "next/server"

type RevalidateEventPayload = {
  id?: string | number | null
  comercio_id?: number | null
  servicio_id?: number | null
  institucion_id?: number | null
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as RevalidateEventPayload

  revalidatePath("/")
  revalidatePath("/eventos")

  if (body.id) {
    revalidatePath(`/eventos/${body.id}`)
  }
  if (body.comercio_id) {
    revalidatePath(`/comercios/${body.comercio_id}`)
  }
  if (body.servicio_id) {
    revalidatePath(`/servicios/${body.servicio_id}`)
  }
  if (body.institucion_id) {
    revalidatePath(`/instituciones/${body.institucion_id}`)
  }

  return NextResponse.json({ ok: true })
}
