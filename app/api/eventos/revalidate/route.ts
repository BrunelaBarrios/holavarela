import { revalidatePath } from "next/cache"
import { NextResponse } from "next/server"

type RevalidateEventPayload = {
  id?: string | number | null
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as RevalidateEventPayload

  revalidatePath("/")
  revalidatePath("/eventos")

  if (body.id) {
    revalidatePath(`/eventos/${body.id}`)
  }

  return NextResponse.json({ ok: true })
}
