import { notFound } from "next/navigation"
import { supabaseServer } from "../../../../lib/supabaseServer"

export const revalidate = 7200

type EventImageParams = {
  params: Promise<{ id: string }>
}

const DATA_URL_PATTERN = /^data:(.+?);base64,(.+)$/i

function decodeDataUrlImage(value: string) {
  const match = value.match(DATA_URL_PATTERN)
  if (!match) return null

  const [, contentType, payload] = match
  return {
    contentType,
    buffer: Buffer.from(payload, "base64"),
  }
}

export async function GET(_request: Request, { params }: EventImageParams) {
  const { id } = await params
  const eventId = Number(id)

  if (!Number.isFinite(eventId)) {
    notFound()
  }

  const { data } = await supabaseServer
    .from("eventos")
    .select("imagen, estado")
    .eq("id", eventId)
    .maybeSingle()

  if (!data || (data.estado && data.estado !== "activo") || !data.imagen) {
    notFound()
  }

  const dataUrlImage = decodeDataUrlImage(data.imagen)
  if (dataUrlImage) {
    return new Response(dataUrlImage.buffer, {
      headers: {
        "Content-Type": dataUrlImage.contentType,
        "Cache-Control": "public, s-maxage=7200, stale-while-revalidate=86400",
      },
    })
  }

  if (/^https?:\/\//i.test(data.imagen)) {
    const upstream = await fetch(data.imagen, {
      next: { revalidate: 7200 },
    })

    if (!upstream.ok) {
      notFound()
    }

    return new Response(upstream.body, {
      headers: {
        "Content-Type": upstream.headers.get("content-type") || "image/jpeg",
        "Cache-Control": "public, s-maxage=7200, stale-while-revalidate=86400",
      },
    })
  }

  notFound()
}
